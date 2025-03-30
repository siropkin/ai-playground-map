import { MapPin, Sliders } from "lucide-react";

import { Button } from "@/components/ui/button";
import PlaygroundList from "@/components/playground-list";
import MapView from "@/components/map-view";
import {
  DropdownMenu,
  DropdownMenuItems,
  DropdownMenuItem,
  DropdownMenuButton,
} from "@/components/ui/dropdown-menu";

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
    <main className="flex min-h-screen flex-col">
      <div className="sticky top-0 z-10 flex w-full items-center justify-between gap-4 bg-white px-4 pt-4 pb-2">
        <h1 className="mr-4 pb-2 text-xl font-bold whitespace-nowrap">
          Playground Map
        </h1>

        <div className="scrollbar-hide hidden flex-grow gap-2 overflow-x-auto pb-2 md:flex">
          {filters.map((filter, index) => (
            <Button
              key={index}
              variant="outline"
              size="sm"
              className="rounded-full"
              aria-label={filter.ariaLabel}
            >
              {filter.label}
            </Button>
          ))}
        </div>

        <div className="md:hidden">
          <DropdownMenu>
            <DropdownMenuButton
              variant="ghost"
              size="icon"
              className="rounded-full"
              aria-label="Filters"
            >
              <Sliders className="h-4 w-4" />
            </DropdownMenuButton>
            <DropdownMenuItems
              anchor="bottom"
              className="scrollbar-hide z-20 flex flex-col gap-2 overflow-y-hidden rounded-md border border-gray-300 bg-white p-4"
            >
              {filters.map((filter, index) => (
                <DropdownMenuItem key={index}>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full"
                    aria-label={filter.ariaLabel}
                  >
                    {filter.label}
                  </Button>
                </DropdownMenuItem>
              ))}
            </DropdownMenuItems>
          </DropdownMenu>
        </div>

        {/*<Button*/}
        {/*  variant="outline"*/}
        {/*  size="sm"*/}
        {/*  className="rounded-full"*/}
        {/*  aria-label="Saved playgrounds"*/}
        {/*>*/}
        {/*  <Heart className="h-4 w-4" />*/}
        {/*  <span>Saved</span>*/}
        {/*</Button>*/}

        {/*<Link href="/profile">*/}
        {/*  <Button*/}
        {/*    variant="ghost"*/}
        {/*    size="icon"*/}
        {/*    aria-label="Go to profile"*/}
        {/*    className="rounded-full"*/}
        {/*  >*/}
        {/*    <Image*/}
        {/*      src="/avatar-placeholder.svg"*/}
        {/*      alt="Profile"*/}
        {/*      className="rounded-full"*/}
        {/*      width={32}*/}
        {/*      height={32}*/}
        {/*    />*/}
        {/*  </Button>*/}
        {/*</Link>*/}
      </div>

      <div className="relative w-full flex-1">
        <div className="absolute inset-0">
          <MapView />

          <Button
            variant="outline"
            size="sm"
            className="absolute right-4 bottom-4 z-20 hidden rounded-full bg-white shadow-md hover:bg-gray-100 md:flex"
            aria-label="Filter by near me"
          >
            <MapPin className="h-4 w-4" />
            <span>Near me</span>
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 bottom-4 z-20 rounded-full bg-white shadow-md hover:bg-gray-100 md:hidden"
            aria-label="Filter by near me"
          >
            <MapPin className="h-4 w-4" />
          </Button>
        </div>

        <div className="absolute inset-0 z-10 hidden h-full w-1/2 overflow-y-auto px-4 py-2 md:flex">
          <PlaygroundList />
        </div>
      </div>

      {/*<div className="scrollbar-hide fixed right-0 bottom-0 left-0 flex justify-around gap-2 overflow-x-auto border-t border-gray-300 bg-white py-2">*/}
      {/*  <Button variant="ghost" size="sm">*/}
      {/*    <MapPin className="h-4 w-4" />*/}
      {/*    <span>Map</span>*/}
      {/*  </Button>*/}
      {/*  <Button variant="ghost" size="sm">*/}
      {/*    <List className="h-4 w-4" />*/}
      {/*    <span>List</span>*/}
      {/*  </Button>*/}
      {/*  <Button variant="ghost" size="sm">*/}
      {/*    <Heart className="h-4 w-4" />*/}
      {/*    <span>Saved</span>*/}
      {/*  </Button>*/}
      {/*</div>*/}
    </main>
  );
}
