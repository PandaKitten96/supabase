import { describe, expect, test } from 'vitest'

import {
  convertArgumentTypes,
  convertConfigParams,
  hasWhitespace,
} from '@/components/interfaces/Database/Functions/Functions.utils'

// ---------------------------------------------------------------------------
// convertArgumentTypes
// ---------------------------------------------------------------------------

describe('convertArgumentTypes', () => {
  test('returns empty value array for empty string', () => {
    expect(convertArgumentTypes('')).toStrictEqual({ value: [] })
  })

  test('returns empty value array for null/undefined-like empty input', () => {
    expect(convertArgumentTypes(null as any)).toStrictEqual({ value: [] })
  })

  test('returns empty value array for undefined input', () => {
    expect(convertArgumentTypes(undefined as any)).toStrictEqual({ value: [] })
  })

  test('parses a single simple argument', () => {
    expect(convertArgumentTypes('a integer')).toStrictEqual({
      value: [{ name: 'a', type: 'integer', defaultValue: undefined }],
    })
  })

  test('parses multiple arguments separated by commas', () => {
    const result = convertArgumentTypes('a integer, b text, c boolean')
    expect(result.value).toHaveLength(3)
    expect(result.value[0]).toMatchObject({ name: 'a', type: 'integer' })
    expect(result.value[1]).toMatchObject({ name: 'b', type: 'text' })
    expect(result.value[2]).toMatchObject({ name: 'c', type: 'boolean' })
  })

  test('parses an argument with a DEFAULT value', () => {
    const result = convertArgumentTypes('x integer DEFAULT 42')
    expect(result.value).toHaveLength(1)
    expect(result.value[0]).toMatchObject({ name: 'x', type: 'integer', defaultValue: '42' })
  })

  test('handles mixed args with and without defaults', () => {
    const result = convertArgumentTypes('a integer, b text DEFAULT hello')
    expect(result.value).toHaveLength(2)
    expect(result.value[0]).toMatchObject({ name: 'a', type: 'integer', defaultValue: undefined })
    expect(result.value[1]).toMatchObject({ name: 'b', type: 'text', defaultValue: 'hello' })
  })

  test('wraps DEFAULT value in quotes for timestamp types', () => {
    const result = convertArgumentTypes('ts timestamp DEFAULT 2024-01-01')
    expect(result.value[0]).toMatchObject({
      name: 'ts',
      type: 'timestamp',
      defaultValue: "'2024-01-01'",
    })
  })

  test('wraps DEFAULT value in quotes for timestamptz type', () => {
    const result = convertArgumentTypes('ts timestamptz DEFAULT now()')
    expect(result.value[0]).toMatchObject({
      name: 'ts',
      type: 'timestamptz',
      defaultValue: "'now()'",
    })
  })

  test('wraps DEFAULT value in quotes for time type', () => {
    const result = convertArgumentTypes('t time DEFAULT 00:00:00')
    expect(result.value[0]).toMatchObject({
      name: 't',
      type: 'time',
      defaultValue: "'00:00:00'",
    })
  })

  test('wraps DEFAULT value in quotes for timetz type', () => {
    const result = convertArgumentTypes('t timetz DEFAULT 12:00:00')
    expect(result.value[0]).toMatchObject({
      name: 't',
      type: 'timetz',
      defaultValue: "'12:00:00'",
    })
  })

  test('does not wrap DEFAULT value in quotes for non-timestamp types', () => {
    const result = convertArgumentTypes('n numeric DEFAULT 0.5')
    expect(result.value[0]).toMatchObject({
      name: 'n',
      type: 'numeric',
      defaultValue: '0.5',
    })
  })

  test('parses argument with array type', () => {
    const result = convertArgumentTypes('ids integer[]')
    expect(result.value[0]).toMatchObject({ name: 'ids', type: 'integer[]' })
  })

  test('filters out malformed arguments (no space between name and type)', () => {
    // "abc" has no type — the regex won't match, returns null, then filtered
    const result = convertArgumentTypes('abc, valid integer')
    expect(result.value).toHaveLength(1)
    expect(result.value[0]).toMatchObject({ name: 'valid', type: 'integer' })
  })
})

// ---------------------------------------------------------------------------
// convertConfigParams
// ---------------------------------------------------------------------------

describe('convertConfigParams', () => {
  test('returns empty value array for null', () => {
    expect(convertConfigParams(null)).toStrictEqual({ value: [] })
  })

  test('returns empty value array for undefined', () => {
    expect(convertConfigParams(undefined)).toStrictEqual({ value: [] })
  })

  test('returns empty value array for empty object', () => {
    expect(convertConfigParams({})).toStrictEqual({ value: [] })
  })

  test('converts a single key-value pair', () => {
    const result = convertConfigParams({ search_path: 'auth, public' })
    expect(result.value).toHaveLength(1)
    expect(result.value[0]).toStrictEqual({ name: 'search_path', value: 'auth, public' })
  })

  test('converts multiple key-value pairs', () => {
    const result = convertConfigParams({ search_path: 'auth, public', statement_timeout: '5000' })
    expect(result.value).toHaveLength(2)
    expect(result.value).toContainEqual({ name: 'search_path', value: 'auth, public' })
    expect(result.value).toContainEqual({ name: 'statement_timeout', value: '5000' })
  })
})

// ---------------------------------------------------------------------------
// hasWhitespace
// ---------------------------------------------------------------------------

describe('hasWhitespace', () => {
  test('returns true for a string with a space', () => {
    expect(hasWhitespace('hello world')).toBe(true)
  })

  test('returns true for a string with a tab', () => {
    expect(hasWhitespace('hello\tworld')).toBe(true)
  })

  test('returns true for a string with a newline', () => {
    expect(hasWhitespace('hello\nworld')).toBe(true)
  })

  test('returns true for a string that is only whitespace', () => {
    expect(hasWhitespace('   ')).toBe(true)
  })

  test('returns false for a string with no whitespace', () => {
    expect(hasWhitespace('helloworld')).toBe(false)
  })

  test('returns false for an empty string', () => {
    expect(hasWhitespace('')).toBe(false)
  })

  test('returns false for a string with only special characters (non-whitespace)', () => {
    expect(hasWhitespace('hello-world_foo')).toBe(false)
  })
})
