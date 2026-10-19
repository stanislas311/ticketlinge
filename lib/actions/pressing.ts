"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { COOKIE_PRESSING_ID } from "@/lib/espace";
import { normaliserTelephone } from "@/lib/telephone";
import { validerChaine } from "@/lib/validation";

export interface EtatPressing {
  erreur: string | null;
}

export async function creerPressing(
  _etatPrecedent: EtatPressing,
  formData: FormData,
): Promise<EtatPressing> {
  const nomBrut = formData.get("nom");
  const villeBrut = formData.get("ville");
  const telephoneBrut = (formData.get("telephone") as string)?.trim() || "";

  const valNom = validerChaine(nomBrut, "Nom du pressing", 2, 100);
  if (!valNom.valide) {
    return { erreur: valNom.erreur! };
  }

  const valVille = validerChaine(villeBrut, "Ville", 2, 100);
  if (!valVille.valide) {
    return { erreur: valVille.erreur! };
  }

  let telephoneNormalise: string | null = null;
  if (telephoneBrut) {
    const valTel = normaliserTelephone(telephoneBrut);
    if (!valTel.valide) {
      return { erreur: valTel.erreur! };
    }
    telephoneNormalise = valTel.telephone!;
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      erreur: "Votre session a expire. Veuillez vous reconnecter.",
    };
  }

  const { error } = await supabase.rpc("creer_pressing", {
    p_nom: valNom.valeur!,
    p_ville: valVille.valeur!,
    p_telephone: telephoneNormalise,
  });

  if (error) {
    if (error.code === "28000") {
      return {
        erreur: "Votre session a expire. Veuillez vous reconnecter.",
      };
    }
    if (error.code === "P0001") {
      return {
        erreur:
          "Vous avez atteint le nombre maximal de pressings autorises (3 pressings maximum).",
      };
    }
    return {
      erreur:
        "Une erreur est survenue lors de la creation de votre pressing. Veuillez reessayer.",
    };
  }

  redirect("/tableau-de-bord");
}

/**
 * Change le pressing actif de l'utilisateur.
 * Vérifie systématiquement l'appartenance dans la base de données.
 */
export async function changerPressingActif(nouveauId: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/connexion");
  }

  // Verification stricte de l'appartenance
  const { data: membre } = await supabase
    .from("membres")
    .select("pressing_id")
    .eq("utilisateur_id", user.id)
    .eq("pressing_id", nouveauId)
    .maybeSingle();

  if (membre) {
    const cookieStore = await cookies();
    cookieStore.set(COOKIE_PRESSING_ID, nouveauId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }

  revalidatePath("/tableau-de-bord");
  revalidatePath("/tarifs");
  revalidatePath("/clients");
}
