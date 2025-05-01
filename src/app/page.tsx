import { PlaygroundList } from "@/components/playground-list";
import { MapView } from "@/components/map-view";

export default function Home() {
  return (
    <div className="relative flex flex-1">
      <div className="absolute top-0 left-0 z-10 hidden max-h-[calc(100vh-80px)] max-w-sm overflow-y-auto md:block">
        <div className="py-2 pr-2 pl-4">
          <PlaygroundList />
        </div>
      </div>

      <div className="absolute inset-0">
        <MapView />
      </div>
    </div>
  );
}
