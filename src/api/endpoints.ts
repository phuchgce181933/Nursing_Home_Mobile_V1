export const AUTH = {
  LOGIN: '/api/auth/login',
  ME: '/api/auth/me',
  CHANGE_PASSWORD: '/api/auth/change-password',
  FORGOT_PASSWORD: '/api/auth/forgot-password',
  RESET_PASSWORD: '/api/auth/reset-password',
  UPDATE_PROFILE: '/api/auth/profile',
} as const;

export const STAFF = {
  LIST: '/api/staff',
  DETAIL: (id: string) => `/api/staff/${id}`,
  UPDATE: (id: string) => `/api/staff/${id}`,
  AVAILABILITY: '/api/staff/availability',
  FLOOR_COVERAGE: (floorId: string) => `/api/staff/floors/${floorId}/coverage`,
  ASSIGN_AREAS: (id: string) => `/api/staff/${id}/areas`,
  ASSIGN_RESIDENTS: (id: string) => `/api/staff/${id}/residents`,
  ASSIGNED_RESIDENTS: (id: string) => `/api/staff/${id}/residents/assigned`,
  AVAILABLE_RESIDENTS: (id: string) => `/api/staff/${id}/residents/available`,
} as const;

export const SHIFTS = {
  LIST: '/api/shifts',
  MY: '/api/shifts/my',
  DETAIL: (id: string) => `/api/shifts/${id}`,
  CREATE: '/api/shifts',
  UPDATE: (id: string) => `/api/shifts/${id}`,
  DELETE: (id: string) => `/api/shifts/${id}`,
  PUBLISH: (id: string) => `/api/shifts/${id}/publish`,
  CONFIRM: (id: string) => `/api/shifts/${id}/confirm`,
  CANCEL: (id: string) => `/api/shifts/${id}/cancel`,
  SCHEDULE: '/api/shifts/schedule',
  CHECK_CONFLICTS: '/api/shifts/check-conflicts',
} as const;

export const RESIDENTS = {
  LIST: '/api/residents',
  DETAIL: (id: string) => `/api/residents/${id}`,
  AREAS_SUMMARY: '/api/residents/areas/summary',
  BY_AREA: '/api/residents/by-area',
  MEDICAL_RECORDS: (residentId: string) => `/api/residents/${residentId}/medical-records`,
  FAMILY: (residentId: string) => `/api/residents/${residentId}/family`,
  INITIAL_HEALTH: (residentId: string) => `/api/residents/${residentId}/initial-health`,
  PRE_EXISTING: (residentId: string) => `/api/residents/${residentId}/pre-existing-conditions`,
  DRUG_ALLERGIES: (residentId: string) => `/api/residents/${residentId}/drug-allergies`,
  EMERGENCY_CONTACTS: (residentId: string) => `/api/residents/${residentId}/emergency-contacts`,
  TRANSFER: (residentId: string) => `/api/residents/${residentId}/transfer-room`,
  TRANSFER_TARGETS: (residentId: string) => `/api/residents/${residentId}/transfer-room/targets`,
} as const;

export const CARE_TASKS = {
  LIST: '/api/staff/care-tasks',
  DETAIL: (id: string) => `/api/staff/care-tasks/${id}`,
  CREATE: '/api/staff/care-tasks',
  DELETE: (id: string) => `/api/staff/care-tasks/${id}`,
  UPDATE_STATUS: (id: string) => `/api/staff/care-tasks/${id}/status`,
  BY_SHIFT: (shiftId: string) => `/api/staff/care-tasks/by-shift/${shiftId}`,
  ASSIGNMENT_CONTEXT: '/api/staff/care-tasks/assignment-context',
} as const;

export const CARE_SCHEDULES = {
  LIST: '/api/staff/care-schedules',
  DETAIL: (id: string) => `/api/staff/care-schedules/${id}`,
  CREATE_DRAFT: '/api/staff/care-schedules/drafts',
  UPDATE: (id: string) => `/api/staff/care-schedules/${id}`,
  DELETE: (id: string) => `/api/staff/care-schedules/${id}`,
  PUBLISH: (id: string) => `/api/staff/care-schedules/${id}/publish`,
  TEMPLATES: '/api/staff/care-schedules/templates',
} as const;

export const CAREGIVER = {
  CARE_TASKS: '/api/caregiver/care-tasks',
  CARE_TASK_DETAIL: (id: string) => `/api/caregiver/care-tasks/${id}`,
  CARE_TASK_STATUS: (id: string) => `/api/caregiver/care-tasks/${id}/status`,
  RESIDENTS: '/api/caregiver/residents',
  RESIDENT_DETAIL: (id: string) => `/api/caregiver/residents/${id}`,
  HYGIENE: '/api/caregiver/hygiene-activities',
  HYGIENE_DETAIL: (id: string) => `/api/caregiver/hygiene-activities/${id}`,
  HYGIENE_CONTEXT: '/api/caregiver/hygiene-activities/context',
  HYGIENE_RESIDENTS: '/api/caregiver/hygiene-activities/residents',
  MEAL_INTAKE: '/api/caregiver/meal-intake-notes',
  MEAL_INTAKE_DETAIL: (id: string) => `/api/caregiver/meal-intake-notes/${id}`,
  MEAL_INTAKE_CONTEXT: '/api/caregiver/meal-intake-notes/context',
  MEAL_INTAKE_RESIDENTS: '/api/caregiver/meal-intake-notes/residents',
  DAILY_BEHAVIORS: '/api/caregiver/daily-behaviors',
  DAILY_BEHAVIOR_DETAIL: (id: string) => `/api/caregiver/daily-behaviors/${id}`,
  DAILY_BEHAVIOR_RESIDENTS: '/api/caregiver/daily-behaviors/residents',
  DIET_PLANS: '/api/caregiver/diet-plans',
  DIET_PLAN_DETAIL: (residentId: string) => `/api/caregiver/diet-plans/${residentId}`,
  REHAB_SCHEDULES: '/api/caregiver/rehabilitation-schedules',
  REHAB_DETAIL: (residentId: string) => `/api/caregiver/rehabilitation-schedules/${residentId}`,
} as const;

export const MEDICATIONS = {
  DAILY_SCHEDULE: '/api/medications/schedule/daily',
  SCHEDULE: '/api/medications/schedule',
  SET_SCHEDULE: '/api/medications/schedule/set',
  MARK_TAKEN: (id: string) => `/api/medications/schedule/${id}/taken`,
  MARK_MISSED: (id: string) => `/api/medications/schedule/${id}/missed`,
  HISTORY: '/api/medications/history',
  AVAILABLE: '/api/medications/available',
  CURRENT: '/api/medications/current',
} as const;

export const CARE_NOTES = {
  LIST: '/api/care-notes',
  MY_NOTES: '/api/care-notes/my-notes',
  CREATE: '/api/care-notes',
  DETAIL: (id: string) => `/api/care-notes/${id}`,
  UPDATE: (id: string) => `/api/care-notes/${id}`,
  DELETE: (id: string) => `/api/care-notes/${id}`,
  HISTORY: (residentId: string) => `/api/care-notes/history/${residentId}`,
} as const;

export const INCIDENTS = {
  LIST: '/api/incidents',
  CREATE: '/api/incidents',
  DETAIL: (id: string) => `/api/incidents/${id}`,
  UPDATE_STATUS: (id: string) => `/api/incidents/${id}/status`,
  EXPORT: '/api/incidents/export',
} as const;

export const CARE_APPOINTMENTS = {
  LIST: '/api/care-appointments',
  MY: '/api/care-appointments/my',
  DAILY: '/api/care-appointments/daily',
  WEEKLY: '/api/care-appointments/weekly',
  CREATE: '/api/care-appointments',
  DETAIL: (id: string) => `/api/care-appointments/${id}`,
  UPDATE: (id: string) => `/api/care-appointments/${id}`,
  DELETE: (id: string) => `/api/care-appointments/${id}`,
  UPDATE_STATUS: (id: string) => `/api/care-appointments/${id}/status`,
  AVAILABLE_STAFF: '/api/care-appointments/available-staff',
} as const;

export const LEAVE_REQUESTS = {
  LIST: '/api/leave-requests',
  CREATE: '/api/leave-requests',
  DETAIL: (id: string) => `/api/leave-requests/${id}`,
  APPROVE: (id: string) => `/api/leave-requests/${id}/approve`,
  REJECT: (id: string) => `/api/leave-requests/${id}/reject`,
  CANCEL: (id: string) => `/api/leave-requests/${id}`,
  REPLACEMENT_CANDIDATES: (id: string) => `/api/leave-requests/${id}/replacement-candidates`,
} as const;

export const PRESCRIPTIONS = {
  LIST: '/api/prescriptions',
  CREATE: '/api/prescriptions',
  DETAIL: (id: string) => `/api/prescriptions/${id}`,
  UPDATE: (id: string) => `/api/prescriptions/${id}`,
  CANCEL: (id: string) => `/api/prescriptions/${id}/cancel`,
} as const;

export const FACILITIES = {
  BUILDINGS: '/api/facilities/buildings',
  FLOORS: '/api/facilities/floors',
  ROOMS: (floorId: string) => `/api/facilities/floors/${floorId}/rooms`,
  FLOOR_DETAIL: (floorId: string) => `/api/facilities/floors/${floorId}`,
  STATS: '/api/facilities/stats',
} as const;

export const FAMILY = {
  RESIDENTS: '/api/family/residents',
  RESIDENT_DETAIL: (id: string) => `/api/family/residents/${id}`,
  INVOICES: (residentId: string) => `/api/family/residents/${residentId}/invoices`,
  PAYMENT_URL: (residentId: string, invoiceId: string) => `/api/family/residents/${residentId}/invoices/${invoiceId}/payment-url`,
  BILLING_SUMMARY: (residentId: string) => `/api/family/residents/${residentId}/billing-summary`,
  WALLET_BALANCE: '/api/family/wallet/balance',
  WALLET_TOPUP: '/api/family/wallet/topup',
  WALLET_TOPUP_VERIFY: '/api/family/wallet/topup/verify',
  WALLET_TOPUP_CONFIRM: '/api/family/wallet/topup/confirm',
  WALLET_QR_PROXY: '/api/family/wallet/qr-proxy',
  VITALS: (residentId: string) => `/api/family/residents/${residentId}/vitals`,
  HEALTH_HISTORY: (residentId: string) => `/api/family/residents/${residentId}/health-history`,
  HEALTH_CHART: (residentId: string) => `/api/family/residents/${residentId}/health-chart`,
  CARE_NOTES: (residentId: string) => `/api/family/residents/${residentId}/care-notes`,
  MEDICATIONS: (residentId: string) => `/api/family/residents/${residentId}/medications`,
  PRESCRIPTIONS: (residentId: string) => `/api/family/residents/${residentId}/prescriptions`,
  DAILY_ACTIVITIES: (residentId: string) => `/api/family/residents/${residentId}/daily-activities`,
  CARE_SCHEDULE: (residentId: string) => `/api/family/residents/${residentId}/care-schedule`,
  CARE_APPOINTMENTS: (residentId: string) => `/api/family/residents/${residentId}/care-appointments`,
  ACTIVITIES: (residentId: string) => `/api/family/residents/${residentId}/activities`,
  REPORT: (residentId: string) => `/api/family/residents/${residentId}/report`,
  ADMISSIONS: '/api/family/admission-requests',
  ADMISSION_DETAIL: (id: string) => `/api/family/admission-requests/${id}`,
  ADMISSION_CANCEL: (id: string) => `/api/family/admission-requests/${id}/cancel`,
  TOURS: '/api/family/tours',
  TOUR_CANCEL: (id: string) => `/api/family/tours/${id}/cancel`,
  SUPPORT_REQUESTS: '/api/family/support-requests',
  SUPPORT_DETAIL: (id: string) => `/api/family/support-requests/${id}`,
  SUPPORT_CLOSE: (id: string) => `/api/family/support-requests/${id}/close`,
} as const;
