"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { Activity } from "@/types";
import type { RunQualityScore } from "@/types/coach";
import { formatKm, formatTime, formatPace, formatDate, formatStartEnd } from "@/lib/dashboard-helpers";

interface RunMapProps {
  selectedActivity: Activity | null;
}

interface Photo {
  unique_id: string;
  urls: Record<string, string>;
  caption: string | null;
}

function decodePolyline(encoded: string): [number, number][] {
  const points: [number, number][] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte: number;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;

    shift = 0;
    result = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;

    points.push([lat / 1e5, lng / 1e5]);
  }
  return points;
}

type AnimationPhase = "loading" | "drawing" | "done";

export default function RunMap({ selectedActivity }: RunMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInstanceRef = useRef<any>(null);
  const [leafletReady, setLeafletReady] = useState(false);
  const [animationPhase, setAnimationPhase] = useState<AnimationPhase>("loading");
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [showGallery, setShowGallery] = useState(false);
  const animationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [qualityScore, setQualityScore] = useState<RunQualityScore | null>(null);

  // Fetch quality score for selected activity
  useEffect(() => {
    if (!selectedActivity?.strava_id) {
      setQualityScore(null);
      return;
    }
    let cancelled = false;
    fetch(`/api/scoring/${selectedActivity.strava_id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data) setQualityScore(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [selectedActivity?.strava_id]);

  // Load Leaflet dynamically
  useEffect(() => {
    if (leafletReady) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(link);
    import("leaflet").then(() => setLeafletReady(true));
  }, [leafletReady]);

  // Reset state on activity change
  useEffect(() => {
    setAnimationPhase("loading");
    setPhotos([]);
    setPhotoIndex(0);
    setShowGallery(false);
    if (animationTimerRef.current) clearTimeout(animationTimerRef.current);
  }, [selectedActivity?.strava_id]);

  // Fetch photos after animation completes
  const fetchPhotos = useCallback(async (stravaId: string) => {
    try {
      const res = await fetch(`/api/activities/${stravaId}/photos`);
      if (res.ok) {
        const data: Photo[] = await res.json();
        setPhotos(data.filter((p) => Object.keys(p.urls).length > 0));
        setPhotoIndex(0);
      }
    } catch {
      /* ignore */
    }
  }, []);

  // Render map with animated polyline
  useEffect(() => {
    if (!leafletReady || !mapRef.current) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.off();
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    if (!selectedActivity?.summary_polyline) return;

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const L = require("leaflet");
    const points = decodePolyline(selectedActivity.summary_polyline);
    if (points.length === 0) return;

    const map = L.map(mapRef.current, {
      zoomControl: false,
      attributionControl: false,
    });
    mapInstanceRef.current = map;

    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: "abcd",
    }).addTo(map);

    // No filter needed for light tiles

    // Add polyline using Leaflet's native SVG renderer
    const svgRenderer = L.svg({ padding: 1 });
    // Create polyline with opacity 0 so it's invisible from the very first frame
    const polyline = L.polyline(points, {
      renderer: svgRenderer,
      color: "#FC4C02",
      weight: 3,
      opacity: 0,
      lineCap: "round",
      lineJoin: "round",
    }).addTo(map);

    // Tailwind v4 override helper — does NOT touch stroke-opacity (caller controls visibility)
    const forcePathStyles = (el: SVGElement) => {
      el.style.setProperty("stroke", "#FC4C02", "important");
      el.style.setProperty("stroke-width", "3", "important");
      el.style.setProperty("stroke-linecap", "round", "important");
      el.style.setProperty("stroke-linejoin", "round", "important");
      el.style.setProperty("fill", "none", "important");
    };

    // Ensure the polyline stays invisible even if Leaflet or Tailwind overrides
    const pathEl = polyline.getElement() as SVGPathElement | null;
    if (pathEl) {
      forcePathStyles(pathEl);
      pathEl.style.setProperty("stroke-opacity", "0", "important");
    }

    // Fit map to polyline bounds
    map.fitBounds(polyline.getBounds(), { padding: [30, 30] });

    const forceMarkerStyles = (marker: ReturnType<typeof L.circleMarker>, fill: string) => {
      const mEl = marker.getElement();
      if (!mEl) return;
      mEl.style.setProperty("fill", fill, "important");
      mEl.style.setProperty("fill-opacity", "1", "important");
      mEl.style.setProperty("stroke", "#ffffff", "important");
      mEl.style.setProperty("stroke-width", "2", "important");
      mEl.style.setProperty("stroke-opacity", "1", "important");
    };

    const stravaId = selectedActivity.strava_id;
    const mapContainer = mapRef.current;

    // Convert an SVG path point to lat/lng using the element's screen transform
    function svgPointToLatLng(el: SVGPathElement, lengthAlongPath: number): [number, number] | null {
      const svgPt = el.getPointAtLength(lengthAlongPath);
      const ctm = el.getScreenCTM();
      if (!ctm || !mapContainer) return null;
      const containerRect = mapContainer.getBoundingClientRect();
      const screenX = svgPt.x * ctm.a + ctm.e;
      const screenY = svgPt.y * ctm.d + ctm.f;
      const latlng = map.containerPointToLatLng([
        screenX - containerRect.left,
        screenY - containerRect.top,
      ]);
      return [latlng.lat, latlng.lng];
    }

    // Wait for tiles to load, then transition to drawing phase
    const loadingDuration = 1500;
    // Scale draw duration with distance: ~3s for 5km, ~8s for 20km, ~17s for 40km, ~30s for 60km+
    const distKm = selectedActivity.distance / 1000;
    const drawDuration = Math.max(3000, Math.min(35000, 1000 + distKm * 300 + distKm * distKm * 3));
    let animFrameId: number | null = null;

    animationTimerRef.current = setTimeout(() => {
      // Fade out the black overlay (handled by React state)
      setAnimationPhase("drawing");

      // After a brief moment for the fade, start the polyline drawing
      animationTimerRef.current = setTimeout(() => {
        const el = polyline.getElement() as SVGPathElement | null;
        if (!el) {
          setAnimationPhase("done");
          fetchPhotos(stravaId);
          return;
        }

        forcePathStyles(el);
        const pathLength = el.getTotalLength();

        if (pathLength <= 0) {
          el.style.setProperty("stroke-opacity", "0.85", "important");
          setAnimationPhase("done");
          fetchPhotos(stravaId);
          return;
        }

        // Prepare dash — dashoffset = full length means nothing is drawn yet
        el.style.setProperty("stroke-dasharray", String(pathLength), "important");
        el.style.setProperty("stroke-dashoffset", String(pathLength), "important");
        // NOW reveal — the dashoffset hides the line, so no flash
        el.style.setProperty("stroke-opacity", "0.85", "important");

        // Add start marker (white dot) — visible from the start of the draw
        const startMarker = L.circleMarker(points[0], {
          radius: 5, color: "#ffffff", fillColor: "#ffffff", fillOpacity: 1, weight: 2,
        }).addTo(map);
        requestAnimationFrame(() => forceMarkerStyles(startMarker, "#ffffff"));

        // Add moving head marker (orange dot) — starts at first point
        const headMarker = L.circleMarker(points[0], {
          radius: 5, color: "#ffffff", fillColor: "#FC4C02", fillOpacity: 1, weight: 2,
        }).addTo(map);
        requestAnimationFrame(() => forceMarkerStyles(headMarker, "#FC4C02"));

        // Animate with requestAnimationFrame
        const startTime = performance.now();

        function animate(now: number) {
          const elapsed = now - startTime;
          // Ease-in-out cubic
          let t = Math.min(elapsed / drawDuration, 1);
          t = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

          // Update dashoffset
          const drawnLength = pathLength * t;
          const offset = pathLength - drawnLength;
          el!.style.setProperty("stroke-dashoffset", String(offset), "important");

          // Move head marker to match the exact drawn tip using the SVG path
          const pos = svgPointToLatLng(el!, drawnLength);
          if (pos) headMarker.setLatLng(pos);
          // Re-force marker styles (Tailwind can strip them on reposition)
          const mEl = headMarker.getElement();
          if (mEl) {
            mEl.style.setProperty("fill", "#FC4C02", "important");
            mEl.style.setProperty("fill-opacity", "1", "important");
            mEl.style.setProperty("stroke", "#ffffff", "important");
            mEl.style.setProperty("stroke-width", "2", "important");
            mEl.style.setProperty("stroke-opacity", "1", "important");
          }

          if (t < 1) {
            animFrameId = requestAnimationFrame(animate);
          } else {
            // Drawing complete
            el!.style.removeProperty("stroke-dasharray");
            el!.style.removeProperty("stroke-dashoffset");
            forcePathStyles(el!);
            el!.style.setProperty("stroke-opacity", "0.85", "important");

            // Ensure head marker is exactly at the end
            headMarker.setLatLng(points[points.length - 1]);
            requestAnimationFrame(() => forceMarkerStyles(headMarker, "#FC4C02"));

            setAnimationPhase("done");
            fetchPhotos(stravaId);
          }
        }

        animFrameId = requestAnimationFrame(animate);
      }, 500); // brief delay after fade starts before drawing begins
    }, loadingDuration);

    return () => {
      if (animFrameId) cancelAnimationFrame(animFrameId);
      if (animationTimerRef.current) clearTimeout(animationTimerRef.current);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.off();
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [leafletReady, selectedActivity, fetchPhotos]);

  const act = selectedActivity;
  const hasPolyline = !!act?.summary_polyline;

  return (
    <div className="bg-white border border-stone-200 rounded-xl overflow-hidden hover:border-stone-300 transition-all h-full flex flex-col">
      {/* Map / Gallery area */}
      <div className="relative flex-1 min-h-[400px]">
        {/* Map container — hidden when gallery is active */}
        <div ref={mapRef} className="absolute inset-0" style={{ visibility: showGallery ? "hidden" : "visible" }} />

        {/* Black loading overlay — covers the map until tiles are ready */}
        {hasPolyline && animationPhase === "loading" && (
          <div
            className="absolute inset-0 flex items-center justify-center bg-[#F7F3EE]"
            style={{ zIndex: 1001, transition: "opacity 0.5s ease-out" }}
          >
            <svg width="48" height="48" viewBox="0 0 48 48" className="animate-spin-slow">
              <circle cx="24" cy="24" r="20" fill="none" stroke="#E5DFD5" strokeWidth="3" />
              <circle
                cx="24"
                cy="24"
                r="20"
                fill="none"
                stroke="#FC4C02"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 20}`}
                strokeDashoffset={`${2 * Math.PI * 20 * 0.25}`}
              />
            </svg>
          </div>
        )}

        {/* Fade-in overlay — briefly visible while transitioning from loading to drawing */}
        {hasPolyline && animationPhase === "drawing" && (
          <div
            className="absolute inset-0 bg-[#F7F3EE] pointer-events-none animate-fade-out"
            style={{ zIndex: 1001 }}
          />
        )}

        {/* Gallery view */}
        {showGallery && photos.length > 0 && (
          <div className="absolute inset-0 bg-[#1a1a1a] flex flex-col items-center justify-center" style={{ zIndex: 1001 }}>
            <img
              src={Object.values(photos[photoIndex].urls)[0]}
              alt={photos[photoIndex].caption || "Activity photo"}
              className="max-w-full max-h-full object-contain"
              style={{ flex: "1 1 auto", minHeight: 0 }}
            />
            {photos.length > 1 && (
              <div className="flex items-center gap-3 py-2">
                <button
                  onClick={() => setPhotoIndex((i) => (i - 1 + photos.length) % photos.length)}
                  className="text-stone-500 hover:text-stone-800 bg-transparent border-none cursor-pointer text-sm px-2"
                >
                  &larr;
                </button>
                <span className="text-stone-500 text-xs">{photoIndex + 1} / {photos.length}</span>
                <button
                  onClick={() => setPhotoIndex((i) => (i + 1) % photos.length)}
                  className="text-stone-500 hover:text-stone-800 bg-transparent border-none cursor-pointer text-sm px-2"
                >
                  &rarr;
                </button>
              </div>
            )}
          </div>
        )}

        {/* Gallery / Map toggle button */}
        {animationPhase === "done" && photos.length > 0 && (
          <button
            onClick={() => setShowGallery((v) => !v)}
            className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center bg-white/95 border border-stone-300 hover:border-stone-400 rounded-lg cursor-pointer transition-all"
            style={{ zIndex: 1002 }}
            title={showGallery ? "Show map" : "Show photos"}
          >
            {showGallery ? (
              /* Map icon */
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M1 3.5L5.5 1.5L10.5 3.5L15 1.5V12.5L10.5 14.5L5.5 12.5L1 14.5V3.5Z" stroke="#6B6660" strokeWidth="1.2" strokeLinejoin="round" />
                <path d="M5.5 1.5V12.5" stroke="#6B6660" strokeWidth="1.2" />
                <path d="M10.5 3.5V14.5" stroke="#6B6660" strokeWidth="1.2" />
              </svg>
            ) : (
              /* Gallery icon */
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="1.5" y="2.5" width="13" height="11" rx="1.5" stroke="#6B6660" strokeWidth="1.2" />
                <circle cx="5" cy="6" r="1.5" stroke="#6B6660" strokeWidth="1" />
                <path d="M1.5 11L5 8L8 10.5L11 7.5L14.5 11" stroke="#6B6660" strokeWidth="1.2" strokeLinejoin="round" />
              </svg>
            )}
          </button>
        )}

        {!hasPolyline && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/95" style={{ zIndex: 1001 }}>
            <span className="text-stone-400 text-sm">
              {act ? "No route data for this activity" : "Select a run to see its route"}
            </span>
          </div>
        )}
      </div>

      {/* Run details */}
      {act && (
        <div className="p-4 border-t border-stone-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-stone-800 truncate">{act.name}</h3>
            <span className="text-xs text-stone-500 whitespace-nowrap ml-2">{formatDate(act.start_date)}</span>
          </div>
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: "Distance", value: `${formatKm(act.distance)} km` },
              { label: "Time", value: formatTime(act.moving_time) },
              { label: "Pace", value: act.distance > 0 ? `${formatPace(act.distance, act.moving_time)}/km` : "-" },
              { label: "Heart Rate", value: act.average_heartrate ? `${Math.round(act.average_heartrate)} bpm` : "-" },
              { label: "Elevation", value: `${Math.round(act.total_elevation_gain)} m` },
              { label: "Suffer Score", value: act.suffer_score ? String(act.suffer_score) : "-" },
              { label: "Clock", value: formatStartEnd(act.start_date, act.elapsed_time) },
            ].map((stat) => (
              <div key={stat.label}>
                <div className="text-stone-500 text-[0.65rem] uppercase tracking-wider font-medium mb-0.5">
                  {stat.label}
                </div>
                <div className="text-sm text-stone-800">{stat.value}</div>
              </div>
            ))}
            {/* Quality score */}
            <div>
              <div className="text-stone-500 text-[0.65rem] uppercase tracking-wider font-medium mb-0.5">
                Quality
              </div>
              {qualityScore ? (
                <div className="flex items-center gap-2">
                  <span
                    className={`text-sm font-medium ${
                      qualityScore.total >= 80
                        ? "text-green-400"
                        : qualityScore.total >= 60
                          ? "text-stone-800"
                          : qualityScore.total >= 40
                            ? "text-yellow-400"
                            : "text-red-400"
                    }`}
                  >
                    {qualityScore.total}
                  </span>
                  <div className="flex gap-1">
                    {[
                      { label: "P", value: qualityScore.paceConsistency },
                      { label: "H", value: qualityScore.heartRateEfficiency },
                      { label: "E", value: qualityScore.elevationHandling },
                      { label: "A", value: qualityScore.planAlignment },
                    ].map((s) => (
                      <span key={s.label} className="text-[0.55rem] text-stone-400" title={`${s.label}: ${s.value}/25`}>
                        {s.value}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-stone-400">-</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
