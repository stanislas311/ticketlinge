"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  creerClientDepot,
  creerDepot,
  rechercherClientsActifs,
} from "@/lib/actions/depots";
import {
  heureAbidjanVersUtcIso,
  totalEstime,
} from "@/lib/depots";
import { formaterPrixXOF } from "@/lib/format";

interface ClientDepot {
  id: string;
  nom: string;
  telephone: string;
}

interface PrestationDepot {
  id: string;
  article: string;
  service: string;
  prix_xof: number;
}

interface LigneDepot extends PrestationDepot {
  quantite: number;
}

interface FormulaireDepotProps {
  clients: ClientDepot[];
  prestations: PrestationDepot[];
  erreurCatalogue: string | null;
  dateRetraitInitiale: string;
}

export function FormulaireDepot({
  clients: clientsInitial,
  prestations,
  erreurCatalogue,
  dateRetraitInitiale,
}: FormulaireDepotProps) {
  const router = useRouter();
  const [clientSelectionne, setClientSelectionne] =
    useState<ClientDepot | null>(null);
  const [rechercheClient, setRechercheClient] = useState("");
  const [resultatsRecherche, setResultatsRecherche] = useState<{
    terme: string;
    clients: ClientDepot[];
    erreur: string | null;
  } | null>(null);
  const [creerClientOuvert, setCreerClientOuvert] = useState(false);
  const [nomNouveauClient, setNomNouveauClient] = useState("");
  const [telephoneNouveauClient, setTelephoneNouveauClient] = useState("");
  const [erreurClient, setErreurClient] = useState<string | null>(null);
  const [dateRetrait, setDateRetrait] = useState(dateRetraitInitiale);
  const [prestationId, setPrestationId] = useState("");
  const [quantite, setQuantite] = useState(1);
  const [lignes, setLignes] = useState<LigneDepot[]>([]);
  const [notes, setNotes] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [enTransition, startTransition] = useTransition();

  useEffect(() => {
    const terme = rechercheClient.trim();
    if (clientSelectionne || terme.length < 2) return;

    let annule = false;
    const timeout = setTimeout(async () => {
      const resultat = await rechercherClientsActifs(terme);
      if (annule) return;
      setResultatsRecherche({
        terme,
        clients: resultat.clients ?? [],
        erreur: resultat.erreur,
      });
    }, 250);

    return () => {
      annule = true;
      clearTimeout(timeout);
    };
  }, [clientSelectionne, rechercheClient]);

  const termeRecherche = rechercheClient.trim();
  const resultatsActuels =
    resultatsRecherche?.terme === termeRecherche ? resultatsRecherche : null;
  const rechercheEnCours =
    !clientSelectionne && termeRecherche.length >= 2 && !resultatsActuels;

  const total = useMemo(
    () =>
      totalEstime(
        lignes.map((ligne) => ({
          prix_unitaire_xof: ligne.prix_xof,
          quantite: ligne.quantite,
        })),
      ),
    [lignes],
  );

  function ajouterLigne() {
    const prestation = prestations.find((item) => item.id === prestationId);
    if (!prestation || !Number.isInteger(quantite) || quantite < 1 || quantite > 999) {
      setErreur("Selectionnez une prestation et une quantite entre 1 et 999.");
      return;
    }

    setErreur(null);
    const existante = lignes.find((ligne) => ligne.id === prestation.id);
    const nouvelleQuantite = (existante?.quantite ?? 0) + quantite;
    if (nouvelleQuantite > 999) {
      setErreur("La quantite cumulee d'une prestation ne peut pas depasser 999.");
      return;
    }
    setLignes((actuelles) =>
      existante
        ? actuelles.map((ligne) =>
            ligne.id === prestation.id
              ? { ...ligne, quantite: nouvelleQuantite }
              : ligne,
          )
        : [...actuelles, { ...prestation, quantite }],
    );
    setPrestationId("");
    setQuantite(1);
  }

  function validerDepot(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErreur(null);
    if (!clientSelectionne) {
      setErreur("Selectionnez ou creez un client.");
      return;
    }
    if (lignes.length === 0) {
      setErreur("Ajoutez au moins une ligne au depot.");
      return;
    }

    let dateUtc: string;
    try {
      dateUtc = heureAbidjanVersUtcIso(dateRetrait);
    } catch (cause) {
      setErreur(cause instanceof Error ? cause.message : "Date de retrait invalide.");
      return;
    }

    startTransition(async () => {
      const resultat = await creerDepot(
        clientSelectionne.id,
        dateUtc,
        lignes.map((ligne) => ({
          prestation_id: ligne.id,
          quantite: ligne.quantite,
        })),
        notes,
      );
      if (resultat.erreur || !resultat.depotId) {
        setErreur(resultat.erreur ?? "Impossible de creer le depot.");
        return;
      }
      router.push(`/depots/${resultat.depotId}`);
    });
  }

  return (
    <form
      onSubmit={validerDepot}
      className="space-y-5"
      aria-describedby={erreur ? "erreur-depot" : undefined}
    >
      {erreurCatalogue && (
        <p role="alert" className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          {erreurCatalogue}
        </p>
      )}
      {erreur && (
        <p id="erreur-depot" role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {erreur}
        </p>
      )}

      <section className="space-y-4 rounded-lg border border-zinc-200 bg-white p-4 shadow-xs sm:p-5">
        <h2 className="text-base font-semibold text-zinc-900">Client</h2>
        {clientSelectionne ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-zinc-50 p-3">
            <div>
              <p className="text-sm font-semibold text-zinc-900">{clientSelectionne.nom}</p>
              <p className="text-xs text-zinc-600">{clientSelectionne.telephone}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setClientSelectionne(null);
                setRechercheClient("");
              }}
              className="rounded-md border border-zinc-300 px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-white"
            >
              Changer de client
            </button>
          </div>
        ) : (
          <>
            <div>
              <label htmlFor="recherche-client-depot" className="block text-sm font-medium text-zinc-700">
                Rechercher par nom ou telephone
              </label>
              <input
                id="recherche-client-depot"
                type="search"
                autoComplete="off"
                value={rechercheClient}
                onChange={(event) => setRechercheClient(event.target.value)}
                placeholder="Nom ou numero de telephone"
                className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-[#0E5A6B] focus:outline-hidden focus:ring-1 focus:ring-[#0E5A6B]"
              />
            </div>
            {resultatsActuels?.erreur && <p role="alert" className="text-sm text-red-700">{resultatsActuels.erreur}</p>}
            {rechercheEnCours && <p role="status" className="text-sm text-zinc-500">Recherche en cours...</p>}
            {resultatsActuels?.clients.length ? (
              <ul aria-label="Resultats clients" className="divide-y divide-zinc-100 rounded-md border border-zinc-200">
                {resultatsActuels.clients.map((client) => (
                  <li key={client.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setClientSelectionne(client);
                        setRechercheClient(client.nom);
                        setResultatsRecherche(null);
                      }}
                      className="w-full px-3 py-2 text-left hover:bg-zinc-50 focus-visible:outline-2 focus-visible:outline-[#0E5A6B]"
                    >
                      <span className="block text-sm font-medium text-zinc-900">{client.nom}</span>
                      <span className="block text-xs text-zinc-600">{client.telephone}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              rechercheClient.trim().length >= 2 &&
              !rechercheEnCours &&
              !resultatsActuels?.erreur && (
                <p className="text-sm text-zinc-500">Aucun client actif ne correspond a cette recherche.</p>
              )
            )}
            {clientsInitial.length > 0 && !rechercheClient && (
              <p className="text-xs text-zinc-500">
                {clientsInitial.length} client{clientsInitial.length > 1 ? "s" : ""} actif{clientsInitial.length > 1 ? "s" : ""} disponible{clientsInitial.length > 1 ? "s" : ""}. Saisissez au moins deux caracteres pour rechercher.
              </p>
            )}
            <button
              type="button"
              onClick={() => setCreerClientOuvert(!creerClientOuvert)}
              className="rounded-md border border-[#0E5A6B] px-3 py-2 text-sm font-semibold text-[#0E5A6B] hover:bg-[#0E5A6B]/5"
            >
              {creerClientOuvert ? "Fermer la creation" : "Creer un nouveau client"}
            </button>
            {creerClientOuvert && (
              <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3">
                <h3 className="text-sm font-semibold text-zinc-900">Nouveau client</h3>
                {erreurClient && <p role="alert" className="mt-2 text-sm text-red-700">{erreurClient}</p>}
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div>
                    <label htmlFor="nouveau-client-nom" className="block text-xs font-medium text-zinc-700">Nom</label>
                    <input
                      id="nouveau-client-nom"
                      name="nom"
                      required
                      minLength={2}
                      maxLength={100}
                      value={nomNouveauClient}
                      onChange={(event) => setNomNouveauClient(event.target.value)}
                      className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label htmlFor="nouveau-client-telephone" className="block text-xs font-medium text-zinc-700">Telephone</label>
                    <input
                      id="nouveau-client-telephone"
                      name="telephone"
                      type="tel"
                      required
                      value={telephoneNouveauClient}
                      onChange={(event) => setTelephoneNouveauClient(event.target.value)}
                      className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(event) => {
                    const form = event.currentTarget.closest("form");
                    if (form) {
                      const donnees = new FormData(form);
                      startTransition(async () => {
                        const resultat = await creerClientDepot(donnees);
                        if (!resultat.client || resultat.erreur) {
                          setErreurClient(resultat.erreur ?? "Impossible d'enregistrer ce client.");
                          return;
                        }
                        setClientSelectionne(resultat.client);
                        setRechercheClient(resultat.client.nom);
                        setResultatsRecherche(null);
                        setNomNouveauClient("");
                        setTelephoneNouveauClient("");
                        setCreerClientOuvert(false);
                      });
                    }
                  }}
                  disabled={enTransition}
                  className="mt-3 rounded-md bg-[#0E5A6B] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {enTransition ? "Enregistrement..." : "Enregistrer et selectionner"}
                </button>
              </div>
            )}
          </>
        )}
      </section>

      <section className="space-y-4 rounded-lg border border-zinc-200 bg-white p-4 shadow-xs sm:p-5">
        <h2 className="text-base font-semibold text-zinc-900">Articles et prestations</h2>
        {prestations.length === 0 ? (
          <p className="rounded-md bg-zinc-50 p-3 text-sm text-zinc-600">
            Aucune prestation active. Ajoutez-en une dans le catalogue des tarifs avant de creer un depot.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-[1fr_7rem_auto] sm:items-end">
            <div>
              <label htmlFor="prestation-depot" className="block text-sm font-medium text-zinc-700">Prestation</label>
              <select
                id="prestation-depot"
                value={prestationId}
                onChange={(event) => setPrestationId(event.target.value)}
                className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm"
              >
                <option value="">Choisir une prestation</option>
                {prestations.map((prestation) => (
                  <option key={prestation.id} value={prestation.id}>
                    {prestation.article} - {prestation.service} ({formaterPrixXOF(prestation.prix_xof)})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="quantite-depot" className="block text-sm font-medium text-zinc-700">Quantite</label>
              <input
                id="quantite-depot"
                type="number"
                min={1}
                max={999}
                step={1}
                value={quantite}
                onChange={(event) => setQuantite(Number(event.target.value))}
                className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
              />
            </div>
            <button
              type="button"
              onClick={ajouterLigne}
              className="rounded-md border border-[#0E5A6B] px-3 py-2 text-sm font-semibold text-[#0E5A6B] hover:bg-[#0E5A6B]/5"
            >
              Ajouter
            </button>
          </div>
        )}

        {lignes.length > 0 ? (
          <ul className="divide-y divide-zinc-100 rounded-md border border-zinc-200">
            {lignes.map((ligne) => (
              <li key={ligne.id} className="flex flex-wrap items-center justify-between gap-3 p-3">
                <div>
                  <p className="text-sm font-medium text-zinc-900">{ligne.article} - {ligne.service}</p>
                  <p className="text-xs text-zinc-600">{ligne.quantite} x {formaterPrixXOF(ligne.prix_xof)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-zinc-900">
                    {formaterPrixXOF(ligne.quantite * ligne.prix_xof)}
                  </span>
                  <button
                    type="button"
                    onClick={() => setLignes((actuelles) => actuelles.filter((item) => item.id !== ligne.id))}
                    aria-label={`Retirer ${ligne.article} - ${ligne.service}`}
                    className="rounded-md border border-zinc-300 px-2 py-1 text-xs text-zinc-700 hover:bg-zinc-50"
                  >
                    Retirer
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-md bg-zinc-50 p-3 text-sm text-zinc-500">Aucune ligne ajoutee.</p>
        )}

        <div className="flex items-center justify-between border-t border-zinc-100 pt-3">
          <p className="text-sm font-medium text-zinc-700">Total estime</p>
          <p className="text-lg font-bold text-zinc-900">{formaterPrixXOF(total)}</p>
        </div>
        <p className="text-xs text-zinc-500">Le total definitif est recalcule a partir du catalogue en base au moment de l&apos;enregistrement.</p>
      </section>

      <section className="space-y-4 rounded-lg border border-zinc-200 bg-white p-4 shadow-xs sm:p-5">
        <h2 className="text-base font-semibold text-zinc-900">Retrait et notes</h2>
        <div>
          <label htmlFor="date-retrait" className="block text-sm font-medium text-zinc-700">
            Date et heure de retrait prevues (heure d&apos;Abidjan)
          </label>
          <input
            id="date-retrait"
            type="datetime-local"
            required
            value={dateRetrait}
            onChange={(event) => setDateRetrait(event.target.value)}
            className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm sm:max-w-sm"
          />
        </div>
        <div>
          <label htmlFor="notes-depot" className="block text-sm font-medium text-zinc-700">Notes facultatives</label>
          <textarea
            id="notes-depot"
            rows={3}
            maxLength={500}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
          />
          <p className="mt-1 text-right text-xs text-zinc-500">{notes.length}/500</p>
        </div>
      </section>

      <button
        type="submit"
        disabled={enTransition || Boolean(erreurCatalogue) || !dateRetrait}
        className="w-full rounded-md bg-[#0E5A6B] px-4 py-3 text-sm font-semibold text-white shadow-xs hover:bg-[#0a4553] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0E5A6B] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
      >
        {enTransition ? "Creation du depot..." : "Creer le depot et afficher le ticket"}
      </button>
    </form>
  );
}
