"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number;
  max?: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  labelPosition?: "inside" | "outside";
  variant?: "default" | "neon" | "gradient";
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value, max = 100, size = "md", showLabel = false, labelPosition = "outside", variant = "gradient", ...props }, ref) => {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
    
    const sizeClasses = {
      sm: "h-2",
      md: "h-3",
      lg: "h-4",
    };
    
    const barVariants = {
      default: "bg-[#00f5ff]",
      neon: "bg-[#00f5ff] shadow-[0_0_10px_rgba(0,245,255,0.8)]",
      gradient: "bg-gradient-to-r from-[#00f5ff] to-[#ff00ff] shadow-[0_0_10px_rgba(0,245,255,0.5)]",
    };

    return (
      <div ref={ref} className={cn("w-full", className)} {...props}>
        {(showLabel && labelPosition === "outside") && (
          <div className="flex justify-between mb-2">
            <span className="text-sm text-white/60">进度</span>
            <span className="text-sm font-medium text-white font-mono">{Math.round(percentage)}%</span>
          </div>
        )}
        
        <div className={cn("relative bg-white/10 rounded-full overflow-hidden", sizeClasses[size])}>
          <motion.div
            className={cn("h-full rounded-full", barVariants[variant])}
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 1, ease: [0, 0, 0.2, 1] }}
          />
          
          {(showLabel && labelPosition === "inside" && size !== "sm") && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs font-medium text-black">{Math.round(percentage)}%</span>
            </div>
          )}
        </div>
      </div>
    );
  }
);

Progress.displayName = "Progress";

export { Progress };
