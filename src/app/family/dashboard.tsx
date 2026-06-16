import { useEffect, useState, useCallback } from 'react';
import { ScrollView, StyleSheet, View, Pressable, Linking, Alert, Modal, TextInput, AppState, AppStateStatus } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/hooks/use-auth';
import {
  FAMILY_RESIDENTS_URL,
  getFamilyResidentInvoicesUrl,
  getFamilyInvoicePaymentUrl,
  FAMILY_WALLET_BALANCE_URL,
  FAMILY_WALLET_TOPUP_URL,
} from '@/constants/api';
import { Spacing, MaxContentWidth } from '@/constants/theme';

type Invoice = {
  _id: string;
  invoiceNumber: string;
  status: string;
  issuedAt: string;
  dueDate?: string;
  totalAmount: number;
};

type Resident = {
  _id: string;
  fullName: string;
};

type Wallet = {
  balance: number;
  totalTopup: number;
  totalSpent: number;
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'issued':
      return '#dc2626';
    case 'paid':
      return '#16a34a';
    case 'partially_paid':
      return '#f59e0b';
    case 'overdue':
      return '#dc2626';
    default:
      return '#6b7280';
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'issued':
      return 'Chưa thanh toán';
    case 'paid':
      return 'Đã thanh toán';
    case 'partially_paid':
      return 'Thanh toán một phần';
    case 'overdue':
      return 'Quá hạn';
    default:
      return status;
  }
};


const handlePayment = async (token: string, residentId: string, invoiceId: string) => {
  try {
    const paymentApiUrl = getFamilyInvoicePaymentUrl(residentId, invoiceId);
    const response = await fetch(paymentApiUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.message || 'Không lấy được URL thanh toán');
    }

    const result = await response.json();
    const paymentUrl = result.data?.paymentUrl;

    if (paymentUrl) {
      await Linking.openURL(paymentUrl);
    } else {
      throw new Error('Không nhận được URL thanh toán');
    }
  } catch (err) {
    console.error('Failed to get payment URL:', err);
    alert(err instanceof Error ? err.message : 'Lỗi khi mở trang thanh toán');
  }
};

const handleWalletTopup = async (token: string, amount: number, setShowTopupModal: any, setPendingTopupId: any) => {
  try {
    const response = await fetch(FAMILY_WALLET_TOPUP_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ amount }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.message || 'Không lấy được URL thanh toán');
    }

    const result = await response.json();
    const data = result.data;

    if (data?.checkoutUrl) {
      setPendingTopupId(data.topupId || null);
      setShowTopupModal(false);
      await Linking.openURL(data.checkoutUrl);
    } else if (data?.paymentUrl) {
      setPendingTopupId(data.topupId || null);
      setShowTopupModal(false);
      await Linking.openURL(data.paymentUrl);
    } else {
      throw new Error('Không nhận được URL thanh toán');
    }
  } catch (err) {
    console.error('Failed to topup:', err);
    alert(err instanceof Error ? err.message : 'Lỗi khi nạp tiền. Vui lòng thử lại.');
  }
};

export default function FamilyDashboard() {
  const { token, user, loading: authLoading, logout } = useAuth();
  const [residents, setResidents] = useState<Resident[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [selectedResidentId, setSelectedResidentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showTopupModal, setShowTopupModal] = useState(false);
  const [topupAmount, setTopupAmount] = useState('');
  const [pendingTopupId, setPendingTopupId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!token || user?.role !== 'family') {
      router.replace('/login');
      return;
    }

    const fetchInitialData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch residents
        const resResponse = await fetch(FAMILY_RESIDENTS_URL, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!resResponse.ok) {
          const body = await resResponse.json().catch(() => ({}));
          throw new Error(body.message || 'Không tải được danh sách người thân');
        }

        const resData = await resResponse.json();
        setResidents(resData);
        if (resData.length > 0) {
          setSelectedResidentId(resData[0]._id);
        }

        // Fetch wallet balance
        const walletResponse = await fetch(FAMILY_WALLET_BALANCE_URL, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (walletResponse.ok) {
          const walletData = await walletResponse.json();
          setWallet(walletData.data || { balance: 0, totalTopup: 0, totalSpent: 0 });
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Lỗi không xác định');
      } finally {
        setLoading(false);
      }
    };

    void fetchInitialData();
  }, [token, user, router, authLoading]);

  useEffect(() => {
    if (!selectedResidentId || !token) return;

    const fetchInvoices = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(getFamilyResidentInvoicesUrl(selectedResidentId), {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body.message || 'Không tải được hóa đơn');
        }

        const result = await response.json();
        setInvoices(result.data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Lỗi không xác định');
      } finally {
        setLoading(false);
      }
    };

    void fetchInvoices();
  }, [selectedResidentId, token]);

  const refreshWallet = async () => {
    if (!token) return;
    try {
      const walletResponse = await fetch(FAMILY_WALLET_BALANCE_URL, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (walletResponse.ok) {
        const walletData = await walletResponse.json();
        setWallet(walletData.data || { balance: 0, totalTopup: 0, totalSpent: 0 });
      }
    } catch (err) {
      console.error('Failed to refresh wallet:', err);
    }
  };

  // Auto-refresh wallet when returning from PayOS payment
  useFocusEffect(
    useCallback(() => {
      console.log('[Dashboard] Screen focused - refreshing wallet');
      
      const checkTopup = async () => {
        if (!token) return;

        try {
          const response = await fetch(`${FAMILY_WALLET_TOPUP_URL}/confirm`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ topupId: pendingTopupId }),
          });

          if (response.ok) {
            const result = await response.json();
            console.log('[Dashboard] Wallet refreshed after topup check:', result.data);
            setWallet(result.data);
          } else {
            console.warn('Failed to check topup:', await response.text());
          }
        } catch (err) {
          console.error('Error checking topup:', err);
        } finally {
          setPendingTopupId(null);
        }
      };

      if (pendingTopupId) {
        void checkTopup();
      } else {
        void refreshWallet();
      }
    }, [token, pendingTopupId])
  );

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.headerSection}>
        <ThemedText type="title" style={styles.title}>Hóa Đơn Thanh Toán</ThemedText>
        <ThemedText type="small" style={styles.greeting}>Xin chào, {user?.fullName || 'Thành viên'}</ThemedText>
      </View>

      {/* Wallet Section */}
      {wallet && (
        <View style={styles.walletSection}>
          <View style={styles.walletCard}>
            <View style={styles.walletHeader}>
              <ThemedText type="smallBold" style={styles.walletLabel}>💰 Ví Tiền</ThemedText>
              <Pressable
                style={styles.refreshButton}
                onPress={refreshWallet}
              >
                <ThemedText type="small" style={styles.refreshButtonText}>Làm mới</ThemedText>
              </Pressable>
            </View>
            <ThemedText type="title" style={styles.walletBalance}>
              {wallet.balance.toLocaleString('vi-VN')}₫
            </ThemedText>
            <View style={styles.walletDetails}>
              <View style={styles.walletDetailRow}>
                <ThemedText type="small" style={styles.walletDetailLabel}>Đã nạp:</ThemedText>
                <ThemedText type="small" style={styles.walletDetailValue}>
                  {wallet.totalTopup.toLocaleString('vi-VN')}₫
                </ThemedText>
              </View>
              <View style={styles.walletDetailRow}>
                <ThemedText type="small" style={styles.walletDetailLabel}>Đã dùng:</ThemedText>
                <ThemedText type="small" style={styles.walletDetailValue}>
                  {wallet.totalSpent.toLocaleString('vi-VN')}₫
                </ThemedText>
              </View>
            </View>
            <Pressable
              style={styles.topupButton}
              onPress={() => setShowTopupModal(true)}
            >
              <ThemedText type="smallBold" style={styles.topupButtonText}>
                + Nạp Tiền
              </ThemedText>
            </Pressable>
          </View>
        </View>
      )}

      {loading ? (
        <ThemedView style={styles.loadingContainer}>
          <ThemedText type="small">Đang tải dữ liệu...</ThemedText>
        </ThemedView>
      ) : error ? (
        <ThemedView style={styles.errorContainer}>
          <ThemedText type="smallBold" style={styles.errorText}>{error}</ThemedText>
        </ThemedView>
      ) : residents.length === 0 ? (
        <ThemedView style={styles.emptyContainer}>
          <ThemedText type="small">Không có người thân nào liên kết.</ThemedText>
        </ThemedView>
      ) : (
        <>
          {/* Resident Selector */}
          <View style={styles.residentSection}>
            <ThemedText type="smallBold" style={styles.sectionLabel}>Chọn người thân</ThemedText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.residentScroll}>
              {residents.map((resident) => (
                <Pressable
                  key={resident._id}
                  style={[
                    styles.residentButton,
                    resident._id === selectedResidentId && styles.residentButtonActive,
                  ]}
                  onPress={() => setSelectedResidentId(resident._id)}
                >
                  <ThemedText
                    type="small"
                    style={[
                      styles.residentButtonText,
                      resident._id === selectedResidentId && styles.residentButtonTextActive,
                    ]}
                  >
                    {resident.fullName}
                  </ThemedText>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          {/* Invoices List */}
          <View style={styles.invoicesSection}>
            <ThemedText type="smallBold" style={styles.sectionLabel}>
              Danh sách hóa đơn ({invoices.length})
            </ThemedText>
            {invoices.length === 0 ? (
              <ThemedView style={styles.emptyInvoicesContainer}>
                <ThemedText type="small">Không có hóa đơn để hiển thị.</ThemedText>
              </ThemedView>
            ) : (
              <View style={styles.invoicesList}>
                {invoices.map((invoice) => (
                  <Pressable key={invoice._id} style={styles.invoiceCard}>
                    <View style={styles.invoiceHeader}>
                      <ThemedText type="smallBold" style={styles.invoiceNumber}>
                        {invoice.invoiceNumber}
                      </ThemedText>
                      <View
                        style={[
                          styles.statusBadge,
                          { backgroundColor: getStatusColor(invoice.status) },
                        ]}
                      >
                        <ThemedText type="small" style={styles.statusText}>
                          {getStatusLabel(invoice.status)}
                        </ThemedText>
                      </View>
                    </View>

                    <View style={styles.invoiceDetails}>
                      <View style={styles.detailRow}>
                        <ThemedText type="small" style={styles.detailLabel}>
                          Ngày xuất:
                        </ThemedText>
                        <ThemedText type="small" style={styles.detailValue}>
                          {new Date(invoice.issuedAt).toLocaleDateString('vi-VN')}
                        </ThemedText>
                      </View>
                      {invoice.dueDate && (
                        <View style={styles.detailRow}>
                          <ThemedText type="small" style={styles.detailLabel}>
                            Hạn trả:
                          </ThemedText>
                          <ThemedText type="small" style={styles.detailValue}>
                            {new Date(invoice.dueDate).toLocaleDateString('vi-VN')}
                          </ThemedText>
                        </View>
                      )}
                      <View style={[styles.detailRow, styles.totalAmountRow]}>
                        <ThemedText type="smallBold" style={styles.detailLabel}>
                          Tổng tiền:
                        </ThemedText>
                        <ThemedText type="smallBold" style={styles.totalAmount}>
                          {invoice.totalAmount.toLocaleString('vi-VN')}₫
                        </ThemedText>
                      </View>

                      {invoice.status !== 'paid' && selectedResidentId && (
                        <Pressable
                          style={styles.paymentButton}
                          onPress={() => handlePayment(token!, selectedResidentId, invoice._id)}
                        >
                          <ThemedText type="smallBold" style={styles.paymentButtonText}>
                            💳 Thanh Toán Qua PayOS
                          </ThemedText>
                        </Pressable>
                      )}
                    </View>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        </>
      )}

      {/* Topup Modal */}
      <Modal
        visible={showTopupModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowTopupModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ThemedText type="smallBold" style={styles.modalTitle}>Nạp Tiền Vào Ví</ThemedText>
            <ThemedText type="small" style={styles.modalSubtitle}>Nhập số tiền muốn nạp (VND):</ThemedText>
            
            <TextInput
              style={styles.modalInput}
              placeholder="Ví dụ: 100000"
              placeholderTextColor="#9ca3af"
              keyboardType="number-pad"
              value={topupAmount}
              onChangeText={setTopupAmount}
            />
            
            <View style={styles.modalButtonGroup}>
              <Pressable
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => {
                  setShowTopupModal(false);
                  setTopupAmount('');
                }}
              >
                <ThemedText type="smallBold" style={styles.modalButtonCancelText}>Hủy</ThemedText>
              </Pressable>
              <Pressable
                style={[styles.modalButton, styles.modalButtonConfirm]}
                onPress={() => {
                  const amount = parseInt(topupAmount || '0', 10);
                  if (amount > 0 && token) {
                    setTopupAmount('');
                    handleWalletTopup(token, amount, setShowTopupModal, setPendingTopupId);
                  } else {
                    alert('Vui lòng nhập số tiền hợp lệ');
                  }
                }}
              >
                <ThemedText type="smallBold" style={styles.modalButtonConfirmText}>Nạp Tiền</ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* QR Code Modal - Removed, opening PayOS directly */}

      {/* Logout Button */}
      <Pressable style={styles.logoutButton} onPress={logout}>
        <ThemedText type="smallBold" style={styles.logoutButtonText}>
          Đăng xuất
        </ThemedText>
      </Pressable>

      <View style={styles.spacer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingVertical: Spacing.four,
    paddingHorizontal: Spacing.three,
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  headerSection: {
    width: '100%',
    maxWidth: MaxContentWidth,
    marginBottom: Spacing.five,
    backgroundColor: '#1f2937',
    paddingVertical: Spacing.four,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: Spacing.one,
    color: '#ffffff',
  },
  greeting: {
    fontSize: 14,
    color: '#e5e7eb',
  },
  walletSection: {
    width: '100%',
    maxWidth: MaxContentWidth,
    marginBottom: Spacing.five,
  },
  walletCard: {
    backgroundColor: '#fff',
    borderRadius: Spacing.three,
    padding: Spacing.four,
    borderWidth: 1,
    borderColor: '#dbeafe',
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
  },
  walletHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.three,
  },
  walletLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  refreshButton: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two,
    backgroundColor: '#f0f9ff',
    borderRadius: Spacing.one,
  },
  refreshButtonText: {
    fontSize: 12,
    color: '#0284c7',
    fontWeight: '500',
  },
  walletBalance: {
    fontSize: 32,
    fontWeight: '700',
    color: '#3b82f6',
    marginBottom: Spacing.three,
  },
  walletDetails: {
    gap: Spacing.two,
    marginBottom: Spacing.four,
    paddingBottom: Spacing.three,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  walletDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  walletDetailLabel: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '500',
  },
  walletDetailValue: {
    fontSize: 13,
    color: '#1f2937',
    fontWeight: '600',
  },
  topupButton: {
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
    borderRadius: Spacing.two,
    backgroundColor: '#10b981',
    alignItems: 'center',
  },
  topupButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: {
    width: '100%',
    maxWidth: MaxContentWidth,
    padding: Spacing.four,
    borderRadius: Spacing.three,
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  errorContainer: {
    width: '100%',
    maxWidth: MaxContentWidth,
    padding: Spacing.four,
    borderRadius: Spacing.three,
    backgroundColor: '#fee2e2',
  },
  errorText: {
    color: '#c53030',
  },
  emptyContainer: {
    width: '100%',
    maxWidth: MaxContentWidth,
    padding: Spacing.four,
    borderRadius: Spacing.three,
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  residentSection: {
    width: '100%',
    maxWidth: MaxContentWidth,
    marginBottom: Spacing.five,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: Spacing.three,
    color: '#1f2937',
  },
  residentScroll: {
    marginHorizontal: -Spacing.three,
    paddingHorizontal: Spacing.three,
  },
  residentButton: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    marginRight: Spacing.two,
    borderRadius: Spacing.two,
    backgroundColor: '#e5e7eb',
    borderWidth: 2,
    borderColor: '#d1d5db',
  },
  residentButtonActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#2563eb',
  },
  residentButtonText: {
    fontSize: 14,
    color: '#374151',
  },
  residentButtonTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  invoicesSection: {
    width: '100%',
    maxWidth: MaxContentWidth,
    marginBottom: Spacing.five,
  },
  invoicesList: {
    gap: Spacing.three,
  },
  emptyInvoicesContainer: {
    padding: Spacing.four,
    borderRadius: Spacing.three,
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  invoiceCard: {
    backgroundColor: '#fff',
    borderRadius: Spacing.three,
    padding: Spacing.four,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  invoiceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.three,
  },
  invoiceNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  statusBadge: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two,
    borderRadius: Spacing.one,
  },
  statusText: {
    color: '#fff',
    fontWeight: '500',
    fontSize: 12,
  },
  invoiceDetails: {
    gap: Spacing.two,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 13,
    color: '#1f2937',
    fontWeight: '500',
  },
  totalAmountRow: {
    paddingTop: Spacing.two,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  totalAmount: {
    fontSize: 16,
    color: '#2563eb',
  },
  paymentButton: {
    marginTop: Spacing.three,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.two,
    backgroundColor: '#059669',
    alignItems: 'center',
  },
  paymentButtonText: {
    color: '#fff',
    fontSize: 14,
  },
  logoutButton: {
    width: '100%',
    maxWidth: MaxContentWidth,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
    borderRadius: Spacing.three,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    marginBottom: Spacing.four,
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 15,
  },
  spacer: {
    height: Spacing.two,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: Spacing.three,
    padding: Spacing.four,
    width: '85%',
    maxWidth: 350,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: Spacing.two,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: Spacing.three,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    fontSize: 14,
    marginBottom: Spacing.four,
    color: '#1f2937',
  },
  modalButtonGroup: {
    flexDirection: 'row',
    gap: Spacing.two,
    justifyContent: 'flex-end',
  },
  modalButton: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.two,
    minWidth: 80,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: '#e5e7eb',
  },
  modalButtonCancelText: {
    color: '#374151',
  },
  modalButtonConfirm: {
    backgroundColor: '#10b981',
  },
  modalButtonConfirmText: {
    color: '#fff',
  },
});
