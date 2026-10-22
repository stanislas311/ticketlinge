"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { modifierDateRetraitDepot } from "@/lib/actions/depots";
import { heureAbidjanVersUtcIso, formaterDateAbidjan } from "@/lib/depots";
import { formaterPrixXOF } from "@/lib/format";

type StatutDepot = "depose" | "en_lavage" | "pret" | "livre" | "annule";

interface ArticleTicket {
  id: string;
  article: string;
  service: string;
  prix_unitaire_xof: number;
  quantite: number;
}

interface HistoriqueTicket {
  id: string;
  ancien_statut: StatutDepot | null;
  nouveau_statut: StatutDepot;
  par: string;
  le: string;
}

interface TicketDepotProps {
  depot: {
    id: string;
    numero_ticket: string;
    statut: StatutDepot;
    date_depot: string;
    date_retrait_prevue: string;
    date_retrait_locale: string;
    total_xof: number;
    notes: string | null;
    client: { nom: string; telephone: string };
  };
  articles: ArticleTicket[];
  historique: HistoriqueTicket[];
  nomPressing: string;
  libellesStatuts: Record<StatutDepot, string>;
}

export function TicketDepot({
  depot,
  articles,
  historique,
  nomPressing,
  libellesStatuts,
}: TicketDepotProps) {
  const router = useRouter();
  const [dateRetrait, setDateRetrait] = useState(depot.date_retrait_locale);
  const [erreur, setErreur] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [enTransition, startTransition] = useTransition();
  const dateModifiable = depot.statut !== "livre" && depot.statut !== "annule";

  function modifierDate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErreur(null);
    setMessage(null);
    let dateUtc: string;
    try {
      dateUtc = heureAbidjanVersUtcIso(dateRetrait);
    } catch (cause) {
      setErreur(cause instanceof Error ? cause.message : "Date de retrait invalide.");
      return;
    }

    startTransition(async () => {
      const resultat = await modifierDateRetraitDepot(depot.id, dateUtc);
      if (resultat.erreur) {
        setErreur(resultat.erreur);
        return;
      }
      setMessage("La date de retrait a ete mise a jour.");
      router.refresh();
    });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href="/depots" className="text-sm font-medium text-[#0E5A6B] hover:underline">
          Retour aux depots
        </Link>
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 focus-visible:outline-2 focus-visible:outline-[#0E5A6B]"
        >
          Imprimer
        </button>
      </div>

      <article className="ticket-imprimable rounded-lg border border-zinc-200 bg-white p-5 shadow-xs sm:p-8">
        <header className="border-b border-dashed border-zinc-300 pb-4 text-center">
          <h1 className="text-xl font-bold text-zinc-900">{nomPressing}</h1>
          <p className="mt-1 text-xs uppercase tracking-widest text-zinc-500">Ticket de depot</p>
          <p className="mt-3 font-mono text-lg font-bold text-zinc-900">{depot.numero_ticket}</p>
          <span className="mt-2 inline-flex rounded-full bg-[#0E5A6B]/10 px-2.5 py-1 text-xs font-semibold text-[#0E5A6B]">
            {libellesStatuts[depot.statut]}
          </span>
        </header>

        <section className="grid grid-cols-1 gap-3 border-b border-dashed border-zinc-300 py-4 text-sm sm:grid-cols-2">
          <div>
            <p className="text-xs text-zinc-500">Client</p>
            <p className="font-semibold text-zinc-900">{depot.client.nom}</p>
            {depot.client.telephone && <p className="text-xs text-zinc-600">{depot.client.telephone}</p>}
          </div>
          <div>
            <p className="text-xs text-zinc-500">Date de depot</p>
            <p className="font-medium text-zinc-900">{formaterDateAbidjan(depot.date_depot)}</p>
            <p className="mt-2 text-xs text-zinc-500">Retrait prevu</p>
            <p className="font-medium text-zinc-900">{formaterDateAbidjan(depot.date_retrait_prevue)}</p>
          </div>
        </section>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[30rem] text-left text-sm">
            <thead className="border-b border-zinc-200 text-xs text-zinc-500">
              <tr>
                <th className="py-3 pr-2 font-medium">Article et service</th>
                <th className="px-2 py-3 text-right font-medium">Qte</th>
                <th className="px-2 py-3 text-right font-medium">Prix unit.</th>
                <th className="py-3 pl-2 text-right font-medium">Sous-total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {articles.map((article) => (
                <tr key={article.id}>
                  <td className="py-3 pr-2">
                    <p className="font-medium text-zinc-900">{article.article}</p>
                    <p className="text-xs text-zinc-500">{article.service}</p>
                  </td>
                  <td className="px-2 py-3 text-right text-zinc-700">{article.quantite}</td>
                  <td className="px-2 py-3 text-right text-zinc-700">{formaterPrixXOF(article.prix_unitaire_xof)}</td>
                  <td className="py-3 pl-2 text-right font-medium text-zinc-900">
                    {formaterPrixXOF(article.prix_unitaire_xof * article.quantite)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-dashed border-zinc-300 py-4">
          <span className="text-sm font-semibold text-zinc-700">Total</span>
          <span className="text-xl font-bold text-zinc-900">{formaterPrixXOF(depot.total_xof)}</span>
        </div>
        {depot.notes && (
          <section className="border-t border-dashed border-zinc-300 py-4">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Notes</h2>
            <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-800">{depot.notes}</p>
          </section>
        )}

        <section className="border-t border-dashed border-zinc-300 pt-4">
          <h2 className="text-sm font-semibold text-zinc-900">Historique</h2>
          {historique.length === 0 ? (
            <p className="mt-2 text-xs text-zinc-500">Aucun evenement disponible.</p>
          ) : (
            <ol className="mt-2 space-y-2">
              {historique.map((evenement) => (
                <li key={evenement.id} className="flex flex-wrap justify-between gap-x-4 gap-y-1 text-xs">
                  <span className="text-zinc-700">
                    {evenement.ancien_statut
                      ? `${libellesStatuts[evenement.ancien_statut]} vers ${libellesStatuts[evenement.nouveau_statut]}`
                      : `Depot cree : ${libellesStatuts[evenement.nouveau_statut]}`}
                  </span>
                  <time dateTime={evenement.le} className="text-zinc-500">{formaterDateAbidjan(evenement.le)}</time>
                </li>
              ))}
            </ol>
          )}
        </section>
      </article>

      {dateModifiable && (
        <section className="rounded-lg border border-zinc-200 bg-white p-4 shadow-xs print:hidden">
          <h2 className="text-sm font-semibold text-zinc-900">Modifier la date de retrait</h2>
          <form onSubmit={modifierDate} className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label htmlFor="modifier-date-retrait" className="block text-xs font-medium text-zinc-700">
                Nouvelle date (heure d&apos;Abidjan)
              </label>
              <input
                id="modifier-date-retrait"
                type="datetime-local"
                required
                value={dateRetrait}
                onChange={(event) => setDateRetrait(event.target.value)}
                className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={enTransition}
              className="rounded-md bg-[#0E5A6B] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {enTransition ? "Mise a jour..." : "Mettre a jour"}
            </button>
          </form>
          {erreur && <p role="alert" className="mt-3 text-sm text-red-700">{erreur}</p>}
          {message && <p role="status" className="mt-3 text-sm text-green-700">{message}</p>}
        </section>
      )}
    </div>
  );
}
