"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export interface EtatAuth {
  erreur: string | null;
  message: string | null;
}

function validerEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function assainirCheminRelatif(chemin: unknown): string | null {
  if (typeof chemin !== "string" || !chemin) {
    return null;
  }
  const cheminNettoye = chemin.trim();
  if (!cheminNettoye.startsWith("/") || cheminNettoye.startsWith("//")) {
    return null;
  }
  // Interdire les protocoles et caracteres suspects
  if (/[\r\n\t]/.test(cheminNettoye)) {
    return null;
  }
  return cheminNettoye;
}

export async function inscription(
  _etatPrecedent: EtatAuth,
  formData: FormData,
): Promise<EtatAuth> {
  const email = (formData.get("email") as string)?.trim().toLowerCase() ?? "";
  const motDePasse = (formData.get("mot_de_passe") as string) ?? "";
  const confirmation = (formData.get("confirmation") as string) ?? "";

  if (!email || !validerEmail(email)) {
    return {
      erreur: "Veuillez fournir une adresse e-mail valide.",
      message: null,
    };
  }

  if (motDePasse.length < 10) {
    return {
      erreur: "Le mot de passe doit comporter au moins 10 caracteres.",
      message: null,
    };
  }

  if (motDePasse !== confirmation) {
    return {
      erreur: "Les mots de passe ne correspondent pas.",
      message: null,
    };
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password: motDePasse,
  });

  if (error) {
    return {
      erreur: "Une erreur est survenue lors de l'inscription. Veuillez reessayer.",
      message: null,
    };
  }

  const suivant = assainirCheminRelatif(formData.get("suivant"));

  // Si Supabase renvoie une session (confirmation par e-mail desactivee)
  if (data?.session) {
    if (suivant) {
      redirect(suivant);
    }
    redirect("/creer-pressing");
  }

  return {
    erreur: null,
    message:
      "Un lien de confirmation vous a ete envoye par e-mail. Veuillez consulter votre boite de reception pour activer votre compte.",
  };
}

export async function connexion(
  _etatPrecedent: EtatAuth,
  formData: FormData,
): Promise<EtatAuth> {
  const email = (formData.get("email") as string)?.trim().toLowerCase() ?? "";
  const motDePasse = (formData.get("mot_de_passe") as string) ?? "";
  const suivant = assainirCheminRelatif(formData.get("suivant"));

  if (!email || !validerEmail(email)) {
    return {
      erreur: "Adresse e-mail ou mot de passe incorrect.",
      message: null,
    };
  }

  if (!motDePasse) {
    return {
      erreur: "Adresse e-mail ou mot de passe incorrect.",
      message: null,
    };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: motDePasse,
  });

  if (error) {
    return {
      erreur: "Adresse e-mail ou mot de passe incorrect.",
      message: null,
    };
  }

  // Verifier si l'utilisateur est membre d'au moins un pressing
  const { data: membre } = await supabase
    .from("membres")
    .select("pressing_id")
    .limit(1)
    .maybeSingle();

  if (!membre) {
    redirect("/creer-pressing");
  }

  if (
    suivant &&
    !suivant.startsWith("/connexion") &&
    !suivant.startsWith("/inscription")
  ) {
    redirect(suivant);
  }

  redirect("/tableau-de-bord");
}

export async function deconnexion(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/connexion");
}
