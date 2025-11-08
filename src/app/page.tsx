import { PlaygroundList } from "@/components/playground-list";
import { PlaygroundListSheet } from "@/components/playground-list-sheet";
import { MapView } from "@/components/map-view";
import StructuredDataHome from "@/components/structured-data-home";

export default function Home() {
  return (
    <>
      <StructuredDataHome />
      <div className="relative flex flex-1">
      {/* Desktop sidebar */}
      <div className="absolute top-0 left-0 z-1 hidden max-h-[calc(100vh-80px)] max-w-sm min-w-sm overflow-y-auto md:block">
        <div className="py-2 pr-2 pl-4">
          <PlaygroundList displayEmptyState />
        </div>
      </div>

      {/* Mobile bottom sheet */}
      <div className="absolute bottom-10 left-1/2 z-1 -translate-x-1/2 md:hidden">
        <PlaygroundListSheet />
      </div>

      {/* Map */}
      <div className="absolute inset-0">
        <MapView />
      </div>
      </div>
    </>
  );
}
