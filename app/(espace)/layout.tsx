import { Suspense } from "react";
import { connection } from "next/server";
import { obtenirContexteEspace } from "@/lib/espace";
import { Navigation } from "./navigation";

async function BarreNavigationConnectee() {
  await connection();
  const contexte = await obtenirContexteEspace();
  return <Navigation contexte={contexte} />;
}

function SqueletteNavigation() {
  return (
    <div className="hidden w-64 shrink-0 border-r border-zinc-200 bg-white p-5 md:flex md:flex-col">
      <div className="h-8 w-32 animate-pulse rounded-md bg-zinc-200" />
      <div className="mt-6 h-24 animate-pulse rounded-md bg-zinc-100" />
      <div className="mt-6 space-y-2">
        <div className="h-9 animate-pulse rounded-md bg-zinc-100" />
        <div className="h-9 animate-pulse rounded-md bg-zinc-100" />
        <div className="h-9 animate-pulse rounded-md bg-zinc-100" />
      </div>
    </div>
  );
}

export default function LayoutEspace({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 md:flex-row">
      <Suspense fallback={<SqueletteNavigation />}>
        <BarreNavigationConnectee />
      </Suspense>
      <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8">
        {children}
      </main>
    </div>
  );
}
