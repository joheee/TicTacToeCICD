import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "Tic-Tac-Toe" };

export const viewport: Viewport = { themeColor: "#21202e" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
