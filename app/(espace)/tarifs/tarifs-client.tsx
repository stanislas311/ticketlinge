"use client";

import { useState, useActionState, useTransition } from "react";
import { formaterPrixXOF } from "@/lib/format";
import {
  creerPrestation,
  modifierPrixPrestation,
  basculerEtatPrestation,
  type EtatPrestation,
} from "@/lib/actions/prestations";

interface Prestation {
  id: string;
  article: string;
  service: string;
  prix_xof: number;
  actif: boolean;
}

interface TarifsClientProps {
  prestations: Prestation[];
  peutEditer: boolean;
  afficherInactives: boolean;
}

const etatInitial: EtatPrestation = { erreur: null };

function FormulaireAjout() {
  const [etat, action, enCours] = useActionState(creerPrestation, etatInitial);

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-xs">
      <h2 className="text-sm font-bold text-zinc-900">
        Ajouter une prestation
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
            Prestation ajoutee avec succes.
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label
              htmlFor="article"
              className="block text-xs font-medium text-zinc-700"
            >
              Article
            </label>
            <input
              id="article"
              name="article"
              type="text"
              required
              minLength={2}
              maxLength={100}
              placeholder="Ex : Chemise"
              className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-xs focus:border-[#0E5A6B] focus:outline-hidden focus:ring-1 focus:ring-[#0E5A6B]"
            />
          </div>
          <div>
            <label
              htmlFor="service"
              className="block text-xs font-medium text-zinc-700"
            >
              Service
            </label>
            <input
              id="service"
              name="service"
              type="text"
              required
              minLength={2}
              maxLength={100}
              placeholder="Ex : Lavage et repassage"
              className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-xs focus:border-[#0E5A6B] focus:outline-hidden focus:ring-1 focus:ring-[#0E5A6B]"
            />
          </div>
          <div>
            <label
              htmlFor="prix_xof"
              className="block text-xs font-medium text-zinc-700"
            >
              Prix (F CFA)
            </label>
            <input
              id="prix_xof"
              name="prix_xof"
              type="number"
              required
              min={0}
              step={1}
              placeholder="1500"
              className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm shadow-xs focus:border-[#0E5A6B] focus:outline-hidden focus:ring-1 focus:ring-[#0E5A6B]"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={enCours}
          className="rounded-md bg-[#0E5A6B] px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-[#0a4553] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0E5A6B] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {enCours ? "Ajout en cours..." : "Ajouter au catalogue"}
        </button>
      </form>
    </div>
  );
}

function LignePrestation({
  prestation,
  peutEditer,
}: {
  prestation: Prestation;
  peutEditer: boolean;
}) {
  const [enEdition, setEnEdition] = useState(false);
  const [nouveauPrix, setNouveauPrix] = useState(
    String(prestation.prix_xof),
  );
  const [erreur, setErreur] = useState<string | null>(null);
  const [enTransition, startTransition] = useTransition();

  function handleModifierPrix() {
    setErreur(null);
    startTransition(async () => {
      const res = await modifierPrixPrestation(prestation.id, nouveauPrix);
      if (res.erreur) {
        setErreur(res.erreur);
      } else {
        setEnEdition(false);
      }
    });
  }

  function handleBasculerEtat() {
    setErreur(null);
    startTransition(async () => {
      const res = await basculerEtatPrestation(
        prestation.id,
        prestation.actif,
      );
      if (res.erreur) {
        setErreur(res.erreur);
      }
    });
  }

  return (
    <tr
      className={`border-b border-zinc-100 transition ${
        !prestation.actif ? "bg-zinc-50 opacity-60" : ""
      }`}
    >
      <td className="px-4 py-3 text-sm text-zinc-900">{prestation.article}</td>
      <td className="px-4 py-3 text-sm text-zinc-600">{prestation.service}</td>
      <td className="px-4 py-3 text-sm font-medium text-zinc-900">
        {enEdition ? (
          <div className="flex items-center gap-2">
            <label htmlFor={`prix-${prestation.id}`} className="sr-only">
              Nouveau prix
            </label>
            <input
              id={`prix-${prestation.id}`}
              type="number"
              min={0}
              step={1}
              value={nouveauPrix}
              onChange={(e) => setNouveauPrix(e.target.value)}
              className="w-24 rounded-md border border-zinc-300 px-2 py-1 text-sm focus:border-[#0E5A6B] focus:outline-hidden focus:ring-1 focus:ring-[#0E5A6B]"
            />
            <button
              type="button"
              onClick={handleModifierPrix}
              disabled={enTransition}
              className="rounded bg-[#0E5A6B] px-2 py-1 text-xs text-white hover:bg-[#0a4553] disabled:opacity-50"
            >
              OK
            </button>
            <button
              type="button"
              onClick={() => {
                setEnEdition(false);
                setNouveauPrix(String(prestation.prix_xof));
                setErreur(null);
              }}
              className="rounded border border-zinc-300 px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-50"
            >
              Annuler
            </button>
          </div>
        ) : (
          formaterPrixXOF(prestation.prix_xof)
        )}
        {erreur && (
          <p role="alert" className="mt-1 text-xs text-red-600">
            {erreur}
          </p>
        )}
      </td>
      <td className="px-4 py-3 text-center text-sm">
        <span
          className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
            prestation.actif
              ? "bg-green-100 text-green-800"
              : "bg-zinc-200 text-zinc-600"
          }`}
        >
          {prestation.actif ? "Actif" : "Inactif"}
        </span>
      </td>
      {peutEditer && (
        <td className="px-4 py-3 text-right text-sm">
          <div className="flex items-center justify-end gap-2">
            {!enEdition && (
              <button
                type="button"
                onClick={() => setEnEdition(true)}
                className="rounded border border-zinc-300 px-2 py-1 text-xs text-zinc-600 transition hover:bg-zinc-50"
              >
                Modifier le prix
              </button>
            )}
            <button
              type="button"
              onClick={handleBasculerEtat}
              disabled={enTransition}
              className="rounded border border-zinc-300 px-2 py-1 text-xs text-zinc-600 transition hover:bg-zinc-50 disabled:opacity-50"
            >
              {prestation.actif ? "Desactiver" : "Reactiver"}
            </button>
          </div>
        </td>
      )}
    </tr>
  );
}


export function TarifsClient({
  prestations,
  peutEditer,
  afficherInactives,
}: TarifsClientProps) {
  const [filtre, setFiltre] = useState<"actives" | "toutes">(
    afficherInactives ? "toutes" : "actives",
  );

  const prestationsFiltrees =
    filtre === "actives"
      ? prestations.filter((p) => p.actif)
      : prestations;

  return (
    <div className="space-y-6">
      {peutEditer && <FormulaireAjout />}

      {/* Filtres */}
      <div className="flex items-center gap-2">
        <label htmlFor="filtre-statut" className="text-xs font-medium text-zinc-600">
          Afficher :
        </label>
        <select
          id="filtre-statut"
          value={filtre}
          onChange={(e) => setFiltre(e.target.value as "actives" | "toutes")}
          className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs focus:border-[#0E5A6B] focus:outline-hidden focus:ring-1 focus:ring-[#0E5A6B]"
        >
          <option value="actives">Prestations actives uniquement</option>
          <option value="toutes">Toutes les prestations</option>
        </select>
      </div>

      {/* Tableau */}
      {prestationsFiltrees.length === 0 ? (
        <div className="rounded-lg border border-zinc-200 bg-white p-8 text-center shadow-xs">
          <p className="text-sm text-zinc-500">
            {filtre === "actives"
              ? "Aucune prestation active pour le moment."
              : "Aucune prestation enregistree dans ce pressing."}
          </p>
          {peutEditer && (
            <p className="mt-2 text-xs text-zinc-400">
              Utilisez le formulaire ci-dessus pour ajouter votre premiere prestation.
            </p>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white shadow-xs">
          <table className="w-full text-left">
            <thead className="border-b border-zinc-200 bg-zinc-50">
              <tr>
                <th className="px-4 py-3 text-xs font-semibold text-zinc-600">
                  Article
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-zinc-600">
                  Service
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-zinc-600">
                  Prix
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-zinc-600">
                  Statut
                </th>
                {peutEditer && (
                  <th className="px-4 py-3 text-right text-xs font-semibold text-zinc-600">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {prestationsFiltrees.map((p) => (
                <LignePrestation
                  key={p.id}
                  prestation={p}
                  peutEditer={peutEditer}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
