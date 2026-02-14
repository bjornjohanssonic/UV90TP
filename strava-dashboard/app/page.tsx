"use client";

import { useEffect, useState } from "react";
import styles from "./page.module.css";

export default function Home() {
  const [checking, setChecking] = useState(true);
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((res) => {
        if (res.ok) {
          setRedirecting(true);
          window.location.href = "/dashboard";
        } else {
          setChecking(false);
        }
      })
      .catch(() => {
        setChecking(false);
      });
  }, []);

  if (checking || redirecting) {
    return (
      <main className={styles.main}>
        <div className={styles.spinner}>
          <div className={styles.spinnerIcon} />
          <p className={styles.spinnerText}>
            {redirecting ? "Redirecting to dashboard..." : "Checking session..."}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.main}>
      <h1 className={styles.title}>Strava Dashboard</h1>
      <a href="/api/auth/login" className={styles.connectBtn}>
        Connect with Strava
      </a>
    </main>
  );
}
