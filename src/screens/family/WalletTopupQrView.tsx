import React, { useEffect, useRef, useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Text, Card, Button, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import QRCode from 'react-native-qrcode-svg';
import { BackHeader } from '../../components/layout/BackHeader';
import { WalletQrExportCard, type WalletQrExportCardHandle } from './WalletQrExportCard';

const COLOR = '#2E7D32';
const NS = 'family.wallet';

export type TopupResult = {
  checkoutUrl?: string;
  qrCode?: string;
  topupId: string;
  orderCode?: number;
  amount: number;
  // Real PayOS bank-transfer details for this payment link (see walletService.js) —
  // used to render the downloadable banking-style receipt image.
  bankBin?: string | null;
  bankAccountNumber?: string | null;
  bankAccountName?: string | null;
  description?: string | null;
  payerName?: string | null;
  createdAt?: string | null;
};

type Props = {
  topupData: TopupResult;
  pollingStatus: 'idle' | 'polling' | 'success' | 'failed';
  topInset: number;
  qrSvgRef: React.MutableRefObject<any>;
  exportCardRef: React.MutableRefObject<WalletQrExportCardHandle | null>;
  savingQr: boolean;
  onCancel: () => void;
  onSaveQr: () => void;
};

const StatusPill: React.FC<{ status: Props['pollingStatus'] }> = ({ status }) => {
  const { t } = useTranslation();
  if (status !== 'polling') return null;
  return (
    <Animated.View entering={FadeIn} style={styles.pollingRow}>
      <ActivityIndicator size="small" color="#92400E" />
      <Text style={styles.pollingText}>{t(`${NS}.waitingConfirmation`)}</Text>
    </Animated.View>
  );
};

export const WalletTopupQrView: React.FC<Props> = ({
  topupData,
  pollingStatus,
  qrSvgRef,
  exportCardRef,
  savingQr,
  onCancel,
  onSaveQr,
}) => {
  const { t } = useTranslation();
  const exportQrSvgRef = useRef<any>(null);
  const [exportQrBase64, setExportQrBase64] = useState<string | null>(null);

  // Pre-render a high-resolution QR raster for the download receipt as soon as the
  // payment QR data is available, well before the user taps "Save" — so the export
  // card's embedded image is already decoded and ready by save time.
  useEffect(() => {
    if (!topupData.qrCode || exportQrBase64) return;
    const id = setTimeout(() => {
      try {
        exportQrSvgRef.current?.toDataURL((b64: string) => setExportQrBase64(b64));
      } catch { /* export receipt will just show without the QR if this fails */ }
    }, 300);
    return () => clearTimeout(id);
  }, [topupData.qrCode, exportQrBase64]);

  if (pollingStatus === 'success') {
    return (
      <View style={styles.flex}>
        <BackHeader title={t(`${NS}.topupTitle`)} color={COLOR} onBack={onCancel} />
        <Animated.View entering={FadeInUp.springify()} style={styles.resultBox}>
          <View style={[styles.resultIconCircle, { backgroundColor: '#D1FAE5' }]}>
            <MaterialCommunityIcons name="check-circle" size={56} color="#065F46" />
          </View>
          <Text style={styles.resultAmount}>{topupData.amount?.toLocaleString('vi-VN')} ₫</Text>
          <Text style={[styles.resultText, { color: '#065F46' }]}>{t(`${NS}.toastTopupSuccess`)}</Text>
        </Animated.View>
      </View>
    );
  }

  if (pollingStatus === 'failed') {
    return (
      <View style={styles.flex}>
        <BackHeader title={t(`${NS}.topupTitle`)} color={COLOR} onBack={onCancel} />
        <Animated.View entering={FadeInUp.springify()} style={styles.resultBox}>
          <View style={[styles.resultIconCircle, { backgroundColor: '#FEE2E2' }]}>
            <MaterialCommunityIcons name="close-circle" size={56} color="#991B1B" />
          </View>
          <Text style={[styles.resultText, { color: '#991B1B' }]}>{t(`${NS}.toastTxCancelledExpired`)}</Text>
        </Animated.View>
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <BackHeader title={t(`${NS}.topupTitle`)} color={COLOR} onBack={onCancel} />

      <ScrollView style={styles.flex} contentContainerStyle={styles.qrBody}>
        <Card style={styles.qrCard} mode="elevated">
          <Card.Content style={styles.qrContent}>
            <Text style={styles.qrTitle}>{t(`${NS}.scanQrTitle`)}</Text>
            <Text style={styles.qrAmount}>{topupData.amount?.toLocaleString('vi-VN')} ₫</Text>

            <View style={styles.qrFrame}>
              {topupData.qrCode ? (
                <QRCode
                  value={topupData.qrCode || 'empty'}
                  size={210}
                  backgroundColor="#FFFFFF"
                  color="#000000"
                  getRef={(ref: any) => { qrSvgRef.current = ref; }}
                />
              ) : (
                <View style={styles.qrLoading}>
                  <ActivityIndicator size="large" color={COLOR} />
                  <Text style={styles.qrLoadingText}>{t(`${NS}.loadingQr`)}</Text>
                </View>
              )}
            </View>

            {topupData.orderCode ? (
              <Text style={styles.orderCode}>{t(`${NS}.orderCode`, { code: topupData.orderCode })}</Text>
            ) : null}
          </Card.Content>
        </Card>

        <Button
          mode="outlined"
          icon="tray-arrow-down"
          onPress={onSaveQr}
          loading={savingQr}
          disabled={savingQr || !topupData.qrCode}
          style={styles.saveBtn}
          contentStyle={styles.saveBtnContent}
          textColor={COLOR}
        >
          {savingQr ? t(`${NS}.savingQr`) : t(`${NS}.saveQr`)}
        </Button>

        <StatusPill status={pollingStatus} />

        <Button mode="text" textColor="#991B1B" onPress={onCancel} style={styles.cancelBtn}>
          {t(`${NS}.cancelTransaction`)}
        </Button>
      </ScrollView>

      {/* Off-screen, invisible: a high-res QR raster feeding the composite receipt
          card below, and the receipt card itself — both exist purely so onSaveQr
          can rasterize a full banking-style image, never shown to the user. */}
      <View style={styles.exportHidden} pointerEvents="none">
        {topupData.qrCode ? (
          <QRCode
            value={topupData.qrCode}
            size={520}
            backgroundColor="#FFFFFF"
            color="#000000"
            getRef={(ref: any) => { exportQrSvgRef.current = ref; }}
          />
        ) : null}
        <WalletQrExportCard ref={exportCardRef as any} topupData={topupData} qrBase64={exportQrBase64} pollingStatus={pollingStatus} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F5F5F5' },
  qrBody: { padding: 16, paddingBottom: 32, alignItems: 'center' },
  exportHidden: { position: 'absolute', top: -100000, left: 0, opacity: 0 },

  qrCard: { borderRadius: 20, width: '100%', marginBottom: 12, elevation: 3 },
  qrContent: { alignItems: 'center', paddingVertical: 24 },
  qrTitle: { fontSize: 14, fontWeight: '500', color: '#6B7280', letterSpacing: 0.2 },
  qrAmount: { fontSize: 32, fontWeight: '800', color: COLOR, marginTop: 6, marginBottom: 20, letterSpacing: -0.5 },
  qrFrame: {
    width: 250,
    height: 250,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrLoading: { alignItems: 'center' },
  qrLoadingText: { fontSize: 13, color: '#9CA3AF', marginTop: 8 },
  orderCode: { fontSize: 12, color: '#9CA3AF', marginTop: 16, fontWeight: '500' },

  saveBtn: { borderRadius: 24, borderColor: COLOR, borderWidth: 1.5, width: '100%', marginBottom: 8 },
  saveBtnContent: { height: 48 },

  pollingRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 20,
    backgroundColor: '#FFFBEB', paddingVertical: 10, paddingHorizontal: 16,
    borderRadius: 12, width: '100%', justifyContent: 'center',
  },
  pollingText: { fontSize: 13, color: '#92400E', fontWeight: '500' },
  cancelBtn: { marginTop: 16 },

  resultBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  resultIconCircle: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  resultAmount: { fontSize: 30, fontWeight: '800', color: COLOR, marginBottom: 8 },
  resultText: { fontSize: 17, fontWeight: '600', textAlign: 'center' },
});
