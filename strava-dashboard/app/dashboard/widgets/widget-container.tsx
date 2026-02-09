"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { COLORS } from "@/lib/dashboard-helpers";
import type { WidgetConfig, WidgetId } from "./widget-types";
import { WIDGET_REGISTRY } from "./widget-types";

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

  const handleResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    resizeStartRef.current = {
      x: e.clientX,
      startSpan: config.colSpan,
    };
  }, [config.colSpan]);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const grid = document.getElementById("dashboard-grid");
      if (!grid) return;

      const gridWidth = grid.getBoundingClientRect().width;
      const colWidth = gridWidth / 12;
      const deltaX = e.clientX - resizeStartRef.current.x;

      const newSpan = Math.max(minColSpan, Math.min(maxColSpan, resizeStartRef.current.startSpan + Math.round(deltaX / colWidth)));
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
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        gridColumn: `span ${displaySpan}`,
        position: "relative",
        minWidth: 0,
        transition: isResizing ? "none" : "all 0.2s",
      }}
    >
      {/* Drop indicator - before */}
      {isDragOver === "before" && (
        <div style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "4px",
          backgroundColor: COLORS.primaryGreen,
          borderRadius: "2px",
          zIndex: 100,
        }} />
      )}

      {/* Widget content — no wrapper card */}
      <div data-widget-inner style={{ position: "relative", width: "100%" }}>
        {children}
      </div>

      {/* Hover controls — top-right move + close buttons */}
      {hovered && (
        <div style={{
          position: "absolute",
          top: "8px",
          right: "8px",
          zIndex: 100,
          display: "flex",
          alignItems: "center",
          gap: "4px",
        }}>
          <div
            draggable
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            style={{
              width: "28px",
              height: "28px",
              borderRadius: "6px",
              backgroundColor: COLORS.textDark,
              color: COLORS.cardAccent,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "grab",
              fontSize: "0.8rem",
              fontWeight: 700,
              opacity: 0.7,
            }}
            title="Drag to reorder"
          >
            ⋮⋮
          </div>
          <button
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            style={{
              width: "28px",
              height: "28px",
              borderRadius: "6px",
              border: "none",
              backgroundColor: COLORS.error,
              color: COLORS.cardAccent,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              fontSize: "0.7rem",
              fontWeight: 700,
              opacity: 0.7,
            }}
            title="Hide widget"
          >
            ✕
          </button>
        </div>
      )}

      {/* Resize handle (right edge) - horizontal only */}
      <div
        onMouseDown={handleResizeMouseDown}
        style={{
          position: "absolute",
          top: "50%",
          right: 0,
          transform: "translateY(-50%)",
          width: "12px",
          height: "48px",
          cursor: "ew-resize",
          zIndex: 100,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity: hovered || isResizing ? 1 : 0,
          transition: "opacity 0.2s",
        }}
      >
        <div style={{
          width: "4px",
          height: "32px",
          borderRadius: "2px",
          backgroundColor: isResizing ? COLORS.primaryGreen : COLORS.textLight,
          transition: "background-color 0.2s",
        }} />
      </div>

      {/* Resize preview overlay */}
      {isResizing && resizePreviewSpan !== null && (
        <div style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          backgroundColor: COLORS.primaryGreen,
          color: COLORS.cardAccent,
          padding: "8px 16px",
          borderRadius: "8px",
          fontSize: "0.75rem",
          fontWeight: 700,
          zIndex: 101,
          boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
          pointerEvents: "none",
          whiteSpace: "nowrap",
        }}>
          {resizePreviewSpan}/12
        </div>
      )}

      {/* Drop indicator - after */}
      {isDragOver === "after" && (
        <div style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: "4px",
          backgroundColor: COLORS.primaryGreen,
          borderRadius: "2px",
          zIndex: 100,
        }} />
      )}
    </div>
  );
}
