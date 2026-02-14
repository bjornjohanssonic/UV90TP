import { describe, it, expect } from "vitest";
import { generatePlan } from "./training-plan";
import type { PlanConfig } from "@/types";

// --- Helper ----------------------------------------------------------------

function makeConfig(overrides: Partial<PlanConfig> = {}): PlanConfig {
  return {
    raceName: "Test Ultra 90K",
    raceDate: "2026-12-01",
    raceDistanceKm: 90,
    startingVolumeKm: 30,
    totalWeeks: 28,
    ...overrides,
  };
}

// --- Total week count -------------------------------------------------------

describe("total week count", () => {
  it("matches the input totalWeeks", () => {
    const plan = generatePlan(makeConfig({ totalWeeks: 28 }));
    expect(plan.weeks).toHaveLength(28);
    expect(plan.totalWeeks).toBe(28);
  });

  it("works with a different week count", () => {
    const plan = generatePlan(makeConfig({ totalWeeks: 20 }));
    expect(plan.weeks).toHaveLength(20);
    expect(plan.totalWeeks).toBe(20);
  });
});

// --- Recovery week positions ------------------------------------------------

describe("recovery week positions", () => {
  it("weeks 4, 8, 12, 16, 20 have phase recovery", () => {
    const plan = generatePlan(makeConfig({ totalWeeks: 28 }));
    const recoveryPositions = [4, 8, 12, 16, 20];

    for (const weekNum of recoveryPositions) {
      const week = plan.weeks.find((w) => w.weekNumber === weekNum);
      expect(week, 'week ' + weekNum + ' should exist').toBeDefined();
      expect(week!.phase, 'week ' + weekNum + ' should be recovery').toBe("recovery");
    }
  });

  it("non-recovery build weeks are not marked as recovery", () => {
    const plan = generatePlan(makeConfig({ totalWeeks: 28 }));
    const buildWeeks = plan.weeks.filter(
      (w) => w.weekNumber <= 24 && ![4, 8, 12, 16, 20].includes(w.weekNumber),
    );
    for (const week of buildWeeks) {
      expect(week.phase, 'week ' + week.weekNumber + ' should be build').toBe("build");
    }
  });
});
