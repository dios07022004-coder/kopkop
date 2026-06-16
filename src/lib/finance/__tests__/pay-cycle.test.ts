import { describe, it, expect } from "vitest";
import { clampDay, nextPayday, lastPayday, cycleBounds, hasPayday } from "../pay-cycle";

const d = (s: string) => new Date(`${s}T00:00:00Z`);

describe("pay-cycle", () => {
  it("clampDay сжимает 31 в коротком месяце", () => {
    expect(clampDay(31, 2026, 1)).toBe(28); // февраль 2026
    expect(clampDay(15, 2026, 0)).toBe(15);
    expect(clampDay(0, 2026, 0)).toBe(1);
  });

  it("nextPayday: до дня зарплаты — в этом месяце", () => {
    expect(nextPayday(10, d("2026-06-05")).toISOString().slice(0, 10)).toBe("2026-06-10");
  });

  it("nextPayday: в день зарплаты — следующий месяц (зарплата уже пришла)", () => {
    expect(nextPayday(10, d("2026-06-10")).toISOString().slice(0, 10)).toBe("2026-07-10");
  });

  it("nextPayday: после дня зарплаты — следующий месяц", () => {
    expect(nextPayday(10, d("2026-06-20")).toISOString().slice(0, 10)).toBe("2026-07-10");
  });

  it("lastPayday: после дня зарплаты — в этом месяце", () => {
    expect(lastPayday(10, d("2026-06-20")).toISOString().slice(0, 10)).toBe("2026-06-10");
  });

  it("lastPayday: до дня зарплаты — прошлый месяц", () => {
    expect(lastPayday(10, d("2026-06-05")).toISOString().slice(0, 10)).toBe("2026-05-10");
  });

  it("cycleBounds: 5 июня, зарплата 10 → осталось 5 дней до 10 июня", () => {
    const b = cycleBounds(10, d("2026-06-05"));
    expect(b.start).toBe("2026-05-10");
    expect(b.end).toBe("2026-06-10");
    expect(b.daysLeft).toBe(5);
  });

  it("cycleBounds: в день зарплаты — новый цикл (~месяц впереди)", () => {
    const b = cycleBounds(10, d("2026-06-10"));
    expect(b.start).toBe("2026-06-10");
    expect(b.end).toBe("2026-07-10");
    expect(b.daysLeft).toBe(30);
  });

  it("hasPayday отсекает невалидные", () => {
    expect(hasPayday(10)).toBe(true);
    expect(hasPayday(0)).toBe(false);
    expect(hasPayday(undefined)).toBe(false);
    expect(hasPayday(32)).toBe(false);
  });
});
