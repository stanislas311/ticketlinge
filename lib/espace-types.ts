export interface InfoPressing {
  id: string;
  nom: string;
  ville: string;
  telephone: string | null;
  plan: string;
}

export interface AdhesionUtilisateur {
  role: "proprietaire" | "gerant" | "receptionniste";
  pressing: InfoPressing;
}

export interface ContexteEspace {
  utilisateur: {
    id: string;
    email: string;
  };
  pressingActif: InfoPressing;
  roleActif: "proprietaire" | "gerant" | "receptionniste";
  adhesions: AdhesionUtilisateur[];
}

export function libelleRole(role: string): string {
  switch (role) {
    case "proprietaire":
      return "Proprietaire";
    case "gerant":
      return "Gerant";
    case "receptionniste":
      return "Receptionniste";
    default:
      return role;
  }
}
