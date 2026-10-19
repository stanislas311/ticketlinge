"use client";

import { useState, useActionState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  creerClient,
  modifierClient,
  basculerEtatClient,
  type EtatClient,
} from "@/lib/actions/clients";

interface Client {
  id: string;
  nom: string;
  telephone: string;
  actif: boolean;
}

interface ClientsClientProps {
  clients: Client[];
  recherche: string;
  page: number;
  totalPages: number;
}

const etatInitial: EtatClient = { erreur: null };

function FormulaireAjout() {
  const [etat, action, enCours] = useActionState(creerClient, etatInitial);

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-xs">
      <h2 className="text-sm font-bold text-zinc-900">
        Ajouter un client
      </h2>

      <form action={action} className="mt-4 space-y-3">
        {etat.erreur && (
          <div
            role="alert"
            className="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-800"
          >
            {etat.erreur}
          </div>
        )}
        {etat.succes && (
          <div
            role="status"
            className="rounded-md border border-green-200 bg-green-50 p-3 text-xs text-green-800"
          >
            Client enregistre avec succes.
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label
              htmlFor="nom"
              className="block text-xs font-medium text-zinc-700"
            >
              Nom du client
            </label>
            <input
              id="nom"
              name="nom"
              type="text"
              required
              minLength={2}
              maxLength={100}
              placeholder="Ex : Kouame Jean"
              className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-xs focus:border-[#0E5A6B] focus:outline-hidden focus:ring-1 focus:ring-[#0E5A6B]"
            />
          </div>
          <div>
            <label
              htmlFor="telephone"
              className="block text-xs font-medium text-zinc-700"
            >
              Telephone
            </label>
            <input
              id="telephone"
              name="telephone"
              type="tel"
              required
              placeholder="Ex : 0701020304"
              className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-xs focus:border-[#0E5A6B] focus:outline-hidden focus:ring-1 focus:ring-[#0E5A6B]"
            />
            <p className="mt-1 text-xs text-zinc-500">
              Format : 0XXXXXXXXX ou +225 0XXXXXXXXX
            </p>
          </div>
        </div>

        <button
          type="submit"
          disabled={enCours}
          className="rounded-md bg-[#0E5A6B] px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-[#0a4553] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0E5A6B] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {enCours ? "Ajout en cours..." : "Ajouter le client"}
        </button>
      </form>
    </div>
  );
}

function LigneClient({ client }: { client: Client }) {
  const [enEdition, setEnEdition] = useState(false);
  const [enTransition, startTransition] = useTransition();
  const [erreur, setErreur] = useState<string | null>(null);

  const [etatModif, actionModif, enCoursModif] = useActionState(
    async (_etatPrec: EtatClient, formData: FormData) => {
      const res = await modifierClient(_etatPrec, formData);
      if (!res.erreur) {
        setEnEdition(false);
      }
      return res;
    },
    etatInitial,
  );

  function handleBasculerEtat() {
    setErreur(null);
    startTransition(async () => {
      const res = await basculerEtatClient(client.id, client.actif);
      if (res.erreur) {
        setErreur(res.erreur);
      }
    });
  }

  if (enEdition) {
    return (
      <tr className="border-b border-zinc-100 bg-zinc-50/50">
        <td colSpan={4} className="px-4 py-4">
          <form action={actionModif} className="space-y-3">
            <input type="hidden" name="id" value={client.id} />
            {etatModif.erreur && (
              <div
                role="alert"
                className="rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-800"
              >
                {etatModif.erreur}
              </div>
            )}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label
                  htmlFor={`edit-nom-${client.id}`}
                  className="block text-xs font-medium text-zinc-700"
                >
                  Nom
                </label>
                <input
                  id={`edit-nom-${client.id}`}
                  name="nom"
                  type="text"
                  required
                  minLength={2}
                  maxLength={100}
                  defaultValue={client.nom}
                  className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-xs focus:border-[#0E5A6B] focus:outline-hidden focus:ring-1 focus:ring-[#0E5A6B]"
                />
              </div>
              <div>
                <label
                  htmlFor={`edit-tel-${client.id}`}
                  className="block text-xs font-medium text-zinc-700"
                >
                  Telephone
                </label>
                <input
                  id={`edit-tel-${client.id}`}
                  name="telephone"
                  type="tel"
                  required
                  defaultValue={client.telephone}
                  className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-xs focus:border-[#0E5A6B] focus:outline-hidden focus:ring-1 focus:ring-[#0E5A6B]"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={enCoursModif}
                className="rounded bg-[#0E5A6B] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#0a4553] disabled:opacity-50"
              >
                Enregistrer
              </button>
              <button
                type="button"
                onClick={() => setEnEdition(false)}
                className="rounded border border-zinc-300 px-3 py-1.5 text-xs text-zinc-600 hover:bg-zinc-50"
              >
                Annuler
              </button>
            </div>
          </form>
        </td>
      </tr>
    );
  }

  return (
    <tr
      className={`border-b border-zinc-100 transition ${
        !client.actif ? "bg-zinc-50 opacity-60" : ""
      }`}
    >
      <td className="px-4 py-3 text-sm text-zinc-900">{client.nom}</td>
      <td className="px-4 py-3 text-sm text-zinc-600">{client.telephone}</td>
      <td className="px-4 py-3 text-center text-sm">
        <span
          className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
            client.actif
              ? "bg-green-100 text-green-800"
              : "bg-zinc-200 text-zinc-600"
          }`}
        >
          {client.actif ? "Actif" : "Inactif"}
        </span>
      </td>
      <td className="px-4 py-3 text-right text-sm">
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => setEnEdition(true)}
            className="rounded border border-zinc-300 px-2 py-1 text-xs text-zinc-600 transition hover:bg-zinc-50"
          >
            Modifier
          </button>
          <button
            type="button"
            onClick={handleBasculerEtat}
            disabled={enTransition}
            className="rounded border border-zinc-300 px-2 py-1 text-xs text-zinc-600 transition hover:bg-zinc-50 disabled:opacity-50"
          >
            {client.actif ? "Desactiver" : "Reactiver"}
          </button>
        </div>
        {erreur && (
          <p role="alert" className="mt-1 text-xs text-red-600">
            {erreur}
          </p>
        )}
      </td>
    </tr>
  );
}

function BarreRecherche({ recherche }: { recherche: string }) {
  const router = useRouter();
  const [valeur, setValeur] = useState(recherche);

  function handleRecherche(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (valeur.trim()) {
      params.set("q", valeur.trim());
    }
    router.push(`/clients${params.toString() ? `?${params.toString()}` : ""}`);
  }

  return (
    <form onSubmit={handleRecherche} className="flex gap-2">
      <label htmlFor="recherche-client" className="sr-only">
        Rechercher un client
      </label>
      <input
        id="recherche-client"
        type="search"
        value={valeur}
        onChange={(e) => setValeur(e.target.value)}
        placeholder="Rechercher par nom ou telephone..."
        className="block w-full max-w-sm rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-xs focus:border-[#0E5A6B] focus:outline-hidden focus:ring-1 focus:ring-[#0E5A6B]"
      />
      <button
        type="submit"
        className="rounded-md bg-[#0E5A6B] px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-[#0a4553] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0E5A6B]"
      >
        Rechercher
      </button>
    </form>
  );
}

function Pagination({
  page,
  totalPages,
  recherche,
}: {
  page: number;
  totalPages: number;
  recherche: string;
}) {
  if (totalPages <= 1) return null;

  function lienPage(p: number): string {
    const params = new URLSearchParams();
    if (recherche) params.set("q", recherche);
    if (p > 1) params.set("page", String(p));
    return `/clients${params.toString() ? `?${params.toString()}` : ""}`;
  }

  return (
    <nav aria-label="Pagination" className="flex items-center justify-center gap-2 pt-4">
      {page > 1 ? (
        <a
          href={lienPage(page - 1)}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
        >
          Precedent
        </a>
      ) : (
        <span className="rounded-md border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-400">
          Precedent
        </span>
      )}

      <span className="text-xs text-zinc-600">
        Page {page} sur {totalPages}
      </span>

      {page < totalPages ? (
        <a
          href={lienPage(page + 1)}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
        >
          Suivant
        </a>
      ) : (
        <span className="rounded-md border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-400">
          Suivant
        </span>
      )}
    </nav>
  );
}

export function ClientsClient({
  clients,
  recherche,
  page,
  totalPages,
}: ClientsClientProps) {
  return (
    <div className="space-y-6">
      <FormulaireAjout />

      <BarreRecherche recherche={recherche} />

      {clients.length === 0 ? (
        <div className="rounded-lg border border-zinc-200 bg-white p-8 text-center shadow-xs">
          <p className="text-sm text-zinc-500">
            {recherche
              ? "Aucun client ne correspond a votre recherche."
              : "Aucun client enregistre dans ce pressing."}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white shadow-xs">
          <table className="w-full text-left">
            <thead className="border-b border-zinc-200 bg-zinc-50">
              <tr>
                <th className="px-4 py-3 text-xs font-semibold text-zinc-600">
                  Nom
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-zinc-600">
                  Telephone
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-zinc-600">
                  Statut
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-zinc-600">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => (
                <LigneClient key={c.id} client={c} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} recherche={recherche} />
    </div>
  );
}
