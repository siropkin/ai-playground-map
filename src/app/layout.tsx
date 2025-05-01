import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

import { FilterProvider } from "@/contexts/filters-context";
import { PlaygroundsProvider } from "@/contexts/playgrounds-context";
// import { ThemeToggle } from "@/components/theme-toggle";
import { ThemeProvider } from "@/components/theme-provider";
import { AddPlaygroundDialog } from "@/components/add-playground-dialog";
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Good Playground Map",
  description: "Find good playgrounds for kids near you",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn(inter.className, "flex min-h-[100dvh] flex-col")}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          disableTransitionOnChange
        >
          <FilterProvider>
            <PlaygroundsProvider>
              <header className="bg-background">
                <nav className="flex items-center justify-between space-x-2 border-b p-4">
                  <div>
                    <Link href="/">
                      <div className="hidden items-center gap-1 sm:flex">
                        <h1 className="text-4xl font-bold uppercase">🛝</h1>

                        <div>
                          <h1 className="text-xl font-bold uppercase">
                            Good Playground Map
                          </h1>
                          <h4 className="text-muted-foreground text-xs whitespace-nowrap">
                            Find good playgrounds for kids near you
                          </h4>
                        </div>
                      </div>

                      <h1 className="text-xl font-bold uppercase sm:hidden">
                        🛝 G P M
                      </h1>
                    </Link>
                  </div>

                  <div className="flex items-center gap-4">
                    <AddPlaygroundDialog />
                    {/*<ThemeToggle />*/}
                  </div>
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
