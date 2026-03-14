"use client";

import * as React from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

// 自定义 Card 属性，排除 children 避免类型冲突
interface CardProps extends Omit<HTMLMotionProps<"div">, "ref" | "children"> {
  variant?: "default" | "neon" | "gradient";
  isHoverable?: boolean;
  hasGlow?: boolean;
  children?: React.ReactNode;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = "default", isHoverable = true, hasGlow = false, children, ...props }, ref) => {
    const baseStyles = "relative rounded-2xl overflow-hidden";
    
    const variants = {
      default: "bg-[rgba(20,20,35,0.6)] backdrop-blur-xl border border-white/10",
      neon: "bg-[rgba(20,20,35,0.7)] backdrop-blur-xl border border-[#00f5ff]/30",
      gradient: "bg-[rgba(20,20,35,0.6)] backdrop-blur-xl border border-white/10 before:absolute before:inset-0 before:p-[1px] before:bg-gradient-to-br before:from-[#00f5ff]/50 before:to-[#ff00ff]/30 before:rounded-2xl before:-z-10",
    };

    return (
      <motion.div
        ref={ref}
        className={cn(baseStyles, variants[variant], className)}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0, 0, 0.2, 1] }}
        whileHover={isHoverable ? { 
          y: -4, 
          boxShadow: hasGlow 
            ? "0 0 30px rgba(0, 245, 255, 0.2), 0 20px 40px rgba(0, 0, 0, 0.5)"
            : "0 20px 40px rgba(0, 0, 0, 0.3)"
        } : undefined}
        {...props}
      >
        {variant === "gradient" && (
          <div className="absolute inset-0 rounded-2xl p-[1px] bg-gradient-to-br from-[#00f5ff]/50 to-[#ff00ff]/30 pointer-events-none" >
            <div className="w-full h-full rounded-2xl bg-[rgba(20,20,35,0.95)]" />
          </div>
        )}
        <div className={cn("relative z-10", variant === "gradient" && "p-[1px]")}>
          {children}
        </div>
      </motion.div>
    );
  }
);

Card.displayName = "Card";

// Card Header
const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />
  )
);
CardHeader.displayName = "CardHeader";

// Card Title
const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3 ref={ref} className={cn("text-xl font-semibold leading-none tracking-tight text-white", className)} {...props} />
  )
);
CardTitle.displayName = "CardTitle";

// Card Description
const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn("text-sm text-white/60", className)} {...props} />
  )
);
CardDescription.displayName = "CardDescription";

// Card Content
const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
  )
);
CardContent.displayName = "CardContent";

// Card Footer
const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex items-center p-6 pt-0", className)} {...props} />
  )
);
CardFooter.displayName = "CardFooter";

// Stat Card (Special component for dashboard)
interface StatCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  icon?: React.ReactNode;
  className?: string;
}

const StatCard = React.forwardRef<HTMLDivElement, StatCardProps>(
  ({ label, value, subValue, trend, trendValue, icon, className, ...props }, ref) => {
    const trendColors = {
      up: "text-[#00ff88]",
      down: "text-[#ff3366]",
      neutral: "text-white/60",
    };

    return (
      <Card ref={ref} className={cn("", className)} {...props}>
        <div className="p-6">
          {/* 顶部渐变线 */}
          <div className="absolute top-0 left-6 right-6 h-[3px] bg-gradient-to-r from-[#00f5ff] to-[#ff00ff] rounded-b-sm" />
          
          <div className="flex items-start justify-between mb-4">
            <span className="text-sm text-white/60 font-medium">{label}</span>
            {icon && <div className="text-[#00f5ff]">{icon}</div>}
          </div>
          
          <div className="space-y-1">
            <motion.div 
              className="text-3xl font-bold text-white font-mono tracking-tight"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              {value}
            </motion.div>
            
            {(subValue || trend) && (
              <div className="flex items-center gap-2">
                {subValue && (
                  <span className="text-sm text-white/50">{subValue}</span>
                )}
                {trend && trendValue && (
                  <span className={cn("text-sm font-medium flex items-center gap-1", trendColors[trend])}>
                    {trend === "up" && "▲"}
                    {trend === "down" && "▼"}
                    {trend === "neutral" && "—"}
                    {trendValue}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </Card>
    );
  }
);
StatCard.displayName = "StatCard";

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, StatCard };
