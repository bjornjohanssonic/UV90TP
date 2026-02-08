"use client";

import { useEffect, useState } from "react";

export default function Home() {
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    const athleteId = localStorage.getItem("athleteId");
    if (athleteId) {
      setRedirecting(true);
      // Small delay to show the redirecting message
      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 300);
    }
  }, []);

  if (redirecting) {
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
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "1rem",
          }}
        >
          <div
            style={{
              width: "40px",
              height: "40px",
              border: "3px solid #333",
              borderTop: "3px solid #fc4c02",
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
            }}
          />
          <p style={{ color: "#888", fontSize: "0.9rem" }}>
            Redirecting to dashboard...
          </p>
        </div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </main>
    );
  }

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
