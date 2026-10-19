"use client";

import { useState, useTransition } from "react";
import { libelleRole } from "@/lib/espace-types";
import {
  creerInvitationAction,
  revoquerInvitationAction,
  changerRoleMembreAction,
  retirerMembreAction,
} from "@/lib/actions/equipe";
import { construireLienInvitation, construireLienWhatsApp } from "@/lib/invitation";

export interface MembreEquipe {
  utilisateur_id: string;
  email: string;
  role: "proprietaire" | "gerant" | "receptionniste";
  cree_le: string;
}

export interface InvitationEnAttente {
  id: string;
  role: "gerant" | "receptionniste";
  expire_le: string;
  cree_le: string;
}

interface EquipeClientProps {
  membres: MembreEquipe[];
  invitations: InvitationEnAttente[];
  monRole: "proprietaire" | "gerant" | "receptionniste";
  monId: string;
  nomPressing: string;
  baseOrigin: string;
  erreurInitial?: string | null;
}

function formaterDate(dateIso: string): string {
  try {
    return new Intl.DateTimeFormat("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(dateIso));
  } catch {
    return dateIso;
  }
}

export function EquipeClient({
  membres,
  invitations,
  monRole,
  monId,
  nomPressing,
  baseOrigin,
  erreurInitial,
}: EquipeClientProps) {
  const [roleAInviter, setRoleAInviter] = useState<"gerant" | "receptionniste">("receptionniste");
  const [jetonCree, setJetonCree] = useState<string | null>(null);
  const [roleJetonCree, setRoleJetonCree] = useState<"gerant" | "receptionniste">("receptionniste");
  const [lienCopie, setLienCopie] = useState(false);
  const [erreurAction, setErreurAction] = useState<string | null>(null);

  // Etats de confirmation
  const [membreEnModification, setMembreEnModification] = useState<MembreEquipe | null>(null);
  const [nouveauRoleChoisi, setNouveauRoleChoisi] = useState<"gerant" | "receptionniste">("receptionniste");
  const [membreARetirer, setMembreARetirer] = useState<MembreEquipe | null>(null);

  const [enTransition, startTransition] = useTransition();

  const estProprietaire = monRole === "proprietaire";
  const peutInviter = monRole === "proprietaire" || monRole === "gerant";

  const lienComplet = jetonCree ? construireLienInvitation(baseOrigin, jetonCree) : "";
  const lienWhatsApp = jetonCree
    ? construireLienWhatsApp(lienComplet, nomPressing, roleJetonCree)
    : "";

  function handleCreerInvitation(e: React.FormEvent) {
    e.preventDefault();
    setErreurAction(null);
    setLienCopie(false);

    startTransition(async () => {
      const res = await creerInvitationAction(roleAInviter);
      if (res.erreur) {
        setErreurAction(res.erreur);
      } else if (res.jeton) {
        setJetonCree(res.jeton);
        setRoleJetonCree(roleAInviter);
      }
    });
  }

  function handleCopierLien() {
    if (!lienComplet) return;
    navigator.clipboard.writeText(lienComplet);
    setLienCopie(true);
    setTimeout(() => setLienCopie(false), 3000);
  }

  function handleRevoquer(invitationId: string) {
    setErreurAction(null);
    startTransition(async () => {
      const res = await revoquerInvitationAction(invitationId);
      if (res.erreur) {
        setErreurAction(res.erreur);
      }
    });
  }

  function handleConfirmerChangementRole() {
    if (!membreEnModification) return;
    setErreurAction(null);

    startTransition(async () => {
      const res = await changerRoleMembreAction(
        membreEnModification.utilisateur_id,
        nouveauRoleChoisi,
      );
      if (res.erreur) {
        setErreurAction(res.erreur);
      } else {
        setMembreEnModification(null);
      }
    });
  }

  function handleConfirmerRetrait() {
    if (!membreARetirer) return;
    setErreurAction(null);

    startTransition(async () => {
      const res = await retirerMembreAction(membreARetirer.utilisateur_id);
      if (res.erreur) {
        setErreurAction(res.erreur);
      } else {
        setMembreARetirer(null);
      }
    });
  }

  return (
    <div className="space-y-8">
      {/* Messages d'erreur */}
      {erreurInitial && (
        <div
          role="alert"
          className="rounded-md border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900"
        >
          {erreurInitial}
        </div>
      )}

      {erreurAction && (
        <div
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 p-4 text-xs text-red-800"
        >
          {erreurAction}
        </div>
      )}

      {/* Section 1 : Membres actuels */}
      <div className="rounded-lg border border-zinc-200 bg-white shadow-xs">
        <div className="border-b border-zinc-200 px-5 py-4">
          <h2 className="text-base font-semibold text-zinc-900">
            Membres de l&apos;equipe ({membres.length})
          </h2>
          <p className="mt-1 text-xs text-zinc-500">
            Personnes ayant acces a la gestion de cet etablissement.
          </p>
        </div>

        {membres.length === 0 ? (
          <div className="p-8 text-center text-sm text-zinc-500">
            Aucun membre trouve pour ce pressing.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-xs font-semibold text-zinc-600">
                <tr>
                  <th className="px-5 py-3">Utilisateur</th>
                  <th className="px-5 py-3">Role</th>
                  <th className="px-5 py-3">Membre depuis</th>
                  {estProprietaire && <th className="px-5 py-3 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {membres.map((m) => {
                  const estMoi = m.utilisateur_id === monId;
                  const estAutreProprietaire = m.role === "proprietaire";

                  return (
                    <tr key={m.utilisateur_id} className="hover:bg-zinc-50/50">
                      <td className="px-5 py-3.5">
                        <span className="font-medium text-zinc-900">{m.email}</span>
                        {estMoi && (
                          <span className="ml-2 inline-flex items-center rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600">
                            Vous
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            m.role === "proprietaire"
                              ? "bg-amber-100 text-amber-800"
                              : m.role === "gerant"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-zinc-100 text-zinc-800"
                          }`}
                        >
                          {libelleRole(m.role)}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-zinc-500">
                        {formaterDate(m.cree_le)}
                      </td>
                      {estProprietaire && (
                        <td className="px-5 py-3.5 text-right">
                          {!estMoi && !estAutreProprietaire ? (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setMembreEnModification(m);
                                  setNouveauRoleChoisi(
                                    m.role === "gerant" ? "receptionniste" : "gerant",
                                  );
                                }}
                                className="rounded border border-zinc-300 px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                              >
                                Modifier le role
                              </button>
                              <button
                                type="button"
                                onClick={() => setMembreARetirer(m)}
                                className="rounded border border-red-200 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                              >
                                Retirer
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-zinc-400">-</span>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modale de changement de role */}
      {membreEnModification && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-base font-bold text-zinc-900">
              Modifier le role du membre
            </h3>
            <p className="mt-1 text-xs text-zinc-600">
              Membre concerne : <span className="font-semibold text-zinc-800">{membreEnModification.email}</span>
            </p>

            <div className="mt-4">
              <label htmlFor="nouveau-role-select" className="block text-xs font-medium text-zinc-700">
                Nouveau role attribue :
              </label>
              <select
                id="nouveau-role-select"
                value={nouveauRoleChoisi}
                onChange={(e) => setNouveauRoleChoisi(e.target.value as "gerant" | "receptionniste")}
                className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-xs focus:border-[#0E5A6B] focus:outline-hidden focus:ring-1 focus:ring-[#0E5A6B]"
              >
                <option value="gerant">Gerant (tarifs et invitations)</option>
                <option value="receptionniste">Receptionniste (clients et tickets)</option>
              </select>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setMembreEnModification(null)}
                disabled={enTransition}
                className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmerChangementRole}
                disabled={enTransition}
                className="rounded-md bg-[#0E5A6B] px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-[#0a4553] disabled:opacity-50"
              >
                {enTransition ? "Modification..." : "Confirmer la modification"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modale de confirmation de retrait */}
      {membreARetirer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-base font-bold text-red-600">
              Retirer ce membre de l&apos;equipe ?
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-zinc-600">
              Voulez-vous vraiment retirer <span className="font-semibold text-zinc-800">{membreARetirer.email}</span> de l&apos;equipe du pressing ? Cette personne perdra immediatement tous ses acces a cet etablissement.
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setMembreARetirer(null)}
                disabled={enTransition}
                className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmerRetrait}
                disabled={enTransition}
                className="rounded-md bg-red-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-red-700 disabled:opacity-50"
              >
                {enTransition ? "Retrait en cours..." : "Confirmer le retrait"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Section 2 : Invitations */}
      {peutInviter && (
        <div className="space-y-6">
          {/* Formulaire de generation d'invitation */}
          <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-xs">
            <h2 className="text-sm font-bold text-zinc-900">
              Inviter un collaborateur
            </h2>
            <p className="mt-1 text-xs text-zinc-500">
              Generez un lien d&apos;invitation securise valable 7 jours.
            </p>

            <form onSubmit={handleCreerInvitation} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="w-full sm:w-64">
                <label htmlFor="select-role-invitation" className="block text-xs font-medium text-zinc-700">
                  Role a attribuer
                </label>
                <select
                  id="select-role-invitation"
                  value={roleAInviter}
                  onChange={(e) => setRoleAInviter(e.target.value as "gerant" | "receptionniste")}
                  className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-xs focus:border-[#0E5A6B] focus:outline-hidden focus:ring-1 focus:ring-[#0E5A6B]"
                >
                  <option value="receptionniste">Receptionniste (clients et tickets)</option>
                  {estProprietaire && <option value="gerant">Gerant (tarifs et invitations)</option>}
                </select>
              </div>

              <button
                type="submit"
                disabled={enTransition}
                className="inline-flex items-center justify-center rounded-md bg-[#0E5A6B] px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-[#0a4553] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0E5A6B] disabled:opacity-50"
              >
                {enTransition ? "Generation..." : "Generer le lien d'invitation"}
              </button>
            </form>

            {/* Affichage du lien cree */}
            {jetonCree && (
              <div className="mt-5 rounded-lg border border-teal-200 bg-teal-50/50 p-4">
                <div className="flex items-start gap-3">
                  <div className="rounded-full bg-teal-100 p-1 text-teal-700">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xs font-bold text-teal-900">
                      Lien d&apos;invitation genere pour un {libelleRole(roleJetonCree)}
                    </h3>
                    <p className="mt-0.5 text-xs text-teal-800">
                      Ce lien ne s&apos;affichera qu&apos;une seule fois sur cet ecran et expire dans 7 jours. Copiez-le maintenant.
                    </p>

                    <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                      <input
                        type="text"
                        readOnly
                        value={lienComplet}
                        className="w-full rounded-md border border-teal-300 bg-white px-3 py-1.5 text-xs font-mono text-zinc-800 select-all"
                      />
                      <div className="flex shrink-0 gap-2">
                        <button
                          type="button"
                          onClick={handleCopierLien}
                          className="rounded-md bg-[#0E5A6B] px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-[#0a4553]"
                        >
                          {lienCopie ? "Lien copie !" : "Copier le lien"}
                        </button>
                        <a
                          href={lienWhatsApp}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-md border border-green-600 bg-green-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-green-700"
                        >
                          <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
                            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981z" />
                          </svg>
                          WhatsApp
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Liste des invitations en attente */}
          <div className="rounded-lg border border-zinc-200 bg-white shadow-xs">
            <div className="border-b border-zinc-200 px-5 py-4">
              <h2 className="text-base font-semibold text-zinc-900">
                Invitations en attente ({invitations.length})
              </h2>
              <p className="mt-1 text-xs text-zinc-500">
                Liens actifs pouvant encore etre utilises pour rejoindre votre pressing.
              </p>
            </div>

            {invitations.length === 0 ? (
              <div className="p-8 text-center text-sm text-zinc-500">
                Aucune invitation en attente pour le moment.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-zinc-200 bg-zinc-50 text-xs font-semibold text-zinc-600">
                    <tr>
                      <th className="px-5 py-3">Role invite</th>
                      <th className="px-5 py-3">Creee le</th>
                      <th className="px-5 py-3">Expire le</th>
                      <th className="px-5 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {invitations.map((inv) => {
                      const peutRevoquer =
                        estProprietaire || (monRole === "gerant" && inv.role === "receptionniste");

                      return (
                        <tr key={inv.id} className="hover:bg-zinc-50/50">
                          <td className="px-5 py-3">
                            <span className="inline-flex rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-800">
                              {libelleRole(inv.role)}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-xs text-zinc-500">
                            {formaterDate(inv.cree_le)}
                          </td>
                          <td className="px-5 py-3 text-xs text-zinc-500">
                            {formaterDate(inv.expire_le)}
                          </td>
                          <td className="px-5 py-3 text-right">
                            {peutRevoquer ? (
                              <button
                                type="button"
                                onClick={() => handleRevoquer(inv.id)}
                                disabled={enTransition}
                                className="rounded border border-zinc-300 px-2.5 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-50 disabled:opacity-50"
                              >
                                Revoquer
                              </button>
                            ) : (
                              <span className="text-xs text-zinc-400">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
