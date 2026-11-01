/**
 * PostCare AI Shared Clinical Date Utilities
 * Enforces unified 'DD MMM YYYY' formatting and dynamic relative date calculations
 * aligned with the local system date.
 */

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
]

const MONTH_NAMES_FULL = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

/**
 * Returns current Date instance
 */
export function getCurrentDate() {
  return new Date()
}

/**
 * Parses any date input safely into a Date object
 */
export function parseDate(dateInput) {
  if (!dateInput) return null
  if (dateInput instanceof Date) {
    return isNaN(dateInput.getTime()) ? null : dateInput
  }

  const str = String(dateInput).trim()
  if (str.toLowerCase() === 'today') return getCurrentDate()
  if (str.toLowerCase() === 'yesterday') return getRelativeDate(-1)
  if (str.toLowerCase() === 'tomorrow') return getRelativeDate(1)

  // Handle YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    const parts = str.split('T')[0].split('-')
    const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10))
    if (!isNaN(d.getTime())) return d
  }

  // Handle DD MMM YYYY or DD Month YYYY
  const parts = str.split(/[\s,]+/)
  if (parts.length >= 3) {
    const day = parseInt(parts[0], 10)
    const monthStr = parts[1].slice(0, 3).toLowerCase()
    const year = parseInt(parts[2], 10)
    const monthIdx = MONTH_NAMES.findIndex(m => m.toLowerCase() === monthStr)
    if (!isNaN(day) && monthIdx !== -1 && !isNaN(year)) {
      return new Date(year, monthIdx, day)
    }
  }

  const fallback = new Date(str)
  return isNaN(fallback.getTime()) ? null : fallback
}

/**
 * Formats a date into a standardized string (Default: 'DD MMM YYYY')
 * @param {Date|string|number} dateInput
 * @param {'DD MMM YYYY'|'DD MMM'|'YYYY-MM-DD'|'DD MMMM YYYY'|'DD MMM YYYY HH:mm'} format
 */
export function formatDate(dateInput, format = 'DD MMM YYYY') {
  const d = parseDate(dateInput)
  if (!d) return String(dateInput || '')

  const day = String(d.getDate()).padStart(2, '0')
  const month = MONTH_NAMES[d.getMonth()]
  const monthFull = MONTH_NAMES_FULL[d.getMonth()]
  const monthNum = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()

  if (format === 'DD MMM') {
    return `${day} ${month}`
  }
  if (format === 'YYYY-MM-DD') {
    return `${year}-${monthNum}-${day}`
  }
  if (format === 'DD MMMM YYYY') {
    return `${day} ${monthFull} ${year}`
  }
  if (format === 'DD MMM YYYY HH:mm') {
    let hours = d.getHours()
    const minutes = String(d.getMinutes()).padStart(2, '0')
    const ampm = hours >= 12 ? 'PM' : 'AM'
    hours = hours % 12 || 12
    const hoursStr = String(hours).padStart(2, '0')
    return `${day} ${month} ${year} ${hoursStr}:${minutes} ${ampm}`
  }

  // Standard default: 'DD MMM YYYY' (e.g. '01 Nov 2026')
  return `${day} ${month} ${year}`
}

/**
 * Returns a Date offset by days from current system date
 * @param {number} offsetDays
 */
export function getRelativeDate(offsetDays = 0) {
  const d = getCurrentDate()
  d.setDate(d.getDate() + offsetDays)
  return d
}

/**
 * Formats a relative date offset from current date
 * @param {number} offsetDays
 * @param {'DD MMM YYYY'|'DD MMM'|'YYYY-MM-DD'} format
 */
export function formatRelativeDate(offsetDays = 0, format = 'DD MMM YYYY') {
  const d = getRelativeDate(offsetDays)
  return formatDate(d, format)
}

/**
 * Checks if a given date is in the past
 */
export function isPastDate(dateInput) {
  const d = parseDate(dateInput)
  if (!d) return false
  const today = getCurrentDate()
  today.setHours(0, 0, 0, 0)
  return d.getTime() < today.getTime()
}

/**
 * Checks if a given date is in the future
 */
export function isFutureDate(dateInput) {
  const d = parseDate(dateInput)
  if (!d) return false
  const today = getCurrentDate()
  today.setHours(23, 59, 59, 999)
  return d.getTime() > today.getTime()
}

/**
 * Checks if an appointment or task is overdue
 */
export function isOverdue(dateInput, status = 'upcoming') {
  if (['completed', 'cancelled', 'resolved'].includes(status?.toLowerCase())) {
    return false
  }
  return isPastDate(dateInput)
}

/**
 * Calculates current post-operative day from surgery date
 */
export function calculatePostOpDay(surgeryDateInput, defaultDay = 14) {
  const d = parseDate(surgeryDateInput)
  if (!d) return defaultDay
  const today = getCurrentDate()
  const diffTime = today.getTime() - d.getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
  return diffDays > 0 ? diffDays : defaultDay
}
