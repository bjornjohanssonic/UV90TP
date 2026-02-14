"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { COLORS } from "@/lib/dashboard-helpers";
import type { WidgetConfig, WidgetId } from "./widget-types";
import { WIDGET_REGISTRY } from "./widget-types";
import styles from "./widget-container.module.css";

interface WidgetContainerProps {
  config: WidgetConfig;
  title: string;
  onReorder: (fromId: string, toId: string) => void;
  onResize: (colSpan: number) => void;
  onRemove: () => void;
  children: React.ReactNode;
}

export default function WidgetContainer({
  config,
  title,
  onReorder,
  onResize,
  onRemove,
  children,
}: WidgetContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isResizing, setIsResizing] = useState(false);
  const [resizePreviewSpan, setResizePreviewSpan] = useState<number | null>(null);
  const [isDragOver, setIsDragOver] = useState<"before" | "after" | null>(null);
  const [hovered, setHovered] = useState(false);

  // ─── Per-widget column constraints ──────────────────────────────────────
  const registry = WIDGET_REGISTRY[config.id as WidgetId];
  const minColSpan = registry?.minColSpan ?? 4;
  const maxColSpan = registry?.maxColSpan ?? 12;

  // ─── Drag-to-Reorder (HTML5 Drag & Drop) ───────────────────────────────

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("text/plain", config.id);
    e.dataTransfer.effectAllowed = "move";
    if (containerRef.current) {
      containerRef.current.style.opacity = "0.4";
    }
  };

  const handleDragEnd = () => {
    if (containerRef.current) {
      containerRef.current.style.opacity = "1";
    }
    setIsDragOver(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const midY = rect.top + rect.height / 2;
    setIsDragOver(e.clientY < midY ? "before" : "after");
  };

  const handleDragLeave = () => {
    setIsDragOver(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const fromId = e.dataTransfer.getData("text/plain");
    if (fromId && fromId !== config.id) {
      onReorder(fromId, config.id);
    }
    setIsDragOver(null);
  };

  // ─── Resize (horizontal only: colSpan) ─────────────────────────────────

  const resizeStartRef = useRef({ x: 0, startSpan: 0 });

  const handleResizeMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsResizing(true);
      resizeStartRef.current = {
        x: e.clientX,
        startSpan: config.colSpan,
      };
    },
    [config.colSpan],
  );

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const grid = document.getElementById("dashboard-grid");
      if (!grid) return;

      const gridWidth = grid.getBoundingClientRect().width;
      const colWidth = gridWidth / 12;
      const deltaX = e.clientX - resizeStartRef.current.x;

      const newSpan = Math.max(
        minColSpan,
        Math.min(maxColSpan, resizeStartRef.current.startSpan + Math.round(deltaX / colWidth)),
      );
      setResizePreviewSpan(newSpan);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      const finalSpan = resizePreviewSpan ?? config.colSpan;
      if (finalSpan !== config.colSpan) {
        onResize(finalSpan);
      }
      setResizePreviewSpan(null);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing, resizePreviewSpan, config.colSpan, minColSpan, maxColSpan, onResize]);

  const displaySpan = resizePreviewSpan ?? config.colSpan;

  return (
    <div
      ref={containerRef}
      className={styles.container}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        gridColumn: `span ${displaySpan}`,
        transition: isResizing ? "none" : "all 0.2s",
      }}
    >
      {/* Drop indicator - before */}
      {isDragOver === "before" && <div className={styles.dropIndicatorBefore} />}

      {/* Widget content -- no wrapper card */}
      <div data-widget-inner className={styles.widgetInner}>
        {children}
      </div>

      {/* Hover controls -- top-right move + close buttons */}
      {hovered && (
        <div className={styles.hoverControls}>
          <div
            draggable
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            className={styles.dragHandle}
            title="Drag to reorder"
          >
            &#x22ee;&#x22ee;
          </div>
          <button
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className={styles.closeButton}
            title="Hide widget"
          >
            &#x2715;
          </button>
        </div>
      )}

      {/* Resize handle (right edge) - horizontal only */}
      <div
        onMouseDown={handleResizeMouseDown}
        className={styles.resizeHandle}
        style={{ opacity: hovered || isResizing ? 1 : 0 }}
      >
        <div
          className={styles.resizeHandleBar}
          style={{
            backgroundColor: isResizing ? COLORS.primaryGreen : COLORS.textLight,
          }}
        />
      </div>

      {/* Resize preview overlay */}
      {isResizing && resizePreviewSpan !== null && (
        <div className={styles.resizePreview}>
          {resizePreviewSpan}/12
        </div>
      )}

      {/* Drop indicator - after */}
      {isDragOver === "after" && <div className={styles.dropIndicatorAfter} />}
    </div>
  );
}
