import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Appliance Tracker",
  description: "Track orthodontic lab appliances and their return dates.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
