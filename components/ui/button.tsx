import Link from "next/link";
import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  href?: string;
  variant?: "primary" | "secondary" | "landing-primary" | "landing-secondary";
  size?: "sm" | "md" | "lg";
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  target?: string;
  rel?: string;
}

export function Button({ 
  href, 
  variant = "primary", 
  size = "md", 
  className = "", 
  style, 
  children, 
  target, 
  rel, 
  ...props 
}: ButtonProps) {
  const baseClasses = "inline-flex items-center justify-center active:scale-[0.97] transition-all duration-200 text-center";
  
  const variantClasses = variant === "primary"
    ? "bg-[#030303] text-[#ffffff] font-semibold hover:bg-[#1a1a1a] hover:ring-[4px] hover:ring-[rgba(0,0,0,0.15)]"
    : variant === "secondary"
    ? "bg-[#ffffff] text-[#171717] font-medium hover:bg-[#f0f1f5] hover:ring-[4px] hover:ring-[rgba(0,0,0,0.05)] border border-[rgba(0,0,0,0.15)]"
    : variant === "landing-primary"
    ? "bg-[#f7f8f8] text-[#08090a] font-semibold hover:bg-[#e0e0e0] hover:ring-[4px] hover:ring-[rgba(255,255,255,0.15)]"
    : "bg-[#08090a] text-[#f7f8f8] font-medium hover:bg-[#111111] hover:ring-[4px] hover:ring-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.15)]";

  const sizeClasses = size === "sm"
    ? "h-9 px-4 rounded-full text-[13px]"
    : size === "md"
      ? "h-[40px] px-6 rounded-md text-[14px]"
      : "h-[44px] px-[24px] rounded-md text-[15px]"; // lg

  const combinedClasses = `${baseClasses} ${variantClasses} ${sizeClasses} ${className}`.trim();

  if (href) {
    const onClick = (props as any).onClick;
    if (href.startsWith("http")) {
      return (
        <a href={href} className={combinedClasses} style={style} target={target} rel={rel} onClick={onClick}>
          {children}
        </a>
      );
    }
    return (
      <Link href={href} className={combinedClasses} style={style} target={target} rel={rel} onClick={onClick}>
        {children}
      </Link>
    );
  }

  return (
    <button className={combinedClasses} style={style} {...props}>
      {children}
    </button>
  );
}
