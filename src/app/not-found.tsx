import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 p-4">
      <h1 className="text-center text-4xl font-bold">404 Page Not Found</h1>
      <p className="text-muted-foreground max-w-md text-center">
        Uh-oh! This page is really good at hiding. Let&apos;s find our way back
        home!
      </p>
      <Link href="/">
        <Button>Go back home</Button>
      </Link>
    </div>
  );
}
