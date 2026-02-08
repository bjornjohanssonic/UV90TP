import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import {
  WIDGET_REGISTRY,
  DEFAULT_LAYOUT,
  LAYOUT_STORAGE_KEY,
  type WidgetId,
  type WidgetConfig,
} from "./widget-types";

// ─── Registry / Layout consistency ──────────────────────────────────────────

describe("WIDGET_REGISTRY", () => {
  it("has a name for every widget ID", () => {
    for (const [id, entry] of Object.entries(WIDGET_REGISTRY)) {
      expect(typeof entry.name).toBe("string");
      expect(entry.name.length).toBeGreaterThan(0);
    }
  });

  it("every entry has valid minColSpan and maxColSpan (4-12, min <= max)", () => {
    for (const [id, entry] of Object.entries(WIDGET_REGISTRY)) {
      expect(entry.minColSpan).toBeGreaterThanOrEqual(4);
      expect(entry.minColSpan).toBeLessThanOrEqual(12);
      expect(entry.maxColSpan).toBeGreaterThanOrEqual(4);
      expect(entry.maxColSpan).toBeLessThanOrEqual(12);
      expect(entry.minColSpan).toBeLessThanOrEqual(entry.maxColSpan);
    }
  });
});

describe("DEFAULT_LAYOUT", () => {
  it("has an entry for every widget in the registry", () => {
    const registryIds = Object.keys(WIDGET_REGISTRY);
    const layoutIds = Object.keys(DEFAULT_LAYOUT);
    for (const id of registryIds) {
      expect(layoutIds).toContain(id);
    }
  });

  it("has no extra entries not in the registry", () => {
    const registryIds = Object.keys(WIDGET_REGISTRY);
    const layoutIds = Object.keys(DEFAULT_LAYOUT);
    for (const id of layoutIds) {
      expect(registryIds).toContain(id);
    }
  });

  it("every entry has valid colSpan (4-12)", () => {
    for (const config of Object.values(DEFAULT_LAYOUT)) {
      expect(config.colSpan).toBeGreaterThanOrEqual(4);
      expect(config.colSpan).toBeLessThanOrEqual(12);
    }
  });

  it("every entry colSpan is within its registry bounds", () => {
    for (const [id, config] of Object.entries(DEFAULT_LAYOUT)) {
      const reg = WIDGET_REGISTRY[id as WidgetId];
      expect(config.colSpan).toBeGreaterThanOrEqual(reg.minColSpan);
      expect(config.colSpan).toBeLessThanOrEqual(reg.maxColSpan);
    }
  });

  it("every entry has a unique order", () => {
    const orders = Object.values(DEFAULT_LAYOUT).map((c) => c.order);
    const unique = new Set(orders);
    expect(unique.size).toBe(orders.length);
  });

  it("orders are contiguous starting from 0", () => {
    const orders = Object.values(DEFAULT_LAYOUT)
      .map((c) => c.order)
      .sort((a, b) => a - b);
    orders.forEach((order, i) => {
      expect(order).toBe(i);
    });
  });

  it("every entry has id matching its key", () => {
    for (const [key, config] of Object.entries(DEFAULT_LAYOUT)) {
      expect(config.id).toBe(key);
    }
  });

  it("every entry defaults to visible", () => {
    for (const config of Object.values(DEFAULT_LAYOUT)) {
      expect(config.visible).toBe(true);
    }
  });
});

describe("LAYOUT_STORAGE_KEY", () => {
  it("is a non-empty string", () => {
    expect(typeof LAYOUT_STORAGE_KEY).toBe("string");
    expect(LAYOUT_STORAGE_KEY.length).toBeGreaterThan(0);
  });

  it("includes version identifier", () => {
    expect(LAYOUT_STORAGE_KEY).toContain("v3");
  });
});

// ─── Widget component files exist ───────────────────────────────────────────

describe("widget component files", () => {
  const widgetsDir = path.resolve(__dirname);

  // Map from widget ID to expected file name
  const widgetFiles: Record<string, string> = {
    thisWeek: "this-week.tsx",
    raceDay: "race-day.tsx",
    nextActions: "next-actions.tsx",
    weeklyChart: "weekly-chart.tsx",
    gymAndPRs: "gym-and-prs.tsx",
    weeklyBreakdown: "weekly-breakdown.tsx",
    weekDetail: "week-detail.tsx",
    recentRuns: "recent-runs.tsx",
  };

  it("has a component file for every widget in the registry", () => {
    for (const widgetId of Object.keys(WIDGET_REGISTRY)) {
      const fileName = widgetFiles[widgetId];
      expect(fileName).toBeDefined();
      const filePath = path.join(widgetsDir, fileName);
      expect(fs.existsSync(filePath)).toBe(true);
    }
  });

  it("widget-container.tsx exists", () => {
    expect(fs.existsSync(path.join(widgetsDir, "widget-container.tsx"))).toBe(true);
  });
});

// ─── dashboard-helpers.ts exists and exports ────────────────────────────────

describe("dashboard-helpers module", () => {
  it("can be imported", async () => {
    const mod = await import("@/lib/dashboard-helpers");
    expect(mod.COLORS).toBeDefined();
    expect(mod.formatKm).toBeTypeOf("function");
    expect(mod.formatTime).toBeTypeOf("function");
    expect(mod.formatPace).toBeTypeOf("function");
    expect(mod.formatDate).toBeTypeOf("function");
    expect(mod.getMonday).toBeTypeOf("function");
    expect(mod.aggregateWeeks).toBeTypeOf("function");
    expect(mod.computePRs).toBeTypeOf("function");
    expect(mod.generateNextActions).toBeTypeOf("function");
  });
});
