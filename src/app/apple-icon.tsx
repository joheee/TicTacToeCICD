import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// iPhone home-screen icon (iOS rounds the corners itself). Geist is bundled to match the portfolio, see icon.tsx.
export default async function AppleIcon() {
  const geist = await readFile(join(process.cwd(), "src/assets/Geist-Regular.ttf"));
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#818cf8", color: "#0a0a0a", fontSize: 120, fontWeight: 700, fontFamily: "Geist" }}>
        J
      </div>
    ),
    { ...size, fonts: [{ name: "Geist", data: geist, weight: 400, style: "normal" }] },
  );
}
