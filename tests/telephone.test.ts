import { describe, it, expect } from "vitest";
import { normaliserTelephone } from "../lib/telephone";

describe("normaliserTelephone", () => {
  it("normalise un numéro ivoirien avec espaces (07 12 34 56 78)", () => {
    const res = normaliserTelephone("07 12 34 56 78");
    expect(res.valide).toBe(true);
    expect(res.telephone).toBe("+2250712345678");
  });

  it("normalise un numéro ivoirien sans espace (0712345678)", () => {
    const res = normaliserTelephone("0712345678");
    expect(res.valide).toBe(true);
    expect(res.telephone).toBe("+2250712345678");
  });

  it("normalise un numéro ivoirien avec indicatif +225 et espaces (+225 07 12 34 56 78)", () => {
    const res = normaliserTelephone("+225 07 12 34 56 78");
    expect(res.valide).toBe(true);
    expect(res.telephone).toBe("+2250712345678");
  });

  it("conserve un numéro ivoirien déjà normalisé (+2250712345678)", () => {
    const res = normaliserTelephone("+2250712345678");
    expect(res.valide).toBe(true);
    expect(res.telephone).toBe("+2250712345678");
  });

  it("normalise avec des points comme séparateurs (01.02.03.04.05)", () => {
    const res = normaliserTelephone("01.02.03.04.05");
    expect(res.valide).toBe(true);
    expect(res.telephone).toBe("+2250102030405");
  });

  it("normalise un numéro saisi avec 225 sans le plus (2250712345678)", () => {
    const res = normaliserTelephone("2250712345678");
    expect(res.valide).toBe(true);
    expect(res.telephone).toBe("+2250712345678");
  });

  it("accepte un numéro international au format E.164 (+33612345678)", () => {
    const res = normaliserTelephone("+33 6 12 34 56 78");
    expect(res.valide).toBe(true);
    expect(res.telephone).toBe("+33612345678");
  });

  it("rejette les chaînes vides ou espaces seuls", () => {
    const res1 = normaliserTelephone("");
    expect(res1.valide).toBe(false);
    expect(res1.erreur).toBeDefined();

    const res2 = normaliserTelephone("   ");
    expect(res2.valide).toBe(false);
  });

  it("rejette les types non-chaînes", () => {
    const res = normaliserTelephone(null);
    expect(res.valide).toBe(false);
  });

  it("rejette les numéros trop courts", () => {
    const res = normaliserTelephone("0712345");
    expect(res.valide).toBe(false);
  });

  it("rejette les numéros avec lettres", () => {
    const res = normaliserTelephone("07123456ab");
    expect(res.valide).toBe(false);
  });
});
