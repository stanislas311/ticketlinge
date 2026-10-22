import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import type { Metadata } from "next";
import { obtenirContexteEspace } from "@/lib/espace";
import { createClient } from "@/lib/supabase/server";
import { formaterDateAbidjan } from "@/lib/depots";
import { formaterPrixXOF } from "@/lib/format";

export const metadata: Metadata = {
  title: "Depots - Ticketlinge",
};

const STATUTS = ["depose", "en_lavage", "pret", "livre", "annule"] as const;
type StatutDepot = (typeof STATUTS)[number];

const LIBELLES_STATUTS: Record<StatutDepot, string> = {
  depose: "Depose",
  en_lavage: "En lavage",
  pret: "Pret",
  livre: "Livre",
  annule: "Annule",
};

interface ProprietesDepots {
  searchParams: Promise<{ [cle: string]: string | string[] | undefined }>;
}

interface DepotListe {
  id: string;
  numero_ticket: string;
  statut: StatutDepot;
  date_depot: string;
  date_retrait_prevue: string;
  total_xof: number;
  client: { nom: string; telephone: string } | null;
}

async function ContenuDepots({
  searchParams,
}: {
  searchParams: ProprietesDepots["searchParams"];
}) {
  await connection();
  const contexte = await obtenirContexteEspace();
  const parametres = await searchParams;
  const rechercheBrute = typeof parametres.q === "string" ? parametres.q : "";
  const recherche = rechercheBrute
    .trim()
    .replace(/[^\p{L}\p{N}+ -]/gu, " ")
    .replace(/\s+/g, " ")
    .slice(0, 100);
  const statutBrut = typeof parametres.statut === "string" ? parametres.statut : "";
  const statut = STATUTS.includes(statutBrut as StatutDepot)
    ? (statutBrut as StatutDepot)
    : "";
  const pageBrute = typeof parametres.page === "string" ? Number(parametres.page) : 1;
  const page = Number.isSafeInteger(pageBrute) && pageBrute > 0 ? pageBrute : 1;
  const supabase = await createClient();
  let erreur: string | null = null;
  let identifiantsClients: string[] = [];

  if (recherche) {
    const motif = `%${recherche}%`;
    const [clientsParNom, clientsParTelephone] = await Promise.all([
      supabase
        .from("clients")
        .select("id")
        .eq("pressing_id", contexte.pressingActif.id)
        .ilike("nom", motif)
        .limit(1000),
      supabase
        .from("clients")
        .select("id")
        .eq("pressing_id", contexte.pressingActif.id)
        .ilike("telephone", motif)
        .limit(1000),
    ]);
    if (clientsParNom.error || clientsParTelephone.error) {
      erreur = "Impossible de rechercher les clients associes aux depots.";
    } else {
      identifiantsClients = [
        ...new Set([
          ...(clientsParNom.data ?? []).map((client) => client.id),
          ...(clientsParTelephone.data ?? []).map((client) => client.id),
        ]),
      ];
    }
  }

  const debut = (page - 1) * 50;
  let depots: DepotListe[] = [];
  let total = 0;
  if (!erreur) {
    let compteQuery = supabase
      .from("depots")
      .select("id", { count: "exact", head: true })
      .eq("pressing_id", contexte.pressingActif.id);
    let depotsQuery = supabase
      .from("depots")
      .select(
        "id, numero_ticket, statut, date_depot, date_retrait_prevue, total_xof, client:clients!depots_client_fkey(nom, telephone)",
      )
      .eq("pressing_id", contexte.pressingActif.id)
      .order("date_depot", { ascending: false })
      .range(debut, debut + 49);

    if (statut) {
      compteQuery = compteQuery.eq("statut", statut);
      depotsQuery = depotsQuery.eq("statut", statut);
    }
    if (recherche) {
      const filtreRecherche =
        identifiantsClients.length > 0
          ? `numero_ticket.ilike.%${recherche}%,client_id.in.(${identifiantsClients.join(",")})`
          : `numero_ticket.ilike.%${recherche}%`;
      compteQuery = compteQuery.or(filtreRecherche);
      depotsQuery = depotsQuery.or(filtreRecherche);
    }

    const [compte, resultats] = await Promise.all([
      compteQuery,
      depotsQuery,
    ]);
    if (compte.error || resultats.error) {
      erreur =
        "La liste des depots n'est pas disponible. Verifiez que la migration des depots a ete appliquee.";
    } else {
      total = compte.count ?? 0;
      depots = (resultats.data ?? []) as unknown as DepotListe[];
    }
  }

  const pages = Math.max(1, Math.ceil(total / 50));
  const pageCourante = Math.min(page, pages);
  const urlPage = (numero: number) => {
    const query = new URLSearchParams();
    if (recherche) query.set("q", recherche);
    if (statut) query.set("statut", statut);
    if (numero > 1) query.set("page", String(numero));
    return `/depots${query.size ? `?${query.toString()}` : ""}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">Depots</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Tickets et retraits prevus pour {contexte.pressingActif.nom}.
            {!erreur && <span className="ml-1 text-zinc-500">({total})</span>}
          </p>
        </div>
        <Link
          href="/depots/nouveau"
          className="inline-flex items-center justify-center rounded-md bg-[#0E5A6B] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0a4553] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0E5A6B]"
        >
          Nouveau depot
        </Link>
      </div>

      <form action="/depots" method="get" className="grid gap-3 rounded-lg border border-zinc-200 bg-white p-4 sm:grid-cols-[1fr_14rem_auto] sm:items-end">
        <div>
          <label htmlFor="recherche-depot" className="block text-xs font-medium text-zinc-700">Ticket, nom ou telephone</label>
          <input
            id="recherche-depot"
            name="q"
            type="search"
            defaultValue={rechercheBrute}
            placeholder="Rechercher..."
            className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label htmlFor="filtre-statut-depot" className="block text-xs font-medium text-zinc-700">Statut</label>
          <select
            id="filtre-statut-depot"
            name="statut"
            defaultValue={statut}
            className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
          >
            <option value="">Tous les statuts</option>
            {STATUTS.map((valeur) => (
              <option key={valeur} value={valeur}>{LIBELLES_STATUTS[valeur]}</option>
            ))}
          </select>
        </div>
        <button type="submit" className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50">
          Filtrer
        </button>
      </form>

      {erreur ? (
        <div role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
          {erreur}
        </div>
      ) : depots.length === 0 ? (
        <div className="rounded-lg border border-zinc-200 bg-white p-8 text-center">
          <h2 className="text-base font-semibold text-zinc-900">Aucun depot trouve</h2>
          <p className="mt-2 text-sm text-zinc-600">
            {recherche || statut
              ? "Essayez de modifier vos criteres de recherche."
              : "Les nouveaux depots et leurs tickets apparaitront ici."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {depots.map((depot) => (
            <Link
              key={depot.id}
              href={`/depots/${depot.id}`}
              className="block rounded-lg border border-zinc-200 bg-white p-4 shadow-xs transition hover:border-[#0E5A6B] focus-visible:outline-2 focus-visible:outline-[#0E5A6B]"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-zinc-900">{depot.numero_ticket}</p>
                  <p className="mt-1 text-sm text-zinc-700">{depot.client?.nom ?? "Client indisponible"}</p>
                  <p className="text-xs text-zinc-500">{depot.client?.telephone}</p>
                </div>
                <span className="rounded-full bg-[#0E5A6B]/10 px-2.5 py-1 text-xs font-medium text-[#0E5A6B]">
                  {LIBELLES_STATUTS[depot.statut]}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 border-t border-zinc-100 pt-3 text-xs sm:grid-cols-3">
                <p><span className="text-zinc-500">Depose le :</span><br />{formaterDateAbidjan(depot.date_depot)}</p>
                <p><span className="text-zinc-500">Retrait prevu :</span><br />{formaterDateAbidjan(depot.date_retrait_prevue)}</p>
                <p className="col-span-2 font-semibold text-zinc-900 sm:col-span-1">{formaterPrixXOF(depot.total_xof)}</p>
              </div>
            </Link>
          ))}
        </div>
      )}

      {!erreur && pages > 1 && (
        <nav aria-label="Pagination des depots" className="flex items-center justify-center gap-3">
          {pageCourante > 1 ? (
            <Link href={urlPage(pageCourante - 1)} className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-700">Precedent</Link>
          ) : <span className="rounded-md border border-zinc-200 px-3 py-2 text-sm text-zinc-400">Precedent</span>}
          <span className="text-sm text-zinc-600">Page {pageCourante} sur {pages}</span>
          {pageCourante < pages ? (
            <Link href={urlPage(pageCourante + 1)} className="rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-700">Suivant</Link>
          ) : <span className="rounded-md border border-zinc-200 px-3 py-2 text-sm text-zinc-400">Suivant</span>}
        </nav>
      )}
    </div>
  );
}

function SqueletteDepots() {
  return <div className="space-y-4"><div className="h-8 w-40 animate-pulse rounded bg-zinc-200" /><div className="h-20 animate-pulse rounded bg-zinc-100" /><div className="h-44 animate-pulse rounded bg-zinc-100" /></div>;
}

export default function PageDepots({ searchParams }: ProprietesDepots) {
  return (
    <Suspense fallback={<SqueletteDepots />}>
      <ContenuDepots searchParams={searchParams} />
    </Suspense>
  );
}
