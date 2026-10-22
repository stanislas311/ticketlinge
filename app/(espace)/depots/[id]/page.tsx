import { Suspense } from "react";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { obtenirContexteEspace } from "@/lib/espace";
import { createClient } from "@/lib/supabase/server";
import { dateAbidjanVersValeurSaisie } from "@/lib/depots";
import { TicketDepot } from "./ticket-depot";

export const metadata: Metadata = {
  title: "Ticket de depot - Ticketlinge",
};

interface ProprietesTicket {
  params: Promise<{ id: string }>;
}

type StatutDepot = "depose" | "en_lavage" | "pret" | "livre" | "annule";

const LIBELLES_STATUTS: Record<StatutDepot, string> = {
  depose: "Depose",
  en_lavage: "En lavage",
  pret: "Pret",
  livre: "Livre",
  annule: "Annule",
};

interface DepotArticle {
  id: string;
  article: string;
  service: string;
  prix_unitaire_xof: number;
  quantite: number;
}

interface DepotHistorique {
  id: string;
  ancien_statut: StatutDepot | null;
  nouveau_statut: StatutDepot;
  par: string;
  le: string;
}

async function ContenuTicket({ params }: { params: ProprietesTicket["params"] }) {
  await connection();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const contexte = await obtenirContexteEspace();
  const supabase = await createClient();
  const { data: depot, error: erreurDepot } = await supabase
    .from("depots")
    .select(
      "id, numero_ticket, statut, date_depot, date_retrait_prevue, total_xof, notes, client:clients!depots_client_fkey(nom, telephone)",
    )
    .eq("id", id)
    .eq("pressing_id", contexte.pressingActif.id)
    .maybeSingle();

  if (erreurDepot) {
    const migrationAbsente =
      ["PGRST202", "PGRST205", "42883", "42P01"].includes(erreurDepot.code ?? "") ||
      erreurDepot.message.includes("schema cache");
    return (
      <div role="alert" className="mx-auto max-w-2xl rounded-lg border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
        {migrationAbsente
          ? "Les tickets ne sont pas encore disponibles. La migration SQL des depots doit etre appliquee."
          : "Impossible de charger ce ticket pour le moment. Veuillez reessayer."}
      </div>
    );
  }
  if (!depot) notFound();

  const [articlesResultat, historiqueResultat] = await Promise.all([
    supabase
      .from("depot_articles")
      .select("id, article, service, prix_unitaire_xof, quantite")
      .eq("depot_id", id)
      .eq("pressing_id", contexte.pressingActif.id)
      .order("article"),
    supabase
      .from("depot_historique")
      .select("id, ancien_statut, nouveau_statut, par, le")
      .eq("depot_id", id)
      .eq("pressing_id", contexte.pressingActif.id)
      .order("le"),
  ]);

  if (articlesResultat.error || historiqueResultat.error) {
    return (
      <div role="alert" className="mx-auto max-w-2xl rounded-lg border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
        La migration SQL des depots doit etre appliquee ou les informations du ticket sont temporairement indisponibles.
      </div>
    );
  }

  const client = depot.client as unknown as { nom: string; telephone: string } | null;
  return (
    <TicketDepot
      depot={{
        id: depot.id,
        numero_ticket: depot.numero_ticket,
        statut: depot.statut as StatutDepot,
        date_depot: depot.date_depot,
        date_retrait_prevue: depot.date_retrait_prevue,
        date_retrait_locale: dateAbidjanVersValeurSaisie(new Date(depot.date_retrait_prevue)),
        total_xof: depot.total_xof,
        notes: depot.notes,
        client: client ?? { nom: "Client indisponible", telephone: "" },
      }}
      articles={(articlesResultat.data ?? []) as DepotArticle[]}
      historique={(historiqueResultat.data ?? []) as DepotHistorique[]}
      nomPressing={contexte.pressingActif.nom}
      libellesStatuts={LIBELLES_STATUTS}
    />
  );
}

function SqueletteTicket() {
  return <div className="mx-auto h-96 max-w-2xl animate-pulse rounded-lg bg-zinc-100" />;
}

export default function PageTicketDepot({ params }: ProprietesTicket) {
  return (
    <Suspense fallback={<SqueletteTicket />}>
      <ContenuTicket params={params} />
    </Suspense>
  );
}
