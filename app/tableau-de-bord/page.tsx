import { Suspense } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { deconnexion } from "@/lib/actions/auth";

interface PressingLie {
  id: string;
  nom: string;
  ville: string;
  telephone: string | null;
  plan: string;
  fin_essai: string;
}

interface AdhesionMembre {
  role: "proprietaire" | "gerant" | "receptionniste";
  pressings: PressingLie | null;
}

function libelleRole(role: string): string {
  switch (role) {
    case "proprietaire":
      return "Proprietaire";
    case "gerant":
      return "Gerant";
    case "receptionniste":
      return "Receptionniste";
    default:
      return role;
  }
}

async function ContenuTableauDeBord() {
  const supabase = await createClient();

  // Verification de l'identite cote serveur
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/connexion");
  }

  // Lecture des pressings associes a l'utilisateur
  const { data: adhesions } = await supabase
    .from("membres")
    .select("role, pressings (id, nom, ville, telephone, plan, fin_essai)")
    .eq("utilisateur_id", user.id);

  const listeAdhesions = (adhesions as unknown as AdhesionMembre[]) || [];

  if (listeAdhesions.length === 0) {
    redirect("/creer-pressing");
  }

  return (
    <>
      <div className="flex items-center gap-4">
        <span className="hidden text-xs text-zinc-500 sm:inline">
          {user.email}
        </span>
        <form action={deconnexion}>
          <button
            type="submit"
            className="rounded-md border border-zinc-300 bg-white px-3.5 py-1.5 text-xs font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0E5A6B]"
          >
            Se deconnecter
          </button>
        </form>
      </div>

      <div className="mt-8">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
              Tableau de bord
            </h1>
            <p className="mt-1 text-sm text-zinc-600">
              Espace de gestion de vos etablissements.
            </p>
          </div>
          {listeAdhesions.length < 3 && (
            <div>
              <Link
                href="/creer-pressing"
                className="inline-flex items-center gap-1.5 rounded-md bg-[#0E5A6B] px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-[#0a4553] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0E5A6B]"
              >
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Nouveau pressing
              </Link>
            </div>
          )}
        </div>

        {/* Liste des etablissements */}
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
          {listeAdhesions.map((adhesion, index) => {
            const pressing = adhesion.pressings;
            if (!pressing) return null;

            return (
              <div
                key={pressing.id || index}
                className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm transition hover:border-zinc-300"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-zinc-900">
                      {pressing.nom}
                    </h2>
                    <p className="mt-1 text-sm text-zinc-600">
                      {pressing.ville}
                    </p>
                  </div>
                  <span className="inline-flex items-center rounded-full bg-[#0E5A6B]/10 px-2.5 py-0.5 text-xs font-medium text-[#0E5A6B]">
                    {libelleRole(adhesion.role)}
                  </span>
                </div>

                {pressing.telephone && (
                  <div className="mt-4 flex items-center gap-2 text-xs text-zinc-500">
                    <svg
                      className="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                    </svg>
                    <span>{pressing.telephone}</span>
                  </div>
                )}

                <div className="mt-6 border-t border-zinc-100 pt-4 text-xs text-zinc-500">
                  <span>Plan : </span>
                  <span className="font-medium text-zinc-700 capitalize">
                    {pressing.plan}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

function SqueletteTableauDeBord() {
  return (
    <div className="py-6 text-sm text-zinc-500">
      Chargement de votre espace...
    </div>
  );
}

export default function PageTableauDeBord() {
  return (
    <div className="flex min-h-screen flex-col bg-zinc-50">
      {/* Barre superieure */}
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-2">
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
        </div>
      </header>

      {/* Zone principale dynamique */}
      <main className="flex-1 py-10">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <Suspense fallback={<SqueletteTableauDeBord />}>
            <ContenuTableauDeBord />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
