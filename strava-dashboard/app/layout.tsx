import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Strava Dashboard",
  description: "Personal running dashboard with training load tracking and goal management",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
