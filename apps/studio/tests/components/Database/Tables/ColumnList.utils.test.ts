import {
  getColumnTypeAffordance,
  getForeignKeyColumnNames,
  getPrimaryKeyColumnNames,
  getUniqueIndexColumnNames,
} from '@/components/interfaces/Database/Tables/ColumnList.utils'
import { describe, expect, test } from 'vitest'

// ---------------------------------------------------------------------------
// getColumnTypeAffordance
// ---------------------------------------------------------------------------

describe('getColumnTypeAffordance', () => {
  test('returns "number" kind for int2', () => {
    const result = getColumnTypeAffordance('int2')
    expect(result.kind).toBe('number')
    expect(result.label).toBe('Numeric')
  })

  test('returns "number" kind for int4', () => {
    expect(getColumnTypeAffordance('int4').kind).toBe('number')
  })

  test('returns "number" kind for int8', () => {
    expect(getColumnTypeAffordance('int8').kind).toBe('number')
  })

  test('returns "number" kind for numeric', () => {
    expect(getColumnTypeAffordance('numeric').kind).toBe('number')
  })

  test('returns "number" kind for float4', () => {
    expect(getColumnTypeAffordance('float4').kind).toBe('number')
  })

  test('returns "number" kind for float8', () => {
    expect(getColumnTypeAffordance('float8').kind).toBe('number')
  })

  test('returns "time" kind for date', () => {
    const result = getColumnTypeAffordance('date')
    expect(result.kind).toBe('time')
    expect(result.label).toBe('Date / time')
  })

  test('returns "time" kind for timestamp', () => {
    expect(getColumnTypeAffordance('timestamp').kind).toBe('time')
  })

  test('returns "time" kind for timestamptz', () => {
    expect(getColumnTypeAffordance('timestamptz').kind).toBe('time')
  })

  test('returns "time" kind for time', () => {
    expect(getColumnTypeAffordance('time').kind).toBe('time')
  })

  test('returns "time" kind for timetz', () => {
    expect(getColumnTypeAffordance('timetz').kind).toBe('time')
  })

  test('returns "text" kind for text', () => {
    const result = getColumnTypeAffordance('text')
    expect(result.kind).toBe('text')
    expect(result.label).toBe('Text')
  })

  test('returns "text" kind for varchar', () => {
    expect(getColumnTypeAffordance('varchar').kind).toBe('text')
  })

  test('returns "json" kind for json', () => {
    const result = getColumnTypeAffordance('json')
    expect(result.kind).toBe('json')
    expect(result.label).toBe('JSON')
  })

  test('returns "json" kind for jsonb', () => {
    expect(getColumnTypeAffordance('jsonb').kind).toBe('json')
  })

  test('returns "bool" kind for bool', () => {
    const result = getColumnTypeAffordance('bool')
    expect(result.kind).toBe('bool')
    expect(result.label).toBe('Boolean')
  })

  test('returns "text" kind for uuid (mapped as text in the data type options)', () => {
    const result = getColumnTypeAffordance('uuid')
    expect(result.kind).toBe('text')
  })

  test('returns "other" for bytea', () => {
    expect(getColumnTypeAffordance('bytea').kind).toBe('other')
  })

  test('returns "other" for an unknown type', () => {
    expect(getColumnTypeAffordance('custom_type').kind).toBe('other')
  })

  test('strips array suffix [] before matching', () => {
    // "int4[]" -> "int4" -> number
    expect(getColumnTypeAffordance('int4[]').kind).toBe('number')
  })

  test('strips quoted format string before matching', () => {
    // '"int4"' -> 'int4' -> number
    expect(getColumnTypeAffordance('"int4"').kind).toBe('number')
  })
})

// ---------------------------------------------------------------------------
// getPrimaryKeyColumnNames
// ---------------------------------------------------------------------------

describe('getPrimaryKeyColumnNames', () => {
  test('returns empty Set when table is undefined', () => {
    expect(getPrimaryKeyColumnNames(undefined).size).toBe(0)
  })

  test('returns empty Set when primary_keys is empty', () => {
    const table = { schema: 'public', name: 'posts', primary_keys: [], relationships: [] }
    expect(getPrimaryKeyColumnNames(table).size).toBe(0)
  })

  test('returns a Set containing each primary key column name', () => {
    const table = {
      schema: 'public',
      name: 'posts',
      primary_keys: [{ name: 'id' }, { name: 'tenant_id' }],
      relationships: [],
    }
    const names = getPrimaryKeyColumnNames(table)
    expect(names.has('id')).toBe(true)
    expect(names.has('tenant_id')).toBe(true)
    expect(names.size).toBe(2)
  })
})

// ---------------------------------------------------------------------------
// getForeignKeyColumnNames
// ---------------------------------------------------------------------------

describe('getForeignKeyColumnNames', () => {
  test('returns empty Set when table is undefined', () => {
    expect(getForeignKeyColumnNames(undefined).size).toBe(0)
  })

  test('returns empty Set when no relationships exist', () => {
    const table = { schema: 'public', name: 'posts', primary_keys: [], relationships: [] }
    expect(getForeignKeyColumnNames(table).size).toBe(0)
  })

  test('includes columns from relationships matching the table schema/name', () => {
    const table = {
      schema: 'public',
      name: 'posts',
      primary_keys: [],
      relationships: [
        { source_schema: 'public', source_table_name: 'posts', source_column_name: 'user_id' },
        { source_schema: 'public', source_table_name: 'posts', source_column_name: 'category_id' },
      ],
    }
    const names = getForeignKeyColumnNames(table)
    expect(names.has('user_id')).toBe(true)
    expect(names.has('category_id')).toBe(true)
    expect(names.size).toBe(2)
  })

  test('excludes relationships from a different schema', () => {
    const table = {
      schema: 'auth',
      name: 'users',
      primary_keys: [],
      relationships: [
        { source_schema: 'public', source_table_name: 'users', source_column_name: 'fk_col' },
      ],
    }
    expect(getForeignKeyColumnNames(table).size).toBe(0)
  })

  test('excludes relationships from a different table name', () => {
    const table = {
      schema: 'public',
      name: 'posts',
      primary_keys: [],
      relationships: [
        { source_schema: 'public', source_table_name: 'comments', source_column_name: 'fk_col' },
      ],
    }
    expect(getForeignKeyColumnNames(table).size).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// getUniqueIndexColumnNames
// ---------------------------------------------------------------------------

describe('getUniqueIndexColumnNames', () => {
  test('returns empty Set when table is undefined', () => {
    expect(getUniqueIndexColumnNames(undefined).size).toBe(0)
  })

  test('returns empty Set when unique_indexes is absent', () => {
    const table = { schema: 'public', name: 'posts', primary_keys: [], relationships: [] }
    expect(getUniqueIndexColumnNames(table).size).toBe(0)
  })

  test('returns empty Set when unique_indexes is empty', () => {
    const table = {
      schema: 'public',
      name: 'posts',
      primary_keys: [],
      relationships: [],
      unique_indexes: [],
    }
    expect(getUniqueIndexColumnNames(table).size).toBe(0)
  })

  test('includes columns from single-column unique indexes', () => {
    const table = {
      schema: 'public',
      name: 'posts',
      primary_keys: [],
      relationships: [],
      unique_indexes: [{ columns: ['email'] }, { columns: ['username'] }],
    }
    const names = getUniqueIndexColumnNames(table)
    expect(names.has('email')).toBe(true)
    expect(names.has('username')).toBe(true)
    expect(names.size).toBe(2)
  })

  test('excludes multi-column composite unique indexes', () => {
    const table = {
      schema: 'public',
      name: 'posts',
      primary_keys: [],
      relationships: [],
      unique_indexes: [{ columns: ['col_a', 'col_b'] }],
    }
    expect(getUniqueIndexColumnNames(table).size).toBe(0)
  })

  test('only includes single-column indexes when mixed with composite', () => {
    const table = {
      schema: 'public',
      name: 'posts',
      primary_keys: [],
      relationships: [],
      unique_indexes: [
        { columns: ['email'] },
        { columns: ['first', 'last'] },
      ],
    }
    const names = getUniqueIndexColumnNames(table)
    expect(names.has('email')).toBe(true)
    expect(names.size).toBe(1)
  })
})
