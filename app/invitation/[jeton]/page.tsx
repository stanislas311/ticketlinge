import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { validerFormatJeton } from "@/lib/invitation";
import { InvitationClient } from "./invitation-client";

export const metadata: Metadata = {
  title: "Invitation - Ticketlinge",
};

interface ProprietesPageInvitation {
  params: Promise<{ jeton: string }>;
}

async function ContenuInvitation({
  params,
}: {
  params: Promise<{ jeton: string }>;
}) {
  await connection();
  const { jeton } = await params;

  if (!validerFormatJeton(jeton)) {
    return (
      <div className="rounded-lg border border-red-200 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-lg font-semibold text-red-600">
          Invitation invalide
        </h2>
        <p className="mt-2 text-sm text-zinc-600">
          Ce lien d&apos;invitation est invalide ou incomplet.
        </p>
        <div className="mt-6">
          <Link
            href="/"
            className="inline-flex rounded-md bg-[#0E5A6B] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0a4553]"
          >
            Retour a l&apos;accueil
          </Link>
        </div>
      </div>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <InvitationClient
      jeton={jeton}
      estConnecte={Boolean(user)}
      emailConnecte={user?.email}
    />
  );
}

function SqueletteInvitation() {
  return (
    <div className="h-64 animate-pulse rounded-lg border border-zinc-200 bg-white p-8" />
  );
}

export default function PageInvitation({ params }: ProprietesPageInvitation) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12 sm:px-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xl font-bold tracking-tight text-[#0E5A6B] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0E5A6B]"
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
        </div>

        <Suspense fallback={<SqueletteInvitation />}>
          <ContenuInvitation params={params} />
        </Suspense>
      </div>
    </div>
  );
}
