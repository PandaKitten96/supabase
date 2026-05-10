import { MAX_ARRAY_SIZE, MAX_CHARACTERS } from '@supabase/pg-meta/src/query/table-row-query'
import { describe, expect, test } from 'vitest'

import {
  convertByteaToHex,
  generateRowObjectFromFields,
  isValueTruncated,
  parseValue,
  validateFields,
} from '@/components/interfaces/TableGridEditor/SidePanelEditor/RowEditor/RowEditor.utils'

// ---------------------------------------------------------------------------
// parseValue
// ---------------------------------------------------------------------------

describe('parseValue', () => {
  test('returns null as-is', () => {
    expect(parseValue(null, 'text')).toBeNull()
  })

  test('returns empty string as-is', () => {
    expect(parseValue('', 'text')).toBe('')
  })

  test('returns numbers without modification', () => {
    expect(parseValue(42, 'int4')).toBe(42)
    expect(parseValue(3.14, 'numeric')).toBe(3.14)
  })

  test('stringifies plain objects', () => {
    expect(parseValue({ key: 'val' }, 'jsonb')).toBe('{"key":"val"}')
  })

  test('stringifies arrays', () => {
    expect(parseValue([1, 2, 3], 'json')).toBe('[1,2,3]')
  })

  test('converts boolean true to string "true"', () => {
    expect(parseValue(true, 'bool')).toBe('true')
  })

  test('converts boolean false to string "false"', () => {
    expect(parseValue(false, 'bool')).toBe('false')
  })

  test('returns string values as-is for text format', () => {
    expect(parseValue('hello world', 'text')).toBe('hello world')
  })

  test('converts bytea buffer to hex string', () => {
    const result = parseValue({ type: 'Buffer', data: [0xca, 0xfe] }, 'bytea')
    expect(result).toBe('\\xcafe')
  })

  test('returns value unchanged when no format is provided', () => {
    expect(parseValue('hello', '')).toBe('hello')
  })
})

// ---------------------------------------------------------------------------
// isValueTruncated
// ---------------------------------------------------------------------------

describe('isValueTruncated', () => {
  test('returns false for null', () => {
    expect(isValueTruncated(null)).toBe(false)
  })

  test('returns false for undefined', () => {
    expect(isValueTruncated(undefined)).toBe(false)
  })

  test('returns false for a normal short string', () => {
    expect(isValueTruncated('hello')).toBe(false)
  })

  test('returns false for a string ending with "..." but shorter than MAX_CHARACTERS', () => {
    expect(isValueTruncated('abc...')).toBe(false)
  })

  test('returns true for a string > MAX_CHARACTERS that ends with "..."', () => {
    const longStr = 'a'.repeat(MAX_CHARACTERS + 1) + '...'
    expect(isValueTruncated(longStr)).toBe(true)
  })

  test('returns false for a string > MAX_CHARACTERS that does NOT end with "..."', () => {
    const longStr = 'a'.repeat(MAX_CHARACTERS + 100)
    expect(isValueTruncated(longStr)).toBe(false)
  })

  test('returns true for a truncated array with exactly MAX_ARRAY_SIZE commas and trailing "..."', () => {
    // Build array with MAX_ARRAY_SIZE real items + 1 "..." sentinel = MAX_ARRAY_SIZE+1 total items
    // The match /","/g finds separators between quoted strings -> MAX_ARRAY_SIZE separators
    const items = Array.from({ length: MAX_ARRAY_SIZE }, (_, i) => `"item${i}"`)
    items.push('"..."')
    const value = `[${items.join(',')}]`
    const commaCount = (value.match(/","/g) || []).length
    expect(commaCount).toBe(MAX_ARRAY_SIZE)
    expect(value.startsWith('["')).toBe(true)
    expect(value.endsWith(',"..."]')).toBe(true)
    expect(isValueTruncated(value)).toBe(true)
  })

  test('returns true for a multi-dimensional array (starts with [[")', () => {
    expect(isValueTruncated('[["a","b"],["c","d"]]')).toBe(true)
  })

  test('returns true for a value ending with the JSON truncation marker', () => {
    expect(isValueTruncated('[1,2,{"truncated":true}]')).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// validateFields
// ---------------------------------------------------------------------------

describe('validateFields', () => {
  const makeField = (overrides: object) => ({
    id: '1',
    name: 'data',
    comment: '',
    format: 'text',
    enums: [],
    defaultValue: null,
    isNullable: true,
    isIdentity: false,
    isPrimaryKey: false,
    value: 'hello',
    foreignKey: undefined,
    ...overrides,
  })

  test('returns empty errors for a valid text field', () => {
    expect(validateFields([makeField({}) as any])).toStrictEqual({})
  })

  test('returns an error for an array field with invalid JSON', () => {
    const field = makeField({ name: 'tags', format: '_text', value: 'not-json' })
    const errors = validateFields([field as any])
    expect(errors['tags']).toBeTruthy()
  })

  test('returns no error for an array field with valid JSON', () => {
    const field = makeField({ name: 'tags', format: '_text', value: '["a","b"]' })
    expect(validateFields([field as any])).toStrictEqual({})
  })

  test('returns an error for a json field with invalid JSON', () => {
    const field = makeField({ name: 'meta', format: 'json', value: '{bad}' })
    const errors = validateFields([field as any])
    expect(errors['meta']).toBeTruthy()
  })

  test('returns no error for a json field with valid JSON', () => {
    const field = makeField({ name: 'meta', format: 'json', value: '{"key":"val"}' })
    expect(validateFields([field as any])).toStrictEqual({})
  })

  test('returns no error for a json field with empty value', () => {
    const field = makeField({ name: 'meta', format: 'jsonb', value: '' })
    expect(validateFields([field as any])).toStrictEqual({})
  })

  test('skips json validation when value is truncated', () => {
    const truncatedValue = 'a'.repeat(MAX_CHARACTERS + 1) + '...'
    const field = makeField({ name: 'meta', format: 'json', value: truncatedValue })
    expect(validateFields([field as any])).toStrictEqual({})
  })

  test('array validation runs before the identity guard; errors are still recorded', () => {
    // The isIdentity guard is at the end of the forEach body, so it only skips
    // code that follows it — array/json validation earlier still runs.
    const field = makeField({ name: 'tags', format: '_text', value: 'not-json', isIdentity: true })
    const errors = validateFields([field as any])
    // Array validation fires first, so the error is still captured
    expect(errors['tags']).toBeTruthy()
  })

  test('returns no error for an array field with null value', () => {
    // if (isArray && field.value) guard is false when value is null
    const field = makeField({ name: 'tags', format: '_text', value: null })
    expect(validateFields([field as any])).toStrictEqual({})
  })

  test('array validation still captures error when defaultValue is set', () => {
    // The defaultValue guard (at end of forEach body) does not skip earlier array validation
    const field = makeField({ name: 'tags', format: '_text', value: 'not-json', defaultValue: '[]' })
    const errors = validateFields([field as any])
    expect(errors['tags']).toBeTruthy()
  })
})

// ---------------------------------------------------------------------------
// generateRowObjectFromFields
// ---------------------------------------------------------------------------

describe('generateRowObjectFromFields', () => {
  const makeField = (overrides: object) => ({
    id: '1',
    name: 'col',
    comment: '',
    format: 'text',
    enums: [],
    defaultValue: null,
    isNullable: true,
    isIdentity: false,
    isPrimaryKey: false,
    foreignKey: undefined,
    value: undefined,
    ...overrides,
  })

  test('omits fields with undefined value by default', () => {
    const fields = [makeField({ name: 'col', format: 'text', value: undefined })] as any
    const result = generateRowObjectFromFields({ fields }) as any
    expect('col' in result).toBe(false)
  })

  test('includes undefined values when includeUndefinedValues is true', () => {
    const fields = [makeField({ name: 'col', format: 'text', value: undefined })] as any
    const result = generateRowObjectFromFields({ fields, includeUndefinedValues: true }) as any
    expect('col' in result).toBe(true)
    expect(result.col).toBeUndefined()
  })

  test('converts bool "true" to boolean true', () => {
    const fields = [makeField({ name: 'active', format: 'bool', value: 'true' })] as any
    const result = generateRowObjectFromFields({ fields }) as any
    expect(result.active).toBe(true)
  })

  test('converts bool "false" to boolean false', () => {
    const fields = [makeField({ name: 'active', format: 'bool', value: 'false' })] as any
    const result = generateRowObjectFromFields({ fields }) as any
    expect(result.active).toBe(false)
  })

  test('converts bool "null" to null', () => {
    const fields = [makeField({ name: 'active', format: 'bool', value: 'null' })] as any
    const result = generateRowObjectFromFields({ fields }) as any
    expect(result.active).toBeNull()
  })

  test('parses JSON array field value', () => {
    const fields = [makeField({ name: 'tags', format: '_text', value: '["a","b"]' })] as any
    const result = generateRowObjectFromFields({ fields }) as any
    expect(result.tags).toStrictEqual(['a', 'b'])
  })

  test('parses JSON object field value', () => {
    const fields = [makeField({ name: 'meta', format: 'jsonb', value: '{"x":1}' })] as any
    const result = generateRowObjectFromFields({ fields }) as any
    expect(result.meta).toStrictEqual({ x: 1 })
  })

  test('passes plain text value as-is', () => {
    const fields = [makeField({ name: 'title', format: 'text', value: 'Hello' })] as any
    const result = generateRowObjectFromFields({ fields }) as any
    expect(result.title).toBe('Hello')
  })

  test('handles multiple fields at once', () => {
    const fields = [
      makeField({ name: 'id', format: 'int4', value: '5' }),
      makeField({ name: 'active', format: 'bool', value: 'true' }),
      makeField({ name: 'name', format: 'text', value: 'Alice' }),
    ] as any
    const result = generateRowObjectFromFields({ fields }) as any
    expect(result.id).toBe('5')
    expect(result.active).toBe(true)
    expect(result.name).toBe('Alice')
  })

  test('produces a string result for timestamp field', () => {
    const fields = [makeField({ name: 'created_at', format: 'timestamp', value: '2024-01-01T12:30:00' })] as any
    const result = generateRowObjectFromFields({ fields }) as any
    expect(typeof result.created_at).toBe('string')
  })

  test('sets array field to null when value is null', () => {
    // isArray && value !== null is false, falls to else branch
    const fields = [makeField({ name: 'tags', format: '_text', value: null })] as any
    const result = generateRowObjectFromFields({ fields }) as any
    expect(result.tags).toBeNull()
  })

  test('passes a JSON field value through when it is already an object', () => {
    // typeof field.value === 'object' branch
    const obj = { key: 'val' }
    const fields = [makeField({ name: 'meta', format: 'jsonb', value: obj })] as any
    const result = generateRowObjectFromFields({ fields }) as any
    expect(result.meta).toBe(obj)
  })
})

// ---------------------------------------------------------------------------
// convertByteaToHex
// ---------------------------------------------------------------------------

describe('convertByteaToHex', () => {
  test('converts a Buffer to hex string with \\x prefix', () => {
    expect(convertByteaToHex({ type: 'Buffer', data: [0xde, 0xad, 0xbe, 0xef] })).toBe(
      '\\xdeadbeef'
    )
  })

  test('converts an all-zeros buffer', () => {
    expect(convertByteaToHex({ type: 'Buffer', data: [0x00, 0x00] })).toBe('\\x0000')
  })

  test('converts a single byte', () => {
    expect(convertByteaToHex({ type: 'Buffer', data: [0xff] })).toBe('\\xff')
  })

  test('handles empty data array without throwing', () => {
    expect(convertByteaToHex({ type: 'Buffer', data: [] })).toBe('\\x')
  })
})
