export type WidgetId =
  | "thisWeek"
  | "raceDay"
  | "nextActions"
  | "weeklyChart"
  | "gymAndPRs"
  | "weeklyBreakdown"
  | "weekDetail"
  | "recentRuns";

export interface WidgetConfig {
  id: WidgetId;
  visible: boolean;
  colSpan: number; // 4, 6, 8, or 12
  order: number;
}

export interface WidgetLayout {
  [key: string]: WidgetConfig;
}

export const WIDGET_REGISTRY: Record<WidgetId, { name: string; minColSpan: number; maxColSpan: number }> = {
  thisWeek: { name: "This Week", minColSpan: 8, maxColSpan: 12 },
  raceDay: { name: "Race Day", minColSpan: 4, maxColSpan: 8 },
  nextActions: { name: "Next Actions", minColSpan: 4, maxColSpan: 8 },
  weeklyChart: { name: "Weekly Distance Chart", minColSpan: 6, maxColSpan: 12 },
  gymAndPRs: { name: "Gym & Personal Records", minColSpan: 4, maxColSpan: 8 },
  weeklyBreakdown: { name: "Weekly Breakdown", minColSpan: 4, maxColSpan: 12 },
  weekDetail: { name: "Week Detail", minColSpan: 4, maxColSpan: 8 },
  recentRuns: { name: "Recent Runs", minColSpan: 8, maxColSpan: 12 },
};

export const DEFAULT_LAYOUT: WidgetLayout = {
  thisWeek: { id: "thisWeek", visible: true, colSpan: 12, order: 0 },
  raceDay: { id: "raceDay", visible: true, colSpan: 6, order: 1 },
  nextActions: { id: "nextActions", visible: true, colSpan: 6, order: 2 },
  weeklyChart: { id: "weeklyChart", visible: true, colSpan: 12, order: 3 },
  gymAndPRs: { id: "gymAndPRs", visible: true, colSpan: 6, order: 4 },
  weeklyBreakdown: { id: "weeklyBreakdown", visible: true, colSpan: 6, order: 5 },
  weekDetail: { id: "weekDetail", visible: true, colSpan: 6, order: 6 },
  recentRuns: { id: "recentRuns", visible: true, colSpan: 12, order: 7 },
};

export const LAYOUT_STORAGE_KEY = "widgetLayout_v3";
