import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Strava Dashboard",
  description: "Personal running dashboard with training load tracking and goal management",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, backgroundColor: "#0a0a0a", color: "#ededed" }}>
        {children}
      </body>
    </html>
  );
}
