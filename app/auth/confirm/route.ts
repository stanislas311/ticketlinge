import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const nextParam = searchParams.get("next");

  // Securite : limitation aux chemins relatifs internes pour eviter les redirections ouvertes
  let destination = "/creer-pressing";
  if (
    nextParam &&
    nextParam.startsWith("/") &&
    !nextParam.startsWith("//") &&
    !nextParam.startsWith("/connexion") &&
    !nextParam.startsWith("/inscription")
  ) {
    destination = nextParam;
  }

  if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });

    if (!error) {
      return NextResponse.redirect(new URL(destination, request.url));
    }
  }

  return NextResponse.redirect(
    new URL("/connexion?erreur=confirmation_invalide", request.url),
  );
}
