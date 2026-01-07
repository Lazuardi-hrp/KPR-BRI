"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"
import { useState } from "react"

interface ImageSlideshowProps {
  images: string[]
  title: string
  availabilityPercent: number
  availabilityStatus: string
  statusColor: string
}

export default function ImageSlideshow({
  images,
  title,
  availabilityPercent,
  availabilityStatus,
  statusColor,
}: ImageSlideshowProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const displayImages = images && images.length > 0 ? images : ["/placeholder.svg"]

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? displayImages.length - 1 : prev - 1))
  }

  const goToNext = () => {
    setCurrentIndex((prev) => (prev === displayImages.length - 1 ? 0 : prev + 1))
  }

  return (
    <div className="relative h-40 sm:h-56 md:h-72 overflow-hidden">
      {/* Main Image */}
      <img
        src={displayImages[currentIndex] || "/placeholder.svg"}
        alt={`${title} - Image ${currentIndex + 1}`}
        className="w-full h-full object-cover transition-opacity duration-300"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />

      {/* Previous Button - Smaller on mobile, larger on desktop */}
      {displayImages.length > 1 && (
        <button
          onClick={goToPrevious}
          className="absolute left-1.5 sm:left-3 top-1/2 -translate-y-1/2 z-10 bg-background/80 hover:bg-background/90 rounded-full p-1.5 sm:p-2 transition-all hover:scale-110"
          aria-label="Previous image"
        >
          <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
      )}

      {/* Next Button */}
      {displayImages.length > 1 && (
        <button
          onClick={goToNext}
          className="absolute right-1.5 sm:right-3 top-1/2 -translate-y-1/2 z-10 bg-background/80 hover:bg-background/90 rounded-full p-1.5 sm:p-2 transition-all hover:scale-110"
          aria-label="Next image"
        >
          <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
      )}

      {/* Image Counter - Reduced font size and padding on mobile */}
      {displayImages.length > 1 && (
        <div className="absolute top-2 right-2 sm:top-3 sm:right-3 z-10 bg-background/90 backdrop-blur-sm px-2 sm:px-3 py-1 rounded-full text-xs font-semibold">
          {currentIndex + 1} / {displayImages.length}
        </div>
      )}

      {/* Availability Badge */}
      <div className="absolute bottom-2 sm:bottom-3 left-2 right-2 sm:left-4 sm:right-4 flex justify-between items-center gap-2">
        <div className="bg-background/95 backdrop-blur-sm px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg w-fit">
          <span className={`text-xs sm:text-sm font-semibold ${statusColor}`}>Ketersediaan: {availabilityStatus}</span>
        </div>

        {/* Dot Indicators */}
        {displayImages.length > 1 && (
          <div className="flex gap-1">
            {displayImages.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full transition-all ${
                  index === currentIndex ? "bg-white w-3 sm:w-4" : "bg-white/50 hover:bg-white/75"
                }`}
                aria-label={`Go to image ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
