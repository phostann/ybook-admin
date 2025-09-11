import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function sleep(ms: number = 1000) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Generates page numbers for pagination with ellipsis
 * @param currentPage - Current page number (1-based)
 * @param totalPages - Total number of pages
 * @returns Array of page numbers and ellipsis strings
 *
 * Examples:
 * - Small dataset (≤5 pages): [1, 2, 3, 4, 5]
 * - Near beginning: [1, 2, 3, 4, '...', 10]
 * - In middle: [1, '...', 4, 5, 6, '...', 10]
 * - Near end: [1, '...', 7, 8, 9, 10]
 */
export function getPageNumbers(currentPage: number, totalPages: number) {
  const maxVisiblePages = 5 // Maximum number of page buttons to show
  const rangeWithDots = []

  if (totalPages <= maxVisiblePages) {
    // If total pages is 5 or less, show all pages
    for (let i = 1; i <= totalPages; i++) {
      rangeWithDots.push(i)
    }
  } else {
    // Always show first page
    rangeWithDots.push(1)

    if (currentPage <= 3) {
      // Near the beginning: [1] [2] [3] [4] ... [10]
      for (let i = 2; i <= 4; i++) {
        rangeWithDots.push(i)
      }
      rangeWithDots.push('...', totalPages)
    } else if (currentPage >= totalPages - 2) {
      // Near the end: [1] ... [7] [8] [9] [10]
      rangeWithDots.push('...')
      for (let i = totalPages - 3; i <= totalPages; i++) {
        rangeWithDots.push(i)
      }
    } else {
      // In the middle: [1] ... [4] [5] [6] ... [10]
      rangeWithDots.push('...')
      for (let i = currentPage - 1; i <= currentPage + 1; i++) {
        rangeWithDots.push(i)
      }
      rangeWithDots.push('...', totalPages)
    }
  }

  return rangeWithDots
}

/**
 * Formats a date string or Date object to a human-readable format
 * @param date - Date string or Date object
 * @returns Formatted date string
 */
export function formatDate(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  
  if (isNaN(dateObj.getTime())) {
    return 'Invalid Date'
  }

  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(dateObj)
}

/**
 * Creates a debounced function that delays invoking `fn` until after `wait`
 * milliseconds have elapsed since the last time the debounced function was invoked.
 *
 * Options:
 * - leading: invoke on the leading edge of the timeout
 * - trailing: invoke on the trailing edge of the timeout (default true)
 * - maxWait: enforce invoking after `maxWait` even if calls continue
 */
export type Debounced<T extends (...args: never[]) => unknown> = ((
  ...args: Parameters<T>
) => ReturnType<T> | undefined) & {
  cancel: () => void
  flush: () => ReturnType<T> | undefined
  pending: () => boolean
}

export function debounce<T extends (...args: never[]) => unknown>(
  fn: T,
  wait = 300,
  options: { leading?: boolean; trailing?: boolean; maxWait?: number } = {}
): Debounced<T> {
  const leading = options.leading === true
  const trailing = options.trailing !== false
  const maxWait = typeof options.maxWait === 'number' ? options.maxWait : undefined

  let timer: ReturnType<typeof setTimeout> | null = null
  let lastArgs: Parameters<T> | undefined
  let lastThis: unknown
  let lastCallTime = 0
  let lastInvokeTime = 0
  let result: ReturnType<T> | undefined

  function invoke(now: number) {
    lastInvokeTime = now
    const args = lastArgs as Parameters<T>
    const thisArg = lastThis
    lastArgs = undefined
    lastThis = undefined
    result = fn.apply(thisArg, args) as ReturnType<T>
    return result
  }

  function startTimer(pendingWait: number) {
    if (timer) clearTimeout(timer)
    timer = setTimeout(onTimerExpired, pendingWait)
  }

  function remainingWait(now: number) {
    const timeSinceCall = now - lastCallTime
    const timeSinceInvoke = now - lastInvokeTime
    const timeWaiting = wait - timeSinceCall
    return maxWait !== undefined
      ? Math.min(timeWaiting, Math.max(0, maxWait - timeSinceInvoke))
      : timeWaiting
  }

  function shouldInvoke(now: number) {
    const timeSinceCall = now - lastCallTime
    const timeSinceInvoke = now - lastInvokeTime
    return (
      lastCallTime === 0 ||
      timeSinceCall >= wait ||
      timeSinceCall < 0 ||
      (maxWait !== undefined && timeSinceInvoke >= maxWait)
    )
  }

  function onTimerExpired() {
    const now = Date.now()
    if (shouldInvoke(now)) {
      trailingEdge(now)
    } else if (timer) {
      startTimer(remainingWait(now))
    }
  }

  function leadingEdge(now: number) {
    lastInvokeTime = now
    startTimer(wait)
    return leading ? invoke(now) : result
  }

  function trailingEdge(now: number) {
    timer = null
    if (trailing && lastArgs) {
      return invoke(now)
    }
    lastArgs = undefined
    lastThis = undefined
    return result
  }

  function cancel() {
    if (timer) clearTimeout(timer)
    timer = null
    lastArgs = undefined
    lastThis = undefined
    lastCallTime = 0
    lastInvokeTime = 0
  }

  function flush() {
    return timer === null ? result : trailingEdge(Date.now())
  }

  function pending() {
    return timer !== null
  }

  const debounced = function (this: unknown, ...args: Parameters<T>) {
    const now = Date.now()
    lastArgs = args
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    lastThis = this
    lastCallTime = now

    return shouldInvoke(now)
      ? (timer === null ? leadingEdge(now) : (maxWait !== undefined ? (startTimer(remainingWait(now)), invoke(now)) : undefined))
      : (timer === null && startTimer(wait), undefined)
  } as Debounced<T>

  debounced.cancel = cancel
  debounced.flush = flush
  debounced.pending = pending

  return debounced
}
