import { describe, expect, test } from 'vitest'

import { PipelineStatusName } from '@/components/interfaces/Database/Replication/Replication.constants'
import {
  getPipelineDisplayState,
  getStatusName,
  normalizePipelineStatusName,
} from '@/components/interfaces/Database/Replication/Pipeline.utils'
import { PipelineStatusRequestStatus } from '@/state/replication-pipeline-request-status'

describe('normalizePipelineStatusName', () => {
  test('returns PipelineStatusName for each valid status string', () => {
    expect(normalizePipelineStatusName('failed')).toBe(PipelineStatusName.FAILED)
    expect(normalizePipelineStatusName('starting')).toBe(PipelineStatusName.STARTING)
    expect(normalizePipelineStatusName('started')).toBe(PipelineStatusName.STARTED)
    expect(normalizePipelineStatusName('stopped')).toBe(PipelineStatusName.STOPPED)
    expect(normalizePipelineStatusName('stopping')).toBe(PipelineStatusName.STOPPING)
    expect(normalizePipelineStatusName('unknown')).toBe(PipelineStatusName.UNKNOWN)
  })

  test('returns undefined for an unrecognized string', () => {
    expect(normalizePipelineStatusName('running')).toBeUndefined()
    expect(normalizePipelineStatusName('FAILED')).toBeUndefined()
    expect(normalizePipelineStatusName('')).toBeUndefined()
    expect(normalizePipelineStatusName('pending')).toBeUndefined()
  })

  test('returns undefined when called with undefined', () => {
    expect(normalizePipelineStatusName(undefined)).toBeUndefined()
  })
})

describe('getStatusName', () => {
  test('returns the normalized status name for a valid status object', () => {
    expect(getStatusName({ name: 'started' })).toBe(PipelineStatusName.STARTED)
    expect(getStatusName({ name: 'failed' })).toBe(PipelineStatusName.FAILED)
    expect(getStatusName({ name: 'stopped' })).toBe(PipelineStatusName.STOPPED)
  })

  test('returns undefined for an unrecognized name inside status object', () => {
    expect(getStatusName({ name: 'unknown_status' })).toBeUndefined()
  })

  test('returns undefined when status is undefined', () => {
    expect(getStatusName(undefined)).toBeUndefined()
  })

  test('returns undefined when status is null', () => {
    expect(getStatusName(null as any)).toBeUndefined()
  })

  test('returns undefined when status is a non-object primitive', () => {
    expect(getStatusName('started' as any)).toBeUndefined()
    expect(getStatusName(42 as any)).toBeUndefined()
  })

  test('returns undefined when status object has no name property', () => {
    expect(getStatusName({} as any)).toBeUndefined()
  })
})

describe('getPipelineDisplayState', () => {
  describe('requestStatus takes priority over statusName', () => {
    test('returns restarting when RestartRequested regardless of statusName', () => {
      const state = getPipelineDisplayState(
        PipelineStatusRequestStatus.RestartRequested,
        PipelineStatusName.STARTED
      )
      expect(state.key).toBe('restarting')
      expect(state.type).toBe('loading')
    })

    test('returns starting when StartRequested regardless of statusName', () => {
      const state = getPipelineDisplayState(
        PipelineStatusRequestStatus.StartRequested,
        PipelineStatusName.STOPPED
      )
      expect(state.key).toBe('starting')
      expect(state.type).toBe('loading')
    })

    test('returns stopping when StopRequested regardless of statusName', () => {
      const state = getPipelineDisplayState(
        PipelineStatusRequestStatus.StopRequested,
        PipelineStatusName.STARTED
      )
      expect(state.key).toBe('stopping')
      expect(state.type).toBe('loading')
    })
  })

  describe('statusName determines state when requestStatus is None or absent', () => {
    test('returns starting for STARTING status', () => {
      const state = getPipelineDisplayState(
        PipelineStatusRequestStatus.None,
        PipelineStatusName.STARTING
      )
      expect(state.key).toBe('starting')
      expect(state.type).toBe('loading')
    })

    test('returns failed for FAILED status', () => {
      const state = getPipelineDisplayState(
        PipelineStatusRequestStatus.None,
        PipelineStatusName.FAILED
      )
      expect(state.key).toBe('failed')
      expect(state.type).toBe('failure')
    })

    test('returns stopped for STOPPED status', () => {
      const state = getPipelineDisplayState(
        PipelineStatusRequestStatus.None,
        PipelineStatusName.STOPPED
      )
      expect(state.key).toBe('stopped')
      expect(state.type).toBe('idle')
    })

    test('returns running for STARTED status', () => {
      const state = getPipelineDisplayState(
        PipelineStatusRequestStatus.None,
        PipelineStatusName.STARTED
      )
      expect(state.key).toBe('running')
      expect(state.type).toBe('success')
    })

    test('returns stopping for STOPPING status', () => {
      const state = getPipelineDisplayState(
        PipelineStatusRequestStatus.None,
        PipelineStatusName.STOPPING
      )
      expect(state.key).toBe('stopping')
      expect(state.type).toBe('loading')
    })

    test('returns unknown for UNKNOWN status', () => {
      const state = getPipelineDisplayState(
        PipelineStatusRequestStatus.None,
        PipelineStatusName.UNKNOWN
      )
      expect(state.key).toBe('unknown')
      expect(state.type).toBe('idle')
    })
  })

  describe('default/fallback cases', () => {
    test('returns unknown when both arguments are absent', () => {
      const state = getPipelineDisplayState()
      expect(state.key).toBe('unknown')
      expect(state.type).toBe('idle')
    })

    test('returns unknown when statusName is undefined and requestStatus is None', () => {
      const state = getPipelineDisplayState(PipelineStatusRequestStatus.None, undefined)
      expect(state.key).toBe('unknown')
      expect(state.type).toBe('idle')
    })
  })

  describe('display state shape', () => {
    test('every state has the required fields', () => {
      const states = [
        getPipelineDisplayState(PipelineStatusRequestStatus.RestartRequested),
        getPipelineDisplayState(PipelineStatusRequestStatus.StartRequested),
        getPipelineDisplayState(PipelineStatusRequestStatus.StopRequested),
        getPipelineDisplayState(PipelineStatusRequestStatus.None, PipelineStatusName.FAILED),
        getPipelineDisplayState(PipelineStatusRequestStatus.None, PipelineStatusName.STOPPED),
        getPipelineDisplayState(PipelineStatusRequestStatus.None, PipelineStatusName.STARTED),
        getPipelineDisplayState(PipelineStatusRequestStatus.None, PipelineStatusName.UNKNOWN),
      ]

      for (const state of states) {
        expect(state).toHaveProperty('key')
        expect(state).toHaveProperty('label')
        expect(state).toHaveProperty('title')
        expect(state).toHaveProperty('message')
        expect(state).toHaveProperty('badge')
        expect(state).toHaveProperty('type')
        expect(typeof state.key).toBe('string')
        expect(typeof state.label).toBe('string')
        expect(typeof state.message).toBe('string')
      }
    })
  })
})
