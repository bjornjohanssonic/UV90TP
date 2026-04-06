"use client";

import { useState, useEffect } from "react";
import type { Activity } from "@/types";
import type { Shoe, ShoeType } from "@/types";
import { formatDate, formatKm } from "@/lib/dashboard-helpers";

const SHOE_TYPE_LABELS: Record<ShoeType, string> = {
  road: "Road",
  trail: "Trail",
  hybrid: "Hybrid",
  dubb: "Dubb",
  gore_tex: "Gore-Tex",
};

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
  shoeId: string; // "" = none selected
  skipped: boolean;
}

interface NewShoeForm {
  name: string;
  type: ShoeType;
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
      shoeId: "",
      skipped: false,
    })),
  );
  const [saving, setSaving] = useState(false);
  const [shoes, setShoes] = useState<Shoe[]>([]);
  const [shoesLoaded, setShoesLoaded] = useState(false);
  // Per-row "add new shoe" forms
  const [addingShoeForRow, setAddingShoeForRow] = useState<number | null>(null);
  const [newShoeForm, setNewShoeForm] = useState<NewShoeForm>({ name: "", type: "road" });
  const [addingShoeSaving, setAddingShoeSaving] = useState(false);

  useEffect(() => {
    fetch("/api/shoes")
      .then((r) => r.json())
      .then((data: Shoe[]) => {
        setShoes(data.filter((s) => s.retired === 0));
        setShoesLoaded(true);
      })
      .catch(() => setShoesLoaded(true));
  }, []);

  function updateRow(idx: number, field: "start" | "end" | "shoeId", value: string) {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r)));
  }

  function toggleSkip(idx: number) {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, skipped: !r.skipped } : r)));
  }

  async function saveNewShoe(forRowIdx: number) {
    const name = newShoeForm.name.trim();
    if (!name) return;
    setAddingShoeSaving(true);
    try {
      const res = await fetch("/api/shoes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, type: newShoeForm.type }),
      });
      const created: Shoe = await res.json();
      setShoes((prev) => [...prev, created]);
      updateRow(forRowIdx, "shoeId", String(created.id));
      setAddingShoeForRow(null);
      setNewShoeForm({ name: "", type: "road" });
    } finally {
      setAddingShoeSaving(false);
    }
  }

  async function saveAll() {
    setSaving(true);
    try {
      for (const row of rows) {
        if (row.skipped) continue;

        const s = row.start.trim() === "" ? null : parseInt(row.start, 10);
        const e = row.end.trim() === "" ? null : parseInt(row.end, 10);
        if (s !== null || e !== null) {
          await fetch(`/api/activities/${row.stravaId}/battery`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ battery_start: s, battery_end: e }),
          });
          onSaved(row.stravaId, s, e);
        }

        if (row.shoeId !== "") {
          await fetch(`/api/activities/${row.stravaId}/shoe`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ shoe_id: parseInt(row.shoeId, 10) }),
          });
        }
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
        className="bg-white border border-stone-300 rounded-xl p-5 max-w-xl w-full mx-4 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-stone-800">Logga aktivitetsdata</h3>
          <button onClick={onClose} className="text-stone-500 hover:text-stone-700 bg-transparent border-none cursor-pointer text-lg">
            &times;
          </button>
        </div>
        <p className="text-xs text-stone-500 mb-4">
          Välj skor och ange klockbatteri för nya aktiviteter. Lämna blankt för att hoppa över.
        </p>

        <div className="flex flex-col gap-3">
          {rows.map((row, idx) => (
            <div
              key={row.stravaId}
              className="rounded-lg px-3 py-2.5"
              style={{
                backgroundColor: row.skipped ? "rgba(0,0,0,0.01)" : "rgba(0,0,0,0.03)",
                opacity: row.skipped ? 0.4 : 1,
              }}
            >
              {/* Activity header */}
              <div className="flex items-center justify-between mb-2">
                <div className="min-w-0">
                  <div className="text-xs text-stone-700 truncate">{row.name}</div>
                  <div className="text-[0.6rem] text-stone-400">
                    {formatDate(row.date)} &middot; {formatKm(row.distance)} km
                  </div>
                </div>
                <button
                  onClick={() => toggleSkip(idx)}
                  className="text-[0.6rem] text-stone-400 hover:text-stone-500 bg-transparent border-none cursor-pointer whitespace-nowrap ml-2"
                >
                  {row.skipped ? "Ångra" : "Hoppa"}
                </button>
              </div>

              {/* Shoe selector */}
              {shoesLoaded && !row.skipped && (
                <div className="mb-2">
                  {addingShoeForRow === idx ? (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <input
                        type="text"
                        placeholder="Märke + modell (t.ex. Hoka Clifton 9)"
                        value={newShoeForm.name}
                        onChange={(e) => setNewShoeForm((f) => ({ ...f, name: e.target.value }))}
                        className="flex-1 min-w-0 text-xs bg-stone-100 border border-stone-300 rounded px-2 py-1 text-stone-800 outline-none focus:border-stone-400"
                        onKeyDown={(e) => e.key === "Enter" && saveNewShoe(idx)}
                        autoFocus
                      />
                      <select
                        value={newShoeForm.type}
                        onChange={(e) => setNewShoeForm((f) => ({ ...f, type: e.target.value as ShoeType }))}
                        className="text-xs bg-stone-100 border border-stone-300 rounded px-1.5 py-1 text-stone-800 outline-none focus:border-stone-400"
                      >
                        {(Object.keys(SHOE_TYPE_LABELS) as ShoeType[]).map((t) => (
                          <option key={t} value={t}>
                            {SHOE_TYPE_LABELS[t]}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => saveNewShoe(idx)}
                        disabled={addingShoeSaving || !newShoeForm.name.trim()}
                        className="text-xs text-white bg-stone-800 hover:bg-stone-700 disabled:bg-stone-300 border-none rounded px-2 py-1 cursor-pointer disabled:cursor-not-allowed"
                      >
                        OK
                      </button>
                      <button
                        onClick={() => {
                          setAddingShoeForRow(null);
                          setNewShoeForm({ name: "", type: "road" });
                        }}
                        className="text-xs text-stone-500 hover:text-stone-700 bg-transparent border border-stone-300 rounded px-2 py-1 cursor-pointer"
                      >
                        Avbryt
                      </button>
                    </div>
                  ) : shoes.length === 0 ? (
                    <button
                      onClick={() => setAddingShoeForRow(idx)}
                      className="text-xs text-stone-400 hover:text-stone-600 bg-transparent border border-dashed border-stone-300 hover:border-stone-400 rounded px-2 py-1 cursor-pointer w-full text-left"
                    >
                      + Skriv för att lägga till ett par skor
                    </button>
                  ) : (
                    <select
                      value={row.shoeId}
                      onChange={(e) => {
                        if (e.target.value === "__new__") {
                          setAddingShoeForRow(idx);
                          setNewShoeForm({ name: "", type: "road" });
                        } else {
                          updateRow(idx, "shoeId", e.target.value);
                        }
                      }}
                      className="w-full text-xs bg-stone-100 border border-stone-300 rounded px-2 py-1 text-stone-800 outline-none focus:border-stone-400"
                    >
                      <option value="">— Välj ett par skor —</option>
                      {shoes.map((s) => (
                        <option key={s.id} value={String(s.id)}>
                          {s.name} ({SHOE_TYPE_LABELS[s.type]})
                        </option>
                      ))}
                      <option value="__new__">+ Lägg till ett nytt par skor</option>
                    </select>
                  )}
                </div>
              )}

              {/* Battery inputs */}
              {!row.skipped && (
                <div className="flex items-center gap-1">
                  <span className="text-[0.6rem] text-stone-400 mr-1">Batteri</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={row.start}
                    onChange={(e) => updateRow(idx, "start", e.target.value)}
                    placeholder="%"
                    className="w-10 text-xs text-center bg-stone-100 border border-stone-300 rounded px-1 py-1 text-stone-800 outline-none focus:border-stone-400"
                  />
                  <span className="text-stone-400 text-[0.55rem]">&rarr;</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={row.end}
                    onChange={(e) => updateRow(idx, "end", e.target.value)}
                    placeholder="%"
                    className="w-10 text-xs text-center bg-stone-100 border border-stone-300 rounded px-1 py-1 text-stone-800 outline-none focus:border-stone-400"
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-stone-200">
          <button
            onClick={onClose}
            className="text-xs text-stone-500 hover:text-stone-700 bg-transparent border border-stone-300 hover:border-stone-400 rounded-lg px-3 py-1.5 cursor-pointer transition-all"
          >
            Hoppa över alla
          </button>
          <button
            onClick={saveAll}
            disabled={saving || activeRows.length === 0}
            className="text-xs text-white bg-stone-800 hover:bg-stone-700 disabled:bg-stone-300 disabled:text-stone-500 border-none rounded-lg px-3 py-1.5 cursor-pointer transition-all disabled:cursor-not-allowed"
          >
            {saving ? "Sparar..." : "Spara alla"}
          </button>
        </div>
      </div>
    </div>
  );
}
