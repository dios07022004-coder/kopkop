"use client";

import { useEffect } from "react";
import { captureUtm } from "@/lib/utm";

/** Запоминает UTM-метки первого визита в cookie (для атрибуции заказов). */
export function UtmCapture() {
  useEffect(() => {
    captureUtm();
  }, []);
  return null;
}
