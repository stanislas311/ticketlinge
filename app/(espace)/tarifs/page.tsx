import { Suspense } from "react";
import { connection } from "next/server";
import type { Metadata } from "next";
import { obtenirContexteEspace } from "@/lib/espace";
import { createClient } from "@/lib/supabase/server";
import { TarifsClient } from "./tarifs-client";

export const metadata: Metadata = {
  title: "Tarifs - Ticketlinge",
};

async function ContenuTarifs() {
  await connection();
  const contexte = await obtenirContexteEspace();
  const supabase = await createClient();

  const { data: prestations } = await supabase
    .from("prestations")
    .select("id, article, service, prix_xof, actif")
    .eq("pressing_id", contexte.pressingActif.id)
    .order("article")
    .order("service");

  const peutEditer = contexte.roleActif !== "receptionniste";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
            Catalogue des tarifs
          </h1>
          <p className="mt-1 text-sm text-zinc-600">
            Prestations du pressing{" "}
            <span className="font-semibold text-zinc-900">
              {contexte.pressingActif.nom}
            </span>
            .
          </p>
        </div>
      </div>

      <TarifsClient
        prestations={prestations ?? []}
        peutEditer={peutEditer}
        afficherInactives={false}
      />
    </div>
  );
}

function SqueletteContenu() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-56 animate-pulse rounded-md bg-zinc-200" />
      <div className="h-40 animate-pulse rounded-md bg-zinc-100" />
      <div className="h-64 animate-pulse rounded-md bg-zinc-100" />
    </div>
  );
}

export default function PageTarifs() {
  return (
    <Suspense fallback={<SqueletteContenu />}>
      <ContenuTarifs />
    </Suspense>
  );
}
