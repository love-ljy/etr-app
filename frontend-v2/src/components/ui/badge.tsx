"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "cyan" | "magenta" | "yellow" | "green" | "red" | "default";
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = "default", ...props }, ref) => {
    const variants = {
      default: "bg-white/10 text-white/80 border-white/20",
      cyan: "bg-[#00f5ff]/15 text-[#00f5ff] border-[#00f5ff]/30 shadow-[0_0_10px_rgba(0,245,255,0.2)]",
      magenta: "bg-[#ff00ff]/15 text-[#ff00ff] border-[#ff00ff]/30 shadow-[0_0_10px_rgba(255,0,255,0.2)]",
      yellow: "bg-[#ffff00]/15 text-[#ffff00] border-[#ffff00]/30",
      green: "bg-[#00ff88]/15 text-[#00ff88] border-[#00ff88]/30",
      red: "bg-[#ff3366]/15 text-[#ff3366] border-[#ff3366]/30",
    };

    return (
      <span
        ref={ref}
        className={cn(
          "inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border",
          variants[variant],
          className
        )}
        {...props}
      />
    );
  }
);

Badge.displayName = "Badge";

export { Badge };
