import { Suspense } from "react";
import { connection } from "next/server";
import type { Metadata } from "next";
import { obtenirContexteEspace } from "@/lib/espace";
import { createClient } from "@/lib/supabase/server";
import { ClientsClient } from "./clients-client";

export const metadata: Metadata = {
  title: "Clients - Ticketlinge",
};

const CLIENTS_PAR_PAGE = 50;

async function ContenuClients({
  searchParams,
}: {
  searchParams: Promise<{ [cle: string]: string | string[] | undefined }>;
}) {
  await connection();
  const contexte = await obtenirContexteEspace();
  const parametres = await searchParams;

  const recherche =
    typeof parametres.q === "string" ? parametres.q.trim() : "";
  const pageParam =
    typeof parametres.page === "string" ? parseInt(parametres.page, 10) : 1;
  const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;

  const supabase = await createClient();

  // Compter le total pour la pagination
  let countQuery = supabase
    .from("clients")
    .select("id", { count: "exact", head: true })
    .eq("pressing_id", contexte.pressingActif.id);

  if (recherche) {
    countQuery = countQuery.or(
      `nom.ilike.%${recherche}%,telephone.ilike.%${recherche}%`,
    );
  }

  const { count } = await countQuery;
  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / CLIENTS_PAR_PAGE));
  const pageCorrigee = Math.min(page, totalPages);
  const offset = (pageCorrigee - 1) * CLIENTS_PAR_PAGE;

  // Requete paginee
  let dataQuery = supabase
    .from("clients")
    .select("id, nom, telephone, actif")
    .eq("pressing_id", contexte.pressingActif.id)
    .order("nom")
    .range(offset, offset + CLIENTS_PAR_PAGE - 1);

  if (recherche) {
    dataQuery = dataQuery.or(
      `nom.ilike.%${recherche}%,telephone.ilike.%${recherche}%`,
    );
  }

  const { data: clients } = await dataQuery;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
            Fichier clients
          </h1>
          <p className="mt-1 text-sm text-zinc-600">
            Clients du pressing{" "}
            <span className="font-semibold text-zinc-900">
              {contexte.pressingActif.nom}
            </span>
            .
            {total > 0 && (
              <span className="ml-1 text-zinc-500">
                ({total} client{total > 1 ? "s" : ""})
              </span>
            )}
          </p>
        </div>
      </div>

      <ClientsClient
        clients={clients ?? []}
        recherche={recherche}
        page={pageCorrigee}
        totalPages={totalPages}
      />
    </div>
  );
}

function SqueletteContenu() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-48 animate-pulse rounded-md bg-zinc-200" />
      <div className="h-24 animate-pulse rounded-md bg-zinc-100" />
      <div className="h-10 w-64 animate-pulse rounded-md bg-zinc-100" />
      <div className="h-64 animate-pulse rounded-md bg-zinc-100" />
    </div>
  );
}

interface ProprietesPageClients {
  searchParams: Promise<{ [cle: string]: string | string[] | undefined }>;
}

export default function PageClients({ searchParams }: ProprietesPageClients) {
  return (
    <Suspense fallback={<SqueletteContenu />}>
      <ContenuClients searchParams={searchParams} />
    </Suspense>
  );
}
