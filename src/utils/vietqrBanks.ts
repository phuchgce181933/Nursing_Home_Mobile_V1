// NAPAS/VietQR bank BIN → display name lookup for the small set of major Vietnamese
// banks. These BIN codes are public standard identifiers (the same table every VietQR
// SDK ships), not anything proprietary to this project. PayOS only returns the raw
// numeric `bin` on a payment link, so this is a best-effort convenience label — if a
// bin isn't in this table we show the raw BIN number instead of guessing, so the
// receipt never displays a wrong bank name.
export const VIETQR_BANK_NAMES: Record<string, string> = {
  '970436': 'Vietcombank',
  '970418': 'BIDV',
  '970415': 'VietinBank',
  '970405': 'Agribank',
  '970422': 'MB Bank',
  '970407': 'Techcombank',
  '970416': 'ACB',
  '970423': 'TPBank',
  '970403': 'Sacombank',
  '970432': 'VPBank',
  '970441': 'VIB',
  '970437': 'HDBank',
  '970414': 'Oceanbank',
  '970431': 'Eximbank',
  '970443': 'SHB',
  '970448': 'OCB',
  '970454': 'Vietcapital Bank',
  '970426': 'MSB',
  '970400': 'SCB',
  '963388': 'PVcomBank',
};

export const resolveBankName = (bin?: string | null): string =>
  (bin && VIETQR_BANK_NAMES[bin]) || (bin ? `Ngân hàng (BIN ${bin})` : 'Đang cập nhật');
