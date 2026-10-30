import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

// Favicon: the "J" tile from the portfolio site. Same code and renderer default (Geist), so same glyph.
export default function Icon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#818cf8", color: "#0a0a0a", fontSize: 22, fontWeight: 700, borderRadius: 8 }}>
        J
      </div>
    ),
    size,
  );
}
