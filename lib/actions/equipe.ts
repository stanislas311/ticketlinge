"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { obtenirContexteEspace, COOKIE_PRESSING_ID } from "@/lib/espace";

function estErreurMigrationAbsente(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return (
    error.code === "PGRST202" ||
    error.code === "42883" ||
    error.code === "42P01" ||
    (typeof error.message === "string" &&
      (error.message.includes("does not exist") ||
        error.message.includes("schema cache") ||
        error.message.includes("Could not find the function")))
  );
}

export async function creerInvitationAction(
  role: "gerant" | "receptionniste",
): Promise<{ erreur: string | null; jeton?: string }> {
  const contexte = await obtenirContexteEspace();

  if (contexte.roleActif === "receptionniste") {
    return { erreur: "Seuls les proprietaires et les gerants peuvent creer des invitations." };
  }

  if (contexte.roleActif === "gerant" && role !== "receptionniste") {
    return { erreur: "Un gerant ne peut inviter qu'un receptionniste." };
  }

  const supabase = await createClient();

  const { data: jeton, error } = await supabase.rpc("creer_invitation", {
    p_pressing: contexte.pressingActif.id,
    p_role: role,
  });

  if (error) {
    if (estErreurMigrationAbsente(error)) {
      return {
        erreur:
          "La fonctionnalite d'invitation n'est pas encore activee en base de donnees (migration en attente).",
      };
    }
    if (error.code === "P0001") {
      return { erreur: "Nombre maximal d'invitations en attente atteint pour ce pressing (20 maximum)." };
    }
    if (error.code === "42501") {
      return { erreur: "Droits insuffisants pour creer cette invitation." };
    }
    return { erreur: "Une erreur est survenue lors de la creation de l'invitation. Veuillez reessayer." };
  }

  revalidatePath("/equipe");
  return { erreur: null, jeton: jeton as string };
}

export async function accepterInvitationAction(
  jeton: string,
): Promise<{ erreur: string | null; pressingId?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { erreur: "Vous devez etre connecte pour accepter une invitation." };
  }

  const { data: pressingId, error } = await supabase.rpc("accepter_invitation", {
    p_jeton: jeton.trim(),
  });

  if (error) {
    if (estErreurMigrationAbsente(error)) {
      return {
        erreur:
          "La fonctionnalite d'invitation n'est pas encore activee en base de donnees (migration en attente).",
      };
    }
    if (error.code === "P0003") {
      return { erreur: "Vous etes deja membre de ce pressing." };
    }
    // Message neutre unique pour jeton inconnu, expire, utilise ou revoque
    return { erreur: "Cette invitation est invalide ou a expire." };
  }

  // Memoriser le pressing nouvellement rejoint comme pressing actif
  if (pressingId && typeof pressingId === "string") {
    const cookieStore = await cookies();
    cookieStore.set(COOKIE_PRESSING_ID, pressingId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }

  revalidatePath("/tableau-de-bord");
  revalidatePath("/equipe");
  revalidatePath("/tarifs");
  revalidatePath("/clients");

  return { erreur: null, pressingId: pressingId as string };
}

export async function revoquerInvitationAction(
  invitationId: string,
): Promise<{ erreur: string | null }> {
  const contexte = await obtenirContexteEspace();

  if (contexte.roleActif === "receptionniste") {
    return { erreur: "Seuls les proprietaires et les gerants peuvent revoquer des invitations." };
  }

  const supabase = await createClient();

  const { error } = await supabase.rpc("revoquer_invitation", {
    p_invitation: invitationId,
  });

  if (error) {
    if (estErreurMigrationAbsente(error)) {
      return {
        erreur:
          "La fonctionnalite d'invitation n'est pas encore activee en base de donnees (migration en attente).",
      };
    }
    if (error.code === "P0004") {
      return { erreur: "Cette invitation a deja ete utilisee et ne peut plus etre revoquee." };
    }
    if (error.code === "42501") {
      return { erreur: "Droits insuffisants pour revoquer cette invitation." };
    }
    return { erreur: "Impossible de revoquer cette invitation. Veuillez reessayer." };
  }

  revalidatePath("/equipe");
  return { erreur: null };
}

export async function changerRoleMembreAction(
  utilisateurId: string,
  nouveauRole: "gerant" | "receptionniste",
): Promise<{ erreur: string | null }> {
  const contexte = await obtenirContexteEspace();

  if (contexte.roleActif !== "proprietaire") {
    return { erreur: "Seul le proprietaire du pressing peut modifier le role d'un membre." };
  }

  if (utilisateurId === contexte.utilisateur.id) {
    return { erreur: "Vous ne pouvez pas modifier votre propre role." };
  }

  const supabase = await createClient();

  const { error } = await supabase.rpc("changer_role_membre", {
    p_pressing: contexte.pressingActif.id,
    p_utilisateur: utilisateurId,
    p_role: nouveauRole,
  });

  if (error) {
    if (estErreurMigrationAbsente(error)) {
      return {
        erreur:
          "La fonctionnalite de gestion des roles n'est pas encore activee en base de donnees (migration en attente).",
      };
    }
    if (error.code === "P0005") {
      return { erreur: "Vous ne pouvez pas modifier votre propre role." };
    }
    if (error.code === "P0007") {
      return { erreur: "Impossible de modifier le role du dernier proprietaire." };
    }
    if (error.code === "42501") {
      return { erreur: "Droits insuffisants pour modifier ce role." };
    }
    return { erreur: "Impossible de modifier le role de ce membre. Veuillez reessayer." };
  }

  revalidatePath("/equipe");
  return { erreur: null };
}

export async function retirerMembreAction(
  utilisateurId: string,
): Promise<{ erreur: string | null }> {
  const contexte = await obtenirContexteEspace();

  if (contexte.roleActif !== "proprietaire") {
    return { erreur: "Seul le proprietaire du pressing peut retirer un membre de l'equipe." };
  }

  if (utilisateurId === contexte.utilisateur.id) {
    return { erreur: "Vous ne pouvez pas vous retirer vous-meme de votre pressing." };
  }

  const supabase = await createClient();

  const { error } = await supabase.rpc("retirer_membre", {
    p_pressing: contexte.pressingActif.id,
    p_utilisateur: utilisateurId,
  });

  if (error) {
    if (estErreurMigrationAbsente(error)) {
      return {
        erreur:
          "La fonctionnalite de retrait des membres n'est pas encore activee en base de donnees (migration en attente).",
      };
    }
    if (error.code === "P0007") {
      return { erreur: "Impossible de retirer le dernier proprietaire." };
    }
    if (error.code === "42501") {
      return { erreur: "Droits insuffisants pour retirer ce membre." };
    }
    return { erreur: "Impossible de retirer ce membre de l'equipe. Veuillez reessayer." };
  }

  revalidatePath("/equipe");
  return { erreur: null };
}
