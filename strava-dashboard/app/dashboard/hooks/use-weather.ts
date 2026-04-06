"use client";

import { useState, useEffect } from "react";

export interface WeatherHour {
  time: string; // "HH:00"
  feelsLike: number; // °C rounded
  precipProb: number; // 0-100
  precip: number; // mm
}

export interface WeatherData {
  today: WeatherHour[]; // current hour → 23:00
  tomorrow: WeatherHour[]; // 07:00 → 20:00
  locationName: string | null;
}

export function useWeather() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError("Geolocation not supported");
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const { latitude, longitude } = coords;
          const url =
            `https://api.open-meteo.com/v1/forecast` +
            `?latitude=${latitude.toFixed(4)}&longitude=${longitude.toFixed(4)}` +
            `&hourly=apparent_temperature,precipitation_probability,precipitation` +
            `&forecast_days=2&timezone=auto`;

          const res = await fetch(url);
          if (!res.ok) throw new Error("Weather fetch failed");
          const data = await res.json();

          const times: string[] = data.hourly.time;
          const feelsLikes: number[] = data.hourly.apparent_temperature;
          const precipProbs: number[] = data.hourly.precipitation_probability;
          const precips: number[] = data.hourly.precipitation;

          const now = new Date();
          const todayStr = now.toISOString().slice(0, 10);
          const tomorrowStr = new Date(now.getTime() + 86400000).toISOString().slice(0, 10);
          const currentHour = now.getHours();

          const today: WeatherHour[] = [];
          const tomorrow: WeatherHour[] = [];

          times.forEach((isoTime, i) => {
            const [datePart, timePart] = isoTime.split("T");
            const hour = parseInt(timePart.slice(0, 2), 10);
            const entry: WeatherHour = {
              time: timePart.slice(0, 5),
              feelsLike: Math.round(feelsLikes[i]),
              precipProb: precipProbs[i],
              precip: Math.round(precips[i] * 10) / 10,
            };

            if (datePart === todayStr && hour >= currentHour) {
              today.push(entry);
            } else if (datePart === tomorrowStr && hour >= 7 && hour <= 20) {
              tomorrow.push(entry);
            }
          });

          // Reverse-geocode city name via Open-Meteo geocoding isn't great,
          // use a simple lat/lng label as fallback
          let locationName: string | null = null;
          try {
            const geoRes = await fetch(
              `https://nominatim.openstreetmap.org/reverse?lat=${latitude.toFixed(4)}&lon=${longitude.toFixed(4)}&format=json`,
              { headers: { "Accept-Language": "sv" } },
            );
            if (geoRes.ok) {
              const geo = await geoRes.json();
              locationName =
                geo.address?.city ?? geo.address?.town ?? geo.address?.village ?? geo.address?.municipality ?? null;
            }
          } catch {
            // locationName stays null — not critical
          }

          setWeather({ today, tomorrow, locationName });
        } catch (e) {
          setError("Could not load weather");
        } finally {
          setLoading(false);
        }
      },
      () => {
        setError("Location access denied");
        setLoading(false);
      },
      { timeout: 8000 },
    );
  }, []);

  return { weather, error, loading };
}
