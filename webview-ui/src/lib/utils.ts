/**
 * Tailwind CSS class merge utility — used by all Shadcn/ui components.
 *
 * Combines clsx (conditional class joining) with tailwind-merge (deduplication
 * of conflicting Tailwind classes). For example:
 *   cn("px-4 py-2", isActive && "bg-primary", "px-6")
 *   → "py-2 px-6 bg-primary"   (px-6 wins over px-4)
 */
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
