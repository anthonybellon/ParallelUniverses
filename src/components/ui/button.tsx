import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from 'src/utils/utils';

const buttonVariants = cva(
  // Terminal keys: square, uppercase VT323, and inverse video on hover.
  'inline-flex items-center justify-center whitespace-nowrap rounded-none border font-display text-lg uppercase leading-none tracking-wider transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-40',
  {
    variants: {
      variant: {
        default:
          'border-primary bg-primary text-primary-foreground shadow-[0_0_10px_rgb(125_255_155/0.35)] hover:bg-primary/85',
        destructive:
          'border-destructive bg-destructive text-destructive-foreground hover:bg-destructive/85',
        outline:
          'glow border-primary/70 bg-transparent text-primary hover:bg-primary hover:text-primary-foreground hover:[text-shadow:none]',
        secondary:
          'glow border-dashed border-primary/60 bg-secondary text-primary hover:border-solid hover:bg-primary hover:text-primary-foreground hover:[text-shadow:none]',
        ghost:
          'border-transparent text-muted-foreground hover:border-primary/50 hover:text-primary',
        link: 'border-transparent text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-8 px-3 text-base',
        lg: 'h-11 px-8 text-xl',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
