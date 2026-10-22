"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { obtenirContexteEspace } from "@/lib/espace";
import { normaliserTelephone } from "@/lib/telephone";
import { validerChaine } from "@/lib/validation";

interface ErreurSupabase {
  code?: string;
  message?: string;
}

interface ClientDepot {
  id: string;
  nom: string;
  telephone: string;
}

export interface ResultatActionDepot {
  erreur: string | null;
  depotId?: string;
  numeroTicket?: string;
  client?: ClientDepot;
  clients?: ClientDepot[];
}

function migrationDepotAbsente(error: ErreurSupabase | null): boolean {
  return Boolean(
    error &&
      (["PGRST202", "PGRST205", "42883", "42P01"].includes(error.code ?? "") ||
        error.message?.includes("schema cache") ||
        error.message?.includes("does not exist") ||
        error.message?.includes("Could not find the function")),
  );
}

function messageErreurDepot(error: ErreurSupabase): string {
  if (migrationDepotAbsente(error)) {
    return "La fonctionnalite des depots n'est pas encore activee en base de donnees. La migration SQL doit etre appliquee.";
  }
  if (error.code === "42501") {
    return "Vous n'avez pas les droits necessaires pour cette operation.";
  }
  return "Une erreur est survenue. Veuillez verifier les informations et reessayer.";
}

export async function rechercherClientsActifs(
  rechercheBrute: string,
): Promise<ResultatActionDepot> {
  const contexte = await obtenirContexteEspace();
  const recherche = rechercheBrute
    .trim()
    .replace(/[%_\\,*()]/g, " ")
    .replace(/\s+/g, " ")
    .slice(0, 100);
  if (!recherche) return { erreur: null, clients: [] };

  const supabase = await createClient();
  const motif = `%${recherche}%`;
  const [parNom, parTelephone] = await Promise.all([
    supabase
      .from("clients")
      .select("id, nom, telephone")
      .eq("pressing_id", contexte.pressingActif.id)
      .eq("actif", true)
      .ilike("nom", motif)
      .order("nom")
      .limit(10),
    supabase
      .from("clients")
      .select("id, nom, telephone")
      .eq("pressing_id", contexte.pressingActif.id)
      .eq("actif", true)
      .ilike("telephone", motif)
      .order("nom")
      .limit(10),
  ]);

  if (parNom.error || parTelephone.error) {
    return {
      erreur:
        "Impossible de rechercher les clients pour le moment. Veuillez reessayer.",
    };
  }

  const clients = new Map<string, ClientDepot>();
  for (const client of [...(parNom.data ?? []), ...(parTelephone.data ?? [])]) {
    clients.set(client.id, client);
  }

  return { erreur: null, clients: [...clients.values()].slice(0, 10) };
}

export async function creerClientDepot(
  formData: FormData,
): Promise<ResultatActionDepot> {
  const contexte = await obtenirContexteEspace();
  const valNom = validerChaine(formData.get("nom"), "Nom du client", 2, 100);
  if (!valNom.valide) return { erreur: valNom.erreur ?? "Nom invalide." };

  const telephone = normaliserTelephone(formData.get("telephone"));
  if (!telephone.valide || !telephone.telephone) {
    return { erreur: telephone.erreur ?? "Numero de telephone invalide." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clients")
    .insert({
      pressing_id: contexte.pressingActif.id,
      nom: valNom.valeur,
      telephone: telephone.telephone,
    })
    .select("id, nom, telephone")
    .single();

  if (error) {
    if (error.code === "23505") {
      return {
        erreur:
          "Ce numero de telephone est deja enregistre pour un client de ce pressing.",
      };
    }
    return { erreur: messageErreurDepot(error) };
  }

  revalidatePath("/clients");
  return { erreur: null, client: data };
}

export async function creerDepot(
  clientId: string,
  dateRetrait: string,
  articles: Array<{ prestation_id: string; quantite: number }>,
  notes: string,
): Promise<ResultatActionDepot> {
  const contexte = await obtenirContexteEspace();

  if (!/^[0-9a-f-]{36}$/i.test(clientId)) {
    return { erreur: "Veuillez selectionner un client valide." };
  }
  if (!Number.isFinite(Date.parse(dateRetrait))) {
    return { erreur: "Veuillez renseigner une date de retrait valide." };
  }
  if (
    !Array.isArray(articles) ||
    articles.length < 1 ||
    articles.length > 50 ||
    articles.some(
      (article) =>
        !article ||
        !/^[0-9a-f-]{36}$/i.test(article.prestation_id) ||
        !Number.isInteger(article.quantite) ||
        article.quantite < 1 ||
        article.quantite > 999,
    )
  ) {
    return { erreur: "Le depot doit contenir entre 1 et 50 lignes valides." };
  }
  if (typeof notes !== "string" || notes.length > 500) {
    return { erreur: "Les notes ne peuvent pas depasser 500 caracteres." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("creer_depot", {
    p_pressing: contexte.pressingActif.id,
    p_client: clientId,
    p_date_retrait: dateRetrait,
    p_articles: articles,
    p_notes: notes.trim() || null,
  });

  if (error) return { erreur: messageErreurDepot(error) };

  const depot = Array.isArray(data) ? data[0] : null;
  if (!depot?.depot_id || !depot.numero_ticket) {
    return {
      erreur:
        "Le depot a ete traite, mais le ticket n'a pas pu etre recupere. Contactez votre administrateur.",
    };
  }

  revalidatePath("/depots");
  revalidatePath("/tableau-de-bord");
  return {
    erreur: null,
    depotId: depot.depot_id,
    numeroTicket: depot.numero_ticket,
  };
}

export async function modifierDateRetraitDepot(
  depotId: string,
  dateRetrait: string,
): Promise<{ erreur: string | null }> {
  await obtenirContexteEspace();
  if (!/^[0-9a-f-]{36}$/i.test(depotId)) {
    return { erreur: "Identifiant de depot invalide." };
  }
  if (!Number.isFinite(Date.parse(dateRetrait))) {
    return { erreur: "Veuillez renseigner une date de retrait valide." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("modifier_date_retrait", {
    p_depot: depotId,
    p_date_retrait: dateRetrait,
  });

  if (error) return { erreur: messageErreurDepot(error) };

  revalidatePath(`/depots/${depotId}`);
  revalidatePath("/depots");
  revalidatePath("/tableau-de-bord");
  return { erreur: null };
}
