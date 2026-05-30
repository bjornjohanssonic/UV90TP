"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MapPin, Trash2, Undo2, Redo2, Save, Split, Flag, Plus, Loader2, Home, X, Sparkles, Layers } from "lucide-react";
import { formatKm, formatDate } from "@/lib/dashboard-helpers";
import { decodePolyline, type LatLng } from "@/lib/polyline";
import {
  type RouteModel,
  emptyRoute,
  fromPath,
  appendNode,
  insertNodeBeforeId,
  moveNodeId,
  deleteNodeId,
  breakOut,
  expandPath,
  totalDistanceMeters,
  nearestLeg,
  sealLoop,
  connectOutAndBack,
  connectBalloon,
} from "@/lib/route-builder";
import type { Activity, SavedRoute, RouteSource } from "@/types";

const ORANGE = "#FC4C02"; // route accent color
const FALLBACK_CENTER: LatLng = [59.3293, 18.0686]; // Stockholm, if geolocation denied
const SNAP_PX = 22; // drop-onto-node tolerance in screen pixels

type Basemap = "stylized" | "streets" | "terrain";
const BASEMAPS: Record<Basemap, { label: string; url: string; options: Record<string, unknown> }> = {
  // Minimal, on-brand base — no roads/paths clutter
  stylized: {
    label: "Stiliserad",
    url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    options: { maxZoom: 19, subdomains: "abcd", attribution: "© OpenStreetMap, © CARTO" },
  },
  // Real street map — shows roads, footpaths and cycleways
  streets: {
    label: "Karta",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    options: { maxZoom: 19, subdomains: "abc", attribution: "© OpenStreetMap" },
  },
  // Topographic — best for seeing trails/paths in forests
  terrain: {
    label: "Terräng",
    url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    options: { maxZoom: 17, subdomains: "abc", attribution: "© OpenTopoMap (CC-BY-SA)" },
  },
};

type Mode = "draw" | "breakout-arm" | "detour";
interface ClosurePopup {
  junctionId: string;
  isStart: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function screenDistance(map: any, a: LatLng, b: LatLng): number {
  const pa = map.latLngToContainerPoint(a);
  const pb = map.latLngToContainerPoint(b);
  return Math.hypot(pa.x - pb.x, pa.y - pb.y);
}

function freeIconHtml(): string {
  return `<div style="width:14px;height:14px;border-radius:9999px;background:#ffffff;border:2px solid ${ORANGE};box-shadow:0 1px 3px rgba(0,0,0,0.3);box-sizing:border-box;"></div>`;
}
function lockedIconHtml(): string {
  return `<div style="width:9px;height:9px;border-radius:9999px;background:${ORANGE};border:1px solid #ffffff;box-sizing:border-box;"></div>`;
}

export default function RouteEditor() {
  const mapRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInstanceRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const LRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const polylineRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markersRef = useRef<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tileLayerRef = useRef<any>(null);
  const [leafletReady, setLeafletReady] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [basemap, setBasemap] = useState<Basemap>("stylized");

  const [model, setModel] = useState<RouteModel>(emptyRoute());
  const [mode, setMode] = useState<Mode>("draw");
  const [source, setSource] = useState<RouteSource>("draw");
  const [baseActivityId, setBaseActivityId] = useState<string | null>(null);
  const [detourAnchorId, setDetourAnchorId] = useState<string | null>(null);

  // Target extension ("make the route N km longer")
  const [extensionKm, setExtensionKm] = useState<string>("");
  const [extensionBaselineM, setExtensionBaselineM] = useState<number | null>(null);

  const [activities, setActivities] = useState<Activity[]>([]);
  const [savedRoutes, setSavedRoutes] = useState<SavedRoute[]>([]);
  const [saving, setSaving] = useState(false);
  const [routeName, setRouteName] = useState("");
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  // Close-the-loop popup (balloon / out-and-back), anchored to a map point
  const [closurePopup, setClosurePopup] = useState<ClosurePopup | null>(null);
  const [popupPx, setPopupPx] = useState<{ x: number; y: number } | null>(null);

  // Refs read by Leaflet event handlers (avoid stale closures)
  const modelRef = useRef(model);
  const modeRef = useRef(mode);
  const detourRef = useRef(detourAnchorId);
  const popupRef = useRef(closurePopup);
  modelRef.current = model;
  modeRef.current = mode;
  detourRef.current = detourAnchorId;
  popupRef.current = closurePopup;

  const closeClosurePopup = useCallback(() => {
    setClosurePopup(null);
    setPopupPx(null);
  }, []);

  const openClosurePopup = useCallback((junctionId: string) => {
    const m = modelRef.current;
    const jIdx = m.nodes.findIndex((n) => n.id === junctionId);
    // must be an earlier node than the end, and an end node must exist
    if (jIdx < 0 || jIdx >= m.nodes.length - 1) return;
    const map = mapInstanceRef.current;
    if (!map) return;
    const pt = map.latLngToContainerPoint(m.nodes[jIdx].latlng);
    setClosurePopup({ junctionId, isStart: jIdx === 0 });
    setPopupPx({ x: pt.x, y: pt.y });
  }, []);

  const distanceM = totalDistanceMeters(model);
  const targetTotalM =
    extensionBaselineM != null && extensionKm !== ""
      ? extensionBaselineM + parseFloat(extensionKm) * 1000
      : null;
  const remainingM = targetTotalM != null ? targetTotalM - distanceM : null;

  // Undo/redo history. Each commitModel call is one undoable step.
  const historyRef = useRef<{ past: RouteModel[]; future: RouteModel[] }>({ past: [], future: [] });
  const [histVersion, setHistVersion] = useState(0);

  const commitModel = useCallback((next: RouteModel) => {
    const h = historyRef.current;
    h.past.push(modelRef.current);
    if (h.past.length > 100) h.past.shift();
    h.future = [];
    modelRef.current = next;
    setModel(next);
    setHistVersion((v) => v + 1);
  }, []);

  const undo = useCallback(() => {
    const h = historyRef.current;
    if (h.past.length === 0) return;
    const prev = h.past.pop()!;
    h.future.push(modelRef.current);
    modelRef.current = prev;
    setModel(prev);
    setHistVersion((v) => v + 1);
    setClosurePopup(null);
    setPopupPx(null);
  }, []);

  const redo = useCallback(() => {
    const h = historyRef.current;
    if (h.future.length === 0) return;
    const next = h.future.pop()!;
    h.past.push(modelRef.current);
    modelRef.current = next;
    setModel(next);
    setHistVersion((v) => v + 1);
  }, []);

  // Recompute on each history change so the toolbar buttons enable/disable correctly
  const { canUndo, canRedo } = useMemo(
    () => ({
      canUndo: historyRef.current.past.length > 0,
      canRedo: historyRef.current.future.length > 0,
    }),
    [histVersion],
  );

  // Ctrl+Z / Ctrl+Y (or Ctrl+Shift+Z) for undo/redo
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      const k = e.key.toLowerCase();
      if (k === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if (k === "y" || (k === "z" && e.shiftKey)) {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo]);

  // ── Load Leaflet + CSS ───────────────────────────────────────────────────
  useEffect(() => {
    if (leafletReady) return;
    if (!document.querySelector('link[data-leaflet]')) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      link.setAttribute("data-leaflet", "true");
      document.head.appendChild(link);
    }
    import("leaflet").then((mod) => {
      LRef.current = mod.default ?? mod;
      setLeafletReady(true);
    });
  }, [leafletReady]);

  // ── Fetch activities + saved routes for the loaders ───────────────────────
  useEffect(() => {
    fetch("/api/activities")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: Activity[]) =>
        setActivities(
          data.filter((a) => a.summary_polyline && a.summary_polyline !== "none"),
        ),
      )
      .catch(() => {});
    refreshSavedRoutes();
  }, []);

  const refreshSavedRoutes = useCallback(() => {
    fetch("/api/routes")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: SavedRoute[]) => setSavedRoutes(data))
      .catch(() => {});
  }, []);

  // ── Init map once ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!leafletReady || !mapRef.current || mapInstanceRef.current) return;
    const L = LRef.current;

    const map = L.map(mapRef.current, { zoomControl: true, attributionControl: true });
    mapInstanceRef.current = map;
    map.attributionControl.setPrefix(false);
    map.setView(FALLBACK_CENTER, 13);
    // Tile layer is managed by a separate effect (keyed on `basemap`)

    map.on("click", (e: { latlng: { lat: number; lng: number } }) => {
      if (popupRef.current) {
        closeClosurePopup();
        return;
      }
      const pt: LatLng = [e.latlng.lat, e.latlng.lng];
      const m = modeRef.current;
      if (m === "draw") {
        commitModel(appendNode(modelRef.current, pt));
      } else if (m === "detour" && detourRef.current) {
        commitModel(insertNodeBeforeId(modelRef.current, detourRef.current, pt));
      }
      // breakout-arm: wait for a click on the route line (handled on polyline)
    });

    setMapReady(true);

    // Center on the user's current location (suggestion mode will reuse this later)
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (mapInstanceRef.current && modelRef.current.nodes.length === 0) {
            mapInstanceRef.current.setView([pos.coords.latitude, pos.coords.longitude], 14);
          }
        },
        () => {},
        { enableHighAccuracy: true, timeout: 8000 },
      );
    }

    return () => {
      map.off();
      map.remove();
      mapInstanceRef.current = null;
      setMapReady(false);
    };
  }, [leafletReady, commitModel, closeClosurePopup]);

  // ── Swap the basemap tile layer when the user toggles it ──────────────────
  useEffect(() => {
    if (!mapReady) return;
    const L = LRef.current;
    const map = mapInstanceRef.current;
    if (!L || !map) return;
    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
      tileLayerRef.current = null;
    }
    const cfg = BASEMAPS[basemap];
    tileLayerRef.current = L.tileLayer(cfg.url, cfg.options).addTo(map);
    tileLayerRef.current.bringToBack();
  }, [basemap, mapReady]);

  // ── Redraw polyline + markers whenever the model changes ──────────────────
  useEffect(() => {
    if (!mapReady) return;
    const L = LRef.current;
    const map = mapInstanceRef.current;
    if (!L || !map) return;

    const path = expandPath(model);

    // Polyline
    if (polylineRef.current) {
      map.removeLayer(polylineRef.current);
      polylineRef.current = null;
    }
    if (path.length >= 2) {
      const pl = L.polyline(path, {
        renderer: L.svg({ padding: 1 }),
        color: ORANGE,
        weight: 4,
        opacity: 0.9,
        lineCap: "round",
        lineJoin: "round",
      }).addTo(map);
      // Tailwind v4 preflight strips SVG presentation attrs — force inline !important
      const el = pl.getElement() as SVGPathElement | null;
      if (el) {
        el.style.setProperty("stroke", ORANGE, "important");
        el.style.setProperty("stroke-width", "4", "important");
        el.style.setProperty("stroke-opacity", "0.9", "important");
        el.style.setProperty("fill", "none", "important");
        el.style.setProperty("stroke-linecap", "round", "important");
        el.style.setProperty("stroke-linejoin", "round", "important");
      }
      // In break-out arming mode, clicking the line picks the split point
      pl.on("click", (e: { latlng: { lat: number; lng: number } }) => {
        if (modeRef.current !== "breakout-arm") return;
        const target: LatLng = [e.latlng.lat, e.latlng.lng];
        const hit = nearestLeg(modelRef.current, target);
        if (!hit) return;
        const leg = modelRef.current.legs[hit.legIndex];
        if (leg.kind !== "path") {
          setStatusMsg("Bryt ut fungerar bara på en inläst tidigare rutt.");
          return;
        }
        const res = breakOut(modelRef.current, hit.legIndex, hit.vertexIndex);
        if (!res) {
          setStatusMsg("Välj en punkt en bit in på rutten, inte ändpunkterna.");
          return;
        }
        commitModel(res.model);
        setDetourAnchorId(res.detourAnchorId);
        detourRef.current = res.detourAnchorId;
        setSource("breakout");
        setMode("detour");
        setStatusMsg("Avstickare: klicka på kartan för att rita, återanslut sker automatiskt.");
      });
      polylineRef.current = pl;
    }

    // Markers
    for (const mk of markersRef.current) map.removeLayer(mk);
    markersRef.current = [];

    model.nodes.forEach((node) => {
      const icon = L.divIcon({
        html: node.locked ? lockedIconHtml() : freeIconHtml(),
        className: "",
        iconSize: node.locked ? [9, 9] : [14, 14],
        iconAnchor: node.locked ? [4.5, 4.5] : [7, 7],
      });
      const marker = L.marker(node.latlng, { icon, draggable: !node.locked });

      // Click an earlier node to close the loop onto it
      marker.on("click", (e: { originalEvent?: Event }) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (e.originalEvent as any)?.stopPropagation?.();
        const m = modelRef.current;
        const endIdx = m.nodes.length - 1;
        if (endIdx < 1 || m.nodes[endIdx].id === node.id) return;
        openClosurePopup(node.id);
      });

      if (!node.locked) {
        marker.on("dragstart", () => {
          map.off("click");
        });
        marker.on("drag", () => {
          const ll = marker.getLatLng();
          const tentative = expandPath(
            moveNodeId(modelRef.current, node.id, [ll.lat, ll.lng]),
          );
          if (polylineRef.current && tentative.length >= 2) {
            polylineRef.current.setLatLngs(tentative);
          }
        });
        marker.on("dragend", () => {
          const ll = marker.getLatLng();
          const dropped: LatLng = [ll.lat, ll.lng];
          const m = modelRef.current;
          const endIdx = m.nodes.length - 1;
          const isEnd = endIdx >= 1 && m.nodes[endIdx].id === node.id;

          // Dropping the end point onto an earlier node closes the loop
          if (isEnd) {
            let hit: { id: string; d: number } | null = null;
            for (let i = 0; i < endIdx; i++) {
              const d = screenDistance(map, m.nodes[i].latlng, dropped);
              if (d <= SNAP_PX && (!hit || d < hit.d)) hit = { id: m.nodes[i].id, d };
            }
            if (hit) {
              setModel({ ...m }); // discard the drop, snap marker back to original spot
              rebindMapClick();
              openClosurePopup(hit.id);
              return;
            }
          }

          commitModel(moveNodeId(m, node.id, dropped));
          rebindMapClick();
        });
        marker.on("contextmenu", (e: { originalEvent?: Event }) => {
          e.originalEvent?.preventDefault?.();
          commitModel(deleteNodeId(modelRef.current, node.id));
        });
      }
      marker.addTo(map);
      markersRef.current.push(marker);
    });

    // Fit bounds when a base route is loaded (only once, when going from empty)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [model, mapReady, commitModel]);

  const rebindMapClick = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    map.off("click");
    map.on("click", (e: { latlng: { lat: number; lng: number } }) => {
      if (popupRef.current) {
        closeClosurePopup();
        return;
      }
      const pt: LatLng = [e.latlng.lat, e.latlng.lng];
      const m = modeRef.current;
      if (m === "draw") {
        commitModel(appendNode(modelRef.current, pt));
      } else if (m === "detour" && detourRef.current) {
        commitModel(insertNodeBeforeId(modelRef.current, detourRef.current, pt));
      }
    });
  }, [commitModel, closeClosurePopup]);

  // ── Toolbar actions ────────────────────────────────────────────────────────
  const startBlank = useCallback(() => {
    commitModel(emptyRoute());
    setMode("draw");
    setSource("draw");
    setBaseActivityId(null);
    setDetourAnchorId(null);
    setExtensionBaselineM(null);
    setExtensionKm("");
    setStatusMsg(null);
  }, [commitModel]);

  const focusOnPath = useCallback((pts: LatLng[]) => {
    const map = mapInstanceRef.current;
    const L = LRef.current;
    if (!map || !L || pts.length === 0) return;
    try {
      // The container may have resized since the map was created — without this the
      // route can land off-screen or at the wrong zoom.
      map.invalidateSize();
      map.fitBounds(L.latLngBounds(pts), { padding: [40, 40] });
    } catch {
      /* ignore */
    }
  }, []);

  const loadFromActivity = useCallback(
    (stravaId: string) => {
      const act = activities.find((a) => a.strava_id === stravaId);
      if (!act?.summary_polyline || act.summary_polyline === "none") {
        setStatusMsg("Det passet saknar GPS-rutt.");
        return;
      }
      let pts: LatLng[] = [];
      try {
        pts = decodePolyline(act.summary_polyline);
      } catch {
        pts = [];
      }
      if (pts.length < 2) {
        setStatusMsg("Kunde inte läsa ruttdata för det passet.");
        return;
      }
      const next = fromPath(pts);
      commitModel(next);
      setMode("draw");
      setSource("draw");
      setBaseActivityId(stravaId);
      setDetourAnchorId(null);
      setExtensionBaselineM(totalDistanceMeters(next));
      setRouteName(`${act.name} (variant)`);
      setStatusMsg(`Laddade "${act.name}" · ${formatKm(act.distance)} km`);
      focusOnPath(pts);
    },
    [activities, commitModel, focusOnPath],
  );

  const loadFromSaved = useCallback(
    (id: number) => {
      const r = savedRoutes.find((x) => x.id === id);
      if (!r) return;
      let pts: LatLng[] = [];
      try {
        pts = decodePolyline(r.polyline);
      } catch {
        pts = [];
      }
      if (pts.length < 2) {
        setStatusMsg("Kunde inte läsa ruttdata.");
        return;
      }
      const next = fromPath(pts);
      commitModel(next);
      setMode("draw");
      setSource("draw");
      setBaseActivityId(r.base_activity_id);
      setDetourAnchorId(null);
      setExtensionBaselineM(totalDistanceMeters(next));
      setRouteName(`${r.name} (variant)`);
      setStatusMsg(`Laddade "${r.name}" · ${formatKm(r.distance_m)} km`);
      focusOnPath(pts);
    },
    [savedRoutes, commitModel, focusOnPath],
  );

  const clearAll = useCallback(() => {
    startBlank();
  }, [startBlank]);

  const armBreakout = useCallback(() => {
    setMode("breakout-arm");
    setStatusMsg("Klicka på rutten där du vill bryta ut.");
  }, []);

  const finishDetour = useCallback(() => {
    setMode("draw");
    setDetourAnchorId(null);
    detourRef.current = null;
    setStatusMsg(null);
  }, []);

  const saveRoute = useCallback(async () => {
    const waypoints = expandPath(modelRef.current);
    if (waypoints.length < 2) {
      setStatusMsg("Rutten behöver minst två punkter.");
      return;
    }
    const name = routeName.trim() || `Rutt ${new Date().toLocaleDateString("sv-SE")}`;
    setSaving(true);
    try {
      const res = await fetch("/api/routes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, waypoints, source, base_activity_id: baseActivityId }),
      });
      if (res.ok) {
        setStatusMsg(`Sparad: ${name}`);
        refreshSavedRoutes();
      } else {
        const err = await res.json().catch(() => ({}));
        setStatusMsg(err.error ? `Kunde inte spara: ${err.error}` : "Kunde inte spara rutten.");
      }
    } catch {
      setStatusMsg("Kunde inte spara rutten.");
    } finally {
      setSaving(false);
    }
  }, [routeName, source, baseActivityId, refreshSavedRoutes]);

  const setExtensionFromCurrent = useCallback(() => {
    setExtensionBaselineM(totalDistanceMeters(modelRef.current));
  }, []);

  // ── Close-the-loop actions ─────────────────────────────────────────────────
  const junctionIndex = useCallback(
    (id: string) => modelRef.current.nodes.findIndex((n) => n.id === id),
    [],
  );

  const applyOutAndBack = useCallback(() => {
    commitModel(connectOutAndBack(modelRef.current));
    closeClosurePopup();
  }, [commitModel, closeClosurePopup]);

  const applyRundtur = useCallback(
    (id: string) => {
      commitModel(sealLoop(modelRef.current, junctionIndex(id)));
      closeClosurePopup();
    },
    [commitModel, closeClosurePopup, junctionIndex],
  );

  const applyBalloon = useCallback(
    (id: string) => {
      commitModel(connectBalloon(modelRef.current, junctionIndex(id)));
      closeClosurePopup();
    },
    [commitModel, closeClosurePopup, junctionIndex],
  );

  const returnHome = useCallback(() => {
    commitModel(connectOutAndBack(modelRef.current));
  }, [commitModel]);

  // Keep the popup pinned to its map point while panning/zooming
  useEffect(() => {
    if (!closurePopup || !mapReady) return;
    const map = mapInstanceRef.current;
    if (!map) return;
    const update = () => {
      const j = modelRef.current.nodes.find((n) => n.id === closurePopup.junctionId);
      if (!j) {
        closeClosurePopup();
        return;
      }
      const pt = map.latLngToContainerPoint(j.latlng);
      setPopupPx({ x: pt.x, y: pt.y });
    };
    map.on("move zoom", update);
    return () => {
      map.off("move zoom", update);
    };
  }, [closurePopup, mapReady, closeClosurePopup]);

  // ── UI ───────────────────────────────────────────────────────────────────
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
      {/* Controls */}
      <div className="flex flex-col gap-4">
        {/* Distance HUD */}
        <div className="bg-white border border-stone-200 rounded-xl p-5">
          <div className="text-stone-500 text-[0.65rem] uppercase tracking-wider font-medium mb-1">
            Sträcka
          </div>
          <div className="text-4xl font-light text-stone-800 tabular-nums">
            {formatKm(distanceM)} <span className="text-lg text-stone-400">km</span>
          </div>
          <div className="text-xs text-stone-500 mt-1">
            {model.nodes.filter((n) => !n.locked).length} ritade punkter
          </div>

          {/* Target extension */}
          <div className="mt-4 pt-4 border-t border-stone-100">
            <div className="text-stone-500 text-[0.65rem] uppercase tracking-wider font-medium mb-2">
              Mål-förlängning
            </div>
            <div className="flex items-center gap-2">
              <span className="text-stone-400 text-sm">+</span>
              <input
                type="number"
                inputMode="decimal"
                step="0.5"
                min="0"
                value={extensionKm}
                onChange={(e) => {
                  setExtensionKm(e.target.value);
                  if (extensionBaselineM == null) setExtensionFromCurrent();
                }}
                placeholder="5"
                className="w-16 bg-stone-50 border border-stone-200 rounded-md px-2 py-1 text-sm text-stone-800 focus:outline-none focus:border-stone-400"
              />
              <span className="text-stone-400 text-sm">km</span>
              {targetTotalM != null && (
                <button
                  onClick={() => {
                    setExtensionKm("");
                    setExtensionBaselineM(null);
                  }}
                  className="ml-auto text-xs text-stone-400 hover:text-stone-700 bg-transparent border-none cursor-pointer"
                >
                  rensa
                </button>
              )}
            </div>
            {remainingM != null && (
              <div className="text-xs mt-2">
                {remainingM > 0 ? (
                  <span className="text-stone-600">
                    Kvar att rita: <span className="font-medium">{formatKm(remainingM)} km</span>
                  </span>
                ) : (
                  <span className="text-green-600 font-medium">
                    Mål nått ({formatKm(-remainingM)} km över)
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Tools */}
        <div className="bg-white border border-stone-200 rounded-xl p-5 flex flex-col gap-2">
          <div className="text-stone-500 text-[0.65rem] uppercase tracking-wider font-medium mb-1">
            Verktyg
          </div>

          {mode === "detour" ? (
            <button
              onClick={finishDetour}
              className="flex items-center gap-2 bg-stone-800 text-white hover:bg-stone-700 border-none rounded-lg px-3 py-2 text-sm font-medium cursor-pointer transition-all"
            >
              <Flag size={15} /> Klar med avstickare
            </button>
          ) : (
            <button
              onClick={armBreakout}
              disabled={!model.legs.some((l) => l.kind === "path")}
              className={`flex items-center gap-2 border rounded-lg px-3 py-2 text-sm font-medium cursor-pointer transition-all ${
                mode === "breakout-arm"
                  ? "bg-[#FC4C02] text-white border-[#FC4C02]"
                  : "border-stone-300 text-stone-600 hover:border-stone-400 disabled:opacity-40 disabled:cursor-not-allowed"
              }`}
            >
              <Split size={15} /> {mode === "breakout-arm" ? "Klicka på rutten…" : "Bryt ut"}
            </button>
          )}

          <button
            onClick={returnHome}
            disabled={model.nodes.length < 2}
            className="flex items-center gap-2 border border-stone-300 text-stone-600 hover:border-stone-400 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg px-3 py-2 text-sm font-medium cursor-pointer transition-all"
          >
            <Home size={15} /> Spring hem (tur-retur)
          </button>
          <div className="flex gap-2">
            <button
              onClick={undo}
              disabled={!canUndo}
              title="Ångra (Ctrl+Z)"
              className="flex-1 flex items-center justify-center gap-1.5 border border-stone-300 text-stone-600 hover:border-stone-400 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg px-3 py-2 text-sm font-medium cursor-pointer transition-all"
            >
              <Undo2 size={15} /> Ångra
            </button>
            <button
              onClick={redo}
              disabled={!canRedo}
              title="Gör om (Ctrl+Y)"
              className="flex-1 flex items-center justify-center gap-1.5 border border-stone-300 text-stone-600 hover:border-stone-400 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg px-3 py-2 text-sm font-medium cursor-pointer transition-all"
            >
              <Redo2 size={15} /> Gör om
            </button>
          </div>
          <button
            onClick={clearAll}
            className="flex items-center gap-2 border border-stone-300 text-stone-600 hover:border-stone-400 rounded-lg px-3 py-2 text-sm font-medium cursor-pointer transition-all"
          >
            <Trash2 size={15} /> Rensa
          </button>
        </div>

        {/* Start from */}
        <div className="bg-white border border-stone-200 rounded-xl p-5 flex flex-col gap-3">
          <div className="text-stone-500 text-[0.65rem] uppercase tracking-wider font-medium">
            Utgå från
          </div>
          <button
            onClick={startBlank}
            className="flex items-center gap-2 border border-stone-300 text-stone-600 hover:border-stone-400 rounded-lg px-3 py-2 text-sm font-medium cursor-pointer transition-all"
          >
            <Plus size={15} /> Tomt blad
          </button>
          <label className="text-xs text-stone-500">
            Tidigare pass {activities.length > 0 ? `(${activities.length})` : ""}
            <select
              value=""
              disabled={activities.length === 0}
              onChange={(e) => e.target.value && loadFromActivity(e.target.value)}
              className="mt-1 w-full bg-stone-50 border border-stone-200 rounded-md px-2 py-1.5 text-sm text-stone-800 focus:outline-none focus:border-stone-400 disabled:opacity-50"
            >
              <option value="">{activities.length > 0 ? "Välj ett pass…" : "Inga pass med GPS-rutt"}</option>
              {activities.slice(0, 50).map((a) => (
                <option key={a.strava_id} value={a.strava_id}>
                  {formatDate(a.start_date)} · {a.name} · {formatKm(a.distance)} km
                </option>
              ))}
            </select>
          </label>
          {savedRoutes.length > 0 && (
            <label className="text-xs text-stone-500">
              Sparad rutt
              <select
                defaultValue=""
                onChange={(e) => e.target.value && loadFromSaved(parseInt(e.target.value, 10))}
                className="mt-1 w-full bg-stone-50 border border-stone-200 rounded-md px-2 py-1.5 text-sm text-stone-800 focus:outline-none focus:border-stone-400"
              >
                <option value="">Välj en sparad rutt…</option>
                {savedRoutes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} · {formatKm(r.distance_m)} km
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>

        {/* Save */}
        <div className="bg-white border border-stone-200 rounded-xl p-5 flex flex-col gap-2">
          <div className="text-stone-500 text-[0.65rem] uppercase tracking-wider font-medium mb-1">
            Spara
          </div>
          <input
            type="text"
            value={routeName}
            onChange={(e) => setRouteName(e.target.value)}
            placeholder="Ruttnamn"
            className="bg-stone-50 border border-stone-200 rounded-md px-2 py-2 text-sm text-stone-800 focus:outline-none focus:border-stone-400"
          />
          <button
            onClick={saveRoute}
            disabled={saving || model.nodes.length < 2}
            className="flex items-center justify-center gap-2 bg-[#FC4C02] text-white hover:bg-[#e04400] disabled:bg-stone-300 disabled:cursor-not-allowed border-none rounded-lg px-3 py-2 text-sm font-medium cursor-pointer transition-all"
          >
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Spara rutt
          </button>
          {statusMsg && <p className="text-xs text-stone-500 mt-1">{statusMsg}</p>}
        </div>
      </div>

      {/* Map */}
      <div className="relative rounded-xl overflow-hidden border border-stone-200 min-h-[560px]">
        <div ref={mapRef} className="absolute inset-0" />
        {/* Hint overlay */}
        <div
          className="absolute top-3 left-3 bg-white/95 border border-stone-200 rounded-lg px-3 py-1.5 text-xs text-stone-600 flex items-center gap-1.5 pointer-events-none"
          style={{ zIndex: 500 }}
        >
          <MapPin size={13} className="text-[#FC4C02]" />
          {mode === "breakout-arm"
            ? "Klicka på rutten för att välja brytpunkt"
            : mode === "detour"
              ? "Klicka för att rita avstickaren"
              : "Klicka för att lägga punkter · dra för att flytta · högerklick för att ta bort"}
        </div>

        {/* Basemap switcher */}
        <div
          className="absolute top-3 right-3 flex items-center bg-white/95 border border-stone-200 rounded-lg p-0.5 shadow-sm"
          style={{ zIndex: 500 }}
        >
          <Layers size={13} className="text-stone-400 mx-1.5" />
          {(Object.keys(BASEMAPS) as Basemap[]).map((key) => (
            <button
              key={key}
              onClick={() => setBasemap(key)}
              className={`px-2 py-1 text-xs font-medium rounded-md border-none cursor-pointer transition-all ${
                basemap === key ? "bg-stone-800 text-white" : "bg-transparent text-stone-500 hover:text-stone-800"
              }`}
            >
              {BASEMAPS[key].label}
            </button>
          ))}
        </div>

        {!mapReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#F7F3EE]" style={{ zIndex: 600 }}>
            <Loader2 size={28} className="animate-spin text-[#FC4C02]" />
          </div>
        )}

        {/* Close-the-loop popup — anchored to the map point, up-and-right of it */}
        {closurePopup && popupPx && (
          <div
            className="absolute"
            style={{
              left: popupPx.x + 12,
              top: popupPx.y - 12,
              transform: "translateY(-100%)",
              zIndex: 700,
            }}
          >
            <style>{`@keyframes rPop{0%{opacity:0;transform:translateY(-100%) scale(.8) rotate(-3deg)}60%{transform:translateY(-100%) scale(1.04) rotate(1deg)}100%{opacity:1;transform:translateY(-100%) scale(1) rotate(0)}}`}</style>
            <div
              className="w-60 bg-white rounded-2xl border-2 border-[#FC4C02] shadow-xl p-3"
              style={{ animation: "rPop .22s cubic-bezier(.34,1.56,.64,1)", transformOrigin: "bottom left" }}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-semibold text-stone-800 flex items-center gap-1.5">
                  <Sparkles size={15} className="text-[#FC4C02]" />
                  {closurePopup.isStart ? "Tillbaka till start!" : "Slingan är sluten!"}
                </span>
                <button
                  onClick={closeClosurePopup}
                  className="text-stone-400 hover:text-stone-700 bg-transparent border-none cursor-pointer p-0.5 -mr-1"
                  aria-label="Stäng"
                >
                  <X size={15} />
                </button>
              </div>
              <p className="text-[0.7rem] text-stone-500 mb-2.5 leading-snug">
                {closurePopup.isStart
                  ? "Vill du springa hem samma väg du kom (tur-och-retur)?"
                  : "Vill du koppla ihop fram-och-tillbaka-rutten och springa hem via stammen?"}
              </p>
              <div className="flex flex-col gap-1.5">
                {closurePopup.isStart ? (
                  <>
                    <button
                      onClick={applyOutAndBack}
                      className="flex items-center justify-center gap-1.5 bg-[#FC4C02] text-white hover:bg-[#e04400] border-none rounded-lg px-3 py-1.5 text-xs font-semibold cursor-pointer transition-all"
                    >
                      <Home size={13} /> Spring hem (tur-retur)
                    </button>
                    <button
                      onClick={() => applyRundtur(closurePopup.junctionId)}
                      className="border border-stone-300 text-stone-600 hover:border-stone-400 rounded-lg px-3 py-1.5 text-xs font-medium cursor-pointer transition-all"
                    >
                      Gör till rundtur
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => applyBalloon(closurePopup.junctionId)}
                      className="flex items-center justify-center gap-1.5 bg-[#FC4C02] text-white hover:bg-[#e04400] border-none rounded-lg px-3 py-1.5 text-xs font-semibold cursor-pointer transition-all"
                    >
                      <Sparkles size={13} /> Koppla ihop ballong
                    </button>
                    <button
                      onClick={() => applyRundtur(closurePopup.junctionId)}
                      className="border border-stone-300 text-stone-600 hover:border-stone-400 rounded-lg px-3 py-1.5 text-xs font-medium cursor-pointer transition-all"
                    >
                      Stäng bara slingan
                    </button>
                  </>
                )}
              </div>
              {/* little pointer toward the node (down-left) */}
              <div
                className="absolute w-3 h-3 bg-white border-l-2 border-b-2 border-[#FC4C02]"
                style={{ left: -2, bottom: -8, transform: "rotate(-45deg)" }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
