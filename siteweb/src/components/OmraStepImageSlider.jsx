import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, MapPin, Images } from 'lucide-react';
import { cn } from '@/lib/utils';

export const OmraStepImageSlider = ({ 
  images = [], 
  stepTitle = '', 
  stepLocation = '', 
  isArabic = false,
  className = '' 
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const touchStartX = useRef(null);
  const touchEndX = useRef(null);

  // Normalize image list
  const slides = Array.isArray(images) && images.length > 0 
    ? images.map((img, idx) => {
        if (typeof img === 'string') {
          return {
            id: `img-${idx}`,
            url: img,
            title: stepLocation || stepTitle,
            desc: stepTitle
          };
        }
        return {
          id: img.id || `img-${idx}`,
          url: img.url,
          title: (isArabic ? img.title_ar : img.title_fr) || img.title || stepLocation || stepTitle,
          desc: (isArabic ? img.desc_ar : img.desc_fr) || img.desc || img.description || ''
        };
      }).filter(s => s && s.url)
    : [
        {
          id: 'default-fallback',
          url: 'https://images.unsplash.com/photo-1564769625905-50e93615e769?q=80&w=1000&auto=format&fit=crop',
          title: stepLocation || stepTitle,
          desc: stepTitle
        }
      ];

  const totalSlides = slides.length;
  const hasMultiple = totalSlides > 1;

  // Auto-play timer (5 seconds)
  useEffect(() => {
    if (!hasMultiple || isHovered) return;

    const timer = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % totalSlides);
    }, 5000);

    return () => clearInterval(timer);
  }, [hasMultiple, isHovered, totalSlides]);

  // Handle bounds if images change
  useEffect(() => {
    if (currentIndex >= totalSlides) {
      setCurrentIndex(0);
    }
  }, [totalSlides, currentIndex]);

  const handlePrev = (e) => {
    e?.stopPropagation();
    setCurrentIndex(prev => (prev === 0 ? totalSlides - 1 : prev - 1));
  };

  const handleNext = (e) => {
    e?.stopPropagation();
    setCurrentIndex(prev => (prev === totalSlides - 1 ? 0 : prev + 1));
  };

  // Touch handlers for mobile swipe
  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const diffX = touchStartX.current - touchEndX.current;
    const minSwipeDistance = 45;

    if (Math.abs(diffX) > minSwipeDistance) {
      if (diffX > 0) {
        // Swiped left
        if (isArabic) handlePrev();
        else handleNext();
      } else {
        // Swiped right
        if (isArabic) handleNext();
        else handlePrev();
      }
    }
    touchStartX.current = null;
    touchEndX.current = null;
  };

  const currentSlide = slides[currentIndex] || slides[0];

  return (
    <div 
      className={cn(
        "relative h-64 sm:h-80 w-full rounded-3xl overflow-hidden shadow-lg group select-none bg-slate-900 border border-slate-200/50 dark:border-white/10",
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Slides Container */}
      <div className="relative w-full h-full">
        {slides.map((slide, idx) => {
          const isActive = idx === currentIndex;
          return (
            <div
              key={slide.id || idx}
              className={cn(
                "absolute inset-0 transition-opacity duration-700 ease-in-out",
                isActive ? "opacity-100 z-10" : "opacity-0 pointer-events-none z-0"
              )}
            >
              <img 
                src={slide.url} 
                alt={slide.title || stepTitle}
                className={cn(
                  "w-full h-full object-cover transition-transform duration-1000 ease-out",
                  isActive && isHovered ? "scale-105" : "scale-100"
                )}
                loading="lazy"
              />
            </div>
          );
        })}
      </div>

      {/* Dark Vignette & Bottom Gradient for Crystal Clear Text */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-black/10 z-20 pointer-events-none" />

      {/* Top Slide Counter Badge (if multiple images) */}
      {hasMultiple && (
        <div className="absolute top-3.5 right-3.5 z-30 pointer-events-none">
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-[11px] font-bold text-white shadow-sm font-mono">
            <Images size={12} className="text-emerald-400" />
            <span>{currentIndex + 1} / {totalSlides}</span>
          </div>
        </div>
      )}

      {/* Prev / Next Controls (Desktop & Hover, with smooth fade) */}
      {hasMultiple && (
        <>
          <button
            type="button"
            onClick={isArabic ? handleNext : handlePrev}
            className={cn(
              "absolute top-1/2 -translate-y-1/2 z-30 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-black/50 hover:bg-black/80 backdrop-blur-md border border-white/20 text-white flex items-center justify-center transition-all duration-300 active:scale-95 shadow-md",
              isArabic ? "right-3 sm:right-4" : "left-3 sm:left-4",
              isHovered ? "opacity-100 translate-x-0" : "opacity-0 md:opacity-0 -translate-x-2"
            )}
            title={isArabic ? "التالي" : "Précédent"}
            aria-label="Previous image"
          >
            {isArabic ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>

          <button
            type="button"
            onClick={isArabic ? handlePrev : handleNext}
            className={cn(
              "absolute top-1/2 -translate-y-1/2 z-30 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-black/50 hover:bg-black/80 backdrop-blur-md border border-white/20 text-white flex items-center justify-center transition-all duration-300 active:scale-95 shadow-md",
              isArabic ? "left-3 sm:left-4" : "right-3 sm:right-4",
              isHovered ? "opacity-100 translate-x-0" : "opacity-0 md:opacity-0 translate-x-2"
            )}
            title={isArabic ? "السابق" : "Suivant"}
            aria-label="Next image"
          >
            {isArabic ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
          </button>
        </>
      )}

      {/* ── IMAGE CORNER OVERLAY ── */}
      {/* Title in GREEN + Short Description in WHITE */}
      <div 
        className={cn(
          "absolute bottom-3.5 sm:bottom-4 z-30 text-white max-w-[88%] transition-all duration-500",
          isArabic ? "right-3.5 sm:right-4 text-right" : "left-3.5 sm:left-4 text-left"
        )}
      >
        {/* Title (GREEN) */}
        {currentSlide.title && (
          <div className="flex items-center gap-1.5 mb-1">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-950/70 border border-emerald-500/30 text-emerald-400 font-bold text-xs sm:text-sm drop-shadow-sm tracking-wide">
              <MapPin size={12} className="text-emerald-400 shrink-0" />
              <span>{currentSlide.title}</span>
            </span>
          </div>
        )}

        {/* Short Description (WHITE) */}
        {currentSlide.desc && (
          <p className="text-xs sm:text-[13px] font-medium text-white/95 leading-snug drop-shadow line-clamp-2 mt-0.5">
            {currentSlide.desc}
          </p>
        )}
      </div>

      {/* Bottom Dots Indicator (if multiple images) */}
      {hasMultiple && (
        <div 
          className={cn(
            "absolute bottom-3 z-30 flex items-center gap-1.5",
            isArabic ? "left-3.5" : "right-3.5"
          )}
        >
          {slides.map((_, dotIdx) => (
            <button
              key={dotIdx}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setCurrentIndex(dotIdx);
              }}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                dotIdx === currentIndex
                  ? "w-5 bg-emerald-400 shadow-xs"
                  : "w-1.5 bg-white/40 hover:bg-white/70"
              )}
              aria-label={`Slide ${dotIdx + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default OmraStepImageSlider;
