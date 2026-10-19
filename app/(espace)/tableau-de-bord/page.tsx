import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import type { Metadata } from "next";
import { obtenirContexteEspace, libelleRole } from "@/lib/espace";

export const metadata: Metadata = {
  title: "Tableau de bord - Ticketlinge",
};

async function ContenuTableauDeBord() {
  await connection();
  const contexte = await obtenirContexteEspace();
  const { pressingActif, roleActif, adhesions } = contexte;

  return (
    <div className="space-y-8">
      {/* En-tete */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
            Tableau de bord
          </h1>
          <p className="mt-1 text-sm text-zinc-600">
            Bienvenue dans l&apos;espace de gestion de{" "}
            <span className="font-semibold text-zinc-900">
              {pressingActif.nom}
            </span>
            .
          </p>
        </div>

        {adhesions.length < 3 && roleActif === "proprietaire" && (
          <div>
            <Link
              href="/creer-pressing"
              className="inline-flex items-center gap-1.5 rounded-md bg-[#0E5A6B] px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-[#0a4553] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0E5A6B]"
            >
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Nouveau pressing
            </Link>
          </div>
        )}
      </div>

      {/* Fiche pressing actif */}
      <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-xs">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-zinc-900">
                {pressingActif.nom}
              </h2>
              <span className="inline-flex rounded-full bg-[#0E5A6B]/10 px-2.5 py-0.5 text-xs font-medium text-[#0E5A6B]">
                {libelleRole(roleActif)}
              </span>
            </div>
            <p className="mt-1 text-sm text-zinc-600">{pressingActif.ville}</p>
            {pressingActif.telephone && (
              <p className="mt-1 text-xs text-zinc-500">
                Telephone : {pressingActif.telephone}
              </p>
            )}
          </div>

          <div className="rounded-md border border-zinc-100 bg-zinc-50 px-4 py-3 text-right">
            <p className="text-xs text-zinc-500">Formule active</p>
            <p className="text-sm font-bold text-zinc-800 capitalize">
              Plan {pressingActif.plan}
            </p>
          </div>
        </div>
      </div>

      {/* Raccourcis d'acces rapide */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <Link
          href="/clients"
          className="group rounded-lg border border-zinc-200 bg-white p-6 shadow-xs transition hover:border-[#0E5A6B] hover:shadow-sm"
        >
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[#0E5A6B]/10 text-[#0E5A6B] transition group-hover:bg-[#0E5A6B] group-hover:text-white">
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <span className="text-xs font-semibold text-[#0E5A6B]">
              Acceder &rarr;
            </span>
          </div>
          <h3 className="mt-4 text-base font-semibold text-zinc-900">
            Fichier Clients
          </h3>
          <p className="mt-1 text-sm text-zinc-600">
            Recherchez vos clients, ajoutez de nouvelles fiches et modifiez leurs
            coordonnees.
          </p>
        </Link>

        <Link
          href="/tarifs"
          className="group rounded-lg border border-zinc-200 bg-white p-6 shadow-xs transition hover:border-[#0E5A6B] hover:shadow-sm"
        >
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[#0E5A6B]/10 text-[#0E5A6B] transition group-hover:bg-[#0E5A6B] group-hover:text-white">
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                <line x1="7" y1="7" x2="7.01" y2="7" />
              </svg>
            </div>
            <span className="text-xs font-semibold text-[#0E5A6B]">
              Acceder &rarr;
            </span>
          </div>
          <h3 className="mt-4 text-base font-semibold text-zinc-900">
            Catalogue des Tarifs
          </h3>
          <p className="mt-1 text-sm text-zinc-600">
            Consultez la grille des prestations, ajustez les prix et gerez les
            services actifs.
          </p>
        </Link>
      </div>
    </div>
  );
}

function SqueletteContenu() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-48 animate-pulse rounded-md bg-zinc-200" />
      <div className="h-32 animate-pulse rounded-md bg-zinc-100" />
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="h-40 animate-pulse rounded-md bg-zinc-100" />
        <div className="h-40 animate-pulse rounded-md bg-zinc-100" />
      </div>
    </div>
  );
}

export default function PageTableauDeBord() {
  return (
    <Suspense fallback={<SqueletteContenu />}>
      <ContenuTableauDeBord />
    </Suspense>
  );
}
