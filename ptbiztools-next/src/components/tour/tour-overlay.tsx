"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import type { TourStep } from "@/lib/tour/tour-model";
import "@/styles/tour.css";

interface TourOverlayProps {
  step: TourStep;
  stepIndex: number;
  totalSteps: number;
  canGoBack: boolean;
  canGoNext: boolean;
  showStartFullTour: boolean;
  onBack: () => void;
  onNext: () => void;
  onSkip: () => void;
  onMissingAnchor: () => void;
  onStartFullTour: () => void;
}

const ANCHOR_POLL_MS = 180;
const ANCHOR_WAIT_LIMIT_MS = 2200;

function findAnchor(anchorId: string): HTMLElement | null {
  return document.querySelector<HTMLElement>(`[data-tour=\"${anchorId}\"]`);
}

export function TourOverlay({
  step,
  stepIndex,
  totalSteps,
  canGoBack,
  canGoNext,
  showStartFullTour,
  onBack,
  onNext,
  onSkip,
  onMissingAnchor,
  onStartFullTour,
}: TourOverlayProps) {
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [isMissing, setIsMissing] = useState(false);
  const missingHandledRef = useRef(false);

  useEffect(() => {
    missingHandledRef.current = false;

    const started = Date.now();

    const refresh = () => {
      const node = findAnchor(step.anchorId);
      if (node) {
        setTargetRect(node.getBoundingClientRect());
        setIsMissing(false);
        return;
      }

      setTargetRect(null);

      const expired = Date.now() - started >= ANCHOR_WAIT_LIMIT_MS;
      if (expired) {
        setIsMissing(true);
        if (!missingHandledRef.current) {
          missingHandledRef.current = true;
          onMissingAnchor();
        }
        return;
      }

      setIsMissing(false);
    };

    refresh();
    const interval = window.setInterval(refresh, ANCHOR_POLL_MS);
    window.addEventListener("resize", refresh);
    window.addEventListener("scroll", refresh, true);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("resize", refresh);
      window.removeEventListener("scroll", refresh, true);
    };
  }, [onMissingAnchor, step.anchorId]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onSkip();
        return;
      }
      if (event.key === "ArrowRight" && canGoNext) {
        event.preventDefault();
        onNext();
      }
      if (event.key === "ArrowLeft" && canGoBack) {
        event.preventDefault();
        onBack();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [canGoBack, canGoNext, onBack, onNext, onSkip]);

  const popoverStyle = useMemo(() => {
    if (!targetRect) {
      return { top: "50%", left: "50%", transform: "translate(-50%, -50%)" } as const;
    }

    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;
    const preferredTop = targetRect.bottom + 14;
    const bottomOverflow = preferredTop + 260 > viewportH;
    const top = bottomOverflow ? Math.max(14, targetRect.top - 276) : preferredTop;

    const centeredLeft = targetRect.left + targetRect.width / 2;
    const clampedLeft = Math.min(Math.max(centeredLeft, 180), viewportW - 180);

    return {
      top: `${top}px`,
      left: `${clampedLeft}px`,
      transform: "translateX(-50%)",
    } as const;
  }, [targetRect]);

  if (isMissing && !targetRect) {
    return null;
  }

  return (
    <div className="tour-overlay-root" role="dialog" aria-modal="true" aria-label="Product tour">
      <div className="tour-overlay-backdrop" />

      {targetRect && (
        <div
          className="tour-overlay-highlight"
          style={{
            top: `${targetRect.top - 8}px`,
            left: `${targetRect.left - 8}px`,
            width: `${targetRect.width + 16}px`,
            height: `${targetRect.height + 16}px`,
          }}
        />
      )}

      <section className="tour-popover" style={popoverStyle}>
        <header className="tour-popover-header">
          <p className="tour-progress">
            Step {stepIndex + 1} of {totalSteps}
          </p>
          <button className="tour-close-btn" onClick={onSkip} aria-label="Skip tour">
            <X size={14} />
          </button>
        </header>

        <h3 className="tour-title">{step.title}</h3>
        <p className="tour-description">{step.description}</p>

        <footer className="tour-actions">
          <div className="tour-actions-left">
            {canGoBack && (
              <button className="tour-btn tour-btn-secondary" onClick={onBack}>
                Back
              </button>
            )}
            <button className="tour-btn tour-btn-ghost" onClick={onSkip}>
              Skip
            </button>
          </div>

          <div className="tour-actions-right">
            {showStartFullTour && (
              <button className="tour-btn tour-btn-secondary" onClick={onStartFullTour}>
                Start full tour
              </button>
            )}
            <button className="tour-btn tour-btn-primary" onClick={onNext}>
              {canGoNext ? "Next" : "Finish"}
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}
