"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from "react";

import { angleForValue, angleFromPoint, type PriceRange, valueForAngle } from "@/lib/price-slider-geometry";

const TRACK_WIDTH_PERCENT = 16;
const THUMB_ORBIT_PERCENT = 50 - TRACK_WIDTH_PERCENT / 2;
const TRACK_GRADIENT = `conic-gradient(from 210deg, #BFDBFE 0%, #3B82F6 50%, #1E3A8A 83.33%, transparent 83.33%, transparent 100%)`;
const RING_MASK = `radial-gradient(closest-side, transparent calc(100% - ${TRACK_WIDTH_PERCENT}%), black calc(100% - ${TRACK_WIDTH_PERCENT}%), black 100%)`;

export type PriceSliderProps = {
  value: number;
  range: PriceRange;
  onChange: (value: number) => void;
  formatValue: (value: number) => string;
  size?: number;
  disabled?: boolean;
};

export function PriceSlider({ value, range, onChange, formatValue, size = 240, disabled = false }: PriceSliderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  const angle = angleForValue(value, range);
  const rad = (angle * Math.PI) / 180;
  const thumbX = 50 + THUMB_ORBIT_PERCENT * Math.sin(rad);
  const thumbY = 50 - THUMB_ORBIT_PERCENT * Math.cos(rad);

  const updateFromPoint = useCallback((clientX: number, clientY: number) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const pointerAngle = angleFromPoint(clientX - cx, clientY - cy);
    onChange(valueForAngle(pointerAngle, range));
  }, [onChange, range]);

  useEffect(() => {
    if (!dragging) return;
    function handleMove(event: PointerEvent) {
      updateFromPoint(event.clientX, event.clientY);
    }
    function handleUp() {
      setDragging(false);
    }
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
  }, [dragging, updateFromPoint]);

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (disabled) return;
    setDragging(true);
    updateFromPoint(event.clientX, event.clientY);
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (disabled) return;
    const { min, max, step } = range;
    if (event.key === "ArrowRight" || event.key === "ArrowUp") {
      event.preventDefault();
      onChange(Math.min(max, value + step));
    } else if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
      event.preventDefault();
      onChange(Math.max(min, value - step));
    } else if (event.key === "PageUp") {
      event.preventDefault();
      onChange(Math.min(max, value + step * 10));
    } else if (event.key === "PageDown") {
      event.preventDefault();
      onChange(Math.max(min, value - step * 10));
    } else if (event.key === "Home") {
      event.preventDefault();
      onChange(min);
    } else if (event.key === "End") {
      event.preventDefault();
      onChange(max);
    }
  }

  return (
    <div
      ref={containerRef}
      style={{ width: size, height: size, touchAction: "none" }}
      className="relative select-none"
      onPointerDown={handlePointerDown}
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 rounded-full"
        style={{ background: TRACK_GRADIENT, WebkitMaskImage: RING_MASK, maskImage: RING_MASK }}
      />
      <div
        role="slider"
        tabIndex={disabled ? -1 : 0}
        aria-label="Your price estimate"
        aria-valuemin={range.min}
        aria-valuemax={range.max}
        aria-valuenow={value}
        aria-valuetext={formatValue(value)}
        aria-disabled={disabled}
        onKeyDown={handleKeyDown}
        className="absolute rounded-full border-4 border-white bg-blue-600 shadow-lg outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        style={{
          left: `${thumbX}%`,
          top: `${thumbY}%`,
          width: size * 0.16,
          height: size * 0.16,
          transform: "translate(-50%, -50%)",
          cursor: disabled ? "default" : "grab",
        }}
      />
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-4 text-center">
        <span className="text-2xl font-black text-zinc-900">{formatValue(value)}</span>
      </div>
    </div>
  );
}
