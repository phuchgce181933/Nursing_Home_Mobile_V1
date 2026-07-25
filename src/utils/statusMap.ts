type StatusEntry = {
  i18nKey: string;
  bgColor: string;
  textColor: string;
  icon: string;
};

const map: Record<string, Omit<StatusEntry, 'i18nKey'>> = {
  // CareTask statuses
  pending:     { bgColor: '#FFEDD5', textColor: '#92400E', icon: 'clock-outline' },
  in_progress: { bgColor: '#FFEDD5', textColor: '#92400E', icon: 'progress-clock' },
  completed:   { bgColor: '#D1FAE5', textColor: '#065F46', icon: 'check-circle-outline' },
  skipped:     { bgColor: '#FEE2E2', textColor: '#991B1B', icon: 'skip-next-circle-outline' },
  missed:      { bgColor: '#FEE2E2', textColor: '#991B1B', icon: 'alert-circle-outline' },

  // Shift statuses
  draft:       { bgColor: '#FFEDD5', textColor: '#92400E', icon: 'file-edit-outline' },
  published:   { bgColor: '#DBEAFE', textColor: '#1E40AF', icon: 'send-outline' },
  confirmed:   { bgColor: '#D1FAE5', textColor: '#065F46', icon: 'check-decagram' },
  cancelled:   { bgColor: '#FEE2E2', textColor: '#991B1B', icon: 'close-circle-outline' },

  // MedicationSchedule statuses (uppercase)
  PENDING:     { bgColor: '#FFEDD5', textColor: '#92400E', icon: 'clock-outline' },
  TAKEN:       { bgColor: '#D1FAE5', textColor: '#065F46', icon: 'check-circle' },
  LATE_TAKEN:  { bgColor: '#DBEAFE', textColor: '#1E40AF', icon: 'clock-check-outline' },
  MISSED:      { bgColor: '#FEE2E2', textColor: '#991B1B', icon: 'close-circle' },
  SKIPPED:     { bgColor: '#FEE2E2', textColor: '#991B1B', icon: 'skip-next' },
  OVERDUE:     { bgColor: '#FFEDD5', textColor: '#92400E', icon: 'alert-outline' },

  // Incident statuses
  open:          { bgColor: '#FFEDD5', textColor: '#92400E', icon: 'alert-circle-outline' },
  investigating: { bgColor: '#FFEDD5', textColor: '#92400E', icon: 'magnify' },
  resolved:      { bgColor: '#D1FAE5', textColor: '#065F46', icon: 'check-circle-outline' },
  closed:        { bgColor: '#FEE2E2', textColor: '#991B1B', icon: 'lock-outline' },

  // Incident severity
  low:      { bgColor: '#D1FAE5', textColor: '#065F46', icon: 'information-outline' },
  medium:   { bgColor: '#FFEDD5', textColor: '#92400E', icon: 'alert-outline' },
  high:     { bgColor: '#FEE2E2', textColor: '#991B1B', icon: 'alert-circle' },
  critical: { bgColor: '#FEE2E2', textColor: '#991B1B', icon: 'alert-octagon' },

  // ResidentVisit statuses
  approved: { bgColor: '#D1FAE5', textColor: '#065F46', icon: 'check-circle-outline' },
  rejected: { bgColor: '#FEE2E2', textColor: '#991B1B', icon: 'close-circle-outline' },

  // Resident residencyStatus
  admitted:    { bgColor: '#D1FAE5', textColor: '#065F46', icon: 'account-check' },
  discharged:  { bgColor: '#FEE2E2', textColor: '#991B1B', icon: 'account-remove' },
  transferred: { bgColor: '#DBEAFE', textColor: '#1E40AF', icon: 'swap-horizontal' },
  inactive:    { bgColor: '#FEE2E2', textColor: '#991B1B', icon: 'account-off' },

  // Room statuses
  available:   { bgColor: '#D1FAE5', textColor: '#065F46', icon: 'door-open' },
  full:        { bgColor: '#DBEAFE', textColor: '#1E40AF', icon: 'door-closed' },
  maintenance: { bgColor: '#FFEDD5', textColor: '#92400E', icon: 'wrench-outline' },

  // CareNote types
  meal:         { bgColor: '#FFEDD5', textColor: '#92400E', icon: 'silverware-fork-knife' },
  activity:     { bgColor: '#DBEAFE', textColor: '#1E40AF', icon: 'run' },
  daily_living: { bgColor: '#D1FAE5', textColor: '#065F46', icon: 'home-heart' },
  health:       { bgColor: '#FEE2E2', textColor: '#991B1B', icon: 'heart-pulse' },
  general:      { bgColor: '#F0F0F0', textColor: '#374151', icon: 'note-text-outline' },

  // CareTask types
  morning_care:       { bgColor: '#FFEDD5', textColor: '#92400E', icon: 'weather-sunny' },
  medication:         { bgColor: '#DBEAFE', textColor: '#1E40AF', icon: 'pill' },
  physical_therapy:   { bgColor: '#D1FAE5', textColor: '#065F46', icon: 'human-handsup' },
  meal_assistance:    { bgColor: '#FFEDD5', textColor: '#92400E', icon: 'food' },
  evening_check:      { bgColor: '#DBEAFE', textColor: '#1E40AF', icon: 'weather-night' },
  emergency_response: { bgColor: '#FEE2E2', textColor: '#991B1B', icon: 'ambulance' },

  // Hygiene completion statuses
  partial:  { bgColor: '#FFEDD5', textColor: '#92400E', icon: 'circle-half-full' },
  refused:  { bgColor: '#FEE2E2', textColor: '#991B1B', icon: 'hand-back-left' },
  assisted: { bgColor: '#DBEAFE', textColor: '#1E40AF', icon: 'handshake-outline' },

  // Activity attendance statuses
  present:     { bgColor: '#D1FAE5', textColor: '#065F46', icon: 'account-check' },
  absent:      { bgColor: '#FEE2E2', textColor: '#991B1B', icon: 'account-remove' },
  late:        { bgColor: '#FFEDD5', textColor: '#92400E', icon: 'clock-alert-outline' },
  left_early:  { bgColor: '#DBEAFE', textColor: '#1E40AF', icon: 'exit-run' },

  // Activity participation levels
  active:  { bgColor: '#D1FAE5', textColor: '#065F46', icon: 'run-fast' },
  // partial already covered by Hygiene completion statuses above
  passive: { bgColor: '#F0F0F0', textColor: '#374151', icon: 'sleep' },
};

const fallback: Omit<StatusEntry, 'i18nKey'> = {
  bgColor: '#F0F0F0',
  textColor: '#374151',
  icon: 'help-circle-outline',
};

export const getStatusEntry = (status?: string | null): StatusEntry => {
  if (!status) return { ...fallback, i18nKey: '' };
  const entry = map[status] ?? fallback;
  return { ...entry, i18nKey: `status.${status}` };
};
