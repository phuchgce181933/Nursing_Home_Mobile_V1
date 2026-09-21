import React, { useImperativeHandle, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import Svg, { Circle, ClipPath, Defs, Image as SvgImage, Line, Path, Rect, Text as SvgText } from 'react-native-svg';
import { resolveBankName } from '../../utils/vietqrBanks';
import type { TopupResult } from './WalletTopupQrView';

// ---------------------------------------------------------------------------
// Renders the full "downloaded QR receipt" as a single composite SVG, then
// rasterizes it to a PNG via react-native-svg's own native toDataURL — the
// same mechanism already proven to work on this Expo Go build for the plain
// QR export. This avoids adding a new native dependency (e.g. react-native-
// view-shot) that Expo Go would not have bundled and could not load.
// Canvas width is fixed at 1080px per spec; height is derived from the
// actual content so nothing is ever clipped or overlapping — a strict
// 1080×1920 canvas is too short to fit every requested field legibly.
// ---------------------------------------------------------------------------

const GREEN = '#2E7D32';
const GREEN_SOFT = '#E8F5E9';
const GRAY = '#6B7280';
const GRAY_LIGHT = '#9CA3AF';
const DARK = '#111827';
const BORDER = '#E5E7EB';
const WHITE = '#FFFFFF';

const CW = 1080;
const PAD = 56;
const CARD_X = PAD;
const CARD_W = CW - PAD * 2;

const truncate = (s: string, max: number) => (s.length > max ? `${s.slice(0, max - 1)}…` : s);

export type WalletQrExportCardHandle = { toDataURL: (cb: (base64: string) => void) => void };

type Props = {
  topupData: TopupResult;
  qrBase64: string | null;
  pollingStatus: 'idle' | 'polling' | 'success' | 'failed';
};

export const WalletQrExportCard = React.forwardRef<WalletQrExportCardHandle, Props>(
  ({ topupData, qrBase64, pollingStatus }, ref) => {
    const { t } = useTranslation();
    const svgRef = useRef<any>(null);
    const NS = 'family.wallet.receipt';

    const paymentTime = topupData.createdAt
      ? new Date(topupData.createdAt).toLocaleString('vi-VN')
      : new Date().toLocaleString('vi-VN');
    const bankName = resolveBankName(topupData.bankBin);
    const isWaiting = pollingStatus === 'polling';

    // --- layout cursor -----------------------------------------------------
    let y = 70;
    const nodes: React.ReactNode[] = [];
    const advance = (h: number) => { y += h; };

    // Header -----------------------------------------------------------------
    const logoR = 64;
    const logoCy = y + logoR;
    nodes.push(
      <React.Fragment key="logo">
        <Defs>
          <ClipPath id="logoClip">
            <Circle cx={CW / 2} cy={logoCy} r={logoR} />
          </ClipPath>
        </Defs>
        <Circle cx={CW / 2} cy={logoCy} r={logoR + 4} fill={WHITE} stroke={BORDER} strokeWidth={1} />
        <SvgImage
          href={require('../../../assets/images/logo-annhien.png')}
          x={CW / 2 - logoR}
          y={logoCy - logoR}
          width={logoR * 2}
          height={logoR * 2}
          preserveAspectRatio="xMidYMid slice"
          clipPath="url(#logoClip)"
        />
      </React.Fragment>
    );
    advance(logoR * 2 + 28);

    nodes.push(
      <SvgText key="brand" x={CW / 2} y={y} fontSize={34} fontWeight="800" fill={GREEN} textAnchor="middle" letterSpacing={1}>
        {t(`${NS}.brand`)}
      </SvgText>
    );
    advance(38);
    nodes.push(
      <SvgText key="subtitle" x={CW / 2} y={y} fontSize={20} fill={GRAY} textAnchor="middle">
        {t(`${NS}.subtitle`)}
      </SvgText>
    );
    advance(34);
    nodes.push(
      <SvgText key="badge" x={CW / 2} y={y} fontSize={18} fontWeight="700" fill={GREEN} textAnchor="middle" letterSpacing={0.6}>
        {t(`${NS}.secureBadge`).toUpperCase()}
      </SvgText>
    );
    advance(56);

    // Main card: QR + amount + transaction rows ------------------------------
    const cardTop = y;
    const innerPad = 48;
    let cy = cardTop + innerPad;

    const qrFrame = Math.round(CARD_W * 0.6);
    const qrFrameX = CW / 2 - qrFrame / 2;
    const qrImgSize = qrFrame - 40;
    const qrItems: React.ReactNode[] = [
      <Rect key="qrframe" x={qrFrameX} y={cy} width={qrFrame} height={qrFrame} rx={20} fill={WHITE} stroke={BORDER} strokeWidth={2} />,
    ];
    if (qrBase64) {
      qrItems.push(
        <SvgImage
          key="qrimg"
          href={`data:image/png;base64,${qrBase64}`}
          x={qrFrameX + 20}
          y={cy + 20}
          width={qrImgSize}
          height={qrImgSize}
          preserveAspectRatio="xMidYMid meet"
        />
      );
    }
    cy += qrFrame + 32;

    qrItems.push(
      <SvgText key="amtlabel" x={CW / 2} y={cy} fontSize={20} fill={GRAY} textAnchor="middle">
        {t(`${NS}.amountLabel`)}
      </SvgText>
    );
    cy += 60;
    qrItems.push(
      <SvgText key="amtvalue" x={CW / 2} y={cy} fontSize={56} fontWeight="800" fill={GREEN} textAnchor="middle" letterSpacing={-0.5}>
        {`${(topupData.amount || 0).toLocaleString('vi-VN')} ₫`}
      </SvgText>
    );
    cy += 40;

    qrItems.push(<Line key="div1" x1={CARD_X + innerPad} x2={CARD_X + CARD_W - innerPad} y1={cy} y2={cy} stroke={BORDER} strokeWidth={1} />);
    cy += 44;

    const infoRows: [string, string][] = [
      [t(`${NS}.transactionId`), String(topupData.orderCode ?? topupData.topupId ?? '—')],
      [t(`${NS}.paymentTime`), paymentTime],
      [t(`${NS}.payerLabel`), truncate(topupData.payerName || '—', 28)],
      [t(`${NS}.walletLabel`), t(`${NS}.walletValue`)],
      [t(`${NS}.purposeLabel`), t(`${NS}.purposeValue`)],
    ];
    infoRows.forEach(([label, value], i) => {
      qrItems.push(
        <SvgText key={`rowlabel-${i}`} x={CARD_X + innerPad} y={cy} fontSize={18} fill={GRAY}>
          {label}
        </SvgText>
      );
      qrItems.push(
        <SvgText key={`rowvalue-${i}`} x={CARD_X + CARD_W - innerPad} y={cy} fontSize={18} fontWeight="600" fill={DARK} textAnchor="end">
          {truncate(value, 30)}
        </SvgText>
      );
      cy += 46;
    });

    cy += innerPad - 46 + 46; // close out inner bottom padding
    const cardH = cy - cardTop;

    nodes.push(
      <React.Fragment key="maincard">
        <Rect x={CARD_X} y={cardTop + 8} width={CARD_W} height={cardH} rx={40} fill="#00000008" />
        <Rect x={CARD_X} y={cardTop} width={CARD_W} height={cardH} rx={40} fill={WHITE} stroke={BORDER} strokeWidth={1} />
        {qrItems}
      </React.Fragment>
    );
    y = cardTop + cardH + 32;

    // Bank / beneficiary card --------------------------------------------------
    const bankTop = y;
    let by = bankTop + innerPad;
    const bankItems: React.ReactNode[] = [
      <SvgText key="banktitle" x={CARD_X + innerPad} y={by} fontSize={22} fontWeight="700" fill={DARK}>
        {t(`${NS}.bankSectionTitle`)}
      </SvgText>,
    ];
    by += 40;
    const bankRows: [string, string][] = [
      [t(`${NS}.receivingOrg`), 'An Nhiên Care Home'],
      [t(`${NS}.receivingBank`), bankName],
      [t(`${NS}.accountNumber`), topupData.bankAccountNumber || '—'],
      [t(`${NS}.accountHolder`), truncate((topupData.bankAccountName || '—').toUpperCase(), 30)],
    ];
    bankRows.forEach(([label, value], i) => {
      bankItems.push(
        <SvgText key={`bl-${i}`} x={CARD_X + innerPad} y={by} fontSize={18} fill={GRAY}>
          {label}
        </SvgText>
      );
      bankItems.push(
        <SvgText key={`bv-${i}`} x={CARD_X + CARD_W - innerPad} y={by} fontSize={18} fontWeight="600" fill={DARK} textAnchor="end">
          {value}
        </SvgText>
      );
      by += 44;
    });
    by += innerPad - 44 + 44;
    const bankH = by - bankTop;
    nodes.push(
      <React.Fragment key="bankcard">
        <Rect x={CARD_X} y={bankTop} width={CARD_W} height={bankH} rx={32} fill={GREEN_SOFT} />
        {bankItems}
      </React.Fragment>
    );
    y = bankTop + bankH + 28;

    // Instructions card ---------------------------------------------------------
    const insTop = y;
    let iy = insTop + innerPad;
    const insItems: React.ReactNode[] = [
      <SvgText key="institle" x={CARD_X + innerPad} y={iy} fontSize={22} fontWeight="700" fill={DARK}>
        {t(`${NS}.instructionsTitle`)}
      </SvgText>,
    ];
    iy += 44;
    const steps = [t(`${NS}.step1`), t(`${NS}.step2`), t(`${NS}.step3`), t(`${NS}.step4`)];
    steps.forEach((step, i) => {
      const cyStep = iy - 6;
      insItems.push(
        <Circle key={`stepc-${i}`} cx={CARD_X + innerPad + 16} cy={cyStep} r={16} fill={GREEN} />
      );
      insItems.push(
        <SvgText key={`stepn-${i}`} x={CARD_X + innerPad + 16} y={cyStep + 6} fontSize={16} fontWeight="700" fill={WHITE} textAnchor="middle">
          {i + 1}
        </SvgText>
      );
      insItems.push(
        <SvgText key={`stept-${i}`} x={CARD_X + innerPad + 44} y={iy} fontSize={18} fill={DARK}>
          {step}
        </SvgText>
      );
      iy += 44;
    });
    iy += innerPad - 44 + 44;
    const insH = iy - insTop;
    nodes.push(
      <React.Fragment key="inscard">
        <Rect x={CARD_X} y={insTop} width={CARD_W} height={insH} rx={32} fill={WHITE} stroke={BORDER} strokeWidth={1} />
        {insItems}
      </React.Fragment>
    );
    y = insTop + insH + 32;

    // Status badge ----------------------------------------------------------
    const badgeText = isWaiting ? t(`${NS}.statusWaiting`) : t(`${NS}.statusReady`);
    const badgeW = 46 + badgeText.length * 11;
    nodes.push(
      <React.Fragment key="statusbadge">
        <Rect x={CW / 2 - badgeW / 2} y={y} width={badgeW} height={52} rx={26} fill={GREEN_SOFT} />
        <Circle cx={CW / 2 - badgeW / 2 + 26} cy={y + 26} r={6} fill={GREEN} />
        <SvgText x={CW / 2 - badgeW / 2 + 44} y={y + 33} fontSize={16} fontWeight="700" fill={GREEN} letterSpacing={0.4}>
          {badgeText}
        </SvgText>
      </React.Fragment>
    );
    y += 90;

    // Footer -------------------------------------------------------------------
    const footerLines = [
      '68 Đường Nguyễn Văn Cừ, Phường An Khánh, Quận Ninh Kiều, TP. Cần Thơ',
      'Hotline: 1800 1234 (miễn phí)  ·  annhiencarehome@gmail.com',
    ];
    footerLines.forEach((line, i) => {
      nodes.push(
        <SvgText key={`footer-${i}`} x={CW / 2} y={y} fontSize={16} fill={GRAY} textAnchor="middle">
          {line}
        </SvgText>
      );
      y += 26;
    });
    y += 8;
    nodes.push(
      <Line key="div2" x1={CW / 2 - 60} x2={CW / 2 + 60} y1={y} y2={y} stroke={BORDER} strokeWidth={1} />
    );
    y += 30;
    nodes.push(
      <SvgText key="security" x={CW / 2} y={y} fontSize={14} fill={GRAY_LIGHT} textAnchor="middle">
        {t(`${NS}.securityNote`)}
      </SvgText>
    );
    y += 24;
    nodes.push(
      <SvgText key="generated" x={CW / 2} y={y} fontSize={13} fill={GRAY_LIGHT} textAnchor="middle">
        {`${t(`${NS}.generatedAt`)}: ${new Date().toLocaleString('vi-VN')}`}
      </SvgText>
    );
    y += 22;
    nodes.push(
      <SvgText key="ref" x={CW / 2} y={y} fontSize={13} fill={GRAY_LIGHT} textAnchor="middle">
        {`${t(`${NS}.referenceId`)}: ${String(topupData.topupId || '').slice(-12)}`}
      </SvgText>
    );
    y += 26;
    nodes.push(
      <SvgText key="copyright" x={CW / 2} y={y} fontSize={13} fill={GRAY_LIGHT} textAnchor="middle">
        {`${t(`${NS}.copyright`, { year: new Date().getFullYear() })} · ${t(`${NS}.generatedBy`)}`}
      </SvgText>
    );
    y += 60;

    const CH = y;

    useImperativeHandle(ref, () => ({
      toDataURL: (cb: (base64: string) => void) => {
        if (!svgRef.current) return;
        svgRef.current.toDataURL(cb, { width: CW, height: CH });
      },
    }));

    // Subtle background decorations (cross / heartbeat / leaf) at low opacity,
    // kept clear of the card columns (x between PAD and CW-PAD) so they never
    // touch text or the QR itself.
    const decor = (
      <React.Fragment key="decor">
        <Path d="M40 40 h24 v24 h24 v24 h-24 v24 h-24 v-24 h-24 v-24 h24 z" fill={GREEN} opacity={0.045} />
        <Path
          d={`M ${CW - 170} 60 l 20 0 l 10 -30 l 15 60 l 12 -40 l 8 20 l 20 0`}
          stroke={GREEN}
          strokeWidth={4}
          fill="none"
          opacity={0.06}
        />
        <Path
          d="M0 0 C 40 10, 55 40, 40 70 C 25 40, 10 10, 0 0 Z"
          transform={`translate(30 ${CH - 140}) rotate(20)`}
          fill={GREEN}
          opacity={0.05}
        />
        <Path
          d="M0 0 C 40 10, 55 40, 40 70 C 25 40, 10 10, 0 0 Z"
          transform={`translate(${CW - 90} ${CH - 90}) rotate(-30)`}
          fill={GREEN}
          opacity={0.05}
        />
      </React.Fragment>
    );

    return (
      <Svg ref={svgRef} width={CW} height={CH} viewBox={`0 0 ${CW} ${CH}`}>
        <Rect x={0} y={0} width={CW} height={CH} fill={WHITE} />
        {decor}
        {nodes}
      </Svg>
    );
  }
);

WalletQrExportCard.displayName = 'WalletQrExportCard';
