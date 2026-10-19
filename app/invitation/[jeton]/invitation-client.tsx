"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { accepterInvitationAction } from "@/lib/actions/equipe";

interface InvitationClientProps {
  jeton: string;
  estConnecte: boolean;
  emailConnecte?: string;
}

export function InvitationClient({
  jeton,
  estConnecte,
  emailConnecte,
}: InvitationClientProps) {
  const router = useRouter();
  const [enTransition, startTransition] = useTransition();
  const [erreur, setErreur] = useState<string | null>(null);

  const cheminRetour = `/invitation/${encodeURIComponent(jeton)}`;
  const lienConnexion = `/connexion?suivant=${encodeURIComponent(cheminRetour)}`;
  const lienInscription = `/inscription?suivant=${encodeURIComponent(cheminRetour)}`;

  function handleRejoindre() {
    setErreur(null);
    startTransition(async () => {
      const res = await accepterInvitationAction(jeton);
      if (res.erreur) {
        setErreur(res.erreur);
      } else {
        router.push("/tableau-de-bord");
      }
    });
  }

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
      {erreur && (
        <div
          role="alert"
          className="mb-6 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          {erreur}
        </div>
      )}

      {!estConnecte ? (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900">
              Invitation a rejoindre une equipe
            </h2>
            <p className="mt-2 text-sm text-zinc-600">
              Vous avez ete invite a collaborer sur un pressing Ticketlinge. Pour accepter cette invitation, veuillez vous connecter a votre compte ou en creer un nouveau.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <Link
              href={lienConnexion}
              className="flex w-full items-center justify-center rounded-md bg-[#0E5A6B] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0a4553] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0E5A6B]"
            >
              Se connecter pour accepter
            </Link>
            <Link
              href={lienInscription}
              className="flex w-full items-center justify-center rounded-md border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 shadow-sm transition hover:bg-zinc-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0E5A6B]"
            >
              Creer un compte
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900">
              Rejoindre l&apos;equipe
            </h2>
            <p className="mt-1 text-xs text-zinc-500">
              Connecte en tant que{" "}
              <span className="font-semibold text-zinc-800">{emailConnecte}</span>
            </p>
            <p className="mt-3 text-sm text-zinc-600">
              En cliquant sur le bouton ci-dessous, vous rejoindrez l&apos;etablissement avec le role prevu par l&apos;invitation et cet espace deviendra votre pressing actif.
            </p>
          </div>

          <button
            type="button"
            onClick={handleRejoindre}
            disabled={enTransition}
            className="flex w-full items-center justify-center rounded-md bg-[#0E5A6B] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0a4553] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0E5A6B] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {enTransition ? "Traitement de l'invitation..." : "Rejoindre l'equipe"}
          </button>
        </div>
      )}
    </div>
  );
}
