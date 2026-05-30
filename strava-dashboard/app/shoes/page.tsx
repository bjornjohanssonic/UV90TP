"use client";

import { useEffect, useState, useRef } from "react";
import { MoreVertical } from "lucide-react";
import type { Activity, Shoe, ShoeType } from "@/types";
import { getShoeAlerts, getRotationWarning, getShoePredictions } from "@/lib/shoe-intelligence";
import { useAuthGuard } from "@/app/hooks/use-auth-guard";

interface RowAction {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

// Per-row 3-dot menu. Dropdown is fixed-positioned so it escapes the table's overflow clip.
function RowMenu({ actions }: { actions: RowAction[] }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (btnRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    const close = () => setOpen(false);
    document.addEventListener("mousedown", onDocDown);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("mousedown", onDocDown);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  function toggle() {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 4, right: window.innerWidth - r.right });
    }
    setOpen((v) => !v);
  }

  return (
    <div className="flex justify-end">
      <button
        ref={btnRef}
        onClick={toggle}
        aria-label="Fler val"
        title="Fler val"
        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-stone-100 text-stone-400 hover:text-stone-700 bg-transparent border-none cursor-pointer transition-all"
      >
        <MoreVertical size={16} />
      </button>
      {open && pos && (
        <div
          ref={menuRef}
          style={{ position: "fixed", top: pos.top, right: pos.right, zIndex: 50 }}
          className="min-w-[170px] bg-white border border-stone-200 rounded-lg shadow-lg py-1"
        >
          {actions.map((a, i) => (
            <button
              key={i}
              onClick={() => {
                a.onClick();
                setOpen(false);
              }}
              disabled={a.disabled}
              className="w-full text-left px-3 py-2 text-sm text-stone-700 hover:bg-stone-50 bg-transparent border-none cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

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
  useAuthGuard();
  const [shoes, setShoes] = useState<Shoe[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
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
    fetch("/api/activities")
      .then((r) => (r.ok ? r.json() : []))
      .then(setActivities)
      .catch(() => {});
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

      {/* Intelligence panel */}
      {shoes.length > 0 && (() => {
        const alerts = getShoeAlerts(shoes);
        const rotation = getRotationWarning(shoes, activities);
        const predictions = getShoePredictions(shoes, activities);
        const hasInsights = alerts.length > 0 || rotation || predictions.length > 0;
        if (!hasInsights) return null;
        return (
          <div className="mb-6 flex flex-col gap-2">
            {alerts.map((a) => (
              <div
                key={a.shoeId}
                className={`flex items-start gap-3 px-4 py-3 rounded-xl border text-sm ${
                  a.level === "critical"
                    ? "bg-red-50 border-red-200 text-red-700"
                    : "bg-yellow-50 border-yellow-200 text-yellow-700"
                }`}
              >
                <span className="font-medium shrink-0">{a.shoeName}</span>
                <span>{a.message}</span>
              </div>
            ))}
            {rotation && (
              <div className="flex items-start gap-3 px-4 py-3 rounded-xl border bg-blue-50 border-blue-200 text-blue-700 text-sm">
                <span className="font-medium shrink-0">Rotation</span>
                <span>
                  {rotation.shoeName} used in {rotation.runsInWindow}/{rotation.windowRuns} runs last 14 days ({Math.round(rotation.pct * 100)}%). Give it a rest.
                </span>
              </div>
            )}
            {predictions.length > 0 && (
              <div className="bg-white border border-stone-200 rounded-xl px-4 py-3">
                <div className="text-[0.65rem] uppercase tracking-wider font-medium text-stone-400 mb-2">Livslängdsprognos</div>
                <div className="flex flex-col gap-1.5">
                  {predictions.map((p) => (
                    <div key={p.shoeId} className="flex items-center gap-3">
                      <span className="text-sm text-stone-700 font-medium w-40 truncate">{p.shoeName}</span>
                      <div className="flex-1 bg-stone-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.min((p.currentKm / 700) * 100, 100)}%`,
                            backgroundColor: p.currentKm >= 700 ? "#f87171" : p.currentKm >= 600 ? "#fbbf24" : "#4ade80",
                          }}
                        />
                      </div>
                      <span className="text-xs text-stone-500 whitespace-nowrap w-40 text-right">
                        {p.weeksToLimit === null
                          ? "Gränsen passerad"
                          : `~${p.weeksToLimit} veckor kvar`}
                        {" "}· {p.weeklyKmRate.toFixed(1)} km/v
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })()}

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
            <div className="grid grid-cols-[1fr_70px_36px] sm:grid-cols-[2fr_100px_80px_120px_36px] px-5 py-2 border-b border-stone-100">
              <span className="text-[0.6rem] uppercase tracking-wider font-medium text-stone-400">Sko</span>
              <span className="text-[0.6rem] uppercase tracking-wider font-medium text-stone-400 text-right">Km</span>
              <span className="hidden sm:block text-[0.6rem] uppercase tracking-wider font-medium text-stone-400">Typ</span>
              <span className="hidden sm:block text-[0.6rem] uppercase tracking-wider font-medium text-stone-400 text-right">Aktiviteter</span>
              <span></span>
            </div>
            {activeShoes.map((shoe, idx) => (
              <div
                key={shoe.id}
                className="grid grid-cols-[1fr_70px_36px] sm:grid-cols-[2fr_100px_80px_120px_36px] px-5 py-3 items-center"
                style={{
                  backgroundColor: idx % 2 === 0 ? "rgba(0,0,0,0.02)" : "transparent",
                  borderBottom: idx < activeShoes.length - 1 ? "1px solid rgba(0,0,0,0.05)" : "none",
                }}
              >
                <div>
                  <span className="text-sm text-stone-800 font-medium">{shoe.name}</span>
                  <span className="sm:hidden text-xs text-stone-400 ml-2">{SHOE_TYPE_LABELS[shoe.type]}</span>
                </div>
                <EditableKm shoe={shoe} onSaved={loadShoes} />
                <span className="hidden sm:block text-xs text-stone-500">{SHOE_TYPE_LABELS[shoe.type]}</span>
                <span className="hidden sm:block text-sm text-stone-700 text-right tabular-nums">{shoe.activity_count ?? 0}</span>
                <RowMenu
                  actions={[
                    {
                      label: retiring === shoe.id ? "..." : "Flytta till Hall of Fame",
                      onClick: () => handleRetire(shoe.id, true),
                      disabled: retiring === shoe.id,
                    },
                  ]}
                />
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
            <div className="grid grid-cols-[1fr_70px_36px] sm:grid-cols-[2fr_100px_80px_120px_36px] px-5 py-2 border-b border-stone-100">
              <span className="text-[0.6rem] uppercase tracking-wider font-medium text-stone-400">Sko</span>
              <span className="text-[0.6rem] uppercase tracking-wider font-medium text-stone-400 text-right">Km</span>
              <span className="hidden sm:block text-[0.6rem] uppercase tracking-wider font-medium text-stone-400">Typ</span>
              <span className="hidden sm:block text-[0.6rem] uppercase tracking-wider font-medium text-stone-400 text-right">Aktiviteter</span>
              <span></span>
            </div>
            {retiredShoes.map((shoe, idx) => (
              <div
                key={shoe.id}
                className="grid grid-cols-[1fr_70px_36px] sm:grid-cols-[2fr_100px_80px_120px_36px] px-5 py-3 items-center opacity-60"
                style={{
                  backgroundColor: idx % 2 === 0 ? "rgba(0,0,0,0.02)" : "transparent",
                  borderBottom: idx < retiredShoes.length - 1 ? "1px solid rgba(0,0,0,0.05)" : "none",
                }}
              >
                <div>
                  <span className="text-sm text-stone-700 font-medium">{shoe.name}</span>
                  <span className="sm:hidden text-xs text-stone-400 ml-2">{SHOE_TYPE_LABELS[shoe.type]}</span>
                </div>
                <span className="text-sm text-stone-600 text-right tabular-nums">
                  {(shoe.total_km ?? 0).toFixed(0)} km
                </span>
                <span className="hidden sm:block text-xs text-stone-500">{SHOE_TYPE_LABELS[shoe.type]}</span>
                <span className="hidden sm:block text-sm text-stone-600 text-right tabular-nums">{shoe.activity_count ?? 0}</span>
                <RowMenu
                  actions={[
                    {
                      label: retiring === shoe.id ? "..." : "Återaktivera",
                      onClick: () => handleRetire(shoe.id, false),
                      disabled: retiring === shoe.id,
                    },
                  ]}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
