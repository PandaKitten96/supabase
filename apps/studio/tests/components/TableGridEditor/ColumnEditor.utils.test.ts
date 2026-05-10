import { describe, expect, test } from 'vitest'

import {
  generateUpdateColumnPayload,
  getPlaceholderText,
} from '../../../components/interfaces/TableGridEditor/SidePanelEditor/ColumnEditor/ColumnEditor.utils'
import type { ColumnField } from '../../../components/interfaces/TableGridEditor/SidePanelEditor/SidePanelEditor.types'

const baseTable = {
  name: 'posts',
  schema: 'public',
  primary_keys: [{ name: 'id' }],
} as any

const originalColumn = {
  name: 'title',
  comment: 'old comment',
  check: null,
  data_type: 'text',
  format: 'text',
  default_value: null,
  is_identity: false,
  is_nullable: true,
  is_unique: false,
} as any

const baseField: ColumnField = {
  id: '1',
  name: 'title',
  table: 'posts',
  schema: 'public',
  comment: 'old comment',
  format: 'text',
  defaultValue: null,
  foreignKey: undefined,
  check: null,
  isNullable: true,
  isUnique: false,
  isArray: false,
  isIdentity: false,
  isPrimaryKey: false,
  isNewColumn: false,
  isEncrypted: false,
}

describe('getPlaceholderText', () => {
  test('returns uuid placeholder for uuid type', () => {
    const result = getPlaceholderText('uuid', 'id')
    expect(result).toContain('"id"')
    expect(result).toContain('00000000-0000-0000-0000-000000000000')
  })
})

describe('generateUpdateColumnPayload', () => {
  test('includes comment in payload when it changes', () => {
    const payload = generateUpdateColumnPayload(
      originalColumn,
      baseTable,
      { ...baseField, comment: 'new comment' }
    )
    expect(payload.comment).toBe('new comment')
  })

  test('includes check in payload when it changes', () => {
    const payload = generateUpdateColumnPayload(
      originalColumn,
      baseTable,
      { ...baseField, check: 'length(title) > 0' }
    )
    expect(payload.check).toBe('length(title) > 0')
  })

  test('includes defaultValue in payload when it changes', () => {
    const payload = generateUpdateColumnPayload(
      originalColumn,
      baseTable,
      { ...baseField, defaultValue: 'untitled' }
    )
    expect(payload.defaultValue).toBe('untitled')
    expect(payload.defaultValueFormat).toBe('literal')
  })

  test('includes isPrimaryKey in payload when it changes', () => {
    const payload = generateUpdateColumnPayload(
      originalColumn,
      baseTable,
      { ...baseField, isPrimaryKey: true }
    )
    expect(payload.isPrimaryKey).toBe(true)
  })
})
