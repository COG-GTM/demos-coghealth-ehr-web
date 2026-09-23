import { api } from './api';

export type AuditEventType = 
  | 'LOGIN'
  | 'LOGOUT'
  | 'SESSION_TIMEOUT'
  | 'PATIENT_ACCESS'
  | 'PATIENT_SEARCH'
  | 'PHI_VIEW'
  | 'PHI_PRINT'
  | 'PHI_EXPORT'
  | 'ORDER_CREATE'
  | 'ORDER_SIGN'
  | 'NOTE_CREATE'
  | 'NOTE_SIGN'
  | 'PRESCRIPTION_CREATE'
  | 'SETTINGS_CHANGE'
  | 'FAILED_LOGIN';

export interface AuditEventInput {
  patientId?: string;
  resourceType?: string;
  resourceId?: string;
  action?: string;
  details?: string;
  success?: boolean;
}

export interface AuditEvent {
  id: string;
  timestamp: string;
  eventType: AuditEventType;
  userId: string;
  userName: string;
  userRole: string;
  ipAddress: string;
  sessionId: string;
  patientId?: string;
  resourceType?: string;
  resourceId?: string;
  action?: string;
  details?: string;
  success: boolean;
}

const AUDIT_ENDPOINT = '/audit/events';
const LEGACY_AUDIT_LOG_KEY = 'coghealth_audit_log';

export function purgeLegacyClientAuditLog(): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.removeItem(LEGACY_AUDIT_LOG_KEY);
}

purgeLegacyClientAuditLog();

export async function submitAuditEvent(
  eventType: AuditEventType,
  options: AuditEventInput = {}
): Promise<void> {
  await api.post(AUDIT_ENDPOINT, {
    eventType,
    occurredAt: new Date().toISOString(),
    patientId: options.patientId,
    resourceType: options.resourceType,
    resourceId: options.resourceId,
    action: options.action,
    details: options.details,
    success: options.success ?? true,
  });
}

export function logAuditEvent(eventType: AuditEventType, options: AuditEventInput = {}): void {
  void submitAuditEvent(eventType, options).catch(() => {
    console.error(`Failed to record audit event: ${eventType}`);
  });
}

export function getPatientAccessLog(patientId: string): Promise<AuditEvent[]> {
  return api.get<AuditEvent[]>(AUDIT_ENDPOINT, {
    patientId,
    eventType: 'PATIENT_ACCESS',
  });
}

export function logPatientAccess(patientId: string): void {
  logAuditEvent('PATIENT_ACCESS', {
    patientId,
    action: 'Opened patient chart',
  });
}

export function logPatientSearch(resultCount: number): void {
  logAuditEvent('PATIENT_SEARCH', {
    action: 'Patient search',
    details: `${resultCount} results`,
  });
}

export function logPHIView(patientId: string, resourceType: string, resourceId: string): void {
  logAuditEvent('PHI_VIEW', {
    patientId,
    resourceType,
    resourceId,
    action: `Viewed ${resourceType}`,
  });
}

export function logPrint(patientId?: string, documentType?: string): void {
  logAuditEvent('PHI_PRINT', {
    patientId,
    resourceType: documentType,
    action: 'Print initiated',
  });
}

export function logPrescription(patientId: string, medication: string): void {
  logAuditEvent('PRESCRIPTION_CREATE', {
    patientId,
    action: 'Prescription created',
    details: medication,
  });
}

export function logOrder(patientId: string, orderType: string, orderDetails: string): void {
  logAuditEvent('ORDER_CREATE', {
    patientId,
    resourceType: orderType,
    action: 'Order created',
    details: orderDetails,
  });
}

export function logLogout(reason: 'manual' | 'timeout' = 'manual'): void {
  logAuditEvent(reason === 'timeout' ? 'SESSION_TIMEOUT' : 'LOGOUT', {
    action: reason === 'timeout' ? 'Session timed out' : 'User logged out',
  });
}
