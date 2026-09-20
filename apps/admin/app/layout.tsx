import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Darb REST Console",
  description: "Restaurant and Café Administrative Management",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
