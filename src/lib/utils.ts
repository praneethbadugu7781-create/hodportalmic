import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateString?: string | Date | null): string {
  if (!dateString) return 'N/A';
  try {
    const d = typeof dateString === 'string' ? new Date(dateString) : dateString;
    if (isNaN(d.getTime())) return String(dateString);
    return d.toLocaleDateString('en-US', {
      timeZone: 'Asia/Kolkata',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return String(dateString);
  }
}

export function formatDateShort(dateString?: string | Date | null): string {
  if (!dateString) return 'N/A';
  try {
    const d = typeof dateString === 'string' ? new Date(dateString) : dateString;
    if (isNaN(d.getTime())) return String(dateString);
    return d.toLocaleDateString('en-US', {
      timeZone: 'Asia/Kolkata',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return String(dateString);
  }
}

/**
 * Formats a Date or ISO string into YYYY-MM-DDTHH:mm in Indian Standard Time (IST)
 * for use in HTML <input type="datetime-local" />
 */
export function formatForDateTimeLocal(dateInput?: Date | string | null): string {
  const date = dateInput ? (typeof dateInput === 'string' ? new Date(dateInput) : dateInput) : new Date();
  if (isNaN(date.getTime())) return '';
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const partMap: Record<string, string> = {};
  for (const p of parts) {
    partMap[p.type] = p.value;
  }
  const hour = partMap.hour === '24' ? '00' : partMap.hour;
  return `${partMap.year}-${partMap.month}-${partMap.day}T${hour}:${partMap.minute}`;
}

/**
 * Parses user-submitted deadline into a Date object.
 * If input is a raw datetime-local string (e.g. "2026-09-13T09:00"),
 * it interprets it in Indian Standard Time (IST, UTC+05:30) so timings never drift.
 */
export function parseTaskDeadline(input: string | Date | null | undefined): Date {
  if (!input) return new Date();
  if (input instanceof Date) return input;
  const str = String(input).trim();
  if (str.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(str)) {
    return new Date(str);
  }
  const withSecondsAndTz = str.length === 16 ? `${str}:00+05:30` : `${str}+05:30`;
  const parsed = new Date(withSecondsAndTz);
  return isNaN(parsed.getTime()) ? new Date(str) : parsed;
}

export function formatFileSize(bytes?: number | null): string {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export function isDeadlinePassed(deadlineStr: string): boolean {
  try {
    const deadline = new Date(deadlineStr);
    return new Date() > deadline;
  } catch {
    return false;
  }
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    // Fallback for older browsers or insecure contexts
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch (err) {
    console.error('Failed to copy to clipboard:', err);
    return false;
  }
}
