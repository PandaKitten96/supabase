import { FOREIGN_KEY_CASCADE_ACTION } from '@supabase/pg-meta'
import { describe, expect, test } from 'vitest'

import {
  generateColumnField,
  generateCreateColumnPayload,
  generateUpdateColumnPayload,
  getForeignKeyCascadeAction,
  getForeignKeyUIState,
  getPlaceholderText,
} from '@/components/interfaces/TableGridEditor/SidePanelEditor/ColumnEditor/ColumnEditor.utils'
import type { ExtendedPostgresRelationship } from '@/components/interfaces/TableGridEditor/SidePanelEditor/SidePanelEditor.types'

// ---------------------------------------------------------------------------
// generateColumnField
// ---------------------------------------------------------------------------

describe('generateColumnField', () => {
  test('returns a ColumnField with sensible defaults when called with no arguments', () => {
    const field = generateColumnField()
    expect(field.name).toBe('')
    expect(field.table).toBe('')
    expect(field.schema).toBe('')
    expect(field.format).toBe('')
    expect(field.isNullable).toBe(true)
    expect(field.isPrimaryKey).toBe(false)
    expect(field.isUnique).toBe(false)
    expect(field.isArray).toBe(false)
    expect(field.isIdentity).toBe(false)
    expect(field.isNewColumn).toBe(true)
    expect(field.isEncrypted).toBe(false)
    expect(field.defaultValue).toBeNull()
    expect(field.foreignKey).toBeUndefined()
    expect(field.check).toBeNull()
  })

  test('uses provided name, table, schema, and format', () => {
    const field = generateColumnField({ name: 'user_id', table: 'posts', schema: 'public', format: 'int8' })
    expect(field.name).toBe('user_id')
    expect(field.table).toBe('posts')
    expect(field.schema).toBe('public')
    expect(field.format).toBe('int8')
  })

  test('generates a unique id each call', () => {
    const a = generateColumnField()
    const b = generateColumnField()
    expect(a.id).not.toBe(b.id)
  })
})

// ---------------------------------------------------------------------------
// getForeignKeyUIState
// ---------------------------------------------------------------------------

describe('getForeignKeyUIState', () => {
  const fk: ExtendedPostgresRelationship = {
    id: 1,
    constraint_name: 'fk',
    source_schema: 'public',
    source_table_name: 'posts',
    source_column_name: 'user_id',
    target_table_schema: 'public',
    target_table_name: 'users',
    target_column_name: 'id',
    deletion_action: FOREIGN_KEY_CASCADE_ACTION.NO_ACTION,
    update_action: FOREIGN_KEY_CASCADE_ACTION.NO_ACTION,
  }

  test('returns "Add" when there is no original config but an updated config', () => {
    expect(getForeignKeyUIState(undefined, fk)).toBe('Add')
  })

  test('returns "Remove" when there is an original config but no updated config', () => {
    expect(getForeignKeyUIState(fk, undefined)).toBe('Remove')
  })

  test('returns "Info" when original and updated configs are identical', () => {
    expect(getForeignKeyUIState(fk, fk)).toBe('Info')
  })

  test('returns "Update" when target schema changes', () => {
    const updated = { ...fk, target_table_schema: 'auth' }
    expect(getForeignKeyUIState(fk, updated)).toBe('Update')
  })

  test('returns "Update" when target table changes', () => {
    const updated = { ...fk, target_table_name: 'profiles' }
    expect(getForeignKeyUIState(fk, updated)).toBe('Update')
  })

  test('returns "Update" when target column changes', () => {
    const updated = { ...fk, target_column_name: 'uid' }
    expect(getForeignKeyUIState(fk, updated)).toBe('Update')
  })

  test('returns "Update" when deletion action changes', () => {
    const updated = { ...fk, deletion_action: FOREIGN_KEY_CASCADE_ACTION.CASCADE }
    expect(getForeignKeyUIState(fk, updated)).toBe('Update')
  })

  test('returns "Update" when update action changes', () => {
    const updated = { ...fk, update_action: FOREIGN_KEY_CASCADE_ACTION.RESTRICT }
    expect(getForeignKeyUIState(fk, updated)).toBe('Update')
  })

  test('returns "Info" when both configs are undefined', () => {
    expect(getForeignKeyUIState(undefined, undefined)).toBe('Info')
  })
})

// ---------------------------------------------------------------------------
// getForeignKeyCascadeAction
// ---------------------------------------------------------------------------

describe('getForeignKeyCascadeAction', () => {
  test('returns "Cascade" for CASCADE action', () => {
    expect(getForeignKeyCascadeAction(FOREIGN_KEY_CASCADE_ACTION.CASCADE)).toBe('Cascade')
  })

  test('returns "Restrict" for RESTRICT action', () => {
    expect(getForeignKeyCascadeAction(FOREIGN_KEY_CASCADE_ACTION.RESTRICT)).toBe('Restrict')
  })

  test('returns "Set default" for SET_DEFAULT action', () => {
    expect(getForeignKeyCascadeAction(FOREIGN_KEY_CASCADE_ACTION.SET_DEFAULT)).toBe('Set default')
  })

  test('returns "Set NULL" for SET_NULL action', () => {
    expect(getForeignKeyCascadeAction(FOREIGN_KEY_CASCADE_ACTION.SET_NULL)).toBe('Set NULL')
  })

  test('returns undefined for NO_ACTION', () => {
    expect(getForeignKeyCascadeAction(FOREIGN_KEY_CASCADE_ACTION.NO_ACTION)).toBeUndefined()
  })

  test('returns undefined for undefined input', () => {
    expect(getForeignKeyCascadeAction(undefined)).toBeUndefined()
  })

  test('returns undefined for an unrecognized string', () => {
    expect(getForeignKeyCascadeAction('unknown')).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// getPlaceholderText
// ---------------------------------------------------------------------------

describe('getPlaceholderText', () => {
  test('uses provided columnFieldName in placeholder', () => {
    const result = getPlaceholderText('int4', 'my_col')
    expect(result).toContain('"my_col"')
  })

  test('falls back to "column_name" when no name provided', () => {
    const result = getPlaceholderText('int4')
    expect(result).toContain('"column_name"')
  })

  test('returns numeric comparison for int2', () => {
    expect(getPlaceholderText('int2', 'n')).toContain('> 0')
  })

  test('returns numeric comparison for int4', () => {
    expect(getPlaceholderText('int4', 'n')).toContain('> 0')
  })

  test('returns numeric comparison for int8', () => {
    expect(getPlaceholderText('int8', 'n')).toContain('> 0')
  })

  test('returns numeric comparison for numeric', () => {
    expect(getPlaceholderText('numeric', 'n')).toContain('> 0')
  })

  test('returns float comparison for float4', () => {
    expect(getPlaceholderText('float4', 'n')).toContain('> 0.0')
  })

  test('returns float comparison for float8', () => {
    expect(getPlaceholderText('float8', 'n')).toContain('> 0.0')
  })

  test('returns length check for text', () => {
    expect(getPlaceholderText('text', 'col')).toContain('length("col")')
  })

  test('returns length check for varchar', () => {
    expect(getPlaceholderText('varchar', 'col')).toContain('length("col")')
  })

  test('returns jsonb_typeof for json', () => {
    expect(getPlaceholderText('json', 'data')).toContain('jsonb_typeof')
  })

  test('returns jsonb_typeof for jsonb', () => {
    expect(getPlaceholderText('jsonb', 'data')).toContain('jsonb_typeof')
  })

  test('returns bool in (...) for bool', () => {
    expect(getPlaceholderText('bool', 'flag')).toContain('in (true, false)')
  })

  test('returns date comparison for date', () => {
    expect(getPlaceholderText('date', 'd')).toContain("'2024-01-01'")
  })

  test('returns time range for time', () => {
    expect(getPlaceholderText('time', 't')).toContain('between')
  })

  test('returns UTC time range for timetz', () => {
    const result = getPlaceholderText('timetz', 't')
    expect(result).toContain('UTC')
  })

  test('returns timestamp range for timestamp', () => {
    const result = getPlaceholderText('timestamp', 'ts')
    expect(result).toContain('2023-01-01')
    expect(result).toContain('2025-01-01')
  })

  test('returns timestamptz range for timestamptz', () => {
    const result = getPlaceholderText('timestamptz', 'ts')
    expect(result).toContain('+00')
  })

  test('returns generic length check for unknown format', () => {
    expect(getPlaceholderText('custom_type', 'c')).toContain('length("c")')
  })

  test('returns generic length check when format is undefined', () => {
    expect(getPlaceholderText(undefined, 'c')).toContain('length("c")')
  })
})

// ---------------------------------------------------------------------------
// generateCreateColumnPayload — isIdentity logic
// ---------------------------------------------------------------------------

describe('generateCreateColumnPayload', () => {
  const baseTable = {
    id: 1,
    schema: 'public',
    name: 'posts',
    primary_keys: [],
    relationships: [],
    columns: [],
  } as any

  const baseField = {
    id: 'uuid-123',
    name: 'title',
    table: 'posts',
    schema: 'public',
    comment: '',
    format: 'text',
    defaultValue: null,
    foreignKey: undefined,
    check: null,
    isNullable: true,
    isUnique: false,
    isArray: false,
    isPrimaryKey: false,
    isIdentity: false,
    isNewColumn: true,
    isEncrypted: false,
  }

  test('uses trimmed field name in payload', () => {
    const payload = generateCreateColumnPayload(baseTable, { ...baseField, name: '  col  ' })
    expect(payload.name).toBe('col')
  })

  test('sets isArray type correctly', () => {
    const payload = generateCreateColumnPayload(baseTable, { ...baseField, format: 'int4', isArray: true })
    expect(payload.type).toBe('int4[]')
  })

  test('sets isIdentity to false for non-int formats even if isIdentity is true', () => {
    const payload = generateCreateColumnPayload(baseTable, {
      ...baseField,
      format: 'text',
      isIdentity: true,
    })
    expect(payload.isIdentity).toBe(false)
  })

  test('sets isIdentity to true for int4 format', () => {
    const payload = generateCreateColumnPayload(baseTable, {
      ...baseField,
      format: 'int4',
      isIdentity: true,
    })
    expect(payload.isIdentity).toBe(true)
  })

  test('omits defaultValue when isIdentity', () => {
    const payload = generateCreateColumnPayload(baseTable, {
      ...baseField,
      format: 'int4',
      isIdentity: true,
      defaultValue: '42',
    })
    expect(payload.defaultValue).toBeUndefined()
  })

  test('includes check when provided', () => {
    const payload = generateCreateColumnPayload(baseTable, {
      ...baseField,
      check: ' length(title) > 0 ',
    })
    expect(payload.check).toBe('length(title) > 0')
  })

  test('omits check when empty string', () => {
    const payload = generateCreateColumnPayload(baseTable, { ...baseField, check: '' })
    expect(payload.check).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// generateUpdateColumnPayload — diff-only updates
// ---------------------------------------------------------------------------

describe('generateUpdateColumnPayload', () => {
  const baseTable = {
    id: 1,
    schema: 'public',
    name: 'posts',
    primary_keys: [],
    relationships: [],
    columns: [],
  } as any

  const originalColumn = {
    id: '1',
    name: 'title',
    schema: 'public',
    table: 'posts',
    format: 'text',
    data_type: 'text',
    comment: null,
    check: null,
    default_value: null,
    is_identity: false,
    is_nullable: true,
    is_unique: false,
  } as any

  const baseField = {
    id: '1',
    name: 'title',
    schema: 'public',
    table: 'posts',
    comment: null,
    format: 'text',
    defaultValue: null,
    foreignKey: undefined,
    check: null,
    isNullable: true,
    isUnique: false,
    isArray: false,
    isPrimaryKey: false,
    isIdentity: false,
    isNewColumn: false,
    isEncrypted: false,
  }

  test('returns empty payload when nothing changed', () => {
    expect(generateUpdateColumnPayload(originalColumn, baseTable, baseField)).toStrictEqual({})
  })

  test('includes name in payload when it changes', () => {
    const payload = generateUpdateColumnPayload(
      originalColumn,
      baseTable,
      { ...baseField, name: 'headline' }
    )
    expect(payload.name).toBe('headline')
  })

  test('includes type in payload when format changes', () => {
    const payload = generateUpdateColumnPayload(
      originalColumn,
      baseTable,
      { ...baseField, format: 'varchar' }
    )
    expect(payload.type).toBe('varchar')
  })

  test('includes isNullable in payload when nullability changes', () => {
    const payload = generateUpdateColumnPayload(
      originalColumn,
      baseTable,
      { ...baseField, isNullable: false }
    )
    expect(payload.isNullable).toBe(false)
  })

  test('includes isUnique in payload when uniqueness changes', () => {
    const payload = generateUpdateColumnPayload(
      originalColumn,
      baseTable,
      { ...baseField, isUnique: true }
    )
    expect(payload.isUnique).toBe(true)
  })

  test('handles ARRAY original format -> strips leading underscore for comparison', () => {
    const arrayOriginal = { ...originalColumn, format: '_int4', data_type: 'ARRAY' }
    // field format "int4[]" should match original "_int4" (ARRAY)
    const payload = generateUpdateColumnPayload(
      arrayOriginal,
      baseTable,
      { ...baseField, format: 'int4', isArray: true }
    )
    // type unchanged: "_int4" normalizes to "int4[]", field type is "int4[]" -> no diff
    expect(payload.type).toBeUndefined()
  })
})
