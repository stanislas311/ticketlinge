"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { deconnexion } from "@/lib/actions/auth";
import { changerPressingActif } from "@/lib/actions/pressing";
import { libelleRole, type ContexteEspace } from "@/lib/espace-types";

interface NavigationProps {
  contexte: ContexteEspace;
}

export function Navigation({ contexte }: NavigationProps) {
  const pathname = usePathname();
  const [menuMobileOuvert, setMenuMobileOuvert] = useState(false);
  const [enTransition, startTransition] = useTransition();

  const { pressingActif, roleActif, adhesions, utilisateur } = contexte;

  const liens = [
    {
      href: "/tableau-de-bord",
      label: "Tableau de bord",
      icon: (
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
          <rect width="7" height="9" x="3" y="3" rx="1" />
          <rect width="7" height="5" x="14" y="3" rx="1" />
          <rect width="7" height="9" x="14" y="12" rx="1" />
          <rect width="7" height="5" x="3" y="16" rx="1" />
        </svg>
      ),
    },
    {
      href: "/clients",
      label: "Clients",
      icon: (
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
      ),
    },
    {
      href: "/tarifs",
      label: "Tarifs",
      icon: (
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
      ),
    },
  ];

  function handleChangementPressing(nouveauId: string) {
    startTransition(async () => {
      await changerPressingActif(nouveauId);
    });
  }

  const contenuMenu = (
    <div className="flex h-full flex-col justify-between">
      <div className="space-y-6">
        {/* Identité du pressing et sélecteur */}
        <div className="rounded-lg border border-zinc-200 bg-white p-3.5 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Pressing actif
          </p>

          {adhesions.length > 1 ? (
            <div className="mt-2">
              <label htmlFor="select-pressing" className="sr-only">
                Changer de pressing
              </label>
              <select
                id="select-pressing"
                value={pressingActif.id}
                disabled={enTransition}
                onChange={(e) => handleChangementPressing(e.target.value)}
                className="block w-full rounded-md border border-zinc-300 bg-zinc-50 px-2.5 py-1.5 text-sm font-semibold text-zinc-900 focus:border-[#0E5A6B] focus:outline-hidden focus:ring-1 focus:ring-[#0E5A6B]"
              >
                {adhesions.map((a) => (
                  <option key={a.pressing.id} value={a.pressing.id}>
                    {a.pressing.nom} ({a.pressing.ville})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="mt-1">
              <p className="text-sm font-bold text-zinc-900">
                {pressingActif.nom}
              </p>
              <p className="text-xs text-zinc-500">{pressingActif.ville}</p>
            </div>
          )}

          <div className="mt-2.5 flex items-center justify-between border-t border-zinc-100 pt-2 text-xs">
            <span className="text-zinc-500">Votre rôle :</span>
            <span className="inline-flex rounded-full bg-[#0E5A6B]/10 px-2 py-0.5 font-medium text-[#0E5A6B]">
              {libelleRole(roleActif)}
            </span>
          </div>
        </div>

        {/* Liens de navigation */}
        <nav aria-label="Navigation principale" className="space-y-1">
          {liens.map((lien) => {
            const estActif =
              pathname === lien.href ||
              (lien.href !== "/tableau-de-bord" &&
                pathname.startsWith(lien.href));

            return (
              <Link
                key={lien.href}
                href={lien.href}
                onClick={() => setMenuMobileOuvert(false)}
                aria-current={estActif ? "page" : undefined}
                className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition ${
                  estActif
                    ? "bg-[#0E5A6B] text-white shadow-xs"
                    : "text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900"
                } focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0E5A6B]`}
              >
                {lien.icon}
                <span>{lien.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Profil utilisateur et déconnexion */}
      <div className="border-t border-zinc-200 pt-4">
        <div className="mb-3">
          <p className="text-xs font-medium text-zinc-500">Connecté en tant que</p>
          <p className="truncate text-xs font-semibold text-zinc-800">
            {utilisateur.email}
          </p>
        </div>
        <form action={deconnexion}>
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-md border border-zinc-300 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 shadow-xs transition hover:bg-zinc-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0E5A6B]"
          >
            <svg
              className="h-4 w-4 text-zinc-500"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Se déconnecter
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <>
      {/* Barre supérieure mobile */}
      <div className="flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-3 md:hidden">
        <Link
          href="/tableau-de-bord"
          className="flex items-center gap-2 text-lg font-bold tracking-tight text-[#0E5A6B]"
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
        <button
          type="button"
          onClick={() => setMenuMobileOuvert(!menuMobileOuvert)}
          aria-expanded={menuMobileOuvert}
          aria-label="Basculer le menu de navigation"
          className="rounded-md border border-zinc-200 p-2 text-zinc-700 hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0E5A6B]"
        >
          {menuMobileOuvert ? (
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
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          ) : (
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
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          )}
        </button>
      </div>

      {/* Menu mobile déroulant */}
      {menuMobileOuvert && (
        <div className="border-b border-zinc-200 bg-white px-4 py-4 md:hidden">
          {contenuMenu}
        </div>
      )}

      {/* Menu latéral bureau */}
      <aside className="hidden w-64 shrink-0 border-r border-zinc-200 bg-white p-5 md:flex md:flex-col">
        <div className="mb-6 flex items-center gap-2">
          <svg
            className="h-7 w-7 text-[#0E5A6B]"
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
          <span className="text-xl font-bold tracking-tight text-[#0E5A6B]">
            Ticketlinge
          </span>
        </div>
        {contenuMenu}
      </aside>
    </>
  );
}
