"use client";

import { useWeather, type WeatherHour } from "../hooks/use-weather";

function tempColor(c: number): string {
  if (c < 0) return "#93c5fd"; // blue-300 — very cold
  if (c < 8) return "#7dd3fc"; // sky-300 — cold, good for running
  if (c < 16) return "#86efac"; // green-300 — ideal
  if (c < 22) return "#fde68a"; // amber-200 — warm
  return "#fca5a5"; // red-300 — hot
}

function tempLabel(c: number): string {
  if (c < 0) return "Mycket kallt";
  if (c < 8) return "Kallt";
  if (c < 16) return "Idealiskt";
  if (c < 22) return "Varmt";
  return "Hett";
}

function rainColor(prob: number): string {
  if (prob < 20) return "rgba(0,0,0,0.06)";
  if (prob < 50) return "rgba(251,191,36,0.5)"; // yellow
  return "rgba(96,165,250,0.6)"; // blue
}

function HourBlock({ hour, highlight }: { hour: WeatherHour; highlight?: boolean }) {
  const color = tempColor(hour.feelsLike);
  const rainH = Math.round((hour.precipProb / 100) * 28); // max 28px bar

  return (
    <div
      className="flex flex-col items-center gap-1 flex-shrink-0"
      style={{ width: 44 }}
      data-tooltip={`${hour.time} — Känns ${hour.feelsLike}°C (${tempLabel(hour.feelsLike)}), ${hour.precipProb}% regn${hour.precip > 0 ? `, ${hour.precip} mm` : ""}`}
    >
      {/* Time */}
      <div
        className="text-[0.6rem] font-medium px-1.5 py-0.5 rounded"
        style={{
          color: highlight ? "#2D2B28" : "#6B6660",
          background: highlight ? "rgba(0,0,0,0.08)" : "rgba(0,0,0,0.04)",
        }}
      >
        {hour.time}
      </div>

      {/* Temperature */}
      <div
        className="text-sm font-light tabular-nums"
        style={{ color, textShadow: highlight ? `0 0 12px ${color}` : "none" }}
      >
        {hour.feelsLike}°
      </div>

      {/* Rain bar */}
      <div className="flex items-end" style={{ height: 28 }}>
        <div
          className="w-4 rounded-sm transition-all duration-300"
          style={{
            height: Math.max(rainH, hour.precipProb > 0 ? 2 : 0),
            backgroundColor: rainColor(hour.precipProb),
          }}
        />
      </div>

      {/* Rain % */}
      <div className="text-[0.5rem]" style={{ color: hour.precipProb >= 20 ? "#6B6660" : "#C4BFB6" }}>
        {hour.precipProb > 0 ? `${hour.precipProb}%` : ""}
      </div>
    </div>
  );
}

function WeatherCard({
  title,
  hours,
  locationName,
  isToday,
}: {
  title: string;
  hours: WeatherHour[];
  locationName: string | null;
  isToday: boolean;
}) {
  if (hours.length === 0) {
    return (
      <div className="bg-white border border-stone-200 rounded-xl p-5 flex items-center justify-center">
        <span className="text-stone-400 text-sm">Inga data</span>
      </div>
    );
  }

  // For today, highlight the first (current) hour
  const currentHour = isToday ? hours[0]?.time : null;

  // Summary: min/max feels-like, max rain prob
  const temps = hours.map((h) => h.feelsLike);
  const minT = Math.min(...temps);
  const maxT = Math.max(...temps);
  const maxRain = Math.max(...hours.map((h) => h.precipProb));

  return (
    <div className="bg-white border border-stone-200 rounded-xl p-5 flex flex-col gap-3 hover:border-stone-300 transition-all">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="text-[0.7rem] text-stone-400 uppercase tracking-wider font-medium">{title}</div>
          {locationName && (
            <div className="text-[0.6rem] text-stone-300 truncate max-w-[100px]">{locationName}</div>
          )}
        </div>
        {/* Summary pills */}
        <div className="flex items-center gap-2 text-[0.6rem]">
          <span style={{ color: tempColor((minT + maxT) / 2) }}>
            {minT}° – {maxT}°
          </span>
          {maxRain >= 20 && (
            <span style={{ color: maxRain >= 50 ? "#93c5fd" : "#fde68a" }}>{maxRain}% regn</span>
          )}
        </div>
      </div>

      {/* Hourly scroll strip */}
      <div className="overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
        <div className="flex gap-1">
          {hours.map((h, i) => (
            <HourBlock key={h.time} hour={h} highlight={isToday && i === 0} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function WeatherPanel() {
  const { weather, error, loading } = useWeather();

  if (loading) {
    return (
      <div className="grid gap-4 grid-cols-2">
        {["Idag", "Imorgon"].map((t) => (
          <div
            key={t}
            className="bg-white border border-stone-200 rounded-xl p-5 flex items-center justify-center h-36"
          >
            <div className="text-stone-300 text-sm">{t} — hämtar väder...</div>
          </div>
        ))}
      </div>
    );
  }

  if (error || !weather) {
    return (
      <div className="grid gap-4 grid-cols-2">
        {["Idag", "Imorgon"].map((t) => (
          <div
            key={t}
            className="bg-white border border-stone-200 rounded-xl p-5 flex items-center justify-center h-36"
          >
            <div className="text-stone-300 text-sm">{error ?? "Ingen väderdata"}</div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 grid-cols-2">
      <WeatherCard
        title="Idag"
        hours={weather.today}
        locationName={weather.locationName}
        isToday={true}
      />
      <WeatherCard
        title="Imorgon"
        hours={weather.tomorrow}
        locationName={null}
        isToday={false}
      />
    </div>
  );
}
