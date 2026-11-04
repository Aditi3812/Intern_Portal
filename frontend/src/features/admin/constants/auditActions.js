export const AUDIT_ACTIONS = [
  'LOGIN',
  'LOGIN_FAILED',
  'LOGOUT',
  'USER_CREATED',
  'PASSWORD_RESET_REQUESTED',
  'PASSWORD_RESET_COMPLETED',
  'REQUEST_SUBMITTED',
  'REQUEST_FORWARDED',
  'REQUEST_REJECTED',
  'REQUEST_APPROVED',
  'CERTIFICATE_DRAFT_CREATED',
  'CERTIFICATE_EDITED',
  'CERTIFICATE_FINALIZED',
  'CERTIFICATE_REVOKED',
  'TEMPLATE_CREATED',
  'TEMPLATE_UPDATED',
  'TEMPLATE_TOGGLED',
  'RETENTION_POLICY_UPDATED',
  'INTERN_ARCHIVED',
  'INTERN_ARCHIVE_WARNING_SENT',
  'INTERN_PURGED',
  'INTERN_RESTORED',
  'EXPORT',
  'EXPORT_ANALYTICS',
];

export const AUDIT_TARGET_TYPES = [
  'user',
  'certificate_request',
  'certificate',
  'certificate_template',
  'retention_policy',
  'audit_log',
  'analytics',
  'internship',
];

export const AUDIT_ACTOR_ROLES = ['admin', 'teamleader', 'intern', 'system'];
