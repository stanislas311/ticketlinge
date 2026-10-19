import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const COOKIE_PRESSING_ID = "ticketlinge_pressing_id";

export * from "./espace-types";
import type { ContexteEspace, InfoPressing, AdhesionUtilisateur } from "./espace-types";

/**
 * Obtient le contexte de l'espace connecté pour la requête courante.
 * Revalide systématiquement le cookie pressing_id côté serveur contre la base
 * de données pour empêcher toute usurpation.
 */
export async function obtenirContexteEspace(): Promise<ContexteEspace> {
  await connection();

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/connexion");
  }

  const { data: adhesionsBrutes, error } = await supabase
    .from("membres")
    .select("role, pressings (id, nom, ville, telephone, plan)")
    .eq("utilisateur_id", user.id);

  if (error || !adhesionsBrutes || adhesionsBrutes.length === 0) {
    redirect("/creer-pressing");
  }

  const adhesions: AdhesionUtilisateur[] = adhesionsBrutes.map((m) => ({
    role: m.role as "proprietaire" | "gerant" | "receptionniste",
    pressing: m.pressings as unknown as InfoPressing,
  }));

  const cookieStore = await cookies();
  const cookiePressingId = cookieStore.get(COOKIE_PRESSING_ID)?.value;

  // Revalidation stricte : vérifier que le pressing du cookie fait bien partie des adhésions
  const adhesionActive =
    adhesions.find((a) => a.pressing.id === cookiePressingId) ?? adhesions[0];

  return {
    utilisateur: {
      id: user.id,
      email: user.email ?? "",
    },
    pressingActif: adhesionActive.pressing,
    roleActif: adhesionActive.role,
    adhesions,
  };
}
