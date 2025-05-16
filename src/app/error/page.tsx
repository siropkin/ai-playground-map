import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ErrorPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 p-4">
      <h1 className="text-center text-4xl font-bold">Error</h1>
      <p className="text-muted-foreground max-w-md text-center">
        Oops! Something went wrong... Maybe try turning it off and on again?
      </p>
      <Link href="/">
        <Button>Go back home</Button>
      </Link>
    </div>
  );
}
