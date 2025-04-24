import { MapPin } from "lucide-react";

import { Button } from "@/components/ui/button";
import PlaygroundList from "@/components/playground-list";
import MapView from "@/components/map-view";
import { FilterBottomSheet } from "@/components/filter-bottom-sheet";
import { ThemeToggle } from "@/components/theme-toggle";
// import FilterButton from "@/components/filter-button";
import { getPlaygrounds, checkDatabaseSetup } from "@/actions";
import { Suspense } from "react";
import Link from "next/link";
import { playgrounds as mockPlaygrounds } from "@/data/playgrounds";

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

export default async function Home() {
  const isDbSetup = await checkDatabaseSetup();
  const playgrounds = isDbSetup ? await getPlaygrounds() : mockPlaygrounds;
  return (
    <>
      <header className="bg-background">
        <nav className="flex items-center justify-between border-b p-4">
          <div>
            <h1 className="text-xl font-bold">Playground Map</h1>
            <h4 className="text-xs">
              Find the best playgrounds for kids near you
            </h4>
          </div>

          <div className="scrollbar-hide hidden space-x-2 overflow-x-auto md:flex">
            {filters.map((filter, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                aria-label={filter.ariaLabel}
              >
                {filter.label}
              </Button>
            ))}
          </div>

          <div className="mr-2 ml-auto md:hidden">
            <FilterBottomSheet filters={filters} />
          </div>

          <ThemeToggle />
        </nav>
      </header>

      <main className="bg-background flex flex-1">
        <div className="z-10 hidden max-h-[calc(100vh-80px)] overflow-y-auto md:block">
          <div className="py-4">
            <Suspense fallback={<div>Loading playgrounds...</div>}>
              <PlaygroundList initialPlaygrounds={playgrounds} />
            </Suspense>
          </div>
        </div>

        <div className="relative flex flex-1">
          <div className="absolute inset-0">
            <Suspense
              fallback={
                <div className="flex h-full w-full items-center justify-center">
                  Loading map...
                </div>
              }
            >
              <MapView initialPlaygrounds={playgrounds} />
            </Suspense>
          </div>

          <div className="absolute right-4 bottom-4 z-10">
            <Button
              variant="outline"
              size="sm"
              className="hidden md:flex"
              aria-label="Filter by near me"
            >
              <MapPin className="h-4 w-4" />
              <span>Near me</span>
            </Button>

            <Button
              variant="outline"
              size="icon"
              className="md:hidden"
              aria-label="Filter by near me"
            >
              <MapPin className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </main>

      <footer className="bg-background"></footer>
    </>
  );
}
