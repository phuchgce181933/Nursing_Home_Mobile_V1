/**
 * Xác minh đầu-cuối màn hình "Quản lý sự cố" với dữ liệu LOCAL.
 *
 * Không mô phỏng lại logic: script biên dịch đúng file src/utils/incidentLabels.ts
 * và src/i18n/locales/vi/nurse.ts đang dùng trong app, stub react-i18next bằng bộ
 * dịch tiếng Việt thật, rồi chạy nhãn lên dữ liệu API thật của nurse2.
 *
 * Chạy: node scripts/verify_incident_labels.cjs
 */
const fs = require('fs');
const path = require('path');
const Module = require('module');
const ts = require('typescript');

const ROOT = path.join(__dirname, '..');
const API = process.env.API_BASE || 'http://localhost:3000';
const EMAIL = 'nurse2@test.com';
const PASSWORD = '123456789P';

// ── Nạp file TS bằng compiler API, stub react-i18next ──────────────────────
const loadTs = (relPath, stubs = {}) => {
  const full = path.join(ROOT, relPath);
  const src = fs.readFileSync(full, 'utf8');
  const js = ts.transpileModule(src, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const m = new Module(full, null);
  m.filename = full;
  m.paths = Module._nodeModulePaths(path.dirname(full));
  const originalRequire = m.require.bind(m);
  m.require = (id) => (id in stubs ? stubs[id] : originalRequire(id));
  m._compile(js, full);
  return m.exports;
};

const viNurse = loadTs('src/i18n/locales/vi/nurse.ts').default;

/** t() tối giản theo đúng ngữ nghĩa i18next: tra khoá lồng nhau + defaultValue. */
const makeT = (bundle) => (key, opts) => {
  const found = key.split('.').reduce((acc, k) => (acc == null ? undefined : acc[k]), bundle);
  if (typeof found === 'string') return found;
  if (opts && typeof opts.defaultValue === 'string') return opts.defaultValue;
  return key;
};
const t = makeT(viNurse);

const { useIncidentLabels } = loadTs('src/utils/incidentLabels.ts', {
  'react-i18next': { useTranslation: () => ({ t }) },
});
const { getIncidentTypeLabel, getIncidentSeverityLabel, getIncidentStatusLabel } = useIncidentLabels();

// ── Điều kiện FAIL: bất kỳ chuỗi kỹ thuật nào lọt ra UI ────────────────────
const FORBIDDEN = [
  'fall', 'breathing_difficulty', 'medication_refused', 'medication_missed',
  'medication_error', 'behavior_change', 'skin_issue', 'weight_loss',
  'open', 'investigating', 'in_progress', 'reported', 'resolved', 'closed',
  'low', 'medium', 'high', 'critical', 'DOCQA',
];
/** Chỉ bắt lỗi khi chuỗi kỹ thuật đứng riêng như một từ (tránh false positive tiếng Việt). */
const leaks = (rendered) =>
  FORBIDDEN.filter((bad) => new RegExp(`(^|[^a-zA-Z_])${bad}([^a-zA-Z_]|$)`).test(rendered));

const post = async (url, body) => {
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: r.status, data: await r.json() };
};
const get = async (url, token) => {
  const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  return { status: r.status, data: await r.json() };
};

(async () => {
  const login = await post(`${API}/api/auth/login`, { email: EMAIL, password: PASSWORD });
  if (login.status !== 200) throw new Error(`Đăng nhập thất bại (${login.status})`);
  const token = login.data.token || login.data.data?.token;
  if (!token) throw new Error('Không lấy được token');
  console.log(`Đăng nhập: ${EMAIL} OK\n`);

  let failures = 0;
  const seenTypes = new Set();
  const seenSeverities = new Set();
  const seenStatuses = new Set();

  // Bộ lọc mức độ: '' + 4 giá trị enum, đúng như chip trên UI.
  for (const sev of ['', 'low', 'medium', 'high', 'critical']) {
    const url = `${API}/api/incidents${sev ? `?severity=${sev}` : ''}`;
    const res = await get(url, token);
    if (res.status !== 200) {
      console.error(`FAIL  GET ${url} -> ${res.status}`);
      failures += 1;
      continue;
    }
    const items = res.data.items ?? [];
    console.log(`Bộ lọc "${sev || 'Tất cả'}" (${t('nurse.incidents.filterAll')}${sev ? ` / ${getIncidentSeverityLabel(sev)}` : ''}): ${items.length} sự cố`);

    for (const it of items) {
      seenTypes.add(it.incidentType);
      seenSeverities.add(it.severity);
      seenStatuses.add(it.status);

      // Đúng 4 chuỗi mà thẻ sự cố render ra.
      const card = [
        getIncidentTypeLabel(it.incidentType, t('nurse.incidents.typeUnknown')),
        it.description ?? '',
        getIncidentSeverityLabel(it.severity),
        getIncidentStatusLabel(it.status),
      ];
      const bad = leaks(card.join(' | '));
      if (bad.length) {
        console.error(`  FAIL lộ ${JSON.stringify(bad)} -> ${card.join(' | ')}`);
        failures += 1;
      } else if (sev === '') {
        console.log(`  OK  ${card[2].padEnd(10)} ${card[3].padEnd(14)} ${card[0]}`);
        console.log(`      ${card[1]}`);
      }
    }
  }

  // Phủ toàn bộ giá trị có thật trong source, kể cả giá trị không thuộc phạm vi nurse2.
  console.log('\n— Bảng nhãn cho MỌI giá trị có trong source/DB —');
  const ALL_TYPES = [
    'fall', 'breathing_difficulty', 'medication', 'medication_refused', 'medication_missed',
    'medication_error', 'behavior', 'behavior_change', 'skin_issue', 'weight_loss',
    'Hạ đường huyết', 'Khó thở cấp', 'Ngã', 'Phản ứng thuốc', 'Te nga', 'Té ngã', 'sốc phản vệ', 'té',
  ];
  for (const v of ALL_TYPES) {
    const label = getIncidentTypeLabel(v);
    const bad = leaks(label);
    if (bad.length) { console.error(`  FAIL type "${v}" -> "${label}"`); failures += 1; }
    else console.log(`  type      ${String(v).padEnd(22)} -> ${label}`);
  }
  for (const v of ['low', 'medium', 'high', 'critical']) {
    const label = getIncidentSeverityLabel(v);
    if (leaks(label).length) { console.error(`  FAIL severity "${v}" -> "${label}"`); failures += 1; }
    else console.log(`  severity  ${v.padEnd(22)} -> ${label}`);
  }
  for (const v of ['reported', 'open', 'in_progress', 'investigating', 'resolved', 'closed']) {
    const label = getIncidentStatusLabel(v);
    if (leaks(label).length) { console.error(`  FAIL status "${v}" -> "${label}"`); failures += 1; }
    else console.log(`  status    ${v.padEnd(22)} -> ${label}`);
  }

  console.log(`\nGiá trị thô nurse2 thực sự nhận được:`);
  console.log(`  incidentType: ${JSON.stringify([...seenTypes])}`);
  console.log(`  severity:     ${JSON.stringify([...seenSeverities])}`);
  console.log(`  status:       ${JSON.stringify([...seenStatuses])}`);

  console.log(failures === 0 ? '\nPASS: không còn chuỗi kỹ thuật nào lọt ra UI.' : `\nFAIL: ${failures} lỗi.`);
  process.exit(failures === 0 ? 0 : 1);
})().catch((e) => { console.error(e.message); process.exit(1); });
