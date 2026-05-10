import { describe, expect, test } from 'vitest'

import { convertArgumentTypes } from './Functions.utils'

describe('convertArgumentTypes', () => {
  test('returns empty value array for undefined input', () => {
    expect(convertArgumentTypes(undefined as any)).toStrictEqual({ value: [] })
  })

  test('parses a single simple argument', () => {
    expect(convertArgumentTypes('a integer')).toStrictEqual({
      value: [{ name: 'a', type: 'integer', defaultValue: undefined }],
    })
  })
})
