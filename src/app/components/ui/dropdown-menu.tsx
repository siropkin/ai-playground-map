import {
  Menu,
  MenuButton,
  MenuItem,
  MenuItems,
  MenuButtonProps,
} from "@headlessui/react";
import * as React from "react";
import { cn } from "@/lib/utils";

const buttonVariants = {
  default: "", // TODO: add default styles
  destructive: "", // TODO: add destructive styles
  outline: "border border-gray-300 hover:bg-gray-200",
  secondary: "", // TODO: add secondary styles
  ghost: "hover:bg-gray-200",
  link: "", // TODO: add link styles
};

const buttonSizes = {
  default: "h-10 px-4 py-2",
  sm: "h-9 px-3 text-sm",
  lg: "h-11 px-8 text-lg",
  icon: "h-10 w-10",
};

export interface DropdownMenuButtonProps extends MenuButtonProps {
  variant?: keyof typeof buttonVariants;
  size?: keyof typeof buttonSizes;
}

const DropdownMenuButton = React.forwardRef<
  HTMLButtonElement,
  DropdownMenuButtonProps
>(({ className, variant = "default", size = "default", ...props }, ref) => {
  const variantClass = buttonVariants[variant];
  const sizeClass = buttonSizes[size];
  return (
    <MenuButton
      className={cn(
        "inline-flex cursor-pointer items-center justify-center gap-2 rounded-md whitespace-nowrap disabled:pointer-events-none disabled:opacity-50",
        variantClass,
        sizeClass,
        className,
      )}
      ref={ref}
      role="button"
      {...props}
    />
  );
});

export {
  Menu as DropdownMenu,
  MenuItems as DropdownMenuItems,
  MenuItem as DropdownMenuItem,
  DropdownMenuButton,
};
