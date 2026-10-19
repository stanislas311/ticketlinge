"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { obtenirContexteEspace } from "@/lib/espace";
import { validerChaine, validerPrixXOF } from "@/lib/validation";

export interface EtatPrestation {
  erreur: string | null;
  succes?: boolean;
}

export async function creerPrestation(
  _etatPrecedent: EtatPrestation,
  formData: FormData,
): Promise<EtatPrestation> {
  const contexte = await obtenirContexteEspace();

  // Verification des droits : proprietaire ou gerant requis
  if (contexte.roleActif === "receptionniste") {
    return {
      erreur:
        "Seuls les proprietaires et les gerants peuvent ajouter des prestations au catalogue.",
    };
  }

  const valArticle = validerChaine(formData.get("article"), "Article", 2, 100);
  if (!valArticle.valide) {
    return { erreur: valArticle.erreur! };
  }

  const valService = validerChaine(formData.get("service"), "Service", 2, 100);
  if (!valService.valide) {
    return { erreur: valService.erreur! };
  }

  const valPrix = validerPrixXOF(formData.get("prix_xof"));
  if (!valPrix.valide) {
    return { erreur: valPrix.erreur! };
  }

  const supabase = await createClient();

  const { error } = await supabase.from("prestations").insert({
    pressing_id: contexte.pressingActif.id,
    article: valArticle.valeur!,
    service: valService.valeur!,
    prix_xof: valPrix.valeur!,
  });

  if (error) {
    if (error.code === "23505") {
      return {
        erreur:
          "Cette prestation existe deja dans ce pressing pour cet article et ce service.",
      };
    }
    if (error.code === "23514") {
      return {
        erreur: "Les donnees de la prestation ne respectent pas les contraintes requises.",
      };
    }
    if (error.code === "42501") {
      return {
        erreur: "Droits insuffisants pour creer une prestation.",
      };
    }
    return {
      erreur:
        "Une erreur est survenue lors de l'ajout de la prestation. Veuillez reessayer.",
    };
  }

  revalidatePath("/tarifs");
  return { erreur: null, succes: true };
}

export async function modifierPrixPrestation(
  prestationId: string,
  nouveauPrixBrut: unknown,
): Promise<{ erreur: string | null }> {
  const contexte = await obtenirContexteEspace();

  if (contexte.roleActif === "receptionniste") {
    return {
      erreur:
        "Seuls les proprietaires et les gerants peuvent modifier les tarifs.",
    };
  }

  const valPrix = validerPrixXOF(nouveauPrixBrut);
  if (!valPrix.valide) {
    return { erreur: valPrix.erreur! };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("prestations")
    .update({ prix_xof: valPrix.valeur! })
    .eq("id", prestationId)
    .eq("pressing_id", contexte.pressingActif.id);

  if (error) {
    if (error.code === "42501") {
      return { erreur: "Droits insuffisants pour modifier ce tarif." };
    }
    return { erreur: "Impossible de modifier le prix. Veuillez reessayer." };
  }

  revalidatePath("/tarifs");
  return { erreur: null };
}

export async function basculerEtatPrestation(
  prestationId: string,
  actifActuel: boolean,
): Promise<{ erreur: string | null }> {
  const contexte = await obtenirContexteEspace();

  if (contexte.roleActif === "receptionniste") {
    return {
      erreur:
        "Seuls les proprietaires et les gerants peuvent activer ou desactiver une prestation.",
    };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("prestations")
    .update({ actif: !actifActuel })
    .eq("id", prestationId)
    .eq("pressing_id", contexte.pressingActif.id);

  if (error) {
    if (error.code === "42501") {
      return { erreur: "Droits insuffisants pour modifier cette prestation." };
    }
    return {
      erreur:
        "Impossible de changer l'etat de la prestation. Veuillez reessayer.",
    };
  }

  revalidatePath("/tarifs");
  return { erreur: null };
}
