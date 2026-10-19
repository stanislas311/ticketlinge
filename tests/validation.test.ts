import { describe, it, expect } from "vitest";
import { validerChaine, validerPrixXOF } from "../lib/validation";

describe("validerChaine", () => {
  it("valide une chaîne correcte", () => {
    const res = validerChaine("Chemise", "Article", 2, 100);
    expect(res.valide).toBe(true);
    expect(res.valeur).toBe("Chemise");
  });

  it("applique le trim sur la chaîne", () => {
    const res = validerChaine("   Lavage et repassage   ", "Service", 2, 100);
    expect(res.valide).toBe(true);
    expect(res.valeur).toBe("Lavage et repassage");
  });

  it("rejette les chaînes trop courtes après trim", () => {
    const res = validerChaine(" a ", "Nom", 2, 100);
    expect(res.valide).toBe(false);
    expect(res.erreur).toContain("entre 2 et 100 caracteres");
  });

  it("rejette les chaînes dépassant la taille maximale", () => {
    const longueChaine = "a".repeat(101);
    const res = validerChaine(longueChaine, "Nom", 2, 100);
    expect(res.valide).toBe(false);
  });

  it("rejette les valeurs non-chaînes", () => {
    const res = validerChaine(undefined, "Nom");
    expect(res.valide).toBe(false);
  });
});

describe("validerPrixXOF", () => {
  it("valide un prix entier positif", () => {
    const res = validerPrixXOF(1500);
    expect(res.valide).toBe(true);
    expect(res.valeur).toBe(1500);
  });

  it("valide un prix nul (0)", () => {
    const res = validerPrixXOF(0);
    expect(res.valide).toBe(true);
    expect(res.valeur).toBe(0);
  });

  it("valide un prix sous forme de chaîne numérique", () => {
    const res = validerPrixXOF("2500");
    expect(res.valide).toBe(true);
    expect(res.valeur).toBe(2500);
  });

  it("rejette les prix décimaux", () => {
    const res = validerPrixXOF(1500.5);
    expect(res.valide).toBe(false);
  });

  it("rejette les prix négatifs", () => {
    const res = validerPrixXOF(-100);
    expect(res.valide).toBe(false);
  });

  it("rejette les chaînes non numériques", () => {
    const res = validerPrixXOF("gratuit");
    expect(res.valide).toBe(false);
  });
});
