"use client";

import { useState } from "react";
import type { Activity } from "@/types";
import { formatDate, formatKm } from "@/lib/dashboard-helpers";

interface BatteryModalProps {
  activities: Activity[];
  onClose: () => void;
  onSaved: (stravaId: string, start: number | null, end: number | null) => void;
}

interface BatteryRow {
  stravaId: string;
  name: string;
  date: string;
  distance: number;
  start: string;
  end: string;
  skipped: boolean;
}

export default function BatteryModal({ activities, onClose, onSaved }: BatteryModalProps) {
  const [rows, setRows] = useState<BatteryRow[]>(
    activities.map((a) => ({
      stravaId: a.strava_id,
      name: a.name,
      date: a.start_date,
      distance: a.distance,
      start: "",
      end: "",
      skipped: false,
    })),
  );
  const [saving, setSaving] = useState(false);

  function updateRow(idx: number, field: "start" | "end", value: string) {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r)));
  }

  function toggleSkip(idx: number) {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, skipped: !r.skipped } : r)));
  }

  async function saveAll() {
    setSaving(true);
    try {
      for (const row of rows) {
        if (row.skipped) continue;
        const s = row.start.trim() === "" ? null : parseInt(row.start, 10);
        const e = row.end.trim() === "" ? null : parseInt(row.end, 10);
        if (s === null && e === null) continue;

        await fetch(`/api/activities/${row.stravaId}/battery`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ battery_start: s, battery_end: e }),
        });
        onSaved(row.stravaId, s, e);
      }
      onClose();
    } finally {
      setSaving(false);
    }
  }

  const activeRows = rows.filter((r) => !r.skipped);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="bg-neutral-900 border border-neutral-700 rounded-xl p-5 max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-neutral-200">Enter Battery Data</h3>
          <button onClick={onClose} className="text-neutral-500 hover:text-neutral-300 bg-transparent border-none cursor-pointer text-lg">
            &times;
          </button>
        </div>
        <p className="text-xs text-neutral-500 mb-4">
          Enter start and end battery % for newly synced activities. Leave blank to skip.
        </p>

        <div className="flex flex-col gap-2">
          {rows.map((row, idx) => (
            <div
              key={row.stravaId}
              className="flex items-center gap-3 px-3 py-2 rounded-lg"
              style={{
                backgroundColor: row.skipped ? "rgba(163,163,163,0.02)" : "rgba(163,163,163,0.06)",
                opacity: row.skipped ? 0.4 : 1,
              }}
            >
              <div className="flex-1 min-w-0">
                <div className="text-xs text-neutral-300 truncate">{row.name}</div>
                <div className="text-[0.6rem] text-neutral-600">
                  {formatDate(row.date)} &middot; {formatKm(row.distance)} km
                </div>
              </div>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={row.start}
                  onChange={(e) => updateRow(idx, "start", e.target.value)}
                  disabled={row.skipped}
                  placeholder="%"
                  className="w-10 text-xs text-center bg-neutral-800 border border-neutral-700 rounded px-1 py-1 text-neutral-200 outline-none focus:border-neutral-500 disabled:opacity-30"
                />
                <span className="text-neutral-600 text-[0.55rem]">&rarr;</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={row.end}
                  onChange={(e) => updateRow(idx, "end", e.target.value)}
                  disabled={row.skipped}
                  placeholder="%"
                  className="w-10 text-xs text-center bg-neutral-800 border border-neutral-700 rounded px-1 py-1 text-neutral-200 outline-none focus:border-neutral-500 disabled:opacity-30"
                />
              </div>
              <button
                onClick={() => toggleSkip(idx)}
                className="text-[0.6rem] text-neutral-600 hover:text-neutral-400 bg-transparent border-none cursor-pointer whitespace-nowrap"
              >
                {row.skipped ? "Undo" : "Skip"}
              </button>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-neutral-800">
          <button
            onClick={onClose}
            className="text-xs text-neutral-500 hover:text-neutral-300 bg-transparent border border-neutral-700 hover:border-neutral-500 rounded-lg px-3 py-1.5 cursor-pointer transition-all"
          >
            Skip All
          </button>
          <button
            onClick={saveAll}
            disabled={saving || activeRows.length === 0}
            className="text-xs text-neutral-900 bg-neutral-200 hover:bg-neutral-300 disabled:bg-neutral-600 disabled:text-neutral-400 border-none rounded-lg px-3 py-1.5 cursor-pointer transition-all disabled:cursor-not-allowed"
          >
            {saving ? "Saving..." : "Save All"}
          </button>
        </div>
      </div>
    </div>
  );
}
