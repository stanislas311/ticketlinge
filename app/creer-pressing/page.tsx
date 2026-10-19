"use client";

import { useActionState } from "react";
import Link from "next/link";
import { creerPressing, type EtatPressing } from "@/lib/actions/pressing";

const etatInitial: EtatPressing = {
  erreur: null,
};

export default function PageCreerPressing() {
  const [etat, action, enCours] = useActionState(creerPressing, etatInitial);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12 sm:px-6">
      <div className="w-full max-w-lg">
        {/* En-tete */}
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
            Configurer votre pressing
          </h1>
          <p className="mt-2 text-sm text-zinc-600">
            Renseignez les informations de votre etablissement pour demarrer.
          </p>
        </div>

        {/* Formulaire */}
        <div className="mt-8 rounded-lg border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
          <form action={action} className="space-y-5" noValidate>
            {etat.erreur && (
              <div
                role="alert"
                className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800"
              >
                {etat.erreur}
              </div>
            )}

            <div>
              <label
                htmlFor="nom"
                className="block text-sm font-medium text-zinc-700"
              >
                Nom du pressing <span className="text-red-500">*</span>
              </label>
              <input
                id="nom"
                name="nom"
                type="text"
                required
                minLength={2}
                maxLength={100}
                className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 shadow-sm transition placeholder:text-zinc-400 focus:border-[#0E5A6B] focus:outline-none focus:ring-1 focus:ring-[#0E5A6B]"
                placeholder="Ex : Pressing de l&apos;Avenir"
              />
              <p className="mt-1 text-xs text-zinc-500">
                De 2 a 100 caracteres.
              </p>
            </div>

            <div>
              <label
                htmlFor="ville"
                className="block text-sm font-medium text-zinc-700"
              >
                Ville <span className="text-red-500">*</span>
              </label>
              <input
                id="ville"
                name="ville"
                type="text"
                required
                minLength={2}
                maxLength={100}
                className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 shadow-sm transition placeholder:text-zinc-400 focus:border-[#0E5A6B] focus:outline-none focus:ring-1 focus:ring-[#0E5A6B]"
                placeholder="Ex : Abidjan"
              />
              <p className="mt-1 text-xs text-zinc-500">
                De 2 a 100 caracteres.
              </p>
            </div>

            <div>
              <label
                htmlFor="telephone"
                className="block text-sm font-medium text-zinc-700"
              >
                Telephone{" "}
                <span className="text-xs font-normal text-zinc-500">
                  (facultatif)
                </span>
              </label>
              <input
                id="telephone"
                name="telephone"
                type="tel"
                className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 shadow-sm transition placeholder:text-zinc-400 focus:border-[#0E5A6B] focus:outline-none focus:ring-1 focus:ring-[#0E5A6B]"
                placeholder="Ex : 0701020304 ou +225 0701020304"
              />
              <p className="mt-1 text-xs text-zinc-500">
                Format ivoirien (10 chiffres) ou international avec indicatif
                +225.
              </p>
            </div>

            <button
              type="submit"
              disabled={enCours}
              className="flex w-full items-center justify-center rounded-md bg-[#0E5A6B] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0a4553] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0E5A6B] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {enCours ? "Creation de votre espace..." : "Creer mon pressing"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
