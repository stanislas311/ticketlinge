import { describe, expect, it } from "vitest";
import {
  dateAbidjanVersValeurSaisie,
  dateRetraitParDefaut,
  formaterDateAbidjan,
  formaterNumeroTicket,
  heureAbidjanVersUtcIso,
  totalEstime,
} from "../lib/depots";

describe("dateRetraitParDefaut", () => {
  it("propose un retrait 48 heures apres la date actuelle", () => {
    const maintenant = new Date("2026-10-22T11:00:00.000Z");
    expect(dateRetraitParDefaut(maintenant).toISOString()).toBe(
      "2026-10-24T11:00:00.000Z",
    );
  });
});

describe("totalEstime", () => {
  it("calcule un total en entiers", () => {
    expect(
      totalEstime([
        { prix_unitaire_xof: 1500, quantite: 2 },
        { prix_unitaire_xof: 750, quantite: 1 },
      ]),
    ).toBe(3750);
  });

  it("refuse un prix non entier", () => {
    expect(() =>
      totalEstime([{ prix_unitaire_xof: 1500.5, quantite: 1 }]),
    ).toThrow();
  });
});

describe("formatage du ticket et de la date", () => {
  it("formate le numero du ticket dans le fuseau d'Abidjan", () => {
    expect(formaterNumeroTicket("2026-10-21T23:30:00.000Z", 3)).toBe(
      "DP-20261021-0003",
    );
  });

  it("affiche une date dans le fuseau d'Abidjan", () => {
    expect(formaterDateAbidjan("2026-10-22T11:05:00.000Z")).toContain(
      "22/10/2026",
    );
  });
});

describe("conversion entre heure d'Abidjan et UTC", () => {
  it("convertit l'heure locale en ISO UTC", () => {
    expect(heureAbidjanVersUtcIso("2026-10-24T13:45")).toBe(
      "2026-10-24T13:45:00.000Z",
    );
  });

  it("convertit un instant UTC en valeur de saisie locale", () => {
    expect(dateAbidjanVersValeurSaisie(new Date("2026-10-24T13:45:00.000Z"))).toBe(
      "2026-10-24T13:45",
    );
  });

  it("refuse une date locale invalide", () => {
    expect(() => heureAbidjanVersUtcIso("2026-02-30T12:00")).toThrow();
  });
});
