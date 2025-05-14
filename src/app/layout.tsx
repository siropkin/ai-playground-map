import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";

import { SITE_NAME, SITE_URL } from "@/lib/constants";
import { FiltersProvider } from "@/contexts/filters-context";
import { PlaygroundsProvider } from "@/contexts/playgrounds-context";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/contexts/auth-context";
import { NavBar } from "@/components/nav-bar";
import { cn } from "@/lib/utils";

import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: SITE_NAME,
  description: "Find good playgrounds for kids near you",
  openGraph: {
    title: SITE_NAME,
    description: "Find good playgrounds for kids near you",
    images: [
      {
        url: "/api/og/home",
        width: 1200,
        height: 630,
        alt: SITE_NAME,
      },
    ],
    type: "website",
    locale: "en_US",
    url: SITE_URL,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          inter.className,
          "flex max-h-[100dvh] min-h-[100dvh] flex-col overflow-hidden",
        )}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          disableTransitionOnChange
        >
          <AuthProvider>
            <FiltersProvider>
              <PlaygroundsProvider>
                <header className="bg-background">
                  <NavBar />
                </header>

                <main className="bg-background flex flex-1 overflow-auto">
                  {children}
                </main>

                <footer className="bg-background"></footer>
              </PlaygroundsProvider>
            </FiltersProvider>
          </AuthProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
