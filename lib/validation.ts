/**
 * Fonctions pures de validation pour Ticketlinge.
 */

export interface ResultatValidation<T = string> {
  valide: boolean;
  valeur?: T;
  erreur?: string;
}

/**
 * Valide une chaîne de caractères : type, trim, longueur minimale et maximale.
 */
export function validerChaine(
  brut: unknown,
  nomChamp: string,
  min = 2,
  max = 100,
): ResultatValidation<string> {
  if (typeof brut !== "string") {
    return {
      valide: false,
      erreur: `Le champ ${nomChamp} doit etre une chaine de caracteres.`,
    };
  }

  const valeur = brut.trim();
  if (valeur.length < min || valeur.length > max) {
    return {
      valide: false,
      erreur: `Le champ ${nomChamp} doit comporter entre ${min} et ${max} caracteres.`,
    };
  }

  return {
    valide: true,
    valeur,
  };
}

/**
 * Valide un prix en franc CFA (XOF) : entier positif ou nul, sans décimales.
 */
export function validerPrixXOF(brut: unknown): ResultatValidation<number> {
  let montant: number;

  if (typeof brut === "number") {
    montant = brut;
  } else if (typeof brut === "string") {
    const nettoye = brut.trim().replace(/\s/g, "");
    if (!/^\d+$/.test(nettoye)) {
      return {
        valide: false,
        erreur: "Le prix doit etre un nombre entier positif ou nul.",
      };
    }
    montant = Number(nettoye);
  } else {
    return {
      valide: false,
      erreur: "Le prix doit etre renseigne.",
    };
  }

  if (!Number.isInteger(montant) || montant < 0) {
    return {
      valide: false,
      erreur: "Le prix doit etre un nombre entier positif ou nul en francs CFA.",
    };
  }

  return {
    valide: true,
    valeur: montant,
  };
}
