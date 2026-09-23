import { useTranslation } from 'react-i18next';

/**
 * Tầng hiển thị TẬP TRUNG cho một giao dịch ví.
 *
 * Backend giữ nguyên các giá trị enum kỹ thuật (`topup`/`payment`/`refund`,
 * `completed`/`pending`/`failed`, `credit`/`debit`/`none`, `wallet`/`payos`).
 * Người dùng TUYỆT ĐỐI không được nhìn thấy các giá trị đó — mọi ánh xạ sang
 * tiếng Việt tập trung ở đây để không màn hình nào tự bịa nhãn.
 *
 * Quy ước dấu tiền dựa trên `direction`, KHÔNG dựa trên `type`:
 *   - credit -> ví tăng   -> dấu "+"
 *   - debit  -> ví giảm   -> dấu "-"
 *   - none   -> ví KHÔNG đổi (trả hoá đơn thẳng qua PayOS) -> KHÔNG có dấu +/-,
 *               vì vẽ dấu trừ ở đây sẽ khiến người dùng tưởng đã bị trừ ví.
 */

const NS = 'family.paymentHistory';

export type WalletTx = {
  _id: string;
  type: 'topup' | 'payment' | 'refund' | string;
  direction?: 'credit' | 'debit' | 'none';
  paymentMethod?: 'wallet' | 'payos';
  walletAffected?: boolean;
  amount: number;
  balanceBefore?: number;
  balanceAfter?: number;
  description?: string;
  invoiceNumber?: string;
  orderCode?: number;
  reference?: string;
  status: 'completed' | 'pending' | 'failed' | string;
  failureReason?: string;
  createdAt?: string;
  completedAt?: string;
  hasBalanceSnapshot?: boolean;
  backfilled?: boolean;
};

/** Ví có thực sự bị tác động không: chỉ `walletAffected === false` mới là "không". */
export const affectsWallet = (tx: Pick<WalletTx, 'walletAffected'>): boolean => tx.walletAffected !== false;

/** '+' | '-' | '' — dựa trên chiều tiền, không phải loại giao dịch. */
export const amountSign = (tx: WalletTx): '+' | '-' | '' => {
  if (!affectsWallet(tx)) return '';
  const dir = tx.direction || (tx.type === 'payment' ? 'debit' : 'credit');
  if (dir === 'debit') return '-';
  if (dir === 'credit') return '+';
  return '';
};

export const useWalletTxLabels = () => {
  const { t } = useTranslation();

  const typeLabel = (tx: WalletTx): string => {
    // Trả hoá đơn thẳng qua PayOS: nói rõ là qua cổng, không phải trừ ví.
    if (tx.type === 'payment' && !affectsWallet(tx)) return t(`${NS}.typePayosPayment`);
    switch (tx.type) {
      case 'topup': return t(`${NS}.typeTopup`);
      case 'payment': return t(`${NS}.typeWalletPayment`);
      case 'refund': return t(`${NS}.typeRefund`);
      default: return t(`${NS}.typeOther`);
    }
  };

  const statusLabel = (status: string): string => {
    switch (status) {
      case 'completed': return t(`${NS}.statusCompleted`);
      case 'pending': return t(`${NS}.statusPending`);
      case 'failed': return t(`${NS}.statusFailed`);
      default: return t(`${NS}.statusPending`);
    }
  };

  const methodLabel = (tx: WalletTx): string => {
    const method = tx.paymentMethod || (affectsWallet(tx) ? 'wallet' : 'payos');
    return method === 'wallet' ? t(`${NS}.methodWallet`) : t(`${NS}.methodPayos`);
  };

  const defaultDescription = (tx: WalletTx): string => {
    if (tx.description) return tx.description;
    if (tx.type === 'topup') return t(`${NS}.defaultTopup`);
    if (tx.type === 'refund') return t(`${NS}.defaultRefund`);
    if (!affectsWallet(tx)) return t(`${NS}.defaultPayosPayment`);
    return t(`${NS}.defaultPayment`);
  };

  return { typeLabel, statusLabel, methodLabel, defaultDescription };
};
