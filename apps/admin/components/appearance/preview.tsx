"use client";
import { getDictionary } from "@darb-rest/i18n";
import { useEffect, useState } from "react";
import { RestaurantMenu, type MenuPreviewProps, type RestaurantPresentation } from "@darb-rest/ui";
import { supportedAppearance } from "@darb-rest/types";
import { appearanceSchema } from "@darb-rest/validation";
export function AppearancePreview(p: MenuPreviewProps & { restaurant: RestaurantPresentation }) {
  const [settings, setSettings] = useState(p.restaurant.settings);
  useEffect(() => {
    const receive = (e: MessageEvent) => {
      if (
        e.origin !== location.origin ||
        e.source !== window.parent ||
        e.data?.type !== "darb-appearance"
      )
        return;
      const result = appearanceSchema.safeParse(e.data.settings);
      if (result.success && supportedAppearance(result.data)) setSettings(result.data);
    };
    window.addEventListener("message", receive);
    window.parent.postMessage({ type: "darb-preview-ready" }, location.origin);
    return () => window.removeEventListener("message", receive);
  }, []);
  const dict = getDictionary(p.locale);
  return (
    <>
      <p className="bg-[#1a3c2a] p-3 text-center text-sm text-white">
        {dict.appearance.previewNote}
      </p>
      <RestaurantMenu {...p} restaurant={{ ...p.restaurant, settings, previewMedia: true }} />
    </>
  );
}
