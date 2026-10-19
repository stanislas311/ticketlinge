/**
 * Fonctions pures pour la gestion des invitations et des redirections securisees.
 */

/**
 * Valide qu'un chemin de redirection est un chemin relatif interne securise.
 * Rejette les URLs absolues, doubles slashes (//evil.com), caracteres de controle,
 * et redirections cycliques vers la connexion ou l'inscription.
 */
export function validerCheminRetour(chemin: unknown): string | null {
  if (typeof chemin !== "string" || !chemin) {
    return null;
  }

  // Interdire les retours a la ligne, tabulations ou caracteres suspects
  if (/[\r\n\t\0]/.test(chemin)) {
    return null;
  }

  const nettoye = chemin.trim();

  // Doit commencer par un slash simple
  if (!nettoye.startsWith("/") || nettoye.startsWith("//") || nettoye.startsWith("/\\")) {
    return null;
  }

  // Interdire les retours a la ligne, tabulations ou caracteres suspects
  if (/[\r\n\t\0]/.test(nettoye)) {
    return null;
  }

  // Interdire les redirections en boucle vers la connexion ou l'inscription
  if (
    nettoye === "/connexion" ||
    nettoye.startsWith("/connexion?") ||
    nettoye === "/inscription" ||
    nettoye.startsWith("/inscription?")
  ) {
    return null;
  }

  // Doit pouvoir etre analyse comme une URL relative valide
  try {
    const url = new URL(nettoye, "http://localhost");
    if (url.origin !== "http://localhost") {
      return null;
    }
    return url.pathname + url.search + url.hash;
  } catch {
    return null;
  }
}

/**
 * Construit l'URL complete d'une invitation a partir de l'origine de base et du jeton.
 */
export function construireLienInvitation(baseOrigin: string, jeton: string): string {
  const originePropre = baseOrigin.replace(/\/+$/, "");
  const jetonNettoye = jeton.trim();
  return `${originePropre}/invitation/${encodeURIComponent(jetonNettoye)}`;
}

/**
 * Construit un lien WhatsApp (wa.me) avec un message d'invitation pre-rempli.
 */
export function construireLienWhatsApp(
  lienInvitation: string,
  nomPressing: string,
  role: "gerant" | "receptionniste",
): string {
  const libelleRole = role === "gerant" ? "gerant" : "receptionniste";
  const message = `Bonjour, vous avez ete invite a rejoindre l'equipe du pressing ${nomPressing} en tant que ${libelleRole}.\n\nCliquez sur ce lien pour accepter l'invitation (valable 7 jours) :\n${lienInvitation}`;

  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

/**
 * Valide le format d'un jeton d'invitation (chaine base64url non vide).
 */
export function validerFormatJeton(jeton: unknown): boolean {
  if (typeof jeton !== "string") {
    return false;
  }
  const nettoye = jeton.trim();
  // Jeton base64url de 32 octets (environ 43-44 caracteres alphanumeriques avec - et _)
  return /^[A-Za-z0-9_-]{20,100}$/.test(nettoye);
}
