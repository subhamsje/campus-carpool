// src/components/VisualWidgets.tsx
import React, { useEffect, useState } from "react";
import { motion } from "motion/react";

// Requirement 10: Animated circular progress for trust score
interface TrustScoreProps {
  score: number;
  size?: number;
}

export function TrustScoreRadial({ score = 95, size = 34 }: TrustScoreProps) {
  const radius = size / 2 - 3;
  const circumference = 2 * Math.PI * radius;
  
  const [offsetValue, setOffsetValue] = useState(circumference);

  useEffect(() => {
    // Smooth delay intro fill
    const timer = setTimeout(() => {
      const computedOffset = circumference - (score / 100) * circumference;
      setOffsetValue(computedOffset);
    }, 250);
    return () => clearTimeout(timer);
  }, [score, circumference]);

  // Color mappings
  const strokeColor = 
    score >= 90
      ? "stroke-indigo-600"
      : score >= 75
      ? "stroke-amber-500"
      : "stroke-rose-500";

  const trackColor = "stroke-slate-100";

  return (
    <div 
      className="relative flex items-center justify-center shrink-0 select-none cursor-help" 
      style={{ width: size, height: size }}
      title={`Verified Peer Trust Index: ${score}%`}
    >
      <svg className="transform -rotate-90" width={size} height={size}>
        {/* Underlay Track Ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className={`${trackColor} fill-white`}
          strokeWidth="3px"
        />
        {/* Foreground Colored Fill Ring */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className={`${strokeColor} fill-none`}
          strokeWidth="3px"
          strokeDasharray={circumference}
          animate={{ strokeDashoffset: offsetValue }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          strokeLinecap="round"
        />
      </svg>
      <span className="absolute text-[8px] font-black text-slate-800 font-mono tracking-tighter">
        {Math.round(score)}
      </span>
    </div>
  );
}

// Requirement 2: Animated text counter that increases to the match percentage on map
interface AnimatedScoreProps {
  value: number;
}

export function AnimatedScore({ value }: AnimatedScoreProps) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = Math.round(value);
    if (start === end) return;
    const duration = 1000;
    const range = end - start;
    let current = start;
    const increment = end > start ? 1 : -1;
    const stepTime = Math.abs(Math.floor(duration / range));

    const timer = setInterval(() => {
      current += increment;
      setCount(current);
      if (current === end) {
        clearInterval(timer);
      }
    }, Math.max(stepTime, 12));

    return () => clearInterval(timer);
  }, [value]);

  return <span>{count}%</span>;
}

// Requirement 7: High-end numerical analytics animation counter
interface StatsCounterProps {
  value: number;
  prefix?: string;
  suffix?: string;
  decimal?: boolean;
}

export function AnimatedStatsCounter({ value, prefix = "", suffix = "", decimal = false }: StatsCounterProps) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const end = value;
    if (end === 0) return;
    const duration = 1200; // ms
    const startTime = performance.now();

    let animFrame: number;

    const updateCounter = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1);
      // Out-cubed easing
      const factor = 1 - Math.pow(1 - progress, 3);
      const val = factor * end;
      setCurrent(val);

      if (progress < 1) {
        animFrame = requestAnimationFrame(updateCounter);
      } else {
        setCurrent(end);
      }
    };

    animFrame = requestAnimationFrame(updateCounter);
    return () => cancelAnimationFrame(animFrame);
  }, [value]);

  const formattedValue = decimal 
    ? current.toFixed(1) 
    : Math.floor(current).toLocaleString();

  return <span>{prefix}{formattedValue}{suffix}</span>;
}
