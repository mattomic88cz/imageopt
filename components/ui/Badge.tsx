import React from 'react';

const badgeVariants = {
  default: 'border-transparent bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]',
  secondary: 'border-transparent bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))]',
  destructive: 'border-transparent bg-[hsl(var(--destructive))] text-[hsl(var(--destructive-foreground))]',
  outline: 'text-[hsl(var(--foreground))] border-[hsl(var(--border))]',
};

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: keyof typeof badgeVariants | 'primary';
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  // Handle 'primary' as an alias for 'default' for backward compatibility
  const effectiveVariant = variant === 'primary' ? 'default' : variant;
  
  return (
    <div
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-[400] transition-colors focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] focus:ring-offset-2 ${badgeVariants[effectiveVariant]} ${className}`}
      {...props}
    />
  );
}