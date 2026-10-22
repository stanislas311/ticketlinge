/**
 * Fonctions pures de formatage pour l'application Ticketlinge.
 */

/**
 * Formate un montant en franc CFA (XOF) sous forme d'entier, sans décimales.
 * Utilise la locale fr-FR et la devise XOF.
 *
 * @param montant Montant entier positif ou nul
 * @returns Chaîne formatée (ex : "1 500 F CFA" ou "1 500 FCFA")
 */
export function formaterPrixXOF(montant: number): string {
  if (!Number.isSafeInteger(montant) || montant < 0) {
    throw new Error("Le montant doit etre un entier positif ou nul.");
  }

  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "XOF",
    maximumFractionDigits: 0,
  }).format(montant);
}
