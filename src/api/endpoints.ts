export const AUTH = {
  LOGIN: '/api/auth/login',
  REGISTER_OTP: '/api/auth/register-otp',
  REGISTER_VERIFY: '/api/auth/register-verify',
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
  CHECK_IN: (id: string) => `/api/shifts/${id}/check-in`,
  CHECK_OUT: (id: string) => `/api/shifts/${id}/check-out`,
  CANCEL: (id: string) => `/api/shifts/${id}/cancel`,
  COMPLETE: (id: string) => `/api/shifts/${id}/complete`,
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
  // Chỉ các phòng có cư dân được phân công cho hộ lý đang đăng nhập.
  ROOMS: '/api/caregiver/residents/rooms',
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

export const NOTIFICATIONS = {
  LIST: '/api/notifications',
  CATEGORIES: '/api/notifications/categories',
  READ: (id: string) => `/api/notifications/${id}/read`,
  SETTINGS: '/api/notifications/settings',
  MARK_READ_BULK: '/api/notifications/mark-read',
  DELETE: (id: string) => `/api/notifications/${id}`,
  DELETE_BULK: '/api/notifications/delete',
  PUSH_TOKEN: '/api/notifications/push-token',
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
  // PayOS QR trong app cho một hoá đơn (song song với nạp ví) — trả JSON qrCode/checkoutUrl.
  INVOICE_PAYOS: (residentId: string, invoiceId: string) => `/api/family/residents/${residentId}/invoices/${invoiceId}/payos`,
  INVOICE_PAYOS_VERIFY: (residentId: string, invoiceId: string) => `/api/family/residents/${residentId}/invoices/${invoiceId}/payos/verify`,
  BILLING_SUMMARY: (residentId: string) => `/api/family/residents/${residentId}/billing-summary`,
  WALLET_BALANCE: '/api/family/wallet/balance',
  WALLET_TOPUP: '/api/family/wallet/topup',
  WALLET_TOPUP_VERIFY: '/api/family/wallet/topup/verify',
  WALLET_PAYMENT_INITIATE: '/api/family/wallet/payments/initiate',
  WALLET_PAYMENT_VERIFY: '/api/family/wallet/payments/verify',
  WALLET_TRANSACTIONS: '/api/family/wallet/transactions',
  WALLET_TRANSACTION_DETAIL: (transactionId: string) => `/api/family/wallet/transactions/${transactionId}`,
  VITALS: (residentId: string) => `/api/family/residents/${residentId}/vitals`,
  HEALTH_HISTORY: (residentId: string) => `/api/family/residents/${residentId}/health-history`,
  HEALTH_CHART: (residentId: string) => `/api/family/residents/${residentId}/health-chart`,
  CARE_NOTES: (residentId: string) => `/api/family/residents/${residentId}/care-notes`,
  MEDICATIONS: (residentId: string) => `/api/family/residents/${residentId}/medications`,
  DAILY_MEDICATION_SCHEDULE: (residentId: string) => `/api/family/residents/${residentId}/daily-medication-schedule`,
  MEDICATION_HISTORY: (residentId: string) => `/api/family/residents/${residentId}/medication-history`,
  PRESCRIPTIONS: (residentId: string) => `/api/family/residents/${residentId}/prescriptions`,
  DAILY_ACTIVITIES: (residentId: string) => `/api/family/residents/${residentId}/daily-activities`,
  CARE_SCHEDULE: (residentId: string) => `/api/family/residents/${residentId}/care-schedule`,
  CARE_APPOINTMENTS: (residentId: string) => `/api/family/residents/${residentId}/care-appointments`,
  ACTIVITIES: (residentId: string) => `/api/family/residents/${residentId}/activities`,
  REPORT: (residentId: string) => `/api/family/residents/${residentId}/report`,
  ADMISSIONS: '/api/family/admission-requests',
  ADMISSION_DETAIL: (id: string) => `/api/family/admission-requests/${id}`,
  ADMISSION_CANCEL: (id: string) => `/api/family/admission-requests/${id}/cancel`,
  PAY_INVOICE: (residentId: string, invoiceId: string) => `/api/residents/${residentId}/invoices/${invoiceId}/pay`,
  BATCH_PAY_INVOICES: (residentId: string) => `/api/residents/${residentId}/invoices/batch-pay`,
  TOURS: '/api/family/tours',
  TOUR_CANCEL: (id: string) => `/api/family/tours/${id}/cancel`,
  SUPPORT_REQUESTS: '/api/family/support-requests',
  SUPPORT_DETAIL: (id: string) => `/api/family/support-requests/${id}`,
  SUPPORT_CLOSE: (id: string) => `/api/family/support-requests/${id}/close`,
  SUPPORT_MESSAGES: (id: string) => `/api/family/support-requests/${id}/messages`,
  VISITS: '/api/family/visits',
  VISIT_CANCEL: (id: string) => `/api/family/visits/${id}/cancel`,
  RESIDENT_PHOTOS: (residentId: string) => `/api/family/residents/${residentId}/photos`,
} as const;

export const PUBLIC_ADMISSIONS = {
  SUBMIT: '/api/public/admission-requests',
} as const;

export const CONSULTATION = {
  SUBMIT: '/api/consultation-requests',
} as const;

export const MEDICAL_SERVICE_PACKAGES = {
  LIST: '/api/medical/service-packages',
  DETAIL: (id: string) => `/api/medical/service-packages/${id}`,
} as const;

export const STAFF_VISITS = {
  LIST: '/api/resident-visits',
  APPROVE: (id: string) => `/api/resident-visits/${id}/approve`,
  REJECT: (id: string) => `/api/resident-visits/${id}/reject`,
} as const;

export const CONVERSATIONS = {
  LIST: '/api/conversations',
  CREATE: '/api/conversations',
  DETAIL: (id: string) => `/api/conversations/${id}`,
  MESSAGES: (id: string) => `/api/conversations/${id}/messages`,
  MARK_READ: (id: string) => `/api/conversations/${id}/messages/read`,
  SEARCH: '/api/conversations/search',
  STAFF_DIRECTORY: '/api/conversations/staff-directory',
  GUEST_CREATE: '/api/conversations/guest',
  GUEST_MESSAGES: (id: string) => `/api/conversations/guest/${id}/messages`,
} as const;

export const ACTIVITIES = {
  LIST: '/api/admin/activities',
  DETAIL: (id: string) => `/api/admin/activities/${id}`,
  RECORD_RESULT: (id: string) => `/api/admin/activities/${id}/record-result`,
} as const;

export const MEAL_PLANS = {
  TEMPLATES: '/api/nurse/meal-plans/templates',
  RESIDENTS: '/api/nurse/meal-plans/residents',
  LIST: '/api/nurse/meal-plans',
  DETAIL: (id: string) => `/api/nurse/meal-plans/${id}`,
  CREATE_DRAFT: '/api/nurse/meal-plans/drafts',
  UPDATE: (id: string) => `/api/nurse/meal-plans/${id}`,
  DELETE: (id: string) => `/api/nurse/meal-plans/${id}`,
  PUBLISH: (id: string) => `/api/nurse/meal-plans/${id}/publish`,
} as const;

export const MEAL_TIME_SCHEDULES = {
  TEMPLATES: '/api/nurse/meal-time-schedules/templates',
  RESIDENTS: '/api/nurse/meal-time-schedules/residents',
  PUBLISHED_TIMES: '/api/nurse/meal-time-schedules/published-times',
  LIST: '/api/nurse/meal-time-schedules',
  DETAIL: (id: string) => `/api/nurse/meal-time-schedules/${id}`,
  CREATE_DRAFT: '/api/nurse/meal-time-schedules/drafts',
  UPDATE: (id: string) => `/api/nurse/meal-time-schedules/${id}`,
  DELETE: (id: string) => `/api/nurse/meal-time-schedules/${id}`,
  PUBLISH: (id: string) => `/api/nurse/meal-time-schedules/${id}/publish`,
} as const;

export const SPECIAL_DIETS = {
  TEMPLATES: '/api/nurse/special-diets/templates',
  RESIDENTS: '/api/nurse/special-diets/residents',
  LIST: '/api/nurse/special-diets',
  DETAIL: (id: string) => `/api/nurse/special-diets/${id}`,
  CREATE_DRAFT: '/api/nurse/special-diets/drafts',
  UPDATE: (id: string) => `/api/nurse/special-diets/${id}`,
  DELETE: (id: string) => `/api/nurse/special-diets/${id}`,
  PUBLISH: (id: string) => `/api/nurse/special-diets/${id}/publish`,
} as const;

export const NUTRITION_REPORTS = {
  SUMMARY: '/api/nurse/nutrition-reports/summary',
  RESIDENTS: '/api/nurse/nutrition-reports/residents',
  RESIDENT_DETAIL: (id: string) => `/api/nurse/nutrition-reports/residents/${id}`,
} as const;

export const ADMIN_ADMISSIONS = {
  LIST: '/api/admin/admission-requests',
  DETAIL: (id: string) => `/api/admin/admission-requests/${id}`,
} as const;

export const MEDICAL_ADMISSIONS = {
  CONSULTATION: (id: string) => `/api/medical/admission-requests/${id}/consultation`,
  SCHEDULE_ASSESSMENT: (id: string) => `/api/medical/admission-requests/${id}/schedule-assessment`,
  EVALUATE_ELIGIBILITY: (id: string) => `/api/medical/admission-requests/${id}/evaluate-eligibility`,
} as const;
