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

const AUDIT_LOG_KEY = 'coghealth_audit_log';
const MAX_LOG_ENTRIES = 1000;

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
  const event: AuditEvent = {
    id: generateId(),
    timestamp: new Date().toISOString(),
    eventType,
    userId: 'USR001',
    userName: 'Dr. Sarah Anderson',
    userRole: 'Physician',
    ipAddress: '192.168.1.100',
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

  const existingLog = getAuditLog();
  existingLog.unshift(event);
  
  if (existingLog.length > MAX_LOG_ENTRIES) {
    existingLog.splice(MAX_LOG_ENTRIES);
  }
  
  localStorage.setItem(AUDIT_LOG_KEY, JSON.stringify(existingLog));
  

}

export function getAuditLog(): AuditEvent[] {
  try {
    const log = localStorage.getItem(AUDIT_LOG_KEY);
    return log ? JSON.parse(log) : [];
  } catch {
    return [];
  }
}

export function clearAuditLog(): void {
  localStorage.removeItem(AUDIT_LOG_KEY);
}

export function getPatientAccessLog(patientId: string): AuditEvent[] {
  return getAuditLog().filter(
    event => event.patientId === patientId && event.eventType === 'PATIENT_ACCESS'
  );
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

export function logPrint(patientId?: string, documentType?: string, details?: string): void {
  logAuditEvent('PHI_PRINT', {
    patientId,
    resourceType: documentType,
    action: 'Print initiated',
    details,
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
