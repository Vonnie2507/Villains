import { clsx, type ClassValue } from 'clsx'

/** Merge Tailwind classes safely */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

/** Format currency (change locale/currency per client) */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(amount)
}

/** Format date (change locale per client) */
export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(date))
}

/** Format date + time */
export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat('en-AU', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(date))
}

/** Get initials from a name */
export function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

/** Truncate text */
export function truncate(str: string, length: number): string {
  return str.length > length ? str.slice(0, length) + '...' : str
}
