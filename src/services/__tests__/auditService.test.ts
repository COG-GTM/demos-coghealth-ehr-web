import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  logAuditEvent,
  getAuditLog,
  clearAuditLog,
  getPatientAccessLog,
  logPatientAccess,
  logPatientSearch,
  logPHIView,
  logPrint,
  logPrescription,
  logOrder,
  logLogout,
} from '../auditService'

describe('auditService', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    vi.clearAllMocks()
  })

  describe('logAuditEvent', () => {
    it('creates and stores an audit event', () => {
      logAuditEvent('LOGIN')

      const log = getAuditLog()
      expect(log).toHaveLength(1)
      expect(log[0].eventType).toBe('LOGIN')
      expect(log[0].userId).toBe('USR001')
      expect(log[0].userName).toBe('Dr. Sarah Anderson')
      expect(log[0].userRole).toBe('Physician')
      expect(log[0].success).toBe(true)
    })

    it('stores events with optional fields', () => {
      logAuditEvent('PATIENT_ACCESS', {
        patientId: 'P001',
        patientMrn: 'MRN001',
        patientName: 'John Smith',
        action: 'Opened chart',
        details: 'Full chart access',
        success: true,
      })

      const log = getAuditLog()
      expect(log[0].patientId).toBe('P001')
      expect(log[0].patientMrn).toBe('MRN001')
      expect(log[0].patientName).toBe('John Smith')
    })

    it('prepends new events to the log', () => {
      logAuditEvent('LOGIN')
      logAuditEvent('LOGOUT')

      const log = getAuditLog()
      expect(log).toHaveLength(2)
      expect(log[0].eventType).toBe('LOGOUT')
      expect(log[1].eventType).toBe('LOGIN')
    })

    it('generates unique ids and timestamps', () => {
      logAuditEvent('LOGIN')
      logAuditEvent('LOGIN')

      const log = getAuditLog()
      expect(log[0].id).not.toBe(log[1].id)
      expect(log[0].timestamp).toBeDefined()
    })

    it('defaults success to true', () => {
      logAuditEvent('LOGIN')
      expect(getAuditLog()[0].success).toBe(true)
    })

    it('allows setting success to false', () => {
      logAuditEvent('FAILED_LOGIN', { success: false })
      expect(getAuditLog()[0].success).toBe(false)
    })
  })

  describe('getAuditLog', () => {
    it('returns empty array when no logs exist', () => {
      expect(getAuditLog()).toEqual([])
    })

    it('returns empty array on corrupted data', () => {
      localStorage.setItem('coghealth_audit_log', 'invalid-json')
      expect(getAuditLog()).toEqual([])
    })
  })

  describe('clearAuditLog', () => {
    it('removes all audit log entries', () => {
      logAuditEvent('LOGIN')
      logAuditEvent('LOGOUT')
      expect(getAuditLog()).toHaveLength(2)

      clearAuditLog()
      expect(getAuditLog()).toEqual([])
    })
  })

  describe('getPatientAccessLog', () => {
    it('filters events by patient id and PATIENT_ACCESS type', () => {
      logAuditEvent('PATIENT_ACCESS', { patientId: 'P001' })
      logAuditEvent('PHI_VIEW', { patientId: 'P001' })
      logAuditEvent('PATIENT_ACCESS', { patientId: 'P002' })

      const accessLog = getPatientAccessLog('P001')
      expect(accessLog).toHaveLength(1)
      expect(accessLog[0].patientId).toBe('P001')
      expect(accessLog[0].eventType).toBe('PATIENT_ACCESS')
    })
  })

  describe('helper functions', () => {
    it('logPatientAccess logs a PATIENT_ACCESS event', () => {
      logPatientAccess('P001', 'MRN001', 'John Smith')

      const log = getAuditLog()
      expect(log[0].eventType).toBe('PATIENT_ACCESS')
      expect(log[0].patientId).toBe('P001')
      expect(log[0].patientMrn).toBe('MRN001')
      expect(log[0].patientName).toBe('John Smith')
    })

    it('logPatientSearch logs a PATIENT_SEARCH event', () => {
      logPatientSearch('Smith', 5)

      const log = getAuditLog()
      expect(log[0].eventType).toBe('PATIENT_SEARCH')
      expect(log[0].details).toContain('Smith')
      expect(log[0].details).toContain('5 results')
    })

    it('logPHIView logs a PHI_VIEW event', () => {
      logPHIView('P001', 'LabResult', 'LR001')

      const log = getAuditLog()
      expect(log[0].eventType).toBe('PHI_VIEW')
      expect(log[0].patientId).toBe('P001')
      expect(log[0].resourceType).toBe('LabResult')
      expect(log[0].resourceId).toBe('LR001')
    })

    it('logPrint logs a PHI_PRINT event', () => {
      logPrint('P001', 'LabReport')

      const log = getAuditLog()
      expect(log[0].eventType).toBe('PHI_PRINT')
      expect(log[0].patientId).toBe('P001')
    })

    it('logPrescription logs a PRESCRIPTION_CREATE event', () => {
      logPrescription('P001', 'Amoxicillin 500mg')

      const log = getAuditLog()
      expect(log[0].eventType).toBe('PRESCRIPTION_CREATE')
      expect(log[0].details).toBe('Amoxicillin 500mg')
    })

    it('logOrder logs an ORDER_CREATE event', () => {
      logOrder('P001', 'Lab', 'CBC with Diff')

      const log = getAuditLog()
      expect(log[0].eventType).toBe('ORDER_CREATE')
      expect(log[0].resourceType).toBe('Lab')
      expect(log[0].details).toBe('CBC with Diff')
    })

    it('logLogout logs a LOGOUT event for manual logout', () => {
      logLogout('manual')

      const log = getAuditLog()
      expect(log[0].eventType).toBe('LOGOUT')
      expect(log[0].action).toBe('User logged out')
    })

    it('logLogout logs a SESSION_TIMEOUT event for timeout', () => {
      logLogout('timeout')

      const log = getAuditLog()
      expect(log[0].eventType).toBe('SESSION_TIMEOUT')
      expect(log[0].action).toBe('Session timed out')
    })
  })
})
