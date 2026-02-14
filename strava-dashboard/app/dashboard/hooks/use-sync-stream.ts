import { useState } from "react";

interface SyncResult {
  message: string;
  type: "success" | "warning" | "error";
}

export function useSyncStream(onSyncComplete: () => Promise<void>) {
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [syncCount, setSyncCount] = useState(0);

  async function handleSync() {
    setSyncing(true);
    setSyncResult(null);
    setSyncStatus("Connecting to Strava...");
    setSyncCount(0);

    try {
      const res = await fetch("/api/activities/sync", {
        method: "POST",
      });

      if (!res.body) {
        setSyncResult({ message: "Sync failed — no response stream.", type: "error" });
        setSyncing(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const dataMatch = line.match(/^data: (.+)$/m);
          if (!dataMatch) continue;
          try {
            const event = JSON.parse(dataMatch[1]);
            if (event.type === "status") {
              setSyncStatus(event.message);
            } else if (event.type === "progress") {
              setSyncCount(event.total);
              setSyncStatus(`Syncing: ${event.total} activities (${event.latest?.name || ""})`);
            } else if (event.type === "rate_limit") {
              setSyncStatus(null);
              setSyncResult({ message: event.message, type: "warning" });
            } else if (event.type === "done") {
              setSyncStatus(null);
              setSyncResult({
                message: event.message,
                type: event.rateLimited ? "warning" : "success",
              });
              await onSyncComplete();
            } else if (event.type === "error") {
              setSyncStatus(null);
              setSyncResult({ message: event.message, type: "error" });
            }
          } catch {
            /* ignore parse errors */
          }
        }
      }

      await onSyncComplete();
    } catch {
      setSyncResult({ message: "Sync failed — network error.", type: "error" });
    } finally {
      setSyncing(false);
      setSyncStatus(null);
    }
  }

  return { syncing, syncStatus, syncResult, syncCount, handleSync };
}
