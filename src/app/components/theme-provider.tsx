"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { useEffect, useState } from "react";

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  const [isLoaded, setIsLoaded] = useState(false);

  // Workaround for hydration mismatch bug
  // [bug]: Theme Provider creates hydration error in Next.js 15.0.1
  // https://github.com/shadcn-ui/ui/issues/5552
  useEffect(() => {
    setIsLoaded(true);
  }, []);

  if (!isLoaded) {
    return null;
  }

  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
