"use client";

import { useActionState } from "react";
import Link from "next/link";
import { connexion, type EtatAuth } from "@/lib/actions/auth";

const etatInitial: EtatAuth = {
  erreur: null,
  message: null,
};

interface ProprietesFormulaireConnexion {
  suivant?: string;
  messageInitial?: string;
}

export function FormulaireConnexion({
  suivant,
  messageInitial,
}: ProprietesFormulaireConnexion) {
  const [etat, action, enCours] = useActionState(connexion, etatInitial);

  const erreurAffichee = etat.erreur || messageInitial;

  return (
    <form action={action} className="space-y-5" noValidate>
      {suivant && <input type="hidden" name="suivant" value={suivant} />}

      {erreurAffichee && (
        <div
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800"
        >
          {erreurAffichee}
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
          autoComplete="current-password"
          required
          className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 shadow-sm transition placeholder:text-zinc-400 focus:border-[#0E5A6B] focus:outline-none focus:ring-1 focus:ring-[#0E5A6B]"
        />
      </div>

      <button
        type="submit"
        disabled={enCours}
        className="flex w-full items-center justify-center rounded-md bg-[#0E5A6B] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0a4553] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0E5A6B] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {enCours ? "Connexion en cours..." : "Se connecter"}
      </button>

      <div className="border-t border-zinc-200 pt-5 text-center text-sm text-zinc-600">
        Pas encore d&apos;espace ?{" "}
        <Link
          href="/inscription"
          className="font-medium text-[#0E5A6B] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0E5A6B]"
        >
          Creer mon compte
        </Link>
      </div>
    </form>
  );
}
