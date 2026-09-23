import { createNavigationContainerRef } from '@react-navigation/native';

// Global navigation ref so code outside the React tree (a push-notification tap handler that
// may fire while the app is cold-starting from a terminated state) can drive navigation once
// the container is ready.
export const navigationRef = createNavigationContainerRef<any>();

type NestedTarget = { tab: string; screen: string };

// Allowlisted mapping từ loại thực thể (server gửi trong data.targetEntityType) → màn hình được
// phép mở, theo TỪNG vai trò. KHÔNG bao giờ điều hướng theo tên route tùy ý do payload cung cấp
// (PART 15): payload chỉ chọn được một trong các đích đã liệt kê sẵn dưới đây. Loại không có trong
// allowlist (hoặc sai vai trò) sẽ rơi về màn hình Thông báo an toàn của vai trò đó.
const ROUTE_ALLOWLIST: Record<string, Record<string, NestedTarget>> = {
  nurse: {
    MedicationSchedule: { tab: 'Medications', screen: 'MedMain' },
    Incident: { tab: 'Dashboard', screen: 'IncidentScreen' },
    CareAppointment: { tab: 'Dashboard', screen: 'CareAppointments' },
    Activity: { tab: 'Dashboard', screen: 'Activities' },
    CareTask: { tab: 'Dashboard', screen: 'CareTasks' },
  },
  family: {
    Activity: { tab: 'Health', screen: 'Activities' },
    CareAppointment: { tab: 'Health', screen: 'Appointments' },
    MedicalRecord: { tab: 'Health', screen: 'HealthMain' },
    Invoice: { tab: 'Invoices', screen: 'InvoiceList' },
    Payment: { tab: 'Wallet', screen: 'WalletMain' },
  },
  caregiver: {
    CareTask: { tab: 'Home', screen: 'TaskList' },
  },
};

// Màn hình Thông báo — mọi vai trò đều có, dùng làm đích an toàn khi không map được (PART 15).
const NOTIFICATIONS_FALLBACK: Record<string, NestedTarget> = {
  nurse: { tab: 'Dashboard', screen: 'Notifications' },
  family: { tab: 'Home', screen: 'Notifications' },
  caregiver: { tab: 'Home', screen: 'Notifications' },
};

// Điều hướng khi người dùng chạm vào push. role suy ra từ phiên đăng nhập hiện tại (server-side
// trust), targetEntityType lấy từ payload nhưng chỉ được dùng để TRA trong allowlist. Nếu không
// khớp hoặc container chưa sẵn sàng thì mở danh sách Thông báo (hoặc bỏ qua nếu chưa sẵn sàng).
export const handleNotificationNavigation = (
  role: string | undefined,
  data: { targetEntityType?: unknown } | undefined,
) => {
  if (!navigationRef.isReady() || !role) return;
  const roleMap = ROUTE_ALLOWLIST[role];
  const fallback = NOTIFICATIONS_FALLBACK[role];
  if (!fallback) return; // vai trò không được hỗ trợ trên mobile → không điều hướng

  const type = typeof data?.targetEntityType === 'string' ? data.targetEntityType : undefined;
  const target = (type && roleMap?.[type]) || fallback;

  const nav = navigationRef as unknown as {
    navigate: (name: string, params?: object) => void;
  };
  try {
    nav.navigate(target.tab, { screen: target.screen });
  } catch {
    // Đích không tồn tại/không truy cập được → mở an toàn danh sách Thông báo.
    nav.navigate(fallback.tab, { screen: fallback.screen });
  }
};
