import React, { useEffect, useState } from 'react';
import { Text, Dialog, Portal, Button, TextInput } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import api from '../../api/axiosInstance';
import { FAMILY } from '../../api/endpoints';

const COLOR = '#2E7D32';
/** Chuỗi hiển thị dùng chung cho mọi nơi thanh toán ví bằng OTP. */
const NS = 'family.invoiceDetail';
const FALLBACK_COOLDOWN_SECONDS = 30;

/**
 * errorCode của backend → khoá i18n tiếng Việt viết theo lời người dùng.
 * Không hiển thị thẳng `message` từ máy chủ: nội dung đó dành cho log/kỹ thuật.
 */
const OTP_ERROR_KEYS: Record<string, string> = {
  OTP_INVALID: 'errOtpInvalid',
  OTP_EXPIRED: 'errOtpExpired',
  OTP_ALREADY_USED: 'errOtpUsed',
  OTP_TOO_MANY_ATTEMPTS: 'errOtpTooManyAttempts',
  OTP_RESEND_TOO_SOON: 'errOtpResendTooSoon',
  OTP_SEND_FAILED: 'errOtpSendFailed',
  OTP_NOT_FOUND: 'errOtpNotFound',
  OTP_FORBIDDEN: 'errOtpNotFound',
  OTP_PURPOSE_MISMATCH: 'errOtpNotFound',
  OTP_PHONE_MISSING: 'errPhoneMissing',
  WALLET_INSUFFICIENT_BALANCE: 'errInsufficientBalance',
  WALLET_PAYMENT_AMOUNT_MISMATCH: 'errAmountChanged',
  WALLET_PAYMENT_AMOUNT_INVALID: 'errAmountChanged',
  WALLET_PAYMENT_INVOICE_REQUIRED: 'errInvoiceNotPayable',
  WALLET_PAYMENT_TOO_MANY_INVOICES: 'errInvoiceNotPayable',
  WALLET_PAYMENT_OTP_REQUIRED: 'errInvoiceNotPayable',
  INVOICE_ALREADY_PAID: 'errInvoiceAlreadyPaid',
  INVOICE_NOT_PAYABLE: 'errInvoiceNotPayable',
};

type Options = {
  /** Gọi sau khi thanh toán thành công (số tiền đã trừ khỏi ví). */
  onSuccess: (amount: number) => void;
  /** Lỗi cần báo ngoài hộp thoại (toast) — ví dụ lỗi ngay ở bước gửi mã. */
  onError: (message: string) => void;
};

/**
 * Luồng "Thanh toán bằng ví" có xác thực OTP, dùng chung cho mọi màn hình.
 *
 * Toàn bộ nghiệp vụ nằm ở backend: màn hình chỉ gọi `initiate` để xin mã rồi
 * `verify` để xác thực. Ví CHỈ bị trừ sau khi `verify` thành công, nên không có
 * đường nào trừ tiền trước khi người dùng nhập đúng mã.
 *
 *   const { start, starting, dialog } = useWalletOtpPayment({ onSuccess, onError });
 *   <Button loading={starting} onPress={() => start([invoiceId], amount)} />
 *   {dialog}
 */
export const useWalletOtpPayment = ({ onSuccess, onError }: Options) => {
  const { t } = useTranslation();
  const qc = useQueryClient();

  const [visible, setVisible] = useState(false);
  const [starting, setStarting] = useState(false);
  const [intent, setIntent] = useState<{ invoiceIds: string[]; amount: number } | null>(null);
  const [otpId, setOtpId] = useState<string | null>(null);
  const [maskedRecipient, setMaskedRecipient] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  /** Dịch lỗi backend sang một câu tiếng Việt dễ hiểu cho người nhà. */
  const errorMessage = (e: any, fallbackKey: string): string => {
    if (!e?.response) return t(`${NS}.errNetwork`);
    const data = e.response.data ?? {};
    const key = OTP_ERROR_KEYS[data.errorCode];
    if (!key) return t(`${NS}.${fallbackKey}`);
    // OTP_INVALID kèm số lần thử còn lại; nếu backend không gửi thì dùng câu không đếm.
    if (key === 'errOtpInvalid' && typeof data.params?.remaining !== 'number') {
      return t(`${NS}.errOtpInvalidNoCount`);
    }
    return String(t(`${NS}.${key}`, data.params ?? {}));
  };

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['familyInvoices'] });
    qc.invalidateQueries({ queryKey: ['familyWallet'] });
  };

  const requestOtp = async (invoiceIds: string[], amount: number) => {
    const res = await api.post(FAMILY.WALLET_PAYMENT_INITIATE, { amount, invoiceIds });
    const data = res.data?.data ?? res.data;
    setOtpId(data?.otpId ?? null);
    setMaskedRecipient(data?.maskedRecipient ?? '');
    // Ưu tiên khoảng chờ do server quy định để nút "Gửi lại mã" không lệch với backend.
    setCooldown(Number(data?.resendAfterSeconds) || FALLBACK_COOLDOWN_SECONDS);
  };

  /** Bấm "Thanh toán bằng ví": xin mã trước, chỉ mở hộp thoại khi mã đã gửi đi. */
  const start = async (invoiceIds: string[], amount: number) => {
    if (starting) return;
    setStarting(true);
    try {
      await requestOtp(invoiceIds, amount);
      setIntent({ invoiceIds, amount });
      setCode('');
      setError(null);
      setVisible(true);
    } catch (e: any) {
      if (e?.response?.data?.errorCode === 'INVOICE_ALREADY_PAID') refresh();
      onError(errorMessage(e, 'errOtpSendFailed'));
    } finally {
      setStarting(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || !intent) return;
    setResending(true);
    try {
      await requestOtp(intent.invoiceIds, intent.amount);
      setCode('');
      setError(null);
    } catch (e: any) {
      // Server chặn vì gửi quá sớm → đồng bộ lại đồng hồ đếm ngược trên máy.
      const wait = Number(e?.response?.data?.params?.seconds);
      if (wait > 0) setCooldown(wait);
      setError(errorMessage(e, 'errOtpSendFailed'));
    } finally {
      setResending(false);
    }
  };

  const handleVerify = async () => {
    if (!code.trim() || !otpId) {
      setError(t(`${NS}.otpCodeRequired`));
      return;
    }
    // Chặn bấm "Xác nhận" nhiều lần: chỉ một yêu cầu xác thực được gửi đi.
    if (verifying) return;
    setVerifying(true);
    setError(null);
    try {
      await api.post(FAMILY.WALLET_PAYMENT_VERIFY, { otpId, code: code.trim() });
      refresh();
      setVisible(false);
      onSuccess(intent?.amount ?? 0);
    } catch (e: any) {
      // Hoá đơn đã được trả ở nơi khác → đóng hộp thoại và làm mới dữ liệu.
      if (e?.response?.data?.errorCode === 'INVOICE_ALREADY_PAID') {
        refresh();
        setVisible(false);
        onError(t(`${NS}.errInvoiceAlreadyPaid`));
      } else {
        setError(errorMessage(e, 'errPaymentFailed'));
      }
    } finally {
      setVerifying(false);
    }
  };

  const dialog = (
    <Portal>
      <Dialog visible={visible} onDismiss={() => setVisible(false)} dismissable={false} style={{ borderRadius: 16 }}>
        <Dialog.Title>{t(`${NS}.otpTitle`)}</Dialog.Title>
        <Dialog.Content>
          <Text style={{ fontSize: 13, color: '#6B7280', marginBottom: 12 }}>
            {t(`${NS}.otpSentTo`, { recipient: maskedRecipient })}
          </Text>
          <TextInput mode="outlined" keyboardType="number-pad" maxLength={6} autoFocus
            value={code} onChangeText={setCode}
            label={t(`${NS}.otpCodeLabel`)} error={!!error} />
          {error ? <Text style={{ color: '#B91C1C', fontSize: 12, marginTop: 4 }}>{error}</Text> : null}
          <Button mode="text" textColor={COLOR} onPress={handleResend} loading={resending}
            disabled={resending || verifying || cooldown > 0} style={{ alignSelf: 'flex-end', marginTop: 4 }}>
            {cooldown > 0 ? t(`${NS}.otpResendCooldown`, { seconds: cooldown }) : t(`${NS}.otpResend`)}
          </Button>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={() => setVisible(false)} disabled={verifying}>{t('common.cancel')}</Button>
          <Button mode="contained" buttonColor={COLOR} onPress={handleVerify}
            loading={verifying} disabled={verifying || code.trim().length < 6}>
            {t(`${NS}.otpVerify`)}
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );

  return { start, starting, dialog };
};
