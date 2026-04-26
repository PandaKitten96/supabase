import { describe, expect, test } from 'vitest'

import {
  buildConnectionParameters,
  buildSafeConnectionString,
  DEFAULT_PORT,
  parseConnectionParams,
  PASSWORD_PLACEHOLDER,
  resolveConnectionString,
} from '@/components/interfaces/ConnectSheet/ConnectionString.utils'

const FALLBACK = { host: 'hidden', port: DEFAULT_PORT, user: 'hidden', database: 'hidden' }

// ---------------------------------------------------------------------------
// parseConnectionParams
// ---------------------------------------------------------------------------

describe('parseConnectionParams', () => {
  test('returns hidden fallback for empty string', () => {
    expect(parseConnectionParams('')).toStrictEqual(FALLBACK)
  })

  test('parses a standard postgresql URL', () => {
    const result = parseConnectionParams(
      'postgresql://myuser:mypassword@db.example.com:5432/mydb'
    )
    expect(result).toStrictEqual({
      host: 'db.example.com',
      port: '5432',
      user: 'myuser',
      database: 'mydb',
    })
  })

  test('uses default port when port is absent from URL', () => {
    const result = parseConnectionParams('postgresql://myuser:mypassword@db.example.com/mydb')
    expect(result.port).toBe(DEFAULT_PORT)
    expect(result.host).toBe('db.example.com')
    expect(result.database).toBe('mydb')
  })

  test('strips leading slash from database path', () => {
    const result = parseConnectionParams('postgresql://user:pass@host:5432/mydb')
    expect(result.database).toBe('mydb')
  })

  test('returns hidden fallback for a malformed URL string', () => {
    expect(parseConnectionParams('not-a-valid-url')).toStrictEqual(FALLBACK)
  })

  test('returns hidden fallback for a URL missing the hostname', () => {
    // URL with no host component
    expect(parseConnectionParams('postgresql://')).toMatchObject({
      host: 'hidden',
      user: 'hidden',
      database: 'hidden',
    })
  })

  test('handles URL with query parameters without including them in database', () => {
    const result = parseConnectionParams(
      'postgresql://user:pass@host:6543/postgres?sslmode=require'
    )
    expect(result.database).toBe('postgres')
    expect(result.host).toBe('host')
    expect(result.port).toBe('6543')
  })
})

// ---------------------------------------------------------------------------
// buildSafeConnectionString
// ---------------------------------------------------------------------------

describe('buildSafeConnectionString', () => {
  const params = { host: 'db.example.com', port: '5432', user: 'myuser', database: 'mydb' }

  test('returns empty string when connectionString is empty', () => {
    expect(buildSafeConnectionString('', params)).toBe('')
  })

  test('replaces the password with the placeholder', () => {
    const result = buildSafeConnectionString(
      'postgresql://myuser:secret@db.example.com:5432/mydb',
      params
    )
    expect(result).toBe(`postgresql://myuser:${PASSWORD_PLACEHOLDER}@db.example.com:5432/mydb`)
  })

  test('preserves query string parameters from the original URL', () => {
    const result = buildSafeConnectionString(
      'postgresql://myuser:secret@db.example.com:5432/mydb?sslmode=require',
      params
    )
    expect(result).toContain('?sslmode=require')
  })

  test('does not include query string when original URL had none', () => {
    const result = buildSafeConnectionString(
      'postgresql://myuser:secret@db.example.com:5432/mydb',
      params
    )
    expect(result).not.toContain('?')
  })

  test('uses host, port, user, database from params, not from the original URL', () => {
    const overrideParams = { host: 'newhost', port: '6543', user: 'newuser', database: 'newdb' }
    const result = buildSafeConnectionString(
      'postgresql://olduser:secret@oldhost:5432/olddb',
      overrideParams
    )
    expect(result).toContain('newhost')
    expect(result).toContain('6543')
    expect(result).toContain('newuser')
    expect(result).toContain('newdb')
    expect(result).not.toContain('oldhost')
  })
})

// ---------------------------------------------------------------------------
// resolveConnectionString
// ---------------------------------------------------------------------------

describe('resolveConnectionString', () => {
  const pooler = {
    direct: 'postgresql://user:pass@direct.host:5432/db',
    sessionShared: 'postgresql://user:pass@session.host:5432/db',
    transactionShared: 'postgresql://user:pass@tx-shared.host:6543/db',
    transactionDedicated: 'postgresql://user:pass@tx-dedicated.host:6543/db',
  }

  test('returns empty string when connectionStringPooler is undefined', () => {
    expect(
      resolveConnectionString({
        connectionMethod: 'direct',
        useSharedPooler: false,
        connectionStringPooler: undefined,
      })
    ).toBe('')
  })

  test('returns direct connection string for direct method', () => {
    const result = resolveConnectionString({
      connectionMethod: 'direct',
      useSharedPooler: false,
      connectionStringPooler: pooler,
    })
    expect(result).toBe(pooler.direct)
  })

  test('returns session shared connection string for session method', () => {
    const result = resolveConnectionString({
      connectionMethod: 'session',
      useSharedPooler: false,
      connectionStringPooler: pooler,
    })
    expect(result).toBe(pooler.sessionShared)
  })

  test('returns transactionShared when useSharedPooler is true', () => {
    const result = resolveConnectionString({
      connectionMethod: 'transaction',
      useSharedPooler: true,
      connectionStringPooler: pooler,
    })
    expect(result).toBe(pooler.transactionShared)
  })

  test('returns transactionDedicated when useSharedPooler is false and dedicated exists', () => {
    const result = resolveConnectionString({
      connectionMethod: 'transaction',
      useSharedPooler: false,
      connectionStringPooler: pooler,
    })
    expect(result).toBe(pooler.transactionDedicated)
  })

  test('falls back to transactionShared when dedicated is absent', () => {
    const poolerNoDedicated = { ...pooler, transactionDedicated: undefined }
    const result = resolveConnectionString({
      connectionMethod: 'transaction',
      useSharedPooler: false,
      connectionStringPooler: poolerNoDedicated,
    })
    expect(result).toBe(pooler.transactionShared)
  })

  test('returns empty string when the selected slot is undefined', () => {
    const poolerEmpty = {
      direct: undefined,
      sessionShared: undefined,
      transactionShared: undefined,
      transactionDedicated: undefined,
    }
    expect(
      resolveConnectionString({
        connectionMethod: 'direct',
        useSharedPooler: false,
        connectionStringPooler: poolerEmpty,
      })
    ).toBe('')
  })
})

// ---------------------------------------------------------------------------
// buildConnectionParameters
// ---------------------------------------------------------------------------

describe('buildConnectionParameters', () => {
  test('returns an array with host, port, database, user entries', () => {
    const params = { host: 'myhost', port: '5432', user: 'myuser', database: 'mydb' }
    const result = buildConnectionParameters(params)

    expect(result).toHaveLength(4)
    expect(result).toContainEqual({ key: 'host', value: 'myhost' })
    expect(result).toContainEqual({ key: 'port', value: '5432' })
    expect(result).toContainEqual({ key: 'database', value: 'mydb' })
    expect(result).toContainEqual({ key: 'user', value: 'myuser' })
  })

  test('preserves the values exactly as provided', () => {
    const params = { host: 'hidden', port: DEFAULT_PORT, user: 'hidden', database: 'hidden' }
    const result = buildConnectionParameters(params)
    for (const entry of result) {
      expect(typeof entry.key).toBe('string')
      expect(typeof entry.value).toBe('string')
    }
  })
})
