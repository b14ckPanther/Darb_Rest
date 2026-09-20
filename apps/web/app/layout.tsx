import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Darb REST",
  description: "Digital Platform for Restaurants & Cafés",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
