import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Playground Map",
  description: "Discover playgrounds near you with our interactive map",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
