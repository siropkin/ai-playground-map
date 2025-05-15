import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SITE_NAME } from "@/lib/constants";

export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 p-4">
      <h1 className="text-4xl font-bold">404 Hide and Seek Champion</h1>
      <p className="text-muted-foreground max-w-md text-center">
        Uh-oh! This page is really good at hiding. Let&apos;s find our way back
        to the playground!
      </p>
      <Link href="/">
        <Button>Go Back to the {SITE_NAME}</Button>
      </Link>
    </div>
  );
}
