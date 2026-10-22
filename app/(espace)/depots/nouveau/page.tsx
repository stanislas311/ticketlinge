import { Suspense } from "react";
import { connection } from "next/server";
import type { Metadata } from "next";
import { obtenirContexteEspace } from "@/lib/espace";
import { createClient } from "@/lib/supabase/server";
import { dateAbidjanVersValeurSaisie, dateRetraitParDefaut } from "@/lib/depots";
import { FormulaireDepot } from "./formulaire-depot";

export const metadata: Metadata = {
  title: "Nouveau depot - Ticketlinge",
};

async function ContenuNouveauDepot() {
  await connection();
  const contexte = await obtenirContexteEspace();
  const dateRetraitInitiale = dateAbidjanVersValeurSaisie(
    dateRetraitParDefaut(new Date()),
  );
  const supabase = await createClient();
  const [clientsResultat, prestationsResultat] = await Promise.all([
    supabase
      .from("clients")
      .select("id, nom, telephone")
      .eq("pressing_id", contexte.pressingActif.id)
      .eq("actif", true)
      .order("nom")
      .limit(20),
    supabase
      .from("prestations")
      .select("id, article, service, prix_xof")
      .eq("pressing_id", contexte.pressingActif.id)
      .eq("actif", true)
      .order("article")
      .order("service"),
  ]);

  const erreurCatalogue =
    clientsResultat.error || prestationsResultat.error
      ? "Impossible de charger les clients ou le catalogue. Veuillez actualiser la page."
      : null;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
          Nouveau depot
        </h1>
        <p className="mt-1 text-sm text-zinc-600">
          Enregistrer des articles pour {contexte.pressingActif.nom}.
        </p>
      </div>
      <FormulaireDepot
        clients={clientsResultat.data ?? []}
        prestations={prestationsResultat.data ?? []}
        erreurCatalogue={erreurCatalogue}
        dateRetraitInitiale={dateRetraitInitiale}
      />
    </div>
  );
}

function SqueletteDepot() {
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="h-8 w-48 animate-pulse rounded-md bg-zinc-200" />
      <div className="h-56 animate-pulse rounded-lg bg-zinc-100" />
      <div className="h-64 animate-pulse rounded-lg bg-zinc-100" />
    </div>
  );
}

export default function PageNouveauDepot() {
  return (
    <Suspense fallback={<SqueletteDepot />}>
      <ContenuNouveauDepot />
    </Suspense>
  );
}
