import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <h1 className="mb-4 text-4xl font-bold">404 - Hide and Seek Champion!</h1>
      <p className="text-muted-foreground mb-8 max-w-md text-center">
        Uh-oh! This page is really good at hiding. Let&apos;s find our way back
        to the playground!
      </p>
      <Link href="/">
        <Button>Go Back to the Playground</Button>
      </Link>
    </div>
  );
}
