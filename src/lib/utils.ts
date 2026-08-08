import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format an integer with a "." thousands separator (e.g. 1234567 -> "1.234.567").
 * Deterministic — does not depend on the runtime's ICU/locale data.
 */
export function formatNumber(value: number): string {
  const n = Math.trunc(Number.isFinite(value) ? value : 0)
  const negative = n < 0
  const digits = Math.abs(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")
  return negative ? `-${digits}` : digits
}

/**
 * Format a USD amount with a fixed number of decimals (default 2).
 */
export function formatUsd(value: number, decimals = 2): string {
  const n = Number.isFinite(value) ? value : 0
  return `$${n.toFixed(decimals)}`
}
