const FUSEAU_ABIDJAN = "Africa/Abidjan";
const DEUX_JOURS_MS = 48 * 60 * 60 * 1000;

interface LigneEstimee {
  prix_unitaire_xof: number;
  quantite: number;
}

function extraireParties(date: Date): Record<string, number> {
  if (!Number.isFinite(date.getTime())) {
    throw new Error("La date fournie est invalide.");
  }

  const parties = new Intl.DateTimeFormat("en-GB", {
    timeZone: FUSEAU_ABIDJAN,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  return Object.fromEntries(
    parties
      .filter((partie) => partie.type !== "literal")
      .map((partie) => [partie.type, Number(partie.value)]),
  );
}

function dateHeureSaisieVersUtc(valeur: string): Date {
  const correspondance =
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(valeur);
  if (!correspondance) {
    throw new Error("La date de retrait doit etre valide.");
  }

  const [, anneeTexte, moisTexte, jourTexte, heureTexte, minuteTexte] =
    correspondance;
  const cible = {
    year: Number(anneeTexte),
    month: Number(moisTexte),
    day: Number(jourTexte),
    hour: Number(heureTexte),
    minute: Number(minuteTexte),
  };

  const estimation = Date.UTC(
    cible.year,
    cible.month - 1,
    cible.day,
    cible.hour,
    cible.minute,
  );
  const dateEstimee = new Date(estimation);
  if (
    dateEstimee.getUTCFullYear() !== cible.year ||
    dateEstimee.getUTCMonth() + 1 !== cible.month ||
    dateEstimee.getUTCDate() !== cible.day ||
    cible.hour > 23 ||
    cible.minute > 59
  ) {
    throw new Error("La date de retrait doit etre valide.");
  }

  let instant = estimation;
  for (let iteration = 0; iteration < 3; iteration += 1) {
    const parties = extraireParties(new Date(instant));
    const heureLocaleUtc = Date.UTC(
      parties.year,
      parties.month - 1,
      parties.day,
      parties.hour,
      parties.minute,
    );
    const difference = estimation - heureLocaleUtc;
    instant += difference;
    if (difference === 0) break;
  }

  const resultat = new Date(instant);
  const partiesFinales = extraireParties(resultat);
  if (
    partiesFinales.year !== cible.year ||
    partiesFinales.month !== cible.month ||
    partiesFinales.day !== cible.day ||
    partiesFinales.hour !== cible.hour ||
    partiesFinales.minute !== cible.minute
  ) {
    throw new Error("Cette heure locale n'existe pas dans le fuseau d'Abidjan.");
  }

  return resultat;
}

export function dateRetraitParDefaut(maintenant = new Date()): Date {
  if (!Number.isFinite(maintenant.getTime())) {
    throw new Error("La date actuelle est invalide.");
  }
  return new Date(maintenant.getTime() + DEUX_JOURS_MS);
}

export function totalEstime(lignes: LigneEstimee[]): number {
  return lignes.reduce((total, ligne) => {
    if (
      !Number.isSafeInteger(ligne.prix_unitaire_xof) ||
      ligne.prix_unitaire_xof < 0 ||
      !Number.isSafeInteger(ligne.quantite) ||
      ligne.quantite < 1 ||
      ligne.quantite > 999
    ) {
      throw new Error("Les prix et quantites doivent etre des entiers valides.");
    }

    const nouveauTotal = total + ligne.prix_unitaire_xof * ligne.quantite;
    if (!Number.isSafeInteger(nouveauTotal)) {
      throw new Error("Le total estime depasse la valeur autorisee.");
    }
    return nouveauTotal;
  }, 0);
}

export function formaterNumeroTicket(dateIso: string, numero: number): string {
  const date = new Date(dateIso);
  if (!Number.isFinite(date.getTime()) || !Number.isSafeInteger(numero) || numero < 1) {
    throw new Error("Le numero de ticket ou la date est invalide.");
  }

  const parties = extraireParties(date);
  const jour = `${parties.year}${String(parties.month).padStart(2, "0")}${String(
    parties.day,
  ).padStart(2, "0")}`;
  return `DP-${jour}-${String(numero).padStart(4, "0")}`;
}

export function formaterDateAbidjan(dateIso: string): string {
  const date = new Date(dateIso);
  if (!Number.isFinite(date.getTime())) {
    throw new Error("La date fournie est invalide.");
  }

  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: FUSEAU_ABIDJAN,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function dateAbidjanVersValeurSaisie(date: Date): string {
  const parties = extraireParties(date);
  return `${parties.year}-${String(parties.month).padStart(2, "0")}-${String(
    parties.day,
  ).padStart(2, "0")}T${String(parties.hour).padStart(2, "0")}:${String(
    parties.minute,
  ).padStart(2, "0")}`;
}

export function heureAbidjanVersUtcIso(valeur: string): string {
  return dateHeureSaisieVersUtc(valeur).toISOString();
}
