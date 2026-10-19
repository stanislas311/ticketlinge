"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export interface EtatPressing {
  erreur: string | null;
}

function validerEtFormaterTelephone(
  tel: string,
): { valide: boolean; valeur: string | null } {
  const brut = tel.trim();
  if (!brut) {
    return { valide: true, valeur: null };
  }
  // Nettoyer les espaces, tirets et points
  const nettoye = brut.replace(/[\s.-]/g, "");
  // Format ivoirien : 10 chiffres commencant par 0, avec ou sans indicatif +225
  const regex = /^(?:\+225)?0\d{9}$/;
  if (regex.test(nettoye)) {
    return { valide: true, valeur: nettoye };
  }
  return { valide: false, valeur: null };
}

export async function creerPressing(
  _etatPrecedent: EtatPressing,
  formData: FormData,
): Promise<EtatPressing> {
  const nom = (formData.get("nom") as string)?.trim() ?? "";
  const ville = (formData.get("ville") as string)?.trim() ?? "";
  const telephoneBrut = (formData.get("telephone") as string) ?? "";

  if (nom.length < 2 || nom.length > 100) {
    return {
      erreur: "Le nom du pressing doit contenir entre 2 et 100 caracteres.",
    };
  }

  if (ville.length < 2 || ville.length > 100) {
    return {
      erreur: "La ville doit contenir entre 2 et 100 caracteres.",
    };
  }

  const { valide, valeur: telephone } =
    validerEtFormaterTelephone(telephoneBrut);

  if (!valide) {
    return {
      erreur:
        "Numero de telephone invalide. Format attendu : 10 chiffres (ex : 0701020304 ou +225 0701020304).",
    };
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
    p_nom: nom,
    p_ville: ville,
    p_telephone: telephone,
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
