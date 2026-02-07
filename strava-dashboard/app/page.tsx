"use client";

import { useEffect } from "react";

export default function Home() {
  useEffect(() => {
    const athleteId = localStorage.getItem("athleteId");
    if (athleteId) {
      window.location.href = "/dashboard";
    }
  }, []);

  return (
    <main
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <h1
        style={{
          fontSize: "2.5rem",
          fontWeight: 700,
          marginBottom: "2rem",
          color: "#ffffff",
        }}
      >
        Strava Dashboard
      </h1>
      <a
        href="/api/auth/login"
        style={{
          backgroundColor: "#fc4c02",
          color: "#ffffff",
          border: "none",
          borderRadius: "8px",
          padding: "14px 32px",
          fontSize: "1.1rem",
          fontWeight: 600,
          cursor: "pointer",
          textDecoration: "none",
          transition: "background-color 0.2s",
        }}
        onMouseOver={(e) =>
          ((e.target as HTMLAnchorElement).style.backgroundColor = "#e04400")
        }
        onMouseOut={(e) =>
          ((e.target as HTMLAnchorElement).style.backgroundColor = "#fc4c02")
        }
      >
        Connect with Strava
      </a>
    </main>
  );
}
