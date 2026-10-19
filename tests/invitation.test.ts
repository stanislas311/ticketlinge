import { describe, it, expect } from "vitest";
import {
  validerCheminRetour,
  construireLienInvitation,
  construireLienWhatsApp,
  validerFormatJeton,
} from "../lib/invitation";

describe("validerCheminRetour", () => {
  it("accepte un chemin relatif simple", () => {
    expect(validerCheminRetour("/tableau-de-bord")).toBe("/tableau-de-bord");
    expect(validerCheminRetour("/invitation/abc123_-XYZ")).toBe(
      "/invitation/abc123_-XYZ",
    );
  });

  it("preserve les parametres de requete et ancres", () => {
    expect(validerCheminRetour("/clients?q=test#top")).toBe(
      "/clients?q=test#top",
    );
  });

  it("rejette les URLs absolues", () => {
    expect(validerCheminRetour("https://evil.com")).toBeNull();
    expect(validerCheminRetour("http://localhost:3000")).toBeNull();
    expect(validerCheminRetour("//evil.com")).toBeNull();
    expect(validerCheminRetour("/\\evil.com")).toBeNull();
  });

  it("rejette les chemins suspects ou avec caracteres de controle", () => {
    expect(validerCheminRetour("/test\nnewline")).toBeNull();
    expect(validerCheminRetour("/test\r\n")).toBeNull();
    expect(validerCheminRetour("/test\0null")).toBeNull();
  });

  it("rejette les boucles de redirection vers connexion et inscription", () => {
    expect(validerCheminRetour("/connexion")).toBeNull();
    expect(validerCheminRetour("/connexion?erreur=test")).toBeNull();
    expect(validerCheminRetour("/inscription")).toBeNull();
    expect(validerCheminRetour("/inscription?suivant=/test")).toBeNull();
  });

  it("rejette les entrees invalides ou vides", () => {
    expect(validerCheminRetour(null)).toBeNull();
    expect(validerCheminRetour(undefined)).toBeNull();
    expect(validerCheminRetour("")).toBeNull();
    expect(validerCheminRetour("   ")).toBeNull();
    expect(validerCheminRetour(123)).toBeNull();
  });
});

describe("construireLienInvitation", () => {
  it("construit l'URL complete sans double slash", () => {
    expect(
      construireLienInvitation("https://ticketlinge.vercel.app", "tok123"),
    ).toBe("https://ticketlinge.vercel.app/invitation/tok123");

    expect(
      construireLienInvitation("https://ticketlinge.vercel.app/", "tok123"),
    ).toBe("https://ticketlinge.vercel.app/invitation/tok123");

    expect(
      construireLienInvitation("http://localhost:3000///", "abc_123-xyz"),
    ).toBe("http://localhost:3000/invitation/abc_123-xyz");
  });

  it("encode les caracteres speciaux du jeton", () => {
    expect(
      construireLienInvitation("https://example.com", "jeton/test?a=1"),
    ).toBe("https://example.com/invitation/jeton%2Ftest%3Fa%3D1");
  });
});

describe("construireLienWhatsApp", () => {
  it("genere un lien wa.me encode avec le nom du pressing et le role", () => {
    const url = construireLienWhatsApp(
      "https://ticketlinge.vercel.app/invitation/abc",
      "Pressing Ivoire",
      "gerant",
    );
    expect(url.startsWith("https://wa.me/?text=")).toBe(true);
    const decoded = decodeURIComponent(url.replace("https://wa.me/?text=", ""));
    expect(decoded).toContain("Pressing Ivoire");
    expect(decoded).toContain("gerant");
    expect(decoded).toContain("https://ticketlinge.vercel.app/invitation/abc");
    expect(decoded).toContain("7 jours");
  });

  it("gere correctement le role receptionniste", () => {
    const url = construireLienWhatsApp(
      "https://example.com/invitation/xyz",
      "Pressing Central",
      "receptionniste",
    );
    const decoded = decodeURIComponent(url.replace("https://wa.me/?text=", ""));
    expect(decoded).toContain("receptionniste");
  });
});

describe("validerFormatJeton", () => {
  it("valide les jetons base64url standard", () => {
    expect(validerFormatJeton("abcdefghijklmnopqrstuvwxyz1234567890_-ABCDE")).toBe(true);
  });

  it("rejette les jetons trop courts ou contenant des caracteres invalides", () => {
    expect(validerFormatJeton("court")).toBe(false);
    expect(validerFormatJeton("jeton avec espaces 12345678901234567890")).toBe(false);
    expect(validerFormatJeton("jeton+avec+plus/slash=padding12345678901234")).toBe(false);
    expect(validerFormatJeton(null)).toBe(false);
  });
});
