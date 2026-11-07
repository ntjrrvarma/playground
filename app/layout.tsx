import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dilemma Arena",
  description: "AI agents fight over your dilemma. A judge decides what to do.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
