import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { Toaster } from "sonner";

import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/constants";
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
  title: {
    default: SITE_NAME,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: [
    "playground finder",
    "playgrounds near me",
    "kids playground",
    "local playgrounds",
    "playground photos",
    "playground features",
    "family activities",
    "outdoor play",
    "children's playgrounds",
    "playground map",
  ],
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
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
    siteName: SITE_NAME,
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    images: ["/api/og/home"],
    creator: "@goodplaygroundmap",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
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
          <Toaster position="top-center" toastOptions={{ style: { zIndex: 9999 } }} />
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
