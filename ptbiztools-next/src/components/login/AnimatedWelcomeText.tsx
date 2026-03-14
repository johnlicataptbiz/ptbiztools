"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface AnimatedWelcomeTextProps {
  phrases?: string[];
  interval?: number;
  className?: string;
}

const DEFAULT_PHRASES = [
  "Welcome Back",
  "Ready to Scale?",
  "Let's Grow Today",
  "Your Clinic Awaits"
];

export const AnimatedWelcomeText: React.FC<AnimatedWelcomeTextProps> = ({
  phrases = DEFAULT_PHRASES,
  interval = 4000,
  className = ""
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % phrases.length);
    }, interval);

    return () => clearInterval(timer);
  }, [phrases.length, interval]);

  return (
    <div className={`relative h-8 overflow-hidden ${className}`}>
      <AnimatePresence mode="wait">
        <motion.span
          key={currentIndex}
          initial={{ y: 20, opacity: 0, filter: "blur(10px)" }}
          animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
          exit={{ y: -20, opacity: 0, filter: "blur(10px)" }}
          transition={{ 
            duration: 0.5, 
            ease: [0.25, 0.8, 0.25, 1]
          }}
          className="absolute inset-0 flex items-center justify-center text-2xl font-bold text-slate-800 dark:text-white"
        >
          {phrases[currentIndex]}
        </motion.span>
      </AnimatePresence>
    </div>
  );
};

// Typewriter effect component
interface TypewriterTextProps {
  text: string;
  delay?: number;
  speed?: number;
  className?: string;
  onComplete?: () => void;
}

export const TypewriterText: React.FC<TypewriterTextProps> = ({
  text,
  delay = 0,
  speed = 50,
  className = "",
  onComplete
}) => {
  const [displayText, setDisplayText] = useState("");
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const startTimer = setTimeout(() => {
      setStarted(true);
    }, delay);

    return () => clearTimeout(startTimer);
  }, [delay]);

  useEffect(() => {
    if (!started) return;

    let currentIndex = 0;
    const interval = setInterval(() => {
      if (currentIndex <= text.length) {
        setDisplayText(text.slice(0, currentIndex));
        currentIndex++;
      } else {
        clearInterval(interval);
        onComplete?.();
      }
    }, speed);

    return () => clearInterval(interval);
  }, [started, text, speed, onComplete]);

  return (
    <span className={className}>
      {displayText}
      <motion.span
        animate={{ opacity: [1, 0] }}
        transition={{ duration: 0.5, repeat: Infinity }}
        className="inline-block w-0.5 h-5 bg-blue-500 ml-0.5 align-middle"
      />
    </span>
  );
};

// Cinematic text reveal with character animation
interface CinematicRevealProps {
  text: string;
  className?: string;
  delay?: number;
}

export const CinematicReveal: React.FC<CinematicRevealProps> = ({
  text,
  className = "",
  delay = 0
}) => {
  return (
    <motion.h1 
      className={className}
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: {
          transition: {
            staggerChildren: 0.03,
            delayChildren: delay
          }
        }
      }}
    >
      {text.split("").map((char, index) => (
        <motion.span
          key={index}
          variants={{
            hidden: { 
              opacity: 0, 
              y: 20,
              rotateX: -90
            },
            visible: { 
              opacity: 1, 
              y: 0,
              rotateX: 0,
              transition: {
                type: "spring",
                damping: 12,
                stiffness: 200
              }
            }
          }}
          className="inline-block"
          style={{ transformStyle: "preserve-3d" }}
        >
          {char === " " ? "\u00A0" : char}
        </motion.span>
      ))}
    </motion.h1>
  );
};
