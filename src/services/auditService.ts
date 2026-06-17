import { getCurrentUser } from './authContext';
import { enqueueAuditEvent } from './auditQueue';

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
  | 'FAILED_LOGIN'
  | 'PHI_ACCESS_JUSTIFIED';

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
  patientMrn?: string;
  patientName?: string;
  resourceType?: string;
  resourceId?: string;
  action?: string;
  details?: string;
  success: boolean;
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function getSessionId(): string {
  let sessionId = sessionStorage.getItem('coghealth_session_id');
  if (!sessionId) {
    sessionId = generateId();
    sessionStorage.setItem('coghealth_session_id', sessionId);
  }
  return sessionId;
}

export function logAuditEvent(
  eventType: AuditEventType,
  options: {
    patientId?: string;
    patientMrn?: string;
    patientName?: string;
    resourceType?: string;
    resourceId?: string;
    action?: string;
    details?: string;
    success?: boolean;
  } = {}
): void {
  const user = getCurrentUser();
  const event: AuditEvent = {
    id: generateId(),
    timestamp: new Date().toISOString(),
    eventType,
    userId: user.userId,
    userName: user.userName,
    userRole: user.userRole,
    ipAddress: user.ipAddress,
    sessionId: getSessionId(),
    patientId: options.patientId,
    patientMrn: options.patientMrn,
    patientName: options.patientName,
    resourceType: options.resourceType,
    resourceId: options.resourceId,
    action: options.action,
    details: options.details,
    success: options.success ?? true,
  };

  enqueueAuditEvent(event);
}

export function logPatientAccess(patientId: string, patientMrn: string, patientName: string): void {
  logAuditEvent('PATIENT_ACCESS', {
    patientId,
    patientMrn,
    patientName,
    action: 'Opened patient chart',
  });
}

export function logPatientSearch(query: string, resultCount: number): void {
  logAuditEvent('PATIENT_SEARCH', {
    action: 'Patient search',
    details: `Query: "${query}" - ${resultCount} results`,
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

export function logLogin(): void {
  logAuditEvent('LOGIN', {
    action: 'User logged in',
  });
}

export function logFailedLogin(attemptedUserId?: string): void {
  logAuditEvent('FAILED_LOGIN', {
    action: 'Failed login attempt',
    details: attemptedUserId ? `Attempted user: ${attemptedUserId}` : undefined,
    success: false,
  });
}

export function logPHIAccessJustification(
  patientId: string,
  reason: string,
  details?: string
): void {
  logAuditEvent('PHI_ACCESS_JUSTIFIED', {
    patientId,
    action: 'PHI access justified',
    details: details ? `${reason}: ${details}` : reason,
  });
}
