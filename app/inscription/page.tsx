"use client";

import { useActionState } from "react";
import Link from "next/link";
import { inscription, type EtatAuth } from "@/lib/actions/auth";

const etatInitial: EtatAuth = {
  erreur: null,
  message: null,
};

export default function PageInscription() {
  const [etat, action, enCours] = useActionState(inscription, etatInitial);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12 sm:px-6">
      <div className="w-full max-w-md">
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
            Creer un compte
          </h1>
          <p className="mt-2 text-sm text-zinc-600">
            Inscrivez-vous pour configurer votre premier pressing.
          </p>
        </div>

        {/* Message de confirmation par email */}
        {etat.message ? (
          <div
            role="status"
            className="mt-8 rounded-md border border-[#0E5A6B]/20 bg-[#0E5A6B]/5 p-5 text-sm text-[#0E5A6B]"
          >
            <div className="flex items-start gap-3">
              <svg
                className="mt-0.5 h-5 w-5 shrink-0"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
              <div>
                <p className="font-semibold">Vérification d&apos;e-mail envoyée</p>
                <p className="mt-1 leading-relaxed text-zinc-700">{etat.message}</p>
                <p className="mt-3">
                  <Link
                    href="/connexion"
                    className="font-medium underline hover:text-[#0a4553]"
                  >
                    Retourner a la page de connexion
                  </Link>
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* Formulaire */
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
                  htmlFor="email"
                  className="block text-sm font-medium text-zinc-700"
                >
                  Adresse e-mail
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 shadow-sm transition placeholder:text-zinc-400 focus:border-[#0E5A6B] focus:outline-none focus:ring-1 focus:ring-[#0E5A6B]"
                  placeholder="nom@exemple.com"
                />
              </div>

              <div>
                <label
                  htmlFor="mot_de_passe"
                  className="block text-sm font-medium text-zinc-700"
                >
                  Mot de passe
                </label>
                <input
                  id="mot_de_passe"
                  name="mot_de_passe"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={10}
                  className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 shadow-sm transition placeholder:text-zinc-400 focus:border-[#0E5A6B] focus:outline-none focus:ring-1 focus:ring-[#0E5A6B]"
                />
                <p className="mt-1 text-xs text-zinc-500">
                  10 caracteres minimum.
                </p>
              </div>

              <div>
                <label
                  htmlFor="confirmation"
                  className="block text-sm font-medium text-zinc-700"
                >
                  Confirmation du mot de passe
                </label>
                <input
                  id="confirmation"
                  name="confirmation"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={10}
                  className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 shadow-sm transition placeholder:text-zinc-400 focus:border-[#0E5A6B] focus:outline-none focus:ring-1 focus:ring-[#0E5A6B]"
                />
              </div>

              <button
                type="submit"
                disabled={enCours}
                className="flex w-full items-center justify-center rounded-md bg-[#0E5A6B] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0a4553] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0E5A6B] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {enCours ? "Creation du compte..." : "Creer mon compte"}
              </button>
            </form>

            <div className="mt-6 border-t border-zinc-200 pt-6 text-center text-sm text-zinc-600">
              Vous avez deja un compte ?{" "}
              <Link
                href="/connexion"
                className="font-medium text-[#0E5A6B] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0E5A6B]"
              >
                Se connecter
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
