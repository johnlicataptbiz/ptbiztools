"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CarouselSlide {
  id: string;
  imageUrl: string;
  title: string;
  subtitle: string;
}

const CLINIC_SLIDES: CarouselSlide[] = [
  {
    id: '1',
    imageUrl: '/assets/hero/clinic-growth-banner-a.png',
    title: "Performance Driven",
    subtitle: "Data-backed coaching for PT clinic success"
  },
  {
    id: '2',
    imageUrl: '/assets/backgrounds/clinic-hero-pattern-a.png',
    title: "Blueprint for Growth",
    subtitle: "Proven systems to scale your practice"
  },
  {
    id: '3',
    imageUrl: '/assets/hero/clinic-network-banner-a.png',
    title: "Accelerate Revenue",
    subtitle: "Strategies that deliver measurable results"
  },
  {
    id: '4',
    imageUrl: '/assets/hero/clinic-training-banner-a.png',
    title: "Connected Community",
    subtitle: "Join 1,000+ successful clinic owners"
  }
];

export const LoginBackgroundCarousel: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % CLINIC_SLIDES.length);
  }, []);

  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + CLINIC_SLIDES.length) % CLINIC_SLIDES.length);
  }, []);

  // Auto-advance slides
  useEffect(() => {
    if (!isAutoPlaying) return;
    const interval = setInterval(handleNext, 6000);
    return () => clearInterval(interval);
  }, [isAutoPlaying, handleNext]);

  const currentSlide = CLINIC_SLIDES[currentIndex];

  return (
    <div 
      className="absolute inset-0 overflow-hidden"
      onMouseEnter={() => setIsAutoPlaying(false)}
      onMouseLeave={() => setIsAutoPlaying(true)}
    >
      {/* Animated background images */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentSlide.id}
          initial={{ opacity: 0, scale: 1.1 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 1.2, ease: [0.25, 0.8, 0.25, 1] }}
          className="absolute inset-0"
        >
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{ 
              backgroundImage: `url(${currentSlide.imageUrl})`,
              filter: 'blur(2px) brightness(0.4)'
            }}
          />
          {/* Gradient overlays */}
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900/90 via-slate-800/80 to-blue-900/70" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-slate-900/50" />
        </motion.div>
      </AnimatePresence>

      {/* Animated pattern overlay */}
      <div className="absolute inset-0 opacity-10">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
              <path d="M 60 0 L 0 0 0 60" fill="none" stroke="white" strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      {/* Content overlay */}
      <div className="absolute bottom-0 left-0 right-0 p-8 md:p-12">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide.id}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="max-w-lg"
          >
            <motion.h2 
              className="text-2xl md:text-3xl font-bold text-white mb-2 drop-shadow-lg"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
            >
              {currentSlide.title}
            </motion.h2>
            <motion.p 
              className="text-sm md:text-base text-slate-300 drop-shadow-md"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
            >
              {currentSlide.subtitle}
            </motion.p>
          </motion.div>
        </AnimatePresence>

        {/* Navigation dots */}
        <div className="flex gap-2 mt-6">
          {CLINIC_SLIDES.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={`h-1.5 rounded-full transition-all duration-500 ${
                idx === currentIndex 
                  ? 'w-8 bg-blue-400 shadow-lg shadow-blue-400/50' 
                  : 'w-2 bg-white/30 hover:bg-white/50'
              }`}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>
      </div>

      {/* Navigation arrows */}
      <div className="absolute inset-y-0 left-0 flex items-center px-4 opacity-0 hover:opacity-100 transition-opacity duration-300">
        <button 
          onClick={handlePrev}
          className="p-3 bg-black/20 backdrop-blur-md rounded-full text-white hover:bg-white/20 transition-all transform hover:scale-110 border border-white/10"
          aria-label="Previous slide"
        >
          <ChevronLeft size={24} />
        </button>
      </div>
      <div className="absolute inset-y-0 right-0 flex items-center px-4 opacity-0 hover:opacity-100 transition-opacity duration-300">
        <button 
          onClick={handleNext}
          className="p-3 bg-black/20 backdrop-blur-md rounded-full text-white hover:bg-white/20 transition-all transform hover:scale-110 border border-white/10"
          aria-label="Next slide"
        >
          <ChevronRight size={24} />
        </button>
      </div>

      {/* Floating particles effect */}
      <FloatingParticles />
    </div>
  );
};

// Separate component for particles to avoid impure functions during render
const FloatingParticles: React.FC = () => {
  // Generate stable random values once on mount
  const particles = useMemo(() => {
    return Array.from({ length: 20 }, (_, i) => ({
      id: i,
      left: `${(i * 5 + 2) % 100}%`,
      duration: 15 + (i % 10),
      delay: i % 5,
    }));
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute w-1 h-1 bg-blue-400/30 rounded-full"
          initial={{ 
            y: "100%",
            opacity: 0 
          }}
          animate={{ 
            y: "-10%",
            opacity: [0, 1, 0],
          }}
          transition={{ 
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: "linear"
          }}
          style={{
            left: p.left,
          }}
        />
      ))}
    </div>
  );
};
