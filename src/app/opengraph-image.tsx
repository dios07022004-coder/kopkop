import { ImageResponse } from "next/og";
import { PRODUCT } from "@/data/content";

export const alt = `${PRODUCT.name} — калькулятор бюджета`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          width: "100%",
          height: "100%",
          padding: "64px",
          background: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 50%, #ffffff 100%)",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              display: "flex",
              width: 56,
              height: 56,
              borderRadius: 16,
              background: "#16a34a",
              color: "white",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 28,
              fontWeight: 700,
            }}
          >
            ₽
          </div>
          <span style={{ fontSize: 28, fontWeight: 600, color: "#14532d" }}>
            {PRODUCT.name}
          </span>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontSize: 56,
              fontWeight: 700,
              lineHeight: 1.15,
              color: "#052e16",
              maxWidth: 900,
            }}
          >
            Узнайте, сколько денег у вас реально свободно
          </div>
          <div style={{ marginTop: 24, fontSize: 28, color: "#166534" }}>
            {`Калькулятор бюджета · считайте бесплатно · полная версия ${PRODUCT.price} ₽`}
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
