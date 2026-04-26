import { describe, expect, test } from 'vitest'

import {
  createPayloadForCreatePolicy,
  createSQLPolicy,
  generateProgrammaticPoliciesForTable,
} from '@/components/interfaces/Auth/Policies/Policies.utils'
import type { PolicyFormField } from '@/components/interfaces/Auth/Policies/Policies.types'
import type { ForeignKeyConstraint } from '@/data/database/foreign-key-constraints-query'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const baseForm: PolicyFormField = {
  id: 1,
  name: 'allow_select',
  schema: 'public',
  table: 'posts',
  command: 'SELECT',
  definition: 'auth.uid() = user_id',
  check: null,
  roles: ['authenticated'],
}

// ---------------------------------------------------------------------------
// createSQLPolicy — new policy
// ---------------------------------------------------------------------------

describe('createSQLPolicy (create new)', () => {
  test('generates a CREATE POLICY statement for SELECT', () => {
    const result = createSQLPolicy(baseForm) as { statement: string; description: string }
    expect(result.statement).toMatch(/CREATE POLICY/)
    expect(result.statement).toMatch(/"allow_select"/)
    expect(result.statement).toMatch(/"public"\."posts"/)
    expect(result.statement).toContain('USING (auth.uid() = user_id)')
  })

  test('defaults to public role when roles array is empty', () => {
    const result = createSQLPolicy({ ...baseForm, roles: [] }) as { statement: string }
    expect(result.statement).toContain('TO public')
  })

  test('includes named roles in the statement', () => {
    const result = createSQLPolicy({
      ...baseForm,
      roles: ['authenticated', 'anon'],
    }) as { statement: string }
    expect(result.statement).toContain('TO authenticated, anon')
  })

  test('trims and normalises whitespace in definition', () => {
    const result = createSQLPolicy({
      ...baseForm,
      definition: '  auth.uid()  =   user_id  ',
    }) as { statement: string }
    expect(result.statement).toContain('USING (auth.uid() = user_id)')
  })

  test('includes WITH CHECK when check is provided', () => {
    const result = createSQLPolicy({
      ...baseForm,
      command: 'UPDATE',
      check: 'auth.uid() = user_id',
    }) as { statement: string }
    expect(result.statement).toContain('WITH CHECK (auth.uid() = user_id)')
  })

  test('returns a description string', () => {
    const result = createSQLPolicy(baseForm) as { description: string }
    expect(typeof result.description).toBe('string')
    expect(result.description.length).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// createSQLPolicy — update existing policy (no changes)
// ---------------------------------------------------------------------------

describe('createSQLPolicy (update — no changes)', () => {
  test('returns empty object when form equals original policy', () => {
    const original = {
      ...baseForm,
      id: 1,
      roles: ['authenticated'],
      definition: 'auth.uid() = user_id',
      check: null,
      action: 'PERMISSIVE' as const,
    } as any
    const result = createSQLPolicy(baseForm, original)
    expect(result).toStrictEqual({})
  })
})

// ---------------------------------------------------------------------------
// createSQLPolicy — update existing policy (with changes)
// ---------------------------------------------------------------------------

describe('createSQLPolicy (update — with changes)', () => {
  const original = {
    id: 1,
    name: 'allow_select',
    schema: 'public',
    table: 'posts',
    table_id: 42,
    command: 'SELECT',
    definition: 'true',
    check: null,
    roles: ['authenticated'],
    action: 'PERMISSIVE' as const,
  } as any

  test('generates ALTER POLICY statement for a name change', () => {
    const result = createSQLPolicy({ ...baseForm, name: 'new_name' }, original) as {
      statement: string
    }
    expect(result.statement).toContain('BEGIN;')
    expect(result.statement).toContain('COMMIT;')
    expect(result.statement).toContain('RENAME TO "new_name"')
  })

  test('generates ALTER POLICY for a definition change', () => {
    const result = createSQLPolicy(
      { ...baseForm, definition: 'auth.uid() = owner_id' },
      original
    ) as { statement: string }
    expect(result.statement).toContain('USING (auth.uid() = owner_id)')
  })

  test('generates ALTER POLICY for a roles change', () => {
    const result = createSQLPolicy({ ...baseForm, roles: ['anon'] }, original) as {
      statement: string
    }
    expect(result.statement).toContain('TO anon')
  })

  test('returns empty object when nothing changed', () => {
    const sameForm: PolicyFormField = { ...baseForm, definition: 'true', check: null }
    const result = createSQLPolicy(sameForm, original)
    expect(result).toStrictEqual({})
  })
})

// ---------------------------------------------------------------------------
// createPayloadForCreatePolicy
// ---------------------------------------------------------------------------

describe('createPayloadForCreatePolicy', () => {
  test('sets action to PERMISSIVE', () => {
    const payload = createPayloadForCreatePolicy(baseForm)
    expect(payload.action).toBe('PERMISSIVE')
  })

  test('omits definition when empty string', () => {
    const payload = createPayloadForCreatePolicy({ ...baseForm, definition: '' })
    expect(payload.definition).toBeUndefined()
  })

  test('includes definition when non-empty', () => {
    const payload = createPayloadForCreatePolicy(baseForm)
    expect(payload.definition).toBe('auth.uid() = user_id')
  })

  test('omits check when null', () => {
    const payload = createPayloadForCreatePolicy({ ...baseForm, check: null })
    expect(payload.check).toBeUndefined()
  })

  test('omits roles from payload when roles is empty (defaults to public at SQL level)', () => {
    const payload = createPayloadForCreatePolicy({ ...baseForm, roles: [] })
    expect(payload.roles).toBeUndefined()
  })

  test('includes roles when non-empty', () => {
    const payload = createPayloadForCreatePolicy(baseForm)
    expect(payload.roles).toStrictEqual(['authenticated'])
  })
})

// ---------------------------------------------------------------------------
// generateProgrammaticPoliciesForTable
// ---------------------------------------------------------------------------

describe('generateProgrammaticPoliciesForTable', () => {
  const directFKConstraint: ForeignKeyConstraint = {
    id: 1,
    source_schema: 'public',
    source_table: 'posts',
    source_columns: ['user_id'],
    target_schema: 'auth',
    target_table: 'users',
    target_columns: ['id'],
    deletion_action: 'NO ACTION',
    update_action: 'NO ACTION',
    constraint_name: 'posts_user_id_fkey',
  }

  test('returns 4 policies (SELECT, INSERT, UPDATE, DELETE) when direct FK to auth.users exists', () => {
    const policies = generateProgrammaticPoliciesForTable({
      table: { name: 'posts', schema: 'public' },
      foreignKeyConstraints: [directFKConstraint],
    })
    expect(policies).toHaveLength(4)
    const commands = policies.map((p) => p.command)
    expect(commands).toContain('SELECT')
    expect(commands).toContain('INSERT')
    expect(commands).toContain('UPDATE')
    expect(commands).toContain('DELETE')
  })

  test('each generated policy targets the authenticated role', () => {
    const policies = generateProgrammaticPoliciesForTable({
      table: { name: 'posts', schema: 'public' },
      foreignKeyConstraints: [directFKConstraint],
    })
    for (const policy of policies) {
      expect(policy.roles).toContain('authenticated')
    }
  })

  test('each generated policy has a non-empty SQL string', () => {
    const policies = generateProgrammaticPoliciesForTable({
      table: { name: 'posts', schema: 'public' },
      foreignKeyConstraints: [directFKConstraint],
    })
    for (const policy of policies) {
      expect(typeof policy.sql).toBe('string')
      expect(policy.sql.length).toBeGreaterThan(0)
    }
  })

  test('INSERT policy uses WITH CHECK instead of USING', () => {
    const policies = generateProgrammaticPoliciesForTable({
      table: { name: 'posts', schema: 'public' },
      foreignKeyConstraints: [directFKConstraint],
    })
    const insert = policies.find((p) => p.command === 'INSERT')!
    expect(insert.sql).toContain('WITH CHECK')
    expect(insert.definition).toBeUndefined()
    expect(insert.check).toBeDefined()
  })

  test('SELECT policy uses USING and has no check', () => {
    const policies = generateProgrammaticPoliciesForTable({
      table: { name: 'posts', schema: 'public' },
      foreignKeyConstraints: [directFKConstraint],
    })
    const select = policies.find((p) => p.command === 'SELECT')!
    expect(select.sql).toContain('USING')
    expect(select.check).toBeUndefined()
  })

  test('UPDATE policy uses both USING and WITH CHECK', () => {
    const policies = generateProgrammaticPoliciesForTable({
      table: { name: 'posts', schema: 'public' },
      foreignKeyConstraints: [directFKConstraint],
    })
    const update = policies.find((p) => p.command === 'UPDATE')!
    expect(update.sql).toContain('USING')
    expect(update.sql).toContain('WITH CHECK')
    expect(update.definition).toBeDefined()
    expect(update.check).toBeDefined()
  })

  test('returns empty array when no FK path to auth.users exists', () => {
    const unrelatedFK: ForeignKeyConstraint = {
      id: 2,
      source_schema: 'public',
      source_table: 'posts',
      source_columns: ['category_id'],
      target_schema: 'public',
      target_table: 'categories',
      target_columns: ['id'],
      deletion_action: 'NO ACTION',
      update_action: 'NO ACTION',
      constraint_name: 'posts_category_id_fkey',
    }
    const policies = generateProgrammaticPoliciesForTable({
      table: { name: 'posts', schema: 'public' },
      foreignKeyConstraints: [unrelatedFK],
    })
    expect(policies).toHaveLength(0)
  })

  test('returns empty array when foreignKeyConstraints is empty', () => {
    const policies = generateProgrammaticPoliciesForTable({
      table: { name: 'posts', schema: 'public' },
      foreignKeyConstraints: [],
    })
    expect(policies).toHaveLength(0)
  })

  test('generates policies via indirect FK path (2-hop through profiles table)', () => {
    // posts -> profiles -> auth.users (2-hop)
    const postsToProfiles: ForeignKeyConstraint = {
      id: 1,
      source_schema: 'public',
      source_table: 'posts',
      source_columns: ['profile_id'],
      target_schema: 'public',
      target_table: 'profiles',
      target_columns: ['id'],
      deletion_action: 'NO ACTION',
      update_action: 'NO ACTION',
      constraint_name: 'posts_profile_id_fkey',
    }
    const profilesToAuthUsers: ForeignKeyConstraint = {
      id: 2,
      source_schema: 'public',
      source_table: 'profiles',
      source_columns: ['user_id'],
      target_schema: 'auth',
      target_table: 'users',
      target_columns: ['id'],
      deletion_action: 'NO ACTION',
      update_action: 'NO ACTION',
      constraint_name: 'profiles_user_id_fkey',
    }
    const policies = generateProgrammaticPoliciesForTable({
      table: { name: 'posts', schema: 'public' },
      foreignKeyConstraints: [postsToProfiles, profilesToAuthUsers],
    })
    expect(policies).toHaveLength(4)
    // Indirect path uses EXISTS subquery
    expect(policies[0].sql).toContain('exists')
  })
})
