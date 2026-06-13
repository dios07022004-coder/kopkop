import { ImageResponse } from "next/og";

/** 512×512 maskable icon for PWA install (manifest). */
export function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#1f9d6b",
          color: "white",
          fontSize: 300,
          fontWeight: 800,
          fontFamily: "sans-serif",
        }}
      >
        ₽
      </div>
    ),
    { width: 512, height: 512 },
  );
}
