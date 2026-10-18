import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { error, status } = await supabase
    .from("pressings")
    .select("id")
    .limit(1);

  return NextResponse.json({
    joignable: status !== 0,
    statut_http: status,
    erreur: error ? { code: error.code, message: error.message } : null,
  });
}
