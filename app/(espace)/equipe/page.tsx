import { Suspense } from "react";
import { headers } from "next/headers";
import { connection } from "next/server";
import type { Metadata } from "next";
import { obtenirContexteEspace } from "@/lib/espace";
import { createClient } from "@/lib/supabase/server";
import {
  EquipeClient,
  type MembreEquipe,
  type InvitationEnAttente,
} from "./equipe-client";

export const metadata: Metadata = {
  title: "Equipe - Ticketlinge",
};

async function ContenuEquipe() {
  await connection();
  const contexte = await obtenirContexteEspace();
  const entetes = await headers();
  const host = entetes.get("x-forwarded-host") || entetes.get("host") || "ticketlinge.vercel.app";
  const proto = entetes.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https");
  const baseOrigin = `${proto}://${host}`;

  const supabase = await createClient();

  let membres: MembreEquipe[] = [];
  let invitations: InvitationEnAttente[] = [];
  let erreurInitial: string | null = null;

  // 1. Charger les membres de l'equipe via la RPC securisee
  const { data: dataMembres, error: errMembres } = await supabase.rpc(
    "lister_equipe",
    { p_pressing: contexte.pressingActif.id },
  );

  if (errMembres) {
    if (
      errMembres.code === "PGRST202" ||
      errMembres.code === "42883" ||
      errMembres.message?.includes("does not exist")
    ) {
      erreurInitial =
        "La gestion de l'equipe sera completement activee des que la migration SQL aura ete executee dans la base de donnees Supabase.";
      // Repli d'affichage minimal avec l'utilisateur connecte
      membres = [
        {
          utilisateur_id: contexte.utilisateur.id,
          email: contexte.utilisateur.email,
          role: contexte.roleActif,
          cree_le: new Date().toISOString(),
        },
      ];
    } else {
      erreurInitial = "Impossible de charger la liste des membres pour le moment.";
    }
  } else if (dataMembres) {
    membres = dataMembres as MembreEquipe[];
  }

  // 2. Si le role le permet, charger les invitations en attente
  if (contexte.roleActif === "proprietaire" || contexte.roleActif === "gerant") {
    const { data: dataInvitations, error: errInvitations } = await supabase
      .from("invitations")
      .select("id, role, expire_le, cree_le")
      .eq("pressing_id", contexte.pressingActif.id)
      .is("utilisee_le", null)
      .is("revoquee_le", null)
      .gt("expire_le", new Date().toISOString())
      .order("cree_le", { ascending: false });

    if (!errInvitations && dataInvitations) {
      invitations = dataInvitations as InvitationEnAttente[];
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
            Gestion de l&apos;equipe
          </h1>
          <p className="mt-1 text-sm text-zinc-600">
            Collaborateurs du pressing{" "}
            <span className="font-semibold text-zinc-900">
              {contexte.pressingActif.nom}
            </span>
            .
          </p>
        </div>
      </div>

      <EquipeClient
        membres={membres}
        invitations={invitations}
        monRole={contexte.roleActif}
        monId={contexte.utilisateur.id}
        nomPressing={contexte.pressingActif.nom}
        baseOrigin={baseOrigin}
        erreurInitial={erreurInitial}
      />
    </div>
  );
}

function SqueletteEquipe() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-48 animate-pulse rounded-md bg-zinc-200" />
      <div className="h-48 animate-pulse rounded-md bg-zinc-100" />
      <div className="h-32 animate-pulse rounded-md bg-zinc-100" />
    </div>
  );
}

export default function PageEquipe() {
  return (
    <Suspense fallback={<SqueletteEquipe />}>
      <ContenuEquipe />
    </Suspense>
  );
}
