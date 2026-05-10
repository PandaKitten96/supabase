import dayjs from 'dayjs'
import { describe, expect, test } from 'vitest'

import {
  constrainDateToRange,
  formatNumberToTwoDigits,
  formatTimeToTimeString,
  getDatesBetweenRange,
  getPITRRetentionDuration,
} from '@/components/interfaces/Database/Backups/PITR/PITR.utils'

// ---------------------------------------------------------------------------
// getPITRRetentionDuration
// ---------------------------------------------------------------------------

describe('getPITRRetentionDuration', () => {
  test('returns 0 when addons is empty', () => {
    expect(getPITRRetentionDuration([])).toBe(0)
  })

  test('returns 0 when no pitr addon exists', () => {
    const addons = [
      { type: 'compute', variant: { meta: {} } },
      { type: 'disk', variant: { meta: {} } },
    ] as any
    expect(getPITRRetentionDuration(addons)).toBe(0)
  })

  test('returns backup_duration_days from pitr addon variant meta', () => {
    const addons = [{ type: 'pitr', variant: { meta: { backup_duration_days: 7 } } }] as any
    expect(getPITRRetentionDuration(addons)).toBe(7)
  })

  test('returns 0 when pitr addon meta has no backup_duration_days', () => {
    const addons = [{ type: 'pitr', variant: { meta: {} } }] as any
    expect(getPITRRetentionDuration(addons)).toBe(0)
  })

  test('returns 0 when pitr addon meta is null', () => {
    const addons = [{ type: 'pitr', variant: { meta: null } }] as any
    expect(getPITRRetentionDuration(addons)).toBe(0)
  })

  test('uses the first pitr addon found when multiple exist', () => {
    const addons = [
      { type: 'pitr', variant: { meta: { backup_duration_days: 14 } } },
      { type: 'pitr', variant: { meta: { backup_duration_days: 30 } } },
    ] as any
    expect(getPITRRetentionDuration(addons)).toBe(14)
  })
})

// ---------------------------------------------------------------------------
// getDatesBetweenRange
// ---------------------------------------------------------------------------

describe('getDatesBetweenRange', () => {
  test('returns empty array when start equals end', () => {
    const d = dayjs('2024-01-01')
    expect(getDatesBetweenRange(d, d)).toHaveLength(0)
  })

  test('returns empty array when end is before start', () => {
    const start = dayjs('2024-01-05')
    const end = dayjs('2024-01-01')
    expect(getDatesBetweenRange(start, end)).toHaveLength(0)
  })

  test('returns one element for a 1-day range', () => {
    const start = dayjs('2024-01-01')
    const end = dayjs('2024-01-02')
    const result = getDatesBetweenRange(start, end)
    expect(result).toHaveLength(1)
    expect(result[0].format('YYYY-MM-DD')).toBe('2024-01-01')
  })

  test('does not include the end date', () => {
    const start = dayjs('2024-01-01')
    const end = dayjs('2024-01-04')
    const result = getDatesBetweenRange(start, end)
    expect(result).toHaveLength(3)
    const lastDate = result[result.length - 1].format('YYYY-MM-DD')
    expect(lastDate).toBe('2024-01-03')
  })

  test('produces consecutive days', () => {
    const start = dayjs('2024-03-01')
    const end = dayjs('2024-03-05')
    const result = getDatesBetweenRange(start, end)
    result.forEach((d, i) => {
      expect(d.format('YYYY-MM-DD')).toBe(start.add(i, 'day').format('YYYY-MM-DD'))
    })
  })
})

// ---------------------------------------------------------------------------
// formatNumberToTwoDigits
// ---------------------------------------------------------------------------

describe('formatNumberToTwoDigits', () => {
  test('pads single-digit numbers with a leading zero', () => {
    expect(formatNumberToTwoDigits(1)).toBe('01')
    expect(formatNumberToTwoDigits(9)).toBe('09')
  })

  test('does not pad two-digit numbers', () => {
    expect(formatNumberToTwoDigits(10)).toBe('10')
    expect(formatNumberToTwoDigits(59)).toBe('59')
  })

  test('returns "00" for zero', () => {
    expect(formatNumberToTwoDigits(0)).toBe('00')
  })

  test('handles three-digit numbers (no truncation)', () => {
    expect(formatNumberToTwoDigits(100)).toBe('100')
  })
})

// ---------------------------------------------------------------------------
// formatTimeToTimeString
// ---------------------------------------------------------------------------

describe('formatTimeToTimeString', () => {
  test('formats midnight correctly', () => {
    expect(formatTimeToTimeString({ h: 0, m: 0, s: 0 })).toBe('00:00:00')
  })

  test('formats a time with all single-digit values', () => {
    expect(formatTimeToTimeString({ h: 9, m: 5, s: 3 })).toBe('09:05:03')
  })

  test('formats max valid time', () => {
    expect(formatTimeToTimeString({ h: 23, m: 59, s: 59 })).toBe('23:59:59')
  })

  test('returns hh:mm:ss format', () => {
    const result = formatTimeToTimeString({ h: 12, m: 30, s: 45 })
    expect(result).toMatch(/^\d{2}:\d{2}:\d{2}$/)
  })
})

// ---------------------------------------------------------------------------
// constrainDateToRange
// ---------------------------------------------------------------------------

describe('constrainDateToRange', () => {
  const lower = dayjs('2024-01-01')
  const upper = dayjs('2024-12-31')

  test('returns current when it is within the range', () => {
    const current = dayjs('2024-06-15')
    const result = constrainDateToRange(current, lower, upper)
    expect(result.format('YYYY-MM-DD')).toBe('2024-06-15')
  })

  test('returns lower when current is before the lower bound', () => {
    const current = dayjs('2023-12-31')
    const result = constrainDateToRange(current, lower, upper)
    expect(result.format('YYYY-MM-DD')).toBe(lower.format('YYYY-MM-DD'))
  })

  test('returns upper when current is after the upper bound', () => {
    const current = dayjs('2025-01-01')
    const result = constrainDateToRange(current, lower, upper)
    expect(result.format('YYYY-MM-DD')).toBe(upper.format('YYYY-MM-DD'))
  })

  test('returns current when it equals the lower bound exactly', () => {
    const result = constrainDateToRange(lower, lower, upper)
    expect(result.format('YYYY-MM-DD')).toBe(lower.format('YYYY-MM-DD'))
  })

  test('returns current when it equals the upper bound exactly', () => {
    const result = constrainDateToRange(upper, lower, upper)
    expect(result.format('YYYY-MM-DD')).toBe(upper.format('YYYY-MM-DD'))
  })
})
