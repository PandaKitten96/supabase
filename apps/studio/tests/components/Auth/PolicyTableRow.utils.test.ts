import { describe, expect, test } from 'vitest'

import {
  generatePolicyUpdateSQL,
  getTableAdmonitionMessage,
  getTableDataApiStatus,
} from '@/components/interfaces/Auth/Policies/PolicyTableRow/PolicyTableRow.utils'
import type { TableApiAccessData } from '@/data/privileges/table-api-access-query'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Use type assertions to avoid importing internal privilege types
const fullyGranted = {
  apiAccessType: 'access',
  grantStatus: 'granted',
  privileges: {},
} as unknown as TableApiAccessData

const customGrants = {
  apiAccessType: 'access',
  grantStatus: 'custom',
  privileges: {},
} as unknown as TableApiAccessData

const noGrantsData: TableApiAccessData = {
  apiAccessType: 'exposed-schema-no-grants',
}

// ---------------------------------------------------------------------------
// getTableDataApiStatus
// ---------------------------------------------------------------------------

describe('getTableDataApiStatus', () => {
  test('returns schema-not-exposed when schema is not exposed', () => {
    expect(
      getTableDataApiStatus({
        isSchemaExposed: false,
        apiAccessData: fullyGranted,
        isRLSEnabled: true,
        policiesCount: 1,
      })
    ).toBe('schema-not-exposed')
  })

  test('returns no-grants when schema exposed but no API grants', () => {
    expect(
      getTableDataApiStatus({
        isSchemaExposed: true,
        apiAccessData: noGrantsData,
        isRLSEnabled: false,
        policiesCount: 0,
      })
    ).toBe('no-grants')
  })

  test('returns custom-grants when schema exposed and grants are custom', () => {
    expect(
      getTableDataApiStatus({
        isSchemaExposed: true,
        apiAccessData: customGrants,
        isRLSEnabled: true,
        policiesCount: 5,
      })
    ).toBe('custom-grants')
  })

  test('returns publicly-readable when fully granted and RLS disabled', () => {
    expect(
      getTableDataApiStatus({
        isSchemaExposed: true,
        apiAccessData: fullyGranted,
        isRLSEnabled: false,
        policiesCount: 0,
      })
    ).toBe('publicly-readable')
  })

  test('returns locked-by-rls when fully granted, RLS enabled, but no policies', () => {
    expect(
      getTableDataApiStatus({
        isSchemaExposed: true,
        apiAccessData: fullyGranted,
        isRLSEnabled: true,
        policiesCount: 0,
      })
    ).toBe('locked-by-rls')
  })

  test('returns secured when fully granted, RLS enabled, and policies exist', () => {
    expect(
      getTableDataApiStatus({
        isSchemaExposed: true,
        apiAccessData: fullyGranted,
        isRLSEnabled: true,
        policiesCount: 2,
      })
    ).toBe('secured')
  })

  test('returns unknown when apiAccessData is undefined and schema is exposed', () => {
    expect(
      getTableDataApiStatus({
        isSchemaExposed: true,
        apiAccessData: undefined,
        isRLSEnabled: false,
        policiesCount: 0,
      })
    ).toBe('unknown')
  })

  test('schema-not-exposed takes precedence over undefined apiAccessData', () => {
    expect(
      getTableDataApiStatus({
        isSchemaExposed: false,
        apiAccessData: undefined,
        isRLSEnabled: false,
        policiesCount: 0,
      })
    ).toBe('schema-not-exposed')
  })
})

// ---------------------------------------------------------------------------
// getTableAdmonitionMessage
// ---------------------------------------------------------------------------

describe('getTableAdmonitionMessage', () => {
  test('returns a message for custom-grants', () => {
    const msg = getTableAdmonitionMessage('custom-grants')
    expect(typeof msg).toBe('string')
    expect(msg!.length).toBeGreaterThan(0)
  })

  test('returns a message for no-grants', () => {
    const msg = getTableAdmonitionMessage('no-grants')
    expect(typeof msg).toBe('string')
    expect(msg!.length).toBeGreaterThan(0)
  })

  test('returns a message for publicly-readable', () => {
    const msg = getTableAdmonitionMessage('publicly-readable')
    expect(typeof msg).toBe('string')
    expect(msg!.length).toBeGreaterThan(0)
  })

  test('returns a message for locked-by-rls', () => {
    const msg = getTableAdmonitionMessage('locked-by-rls')
    expect(typeof msg).toBe('string')
    expect(msg!.length).toBeGreaterThan(0)
  })

  test('returns null for secured (everything is fine)', () => {
    expect(getTableAdmonitionMessage('secured')).toBeNull()
  })

  test('returns null for schema-not-exposed (handled separately with a link)', () => {
    expect(getTableAdmonitionMessage('schema-not-exposed')).toBeNull()
  })

  test('returns null for unknown (caller should stay silent)', () => {
    expect(getTableAdmonitionMessage('unknown')).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// generatePolicyUpdateSQL
// ---------------------------------------------------------------------------

describe('generatePolicyUpdateSQL', () => {
  const basePolicy = {
    id: 1,
    schema: 'public',
    table: 'users',
    table_id: 42,
    name: 'allow_read',
    command: 'SELECT' as const,
    roles: ['authenticated'],
    definition: null,
    check: null,
    action: 'PERMISSIVE' as const,
  }

  test('generates SQL with a USING expression when definition is set', () => {
    const sql = generatePolicyUpdateSQL({
      ...basePolicy,
      definition: 'auth.uid() = user_id',
    })
    expect(sql).toContain('alter policy "allow_read"')
    expect(sql).toContain('on "public"."users"')
    expect(sql).toContain('using (auth.uid() = user_id)')
  })

  test('generates SQL with a WITH CHECK expression when check is set', () => {
    const sql = generatePolicyUpdateSQL({
      ...basePolicy,
      check: 'auth.uid() = user_id',
    })
    expect(sql).toContain('with check (auth.uid() = user_id)')
  })

  test('generates SQL with both USING and WITH CHECK', () => {
    const sql = generatePolicyUpdateSQL({
      ...basePolicy,
      definition: 'auth.uid() = user_id',
      check: 'auth.uid() = user_id',
    })
    expect(sql).toContain('using (auth.uid() = user_id)')
    expect(sql).toContain('with check (auth.uid() = user_id)')
  })

  test('generates SQL with no expressions when both definition and check are null', () => {
    const sql = generatePolicyUpdateSQL(basePolicy)
    expect(sql).toContain('alter policy "allow_read"')
    expect(sql).toContain('on "public"."users"')
    expect(sql).not.toContain('using')
    expect(sql).not.toContain('with check')
  })

  test('includes all roles joined by comma', () => {
    const sql = generatePolicyUpdateSQL({
      ...basePolicy,
      roles: ['authenticated', 'anon'],
    })
    expect(sql).toContain('to authenticated, anon')
  })

  test('quotes schema and table names correctly', () => {
    const sql = generatePolicyUpdateSQL({
      ...basePolicy,
      schema: 'my_schema',
      table: 'my_table',
      name: 'my_policy',
    })
    expect(sql).toContain('"my_schema"."my_table"')
    expect(sql).toContain('"my_policy"')
  })
})
