import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import type { Metadata } from "next";
import { validerCheminRetour } from "@/lib/invitation";
import { FormulaireConnexion } from "./formulaire-connexion";

export const metadata: Metadata = {
  title: "Connexion - Ticketlinge",
};

interface ProprietesPageConnexion {
  searchParams: Promise<{ [cle: string]: string | string[] | undefined }>;
}

async function ContenuFormulaireConnexion({
  searchParams,
}: {
  searchParams: Promise<{ [cle: string]: string | string[] | undefined }>;
}) {
  await connection();
  const parametres = await searchParams;
  const suivant = validerCheminRetour(parametres.suivant) ?? undefined;
  const erreurCode =
    typeof parametres.erreur === "string" ? parametres.erreur : undefined;

  let messageInitial: string | undefined;
  if (
    erreurCode === "confirmation_invalide" ||
    erreurCode === "confirmation_echouee"
  ) {
    messageInitial =
      "Le lien de confirmation est invalide ou a expire. Veuillez vous connecter ou verifier votre lien.";
  }

  return (
    <FormulaireConnexion
      suivant={suivant}
      messageInitial={messageInitial}
    />
  );
}

export default function PageConnexion({
  searchParams,
}: ProprietesPageConnexion) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12 sm:px-6">
      <div className="w-full max-w-md">
        <div className="text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xl font-bold tracking-tight text-[#0E5A6B] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0E5A6B]"
          >
            <svg
              className="h-6 w-6 text-[#0E5A6B]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect width="18" height="18" x="3" y="3" rx="2" />
              <path d="M7 7h10" />
              <path d="M7 12h10" />
              <path d="M7 17h6" />
            </svg>
            Ticketlinge
          </Link>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-zinc-900">
            Connexion a votre espace
          </h1>
          <p className="mt-2 text-sm text-zinc-600">
            Saisissez vos identifiants pour acceder a votre pressing.
          </p>
        </div>

        <div className="mt-8 rounded-lg border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
          <Suspense fallback={<FormulaireConnexion />}>
            <ContenuFormulaireConnexion searchParams={searchParams} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
