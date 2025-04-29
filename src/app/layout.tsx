import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

import { FilterProvider } from "@/contexts/filters-context";
import { PlaygroundsProvider } from "@/contexts/playgrounds-context";
import { ThemeToggle } from "@/components/theme-toggle";
import { ThemeProvider } from "@/components/theme-provider";
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
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <FilterProvider>
            <PlaygroundsProvider>
              <header className="bg-background">
                <nav className="flex items-center justify-between space-x-2 border-b p-4">
                  <div>
                    <Link href="/">
                      <h1 className="text-xl font-bold uppercase">
                        Playground Map
                      </h1>
                      <h4 className="text-xs whitespace-nowrap">
                        Find the best playgrounds for kids near you
                      </h4>
                    </Link>
                  </div>

                  <ThemeToggle />
                </nav>
              </header>

              <main className="bg-background flex flex-1">{children}</main>

              <footer className="bg-background"></footer>
            </PlaygroundsProvider>
          </FilterProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
