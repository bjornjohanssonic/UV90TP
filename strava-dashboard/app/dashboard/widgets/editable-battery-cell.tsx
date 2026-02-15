"use client";

import { useState, useRef, useEffect } from "react";

interface EditableBatteryCellProps {
  stravaId: string;
  batteryStart: number | null;
  batteryEnd: number | null;
  onSaved: (stravaId: string, start: number | null, end: number | null) => void;
}

export default function EditableBatteryCell({ stravaId, batteryStart, batteryEnd, onSaved }: EditableBatteryCellProps) {
  const [editing, setEditing] = useState(false);
  const [start, setStart] = useState(batteryStart?.toString() ?? "");
  const [end, setEnd] = useState(batteryEnd?.toString() ?? "");
  const [saving, setSaving] = useState(false);
  const startRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editing && startRef.current) startRef.current.focus();
  }, [editing]);

  // Close on click outside
  useEffect(() => {
    if (!editing) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setEditing(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [editing]);

  const hasBattery = batteryStart != null || batteryEnd != null;

  async function save() {
    const s = start.trim() === "" ? null : parseInt(start, 10);
    const e = end.trim() === "" ? null : parseInt(end, 10);

    for (const v of [s, e]) {
      if (v !== null && (isNaN(v) || v < 0 || v > 100)) return;
    }

    setSaving(true);
    try {
      await fetch(`/api/activities/${stravaId}/battery`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ battery_start: s, battery_end: e }),
      });
      onSaved(stravaId, s, e);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <div ref={containerRef} className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
        <input
          ref={startRef}
          type="number"
          min={0}
          max={100}
          value={start}
          onChange={(e) => setStart(e.target.value)}
          placeholder="S"
          className="w-8 text-[0.65rem] text-center bg-neutral-800 border border-neutral-700 rounded px-0.5 py-0.5 text-neutral-200 outline-none focus:border-neutral-500"
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") setEditing(false);
          }}
        />
        <span className="text-neutral-600 text-[0.5rem]">&rarr;</span>
        <input
          type="number"
          min={0}
          max={100}
          value={end}
          onChange={(e) => setEnd(e.target.value)}
          placeholder="E"
          className="w-8 text-[0.65rem] text-center bg-neutral-800 border border-neutral-700 rounded px-0.5 py-0.5 text-neutral-200 outline-none focus:border-neutral-500"
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") setEditing(false);
          }}
        />
        <button
          onClick={save}
          disabled={saving}
          className="text-[0.55rem] text-neutral-400 hover:text-neutral-200 bg-transparent border-none cursor-pointer px-0.5"
        >
          {saving ? "..." : "\u2713"}
        </button>
      </div>
    );
  }

  return (
    <span
      className={`text-xs cursor-pointer hover:text-neutral-300 transition-colors ${hasBattery ? "text-neutral-400" : "text-neutral-700"}`}
      onClick={(e) => {
        e.stopPropagation();
        setStart(batteryStart?.toString() ?? "");
        setEnd(batteryEnd?.toString() ?? "");
        setEditing(true);
      }}
      title="Click to edit battery"
    >
      {hasBattery
        ? `${batteryStart ?? "?"}→${batteryEnd ?? "?"}%`
        : "\u2014"}
    </span>
  );
}
