/**
 * Fonction pure de validation et normalisation des numéros de téléphone.
 * Cible le format international E.164 requis par la base de données :
 * contrainte check (telephone ~ '^\+[1-9][0-9]{7,14}$')
 */

export interface ResultatTelephone {
  valide: boolean;
  telephone?: string;
  erreur?: string;
}

export function normaliserTelephone(brut: unknown): ResultatTelephone {
  if (typeof brut !== "string") {
    return {
      valide: false,
      erreur: "Le numero de telephone doit etre une chaine de caracteres.",
    };
  }

  const texte = brut.trim();
  if (!texte) {
    return {
      valide: false,
      erreur: "Le numero de telephone est obligatoire.",
    };
  }

  // Nettoyage de tous les separateurs (espaces, tirets, points, parentheses)
  const nettoye = texte.replace(/[\s.\-()]/g, "");

  let normalise: string;

  // Cas 1 : numero ivoirien local a 10 chiffres debutant par 0 (ex : 0712345678)
  if (/^0\d{9}$/.test(nettoye)) {
    normalise = `+225${nettoye}`;
  }
  // Cas 2 : numero ivoirien avec indicatif +225 et 10 chiffres avec le 0 initial (ex : +2250712345678)
  else if (/^\+2250\d{9}$/.test(nettoye)) {
    normalise = nettoye;
  }
  // Cas 3 : numero ivoirien saisi 2250XXXXXXXXX sans le +
  else if (/^2250\d{9}$/.test(nettoye)) {
    normalise = `+${nettoye}`;
  }
  // Cas 4 : numero international general au format E.164 debutant par +
  else if (/^\+[1-9]\d{7,14}$/.test(nettoye)) {
    normalise = nettoye;
  }
  // Format inconnu ou invalide
  else {
    return {
      valide: false,
      erreur:
        "Numero de telephone invalide. Exemple attendu : 07 12 34 56 78 ou +225 07 12 34 56 78.",
    };
  }

  // Validation finale stricte selon la contrainte de la base : ^\+[1-9][0-9]{7,14}$
  const regexE164 = /^\+[1-9][0-9]{7,14}$/;
  if (!regexE164.test(normalise)) {
    return {
      valide: false,
      erreur:
        "Le numero de telephone ne respecte pas le format international E.164.",
    };
  }

  return {
    valide: true,
    telephone: normalise,
  };
}
