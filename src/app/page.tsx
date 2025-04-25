import { MapPin } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PlaygroundList } from "@/components/playground-list";
import { MapView } from "@/components/map-view";
import { FilterBottomSheet } from "@/components/filter-bottom-sheet";
import { ThemeToggle } from "@/components/theme-toggle";

const filters = [
  { label: "Ages 0-3", ariaLabel: "Filter by ages 0-3" },
  { label: "Ages 4-7", ariaLabel: "Filter by ages 4-7" },
  { label: "Ages 8+", ariaLabel: "Filter by ages 8+" },
  { label: "Free", ariaLabel: "Filter by free access" },
  { label: "Swings", ariaLabel: "Filter by swings" },
  { label: "Slides", ariaLabel: "Filter by slides" },
  { label: "Sand", ariaLabel: "Filter by sand" },
  { label: "Picnic Area", ariaLabel: "Filter by picnic area" },
  { label: "Restrooms", ariaLabel: "Filter by restrooms" },
];

export default function Home() {
  return (
    <>
      <header className="bg-background">
        <nav className="flex items-center justify-between space-x-2 border-b p-4">
          <div>
            <h1 className="text-xl font-bold">Playground Map</h1>
            <h4 className="text-xs whitespace-nowrap">
              Find the best playgrounds for kids near you
            </h4>
          </div>

          <div className="hidden space-x-2 overflow-x-auto md:flex">
            {filters.map((filter, index) => (
              <Button
                key={index}
                variant="outline"
                aria-label={filter.ariaLabel}
              >
                {filter.label}
              </Button>
            ))}
          </div>

          <div className="mr-2 ml-auto md:hidden">
            <FilterBottomSheet filters={filters} />
          </div>

          <div>
            <ThemeToggle />
          </div>
        </nav>
      </header>

      <main className="bg-background flex flex-1">
        <div className="relative flex flex-1">
          <div className="absolute top-0 left-0 z-10 hidden max-h-[calc(100vh-80px)] max-w-md overflow-y-auto md:block">
            <div className="py-2 pr-2 pl-6">
              <PlaygroundList />
            </div>
          </div>

          <div className="absolute inset-0">
            <MapView />
          </div>

          <div className="absolute right-4 bottom-4 z-10">
            <Button variant="outline" aria-label="Filter by near me">
              <MapPin className="h-4 w-4" />
              <span>Near me</span>
            </Button>
          </div>
        </div>
      </main>

      <footer className="bg-background"></footer>
    </>
  );
}
