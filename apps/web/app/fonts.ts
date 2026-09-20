import { Cairo, Heebo, Ubuntu } from "next/font/google";

export const fontCairo = Cairo({
  subsets: ["arabic", "latin"],
  variable: "--font-cairo",
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  adjustFontFallback: false,
});

export const fontHeebo = Heebo({
  subsets: ["hebrew", "latin"],
  variable: "--font-heebo",
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  adjustFontFallback: false,
});

export const fontUbuntu = Ubuntu({
  fallback: ["Cairo", "Heebo"],
  subsets: ["latin"],
  variable: "--font-ubuntu",
  weight: ["300", "400", "500", "700"],
  display: "swap",
  adjustFontFallback: false,
});

export function getActiveFontClass(locale: string): string {
  switch (locale) {
    case "he":
      return "font-heebo";
    case "en":
      return "font-ubuntu";
    case "ar":
    default:
      return "font-cairo";
  }
}
