"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { obtenirContexteEspace } from "@/lib/espace";
import { validerChaine } from "@/lib/validation";
import { normaliserTelephone } from "@/lib/telephone";

export interface EtatClient {
  erreur: string | null;
  succes?: boolean;
}

export async function creerClient(
  _etatPrecedent: EtatClient,
  formData: FormData,
): Promise<EtatClient> {
  const contexte = await obtenirContexteEspace();

  const valNom = validerChaine(formData.get("nom"), "Nom du client", 2, 100);
  if (!valNom.valide) {
    return { erreur: valNom.erreur! };
  }

  const valTel = normaliserTelephone(formData.get("telephone"));
  if (!valTel.valide) {
    return { erreur: valTel.erreur! };
  }

  const supabase = await createClient();

  const { error } = await supabase.from("clients").insert({
    pressing_id: contexte.pressingActif.id,
    nom: valNom.valeur!,
    telephone: valTel.telephone!,
  });

  if (error) {
    if (error.code === "23505") {
      return {
        erreur:
          "Ce numero de telephone est deja enregistre pour un client dans ce pressing.",
      };
    }
    if (error.code === "23514") {
      return {
        erreur:
          "Les informations du client ne respectent pas le format attendu (nom ou telephone).",
      };
    }
    if (error.code === "42501") {
      return {
        erreur: "Droits insuffisants pour creer un client.",
      };
    }
    return {
      erreur:
        "Une erreur est survenue lors de l'enregistrement du client. Veuillez reessayer.",
    };
  }

  revalidatePath("/clients");
  return { erreur: null, succes: true };
}

export async function modifierClient(
  _etatPrecedent: EtatClient,
  formData: FormData,
): Promise<EtatClient> {
  const contexte = await obtenirContexteEspace();

  const id = formData.get("id") as string;
  if (!id) {
    return { erreur: "Identifiant client manquant." };
  }

  const valNom = validerChaine(formData.get("nom"), "Nom du client", 2, 100);
  if (!valNom.valide) {
    return { erreur: valNom.erreur! };
  }

  const valTel = normaliserTelephone(formData.get("telephone"));
  if (!valTel.valide) {
    return { erreur: valTel.erreur! };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("clients")
    .update({
      nom: valNom.valeur!,
      telephone: valTel.telephone!,
    })
    .eq("id", id)
    .eq("pressing_id", contexte.pressingActif.id);

  if (error) {
    if (error.code === "23505") {
      return {
        erreur:
          "Ce numero de telephone est deja utilise par un autre client de ce pressing.",
      };
    }
    if (error.code === "23514") {
      return {
        erreur: "Les informations fournies sont invalides.",
      };
    }
    if (error.code === "42501") {
      return {
        erreur: "Droits insuffisants pour modifier ce client.",
      };
    }
    return {
      erreur:
        "Une erreur est survenue lors de la mise a jour du client. Veuillez reessayer.",
    };
  }

  revalidatePath("/clients");
  return { erreur: null, succes: true };
}

export async function basculerEtatClient(
  clientId: string,
  actifActuel: boolean,
): Promise<{ erreur: string | null }> {
  const contexte = await obtenirContexteEspace();
  const supabase = await createClient();

  const { error } = await supabase
    .from("clients")
    .update({ actif: !actifActuel })
    .eq("id", clientId)
    .eq("pressing_id", contexte.pressingActif.id);

  if (error) {
    if (error.code === "42501") {
      return { erreur: "Droits insuffisants pour modifier ce client." };
    }
    return {
      erreur: "Impossible de modifier le statut du client. Veuillez reessayer.",
    };
  }

  revalidatePath("/clients");
  return { erreur: null };
}
