import Link from "next/link";

export default function PageAccueil() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Barre de navigation */}
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
          <nav className="flex items-center gap-3">
            <Link
              href="/connexion"
              className="rounded-md px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0E5A6B]"
            >
              Se connecter
            </Link>
            <Link
              href="/inscription"
              className="rounded-md bg-[#0E5A6B] px-3.5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-[#0a4553] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0E5A6B]"
            >
              Creer mon espace
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero section */}
      <main className="flex-1">
        <section className="mx-auto max-w-5xl px-4 py-16 text-center sm:px-6 sm:py-24">
          <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 sm:text-5xl">
            La gestion de votre pressing,{" "}
            <span className="text-[#0E5A6B]">simplifiee</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base text-zinc-600 sm:text-lg">
            Ticketlinge accompagne les pressings au quotidien : enregistrement
            des articles, edition des tickets, suivi des etats de lavage et
            gestion securisee par etablissement.
          </p>

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/inscription"
              className="inline-flex items-center justify-center rounded-md bg-[#0E5A6B] px-6 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-[#0a4553] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0E5A6B]"
            >
              Creer mon espace
            </Link>
            <Link
              href="/connexion"
              className="inline-flex items-center justify-center rounded-md border border-zinc-300 bg-white px-6 py-3 text-base font-semibold text-zinc-700 shadow-sm transition hover:bg-zinc-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0E5A6B]"
            >
              Se connecter
            </Link>
          </div>
        </section>

        {/* Presentation des atouts */}
        <section className="border-t border-zinc-200 bg-white py-16">
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <h2 className="text-center text-xl font-bold text-zinc-900 sm:text-2xl">
              Pense pour l&apos;efficacite de votre equipe
            </h2>

            <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-3">
              <div className="rounded-lg border border-zinc-200 p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[#0E5A6B]/10 text-[#0E5A6B]">
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
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                    <polyline points="10 9 9 9 8 9" />
                  </svg>
                </div>
                <h3 className="mt-4 text-base font-semibold text-zinc-900">
                  Tickets et depots
                </h3>
                <p className="mt-2 text-sm text-zinc-600">
                  Enregistrez rapidement chaque article avec son type de
                  traitement et imprimez ou partagez les recus clients.
                </p>
              </div>

              <div className="rounded-lg border border-zinc-200 p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[#0E5A6B]/10 text-[#0E5A6B]">
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
                </div>
                <h3 className="mt-4 text-base font-semibold text-zinc-900">
                  Fichier clients
                </h3>
                <p className="mt-2 text-sm text-zinc-600">
                  Retrouvez instantanement les coordonnees et l&apos;historique
                  de vos clients pour un accueil fluide au comptoir.
                </p>
              </div>

              <div className="rounded-lg border border-zinc-200 p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[#0E5A6B]/10 text-[#0E5A6B]">
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
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                </div>
                <h3 className="mt-4 text-base font-semibold text-zinc-900">
                  Espaces etanches
                </h3>
                <p className="mt-2 text-sm text-zinc-600">
                  Chaque pressing dispose d&apos;un espace completement isole
                  avec des roles definis pour proprietaires et employes.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Pied de page */}
      <footer className="border-t border-zinc-200 bg-zinc-50 py-6 text-center text-xs text-zinc-500">
        <div className="mx-auto max-w-5xl px-4">
          <p>Ticketlinge &copy; 2026 - Plateforme de gestion de pressing.</p>
        </div>
      </footer>
    </div>
  );
}
