import { describe, it, expect } from "vitest";
import { formaterPrixXOF } from "../lib/format";

describe("formaterPrixXOF", () => {
  it("formate correctement 0 franc CFA", () => {
    const resultat = formaterPrixXOF(0);
    expect(resultat).toContain("0");
    expect(resultat).toMatch(/F\s?CFA|XOF/);
  });

  it("formate des milliers avec séparateur d'espace", () => {
    const resultat = formaterPrixXOF(1500);
    // 1 500 F CFA (avec espace insécable standard)
    expect(resultat.replace(/\s/g, " ")).toContain("1 500");
  });

  it("arrondit à l'entier et refuse les décimales", () => {
    const resultat = formaterPrixXOF(2500.4);
    expect(resultat.replace(/\s/g, " ")).toContain("2 500");
  });

  it("rejette les montants négatifs", () => {
    expect(() => formaterPrixXOF(-500)).toThrow();
  });

  it("rejette les valeurs non finies", () => {
    expect(() => formaterPrixXOF(Infinity)).toThrow();
    expect(() => formaterPrixXOF(NaN)).toThrow();
  });
});
