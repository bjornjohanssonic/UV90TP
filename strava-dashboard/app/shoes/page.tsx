"use client";

import { useEffect, useState, useRef } from "react";
import type { Shoe, ShoeType } from "@/types";

const SHOE_TYPE_LABELS: Record<ShoeType, string> = {
  road: "Road",
  trail: "Trail",
  hybrid: "Hybrid",
  dubb: "Dubb",
  gore_tex: "Gore-Tex",
};

function EditableKm({ shoe, onSaved }: { shoe: Shoe; onSaved: () => void }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function startEdit() {
    setValue(String(Math.round(shoe.total_km ?? 0)));
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 0);
  }

  async function save() {
    const total = parseFloat(value);
    if (isNaN(total)) {
      setEditing(false);
      return;
    }
    const manual_km = Math.max(0, total - (shoe.activity_km ?? 0));
    setSaving(true);
    try {
      await fetch(`/api/shoes/${shoe.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ manual_km }),
      });
      onSaved();
    } finally {
      setSaving(false);
      setEditing(false);
    }
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1 justify-end">
        <input
          ref={inputRef}
          type="number"
          min={0}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") setEditing(false);
          }}
          onBlur={save}
          disabled={saving}
          autoFocus
          className="w-20 text-sm text-right bg-stone-100 border border-stone-400 rounded px-2 py-0.5 text-stone-800 outline-none tabular-nums"
        />
        <span className="text-xs text-stone-400">km</span>
      </div>
    );
  }

  return (
    <button
      onClick={startEdit}
      className="text-sm text-stone-700 tabular-nums bg-transparent border-none cursor-pointer hover:text-stone-900 hover:underline decoration-dotted underline-offset-2 text-right w-full"
      title="Klicka för att redigera"
    >
      {Math.round(shoe.total_km ?? 0)} km
    </button>
  );
}

export default function ShoesPage() {
  const [shoes, setShoes] = useState<Shoe[]>([]);
  const [loading, setLoading] = useState(true);
  const [addName, setAddName] = useState("");
  const [addType, setAddType] = useState<ShoeType>("road");
  const [adding, setAdding] = useState(false);
  const [retiring, setRetiring] = useState<number | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  async function loadShoes() {
    const res = await fetch("/api/shoes");
    const data: Shoe[] = await res.json();
    setShoes(data);
    setLoading(false);
  }

  useEffect(() => {
    loadShoes();
  }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const name = addName.trim();
    if (!name) return;
    setAdding(true);
    try {
      await fetch("/api/shoes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, type: addType }),
      });
      setAddName("");
      setAddType("road");
      setShowAddForm(false);
      await loadShoes();
    } finally {
      setAdding(false);
    }
  }

  async function handleRetire(id: number, retired: boolean) {
    setRetiring(id);
    try {
      await fetch(`/api/shoes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ retired }),
      });
      await loadShoes();
    } finally {
      setRetiring(null);
    }
  }

  type SortKey = "name" | "total_km" | "activity_count" | "type";
  const [sortBy, setSortBy] = useState<SortKey>("name");

  const activeShoes = shoes
    .filter((s) => s.retired === 0)
    .sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name, "sv");
        case "total_km":
          return (b.total_km ?? 0) - (a.total_km ?? 0);
        case "activity_count":
          return (b.activity_count ?? 0) - (a.activity_count ?? 0);
        case "type":
          return a.type.localeCompare(b.type, "sv");
      }
    });
  const retiredShoes = shoes.filter((s) => s.retired === 1);

  return (
    <main className="max-w-[900px] mx-auto p-8 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-light text-stone-800 tracking-tight">Skor</h1>
          <p className="text-sm text-stone-500 mt-1">Distanstracker för dina löparskor</p>
        </div>
        <a
          href="/dashboard"
          className="border border-stone-300 hover:border-stone-400 text-stone-500 hover:text-stone-800 rounded-lg px-4 py-2 text-sm font-medium no-underline transition-all"
        >
          ← Dashboard
        </a>
      </div>

      {/* Active shoes */}
      <div className="bg-white border border-stone-200 rounded-xl overflow-hidden hover:border-stone-300 transition-all mb-6">
        <div className="px-5 py-4 border-b border-stone-200 flex items-center justify-between gap-3">
          <h2 className="text-[0.7rem] uppercase tracking-wider font-medium text-stone-500">Aktiva skor</h2>
          <div className="flex items-center gap-2 ml-auto">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortKey)}
              className="text-xs bg-stone-50 border border-stone-200 rounded-lg px-2 py-1 text-stone-500 outline-none focus:border-stone-400 cursor-pointer"
            >
              <option value="name">Namn</option>
              <option value="total_km">Avstånd</option>
              <option value="activity_count">Aktiviteter</option>
              <option value="type">Typ</option>
            </select>
            <button
              onClick={() => {
                setShowAddForm((v) => !v);
                setAddName("");
                setAddType("road");
              }}
              className="w-7 h-7 flex items-center justify-center rounded-lg border border-stone-200 hover:border-stone-400 text-stone-400 hover:text-stone-700 bg-transparent cursor-pointer transition-all text-base leading-none"
              title="Lägg till skor"
            >
              {showAddForm ? "×" : "+"}
            </button>
          </div>
        </div>

        {showAddForm && (
          <form
            onSubmit={handleAdd}
            className="flex gap-3 items-end flex-wrap px-5 py-4 border-b border-stone-100 bg-stone-50/60"
          >
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs text-stone-500 mb-1">Märke &amp; modell</label>
              <input
                type="text"
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                placeholder="t.ex. Hoka Clifton 9"
                autoFocus
                className="w-full text-sm bg-white border border-stone-300 rounded-lg px-3 py-2 text-stone-800 outline-none focus:border-stone-500"
              />
            </div>
            <div>
              <label className="block text-xs text-stone-500 mb-1">Typ</label>
              <select
                value={addType}
                onChange={(e) => setAddType(e.target.value as ShoeType)}
                className="text-sm bg-white border border-stone-300 rounded-lg px-3 py-2 text-stone-800 outline-none focus:border-stone-500"
              >
                {(Object.keys(SHOE_TYPE_LABELS) as ShoeType[]).map((t) => (
                  <option key={t} value={t}>
                    {SHOE_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              disabled={adding || !addName.trim()}
              className="text-sm text-white bg-stone-800 hover:bg-stone-700 disabled:bg-stone-300 disabled:text-stone-500 border-none rounded-lg px-4 py-2 cursor-pointer transition-all disabled:cursor-not-allowed"
            >
              {adding ? "Sparar..." : "Lägg till"}
            </button>
          </form>
        )}
        {loading ? (
          <div className="px-5 py-8 text-center text-stone-400 text-sm">Laddar...</div>
        ) : activeShoes.length === 0 ? (
          <div className="px-5 py-8 text-center text-stone-400 text-sm">Inga skor tillagda än.</div>
        ) : (
          <div>
            {/* Header */}
            <div className="grid grid-cols-[2fr_100px_80px_80px_120px] px-5 py-2 border-b border-stone-100">
              <span className="text-[0.6rem] uppercase tracking-wider font-medium text-stone-400">Sko</span>
              <span className="text-[0.6rem] uppercase tracking-wider font-medium text-stone-400">Typ</span>
              <span className="text-[0.6rem] uppercase tracking-wider font-medium text-stone-400 text-right">Aktiviteter</span>
              <span className="text-[0.6rem] uppercase tracking-wider font-medium text-stone-400 text-right">Km</span>
              <span className="text-[0.6rem] uppercase tracking-wider font-medium text-stone-400 text-right"></span>
            </div>
            {activeShoes.map((shoe, idx) => (
              <div
                key={shoe.id}
                className="grid grid-cols-[2fr_100px_80px_80px_120px] px-5 py-3 items-center"
                style={{
                  backgroundColor: idx % 2 === 0 ? "rgba(0,0,0,0.02)" : "transparent",
                  borderBottom: idx < activeShoes.length - 1 ? "1px solid rgba(0,0,0,0.05)" : "none",
                }}
              >
                <span className="text-sm text-stone-800 font-medium">{shoe.name}</span>
                <span className="text-xs text-stone-500">{SHOE_TYPE_LABELS[shoe.type]}</span>
                <span className="text-sm text-stone-700 text-right tabular-nums">{shoe.activity_count ?? 0}</span>
                <EditableKm shoe={shoe} onSaved={loadShoes} />
                <div className="text-right">
                  <button
                    onClick={() => handleRetire(shoe.id, true)}
                    disabled={retiring === shoe.id}
                    className="text-xs text-stone-400 hover:text-stone-600 bg-transparent border border-stone-200 hover:border-stone-400 rounded-lg px-3 py-1.5 cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {retiring === shoe.id ? "..." : "Hall of Fame"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Hall of Fame */}
      {retiredShoes.length > 0 && (
        <div className="bg-white border border-stone-200 rounded-xl overflow-hidden hover:border-stone-300 transition-all">
          <div className="px-5 py-4 border-b border-stone-200 flex items-center justify-between">
            <h2 className="text-[0.7rem] uppercase tracking-wider font-medium text-stone-500">Hall of Fame</h2>
            <span className="text-[0.6rem] text-stone-400">Pensionerade skor</span>
          </div>
          <div>
            <div className="grid grid-cols-[2fr_100px_80px_80px_120px] px-5 py-2 border-b border-stone-100">
              <span className="text-[0.6rem] uppercase tracking-wider font-medium text-stone-400">Sko</span>
              <span className="text-[0.6rem] uppercase tracking-wider font-medium text-stone-400">Typ</span>
              <span className="text-[0.6rem] uppercase tracking-wider font-medium text-stone-400 text-right">Aktiviteter</span>
              <span className="text-[0.6rem] uppercase tracking-wider font-medium text-stone-400 text-right">Km</span>
              <span className="text-[0.6rem] uppercase tracking-wider font-medium text-stone-400 text-right"></span>
            </div>
            {retiredShoes.map((shoe, idx) => (
              <div
                key={shoe.id}
                className="grid grid-cols-[2fr_100px_80px_80px_120px] px-5 py-3 items-center opacity-60"
                style={{
                  backgroundColor: idx % 2 === 0 ? "rgba(0,0,0,0.02)" : "transparent",
                  borderBottom: idx < retiredShoes.length - 1 ? "1px solid rgba(0,0,0,0.05)" : "none",
                }}
              >
                <span className="text-sm text-stone-700 font-medium">{shoe.name}</span>
                <span className="text-xs text-stone-500">{SHOE_TYPE_LABELS[shoe.type]}</span>
                <span className="text-sm text-stone-600 text-right tabular-nums">{shoe.activity_count ?? 0}</span>
                <span className="text-sm text-stone-600 text-right tabular-nums">
                  {((shoe.total_km ?? 0)).toFixed(0)} km
                </span>
                <div className="text-right">
                  <button
                    onClick={() => handleRetire(shoe.id, false)}
                    disabled={retiring === shoe.id}
                    className="text-xs text-stone-400 hover:text-stone-600 bg-transparent border border-stone-200 hover:border-stone-400 rounded-lg px-3 py-1.5 cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {retiring === shoe.id ? "..." : "Återaktivera"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
