"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface ImageCarouselProps {
  images: {
    filename: string;
    caption?: string;
    alt: string;
  }[];
  className?: string;
  unoptimized?: boolean;
}

// Swipe configuration constants
const SWIPE_THRESHOLD = 50; // Minimum distance in pixels to trigger a swipe
const SWIPE_VELOCITY_THRESHOLD = 0.3; // Minimum velocity to trigger a swipe

export default function ImageCarousel({
  images,
  className,
  unoptimized,
}: ImageCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const touchStartTime = useRef<number>(0);

  const goToNext = useCallback(() => {
    if (isTransitioning || images.length <= 1) return;

    setIsTransitioning(true);
    setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
  }, [images.length, isTransitioning]);

  const goToPrevious = useCallback(() => {
    if (isTransitioning || images.length <= 1) return;

    setIsTransitioning(true);
    setCurrentIndex(
      (prevIndex) => (prevIndex - 1 + images.length) % images.length,
    );
  }, [images.length, isTransitioning]);

  const goToSlide = useCallback(
    (index: number) => {
      if (isTransitioning || index === currentIndex) return;

      setIsTransitioning(true);
      setCurrentIndex(index);
    },
    [currentIndex, isTransitioning],
  );

  // Touch event handlers for swipe gestures
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    setTouchEnd(null); // Reset touch end
    setTouchStart(e.targetTouches[0].clientX);
    touchStartTime.current = Date.now();
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const touchDuration = Date.now() - touchStartTime.current;
    const velocity = Math.abs(distance) / touchDuration;

    const isLeftSwipe = distance > SWIPE_THRESHOLD;
    const isRightSwipe = distance < -SWIPE_THRESHOLD;
    const isFastSwipe = velocity > SWIPE_VELOCITY_THRESHOLD;

    // Trigger navigation if swipe distance exceeds threshold or swipe is fast enough
    if ((isLeftSwipe || isRightSwipe) || isFastSwipe) {
      if (distance > 0) {
        // Swiped left - go to next image
        goToNext();
      } else {
        // Swiped right - go to previous image
        goToPrevious();
      }
    }

    // Reset touch states
    setTouchStart(null);
    setTouchEnd(null);
  }, [touchStart, touchEnd, goToNext, goToPrevious]);

  useEffect(() => {
    // Reset transition state after animation completes
    const timer = setTimeout(() => {
      setIsTransitioning(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [currentIndex]);

  // Don't render if there are no images
  if (!images.length) return null;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800",
        className,
      )}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Main image container */}
      <div className="relative aspect-square w-full md:aspect-[4/3]">
        <Image
          src={images[currentIndex].filename}
          alt={images[currentIndex].alt}
          fill
          className="object-cover transition-opacity duration-300"
          sizes="(max-width: 768px) 100vw, 50vw"
          priority={currentIndex === 0}
          unoptimized={unoptimized}
        />
        {images[currentIndex].caption && (
          <div className="bg-background/80 absolute top-0 right-0 left-0 truncate p-2 text-sm">
            {images[currentIndex].caption}
          </div>
        )}
      </div>

      {images.length > 1 && (
        <>
          {/* Navigation buttons */}
          <Button
            className="bg-background/80 hover:bg-background/100 absolute top-1/2 left-2 -translate-y-1/2"
            size="icon"
            variant="ghost"
            aria-label="Previous image"
            onClick={goToPrevious}
          >
            <ChevronLeft className="h-4 w-4 text-zinc-500" />
          </Button>
          <Button
            className="bg-background/80 hover:bg-background/100 absolute top-1/2 right-2 -translate-y-1/2"
            size="icon"
            variant="ghost"
            aria-label="Next image"
            onClick={goToNext}
          >
            <ChevronRight className="h-6 w-6 text-zinc-500" />
          </Button>

          {/* Indicators */}
          <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 translate-y-1/2 gap-2">
            {images.map((_, index) => (
              <Button
                key={index}
                className={cn(
                  "h-2 w-2 cursor-pointer rounded-full border p-0 transition-all",
                  index === currentIndex
                    ? "w-4 border-zinc-100 bg-zinc-900" // dark bg, light border
                    : "border-zinc-900 bg-zinc-100 hover:border-zinc-100 hover:bg-zinc-900", // light bg, dark border on hover
                )}
                aria-label={`Go to image ${index + 1}`}
                aria-current={index === currentIndex ? "true" : "false"}
                onClick={() => goToSlide(index)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
