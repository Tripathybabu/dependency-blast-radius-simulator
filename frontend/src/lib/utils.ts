import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export function severityColor(score: number): string {
  if (score >= 200) return "text-red-400";
  if (score >= 100) return "text-orange-400";
  if (score >= 50) return "text-yellow-400";
  return "text-green-400";
}

export function severityLabel(score: number): string {
  if (score >= 200) return "Critical";
  if (score >= 100) return "High";
  if (score >= 50) return "Medium";
  return "Low";
}

export function severityBadgeVariant(score: number): "destructive" | "warning" | "secondary" | "default" {
  if (score >= 200) return "destructive";
  if (score >= 100) return "warning";
  if (score >= 50) return "secondary";
  return "default";
}
