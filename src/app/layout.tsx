import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { ThemeProvider } from "@/components/theme-provider";
import { FilterProvider } from "@/contexts/filters-context";
import { PlaygroundsProvider } from "@/contexts/playgrounds-context";
import "./globals.css";
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Playground Map",
  description: "Find the best playgrounds for kids near you",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn(inter.className, "flex min-h-screen flex-col")}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system" // system
          enableSystem
          disableTransitionOnChange
        >
          <FilterProvider>
            <PlaygroundsProvider>{children}</PlaygroundsProvider>
          </FilterProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
