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

                      <h1 className="text-4xl font-bold uppercase sm:hidden">
                        🛝 G P M
                      </h1>
                    </Link>
                  </div>

                  <div className="flex items-center gap-4">
                    <AddPlaygroundDialog />
                    <Link
                      href="https://github.com/siropkin/playground-map"
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="GitHub repository"
                    >
                      <svg
                        role="img"
                        viewBox="0 0 24 24"
                        width={36}
                        height={36}
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <title>GitHub repository</title>
                        <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
                      </svg>
                    </Link>
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
