import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Darb REST",
    short_name: "Darb REST",
    start_url: "/",
    display: "standalone",
    background_color: "#faf8f4",
    theme_color: "#1a3c2a",
    icons: [{ src: "/brand/darb-rest-pwa-icon.png", sizes: "1254x1254", type: "image/png" }],
  };
}
