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

/**
 * Format a per-1M token price. These can be tiny (e.g. 0.003), so show between
 * 2 and 6 decimals and trim unnecessary trailing zeros. Deterministic — does
 * not depend on the runtime's ICU/locale data.
 */
export function formatTokenPrice(value: number): string {
  const n = Number.isFinite(value) ? value : 0
  let s = n.toFixed(6)
  s = s.replace(/0+$/, "").replace(/\.$/, "")
  const [int, dec] = s.split(".")
  if (!dec) return `${int}.00`
  if (dec.length === 1) return `${int}.${dec}0`
  return `${int}.${dec}`
}
