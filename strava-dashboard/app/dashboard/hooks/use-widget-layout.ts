import { useState, useEffect } from "react";
import {
  type WidgetConfig,
  type WidgetLayout,
  type WidgetId,
  WIDGET_REGISTRY,
  DEFAULT_LAYOUT,
  LAYOUT_STORAGE_KEY,
} from "../widgets/widget-types";

export function useWidgetLayout() {
  const [widgetLayout, setWidgetLayout] = useState<WidgetLayout>(DEFAULT_LAYOUT);
  const [showWidgetMenu, setShowWidgetMenu] = useState(false);

  // Load saved layout
  useEffect(() => {
    const saved = localStorage.getItem(LAYOUT_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const first = Object.values(parsed)[0] as Record<string, unknown>;
        if (first && "colSpan" in first && "order" in first) {
          const merged = { ...parsed };
          for (const [id, config] of Object.entries(DEFAULT_LAYOUT)) {
            if (!(id in merged)) {
              merged[id] = config;
            }
          }
          setWidgetLayout(merged);
        }
      } catch {
        /* use default */
      }
    } else {
      const v2 = localStorage.getItem("widgetLayout_v2");
      if (v2) {
        try {
          const parsed = JSON.parse(v2);
          const migrated: WidgetLayout = {};
          for (const [id, cfg] of Object.entries(parsed) as [string, Record<string, unknown>][]) {
            const reg = WIDGET_REGISTRY[id as WidgetId];
            if (!reg) continue;
            const colSpan = Math.max(reg.minColSpan, Math.min(reg.maxColSpan, (cfg.colSpan as number) || 6));
            migrated[id] = {
              id: id as WidgetId,
              visible: (cfg.visible as boolean) ?? true,
              colSpan,
              order: (cfg.order as number) ?? 0,
            };
          }
          for (const [id, config] of Object.entries(DEFAULT_LAYOUT)) {
            if (!(id in migrated)) {
              migrated[id] = config;
            }
          }
          setWidgetLayout(migrated);
          localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(migrated));
        } catch {
          /* use default */
        }
      }
    }
  }, []);

  // Persist layout
  useEffect(() => {
    localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(widgetLayout));
  }, [widgetLayout]);

  const getOrderedVisibleWidgets = (): WidgetConfig[] =>
    Object.values(widgetLayout)
      .filter((w) => w.visible)
      .sort((a, b) => a.order - b.order);

  const getHiddenWidgets = (): WidgetConfig[] => Object.values(widgetLayout).filter((w) => !w.visible);

  const reorderWidget = (fromId: string, toId: string) => {
    const ordered = getOrderedVisibleWidgets().map((w) => w.id);
    const fromIdx = ordered.indexOf(fromId as WidgetId);
    const toIdx = ordered.indexOf(toId as WidgetId);
    if (fromIdx === -1 || toIdx === -1) return;

    ordered.splice(fromIdx, 1);
    ordered.splice(toIdx, 0, fromId as WidgetId);

    setWidgetLayout((prev) => {
      const next = { ...prev };
      ordered.forEach((id, i) => {
        next[id] = { ...next[id], order: i };
      });
      return next;
    });
  };

  const resizeWidget = (id: string, colSpan: number) => {
    setWidgetLayout((prev) => ({
      ...prev,
      [id]: { ...prev[id], colSpan },
    }));
  };

  const toggleWidgetVisibility = (id: string) => {
    setWidgetLayout((prev) => {
      const widget = prev[id];
      if (widget.visible) {
        return { ...prev, [id]: { ...widget, visible: false } };
      }
      const maxOrder = Math.max(
        ...Object.values(prev)
          .filter((w) => w.visible)
          .map((w) => w.order),
        -1,
      );
      const defaultColSpan = DEFAULT_LAYOUT[id]?.colSpan ?? 6;
      return { ...prev, [id]: { ...widget, visible: true, colSpan: defaultColSpan, order: maxOrder + 1 } };
    });
  };

  const resetLayout = () => setWidgetLayout(DEFAULT_LAYOUT);

  return {
    widgetLayout,
    showWidgetMenu,
    setShowWidgetMenu,
    getOrderedVisibleWidgets,
    getHiddenWidgets,
    reorderWidget,
    resizeWidget,
    toggleWidgetVisibility,
    resetLayout,
  };
}
