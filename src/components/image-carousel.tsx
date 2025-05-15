"use client";

import { useState, useCallback, useEffect } from "react";
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

export default function ImageCarousel({
  images,
  className,
  unoptimized,
}: ImageCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

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

  useEffect(() => {
    // Reset transition state after animation completes
    const timer = setTimeout(() => {
      setIsTransitioning(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [currentIndex]);

  // Don't render if there are no images
  if (!images.length) return null;

  // If there's only one image, render it without carousel controls
  if (images.length === 1) {
    return (
      <div
        className={cn(
          "relative overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800",
          className,
        )}
      >
        <div className="relative aspect-square w-full md:aspect-[4/3]">
          <Image
            src={images[0].filename}
            alt={images[0].alt}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 50vw"
            unoptimized={unoptimized}
          />
          {images[0].caption && (
            <div className="absolute right-0 bottom-0 left-0 bg-black/50 p-2 text-sm text-white">
              {images[0].caption}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800",
        className,
      )}
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
          <div className="bg-background/80 absolute right-0 bottom-0 left-0 p-2 text-sm">
            {images[currentIndex].caption}
          </div>
        )}
      </div>

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
      {/* Image counter */}
      <div className="bg-background/80 absolute top-4 right-4 rounded-full px-2 py-1 text-xs">
        {currentIndex + 1} / {images.length}
      </div>
    </div>
  );
}
