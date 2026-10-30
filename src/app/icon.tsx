import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

// Favicon: the "J" tile from the portfolio site. The portfolio runs Next 16, whose image renderer defaults
// to Geist; Next 15 defaults to Noto Sans, so Geist is bundled here to draw the same glyph.
export default async function Icon() {
  const geist = await readFile(join(process.cwd(), "src/assets/Geist-Regular.ttf"));
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#818cf8", color: "#0a0a0a", fontSize: 22, fontWeight: 700, borderRadius: 8, fontFamily: "Geist" }}>
        J
      </div>
    ),
    { ...size, fonts: [{ name: "Geist", data: geist, weight: 400, style: "normal" }] },
  );
}
