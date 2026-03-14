"use client";

import * as React from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

// 自定义 Button 属性，排除 children 避免类型冲突
interface ButtonProps extends Omit<HTMLMotionProps<"button">, "ref" | "size" | "children"> {
  variant?: "primary" | "secondary" | "ghost" | "outline";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  children?: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", isLoading, leftIcon, rightIcon, children, disabled, ...props }, ref) => {
    const baseStyles = "relative inline-flex items-center justify-center gap-2 font-semibold transition-all duration-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00f5ff]/50 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden";
    
    const variants = {
      primary: "bg-gradient-to-r from-[#00f5ff] to-[#00d4e6] text-black hover:shadow-[0_0_30px_rgba(0,245,255,0.5)] hover:-translate-y-0.5 active:translate-y-0",
      secondary: "bg-transparent border-2 border-[#00f5ff]/50 text-[#00f5ff] hover:bg-[#00f5ff]/10 hover:border-[#00f5ff] hover:shadow-[0_0_20px_rgba(0,245,255,0.3)]",
      ghost: "bg-white/5 text-white/80 hover:bg-white/10 hover:text-white",
      outline: "border border-white/20 text-white hover:border-[#00f5ff]/50 hover:text-[#00f5ff]",
    };
    
    const sizes = {
      sm: "px-4 py-2 text-sm",
      md: "px-6 py-3 text-base",
      lg: "px-8 py-4 text-lg",
    };

    return (
      <motion.button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        disabled={disabled || isLoading}
        whileHover={{ scale: disabled || isLoading ? 1 : 1.02 }}
        whileTap={{ scale: disabled || isLoading ? 1 : 0.98 }}
        {...props}
      >
        {isLoading && (
          <motion.span
            className="absolute inset-0 flex items-center justify-center bg-inherit"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <motion.span
              className="w-5 h-5 border-2 border-current border-t-transparent rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
          </motion.span>
        )}
        <span className={cn("flex items-center gap-2", isLoading && "opacity-0")}>
          {leftIcon}
          {children}
          {rightIcon}
        </span>
      </motion.button>
    );
  }
);

Button.displayName = "Button";

export { Button };
