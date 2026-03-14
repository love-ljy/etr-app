"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightElement?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, label, error, leftIcon, rightElement, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-white/70 mb-2">
            {label}
          </label>
        )}
        <motion.div
          className={cn(
            "relative flex items-center rounded-xl bg-[rgba(10,10,15,0.8)] border transition-all duration-300",
            error 
              ? "border-[#ff3366] shadow-[0_0_10px_rgba(255,51,102,0.3)]" 
              : "border-white/10 focus-within:border-[#00f5ff] focus-within:shadow-[0_0_20px_rgba(0,245,255,0.2),0_0_0_3px_rgba(0,245,255,0.1)]"
          )}
          whileFocus={{ scale: 1.01 }}
        >
          {leftIcon && (
            <div className="absolute left-4 text-white/40">
              {leftIcon}
            </div>
          )}
          
          <input
            type={type}
            className={cn(
              "flex-1 bg-transparent px-4 py-4 text-white placeholder:text-white/30 outline-none font-mono",
              leftIcon && "pl-12",
              rightElement && "pr-24",
              className
            )}
            ref={ref}
            {...props}
          />
          
          {rightElement && (
            <div className="absolute right-2">
              {rightElement}
            </div>
          )}
        </motion.div>
        
        {error && (
          <motion.p 
            className="mt-2 text-sm text-[#ff3366]"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {error}
          </motion.p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export { Input };
