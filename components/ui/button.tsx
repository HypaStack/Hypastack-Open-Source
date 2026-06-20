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
  if (variant.startsWith("landing-")) {
    const isSecondary = variant === "landing-secondary";
    const gradientClasses = isSecondary 
       ? "bg-gradient-to-tr from-[rgba(255,255,255,0.05)] to-[rgba(255,255,255,0.15)] group-hover:to-[rgba(255,255,255,0.25)]"
       : "bg-gradient-to-tr from-[#242526] via-[#242526] to-[#666c73] group-hover:to-[#888f98]";
    
    const sizeClasses = size === "sm" ? "px-4 py-2" : size === "md" ? "px-5 py-2.5" : "px-6 py-3";
    const textClasses = size === "sm" ? "text-[13px] sm:text-[14px]" : size === "md" ? "text-[14px] sm:text-[15px]" : "text-[15px] sm:text-[16px]";
    
    const innerContent = (
      <>
        <div className={`absolute inset-0 ${gradientClasses} transition-colors duration-300`} />
        <div className={`relative bg-[#151616] rounded-full ${sizeClasses} flex items-center justify-center gap-2 sm:gap-3 w-full h-full text-[#f7f8f8] ${textClasses} font-medium`}>
           {children}
        </div>
      </>
    );

    const containerClasses = `relative inline-flex items-center justify-center p-[1px] rounded-full overflow-hidden shrink-0 group active:scale-[0.98] transition-transform duration-150 ${className}`.trim();

    if (href) {
      const onClick = (props as any).onClick;
      if (href.startsWith("http")) {
        return <a href={href} className={containerClasses} style={style} target={target} rel={rel} onClick={onClick}>{innerContent}</a>;
      }
      return <Link href={href} className={containerClasses} style={style} target={target} rel={rel} onClick={onClick}>{innerContent}</Link>;
    }
    return <button className={containerClasses} style={style} {...props}>{innerContent}</button>;
  }

  const baseClasses = "inline-flex items-center justify-center active:scale-[0.97] transition-all duration-200 text-center";
  
  const variantClasses = variant === "primary"
    ? "bg-[#030303] text-[#ffffff] font-semibold hover:bg-[#1a1a1a] hover:ring-[4px] hover:ring-[rgba(0,0,0,0.15)] dark:bg-[#f7f8f8] dark:text-[#08090a] dark:hover:bg-white dark:hover:ring-[rgba(255,255,255,0.15)]"
    : "bg-[#ffffff] text-[#171717] font-medium hover:bg-[#f0f1f5] hover:ring-[4px] hover:ring-[rgba(0,0,0,0.05)] border border-[rgba(0,0,0,0.12)] dark:bg-[rgba(255,255,255,0.06)] dark:text-[#f7f8f8] dark:border-[rgba(255,255,255,0.08)] dark:hover:bg-[rgba(255,255,255,0.1)] dark:hover:ring-[rgba(255,255,255,0.05)]";

  const sizeClasses = size === "sm"
    ? "h-9 px-4 rounded-full text-[13px]"
    : size === "md"
      ? "h-[40px] px-5 rounded-full text-[14px]"
      : "h-[44px] px-6 rounded-full text-[15px]"; // lg

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
