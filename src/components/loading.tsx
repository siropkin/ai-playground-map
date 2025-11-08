import { SITE_ICON } from "@/lib/constants";

export function Loading() {
  return (
    <div className="bg-background/50 absolute inset-0 z-20 flex items-center justify-center">
      3... 2... 1... {SITE_ICON}
    </div>
  );
}
