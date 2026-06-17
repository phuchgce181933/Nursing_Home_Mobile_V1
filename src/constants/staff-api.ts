import { API_BASE_URL } from './api';

const S = `${API_BASE_URL}/api/staff`;

export const STAFF_DASHBOARD_URL         = `${S}/dashboard`;
export const STAFF_ALERTS_URL            = `${S}/alerts`;
export const STAFF_SHIFT_URL             = `${S}/shift`;
export const STAFF_RESIDENTS_URL         = `${S}/residents`;
export const getResidentUrl              = (id: string) => `${S}/residents/${id}`;
export const STAFF_ASSIGNMENTS_URL       = `${S}/shift-assignments`;
export const STAFF_REPORTS_URL           = `${S}/shift-reports`;
export const STAFF_VITALS_URL            = `${S}/vitals`;
export const getVitalsUrl                = (residentId: string) => `${S}/vitals/${residentId}`;
export const STAFF_MEDICATIONS_URL       = `${S}/medications`;
export const getMedicationUrl            = (id: string) => `${S}/medications/${id}`;
export const STAFF_CARE_NOTES_URL        = `${S}/care-notes`;
export const STAFF_CHORES_URL            = `${S}/chores`;
export const STAFF_CHORES_BULK_URL       = `${S}/chores/bulk`;
export const STAFF_ROOMS_URL             = `${S}/rooms`;
export const getRoomUrl                  = (id: string) => `${S}/rooms/${id}/status`;
export const STAFF_MEALS_URL             = `${S}/meal-assignments`;
export const STAFF_MEAL_CONFIRM_URL      = `${S}/meal-confirmations`;
export const STAFF_NOTIFICATIONS_URL     = `${S}/notifications`;
export const STAFF_SHIFT_SUMMARY_URL     = `${S}/shift-summary`;
