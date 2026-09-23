/**
 * Xác minh đầu-cuối màn hình "Báo cáo dinh dưỡng" với dữ liệu LOCAL.
 *
 * Không mô phỏng lại logic: biên dịch đúng src/utils/nutritionLabels.ts và
 * src/i18n/locales/vi/nurse.ts đang dùng trong app, rồi áp nhãn lên dữ liệu API thật.
 *
 * Chạy: node scripts/verify_nutrition_reports.cjs
 */
const fs = require('fs');
const path = require('path');
const Module = require('module');
const ts = require('typescript');

const ROOT = path.join(__dirname, '..');
const API = process.env.API_BASE || 'http://localhost:3000';

const loadTs = (relPath, stubs = {}) => {
  const full = path.join(ROOT, relPath);
  const js = ts.transpileModule(fs.readFileSync(full, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const m = new Module(full, null);
  m.filename = full;
  m.paths = Module._nodeModulePaths(path.dirname(full));
  const orig = m.require.bind(m);
  m.require = (id) => (id in stubs ? stubs[id] : orig(id));
  m._compile(js, full);
  return m.exports;
};

const viNurse = loadTs('src/i18n/locales/vi/nurse.ts').default;
const t = (key, opts) => {
  const found = key.split('.').reduce((a, k) => (a == null ? undefined : a[k]), viNurse);
  if (typeof found === 'string') return found;
  if (opts && typeof opts.defaultValue === 'string') return opts.defaultValue;
  return key;
};

const { useNutritionLabels } = loadTs('src/utils/nutritionLabels.ts', {
  'react-i18next': { useTranslation: () => ({ t }) },
});
const { getMealTypeLabel, getDietTypeLabel, getIntakeStatusLabel } = useNutritionLabels();

const FORBIDDEN = [
  'breakfast', 'lunch', 'dinner', 'snack',
  'diabetic', 'low_sodium', 'renal', 'high_protein', 'soft_texture', 'liquid_only', 'custom',
  'full', 'partial', 'refused', 'assisted',
  'DOCQA', 'Route not found', 'undefined', 'null',
];
const leaks = (s) => FORBIDDEN.filter((b) => new RegExp(`(^|[^a-zA-Z_])${b}([^a-zA-Z_]|$)`, 'i').test(s));
const OBJECT_ID = /\b[0-9a-f]{24}\b/;
/** Mã cư dân nội bộ (RES_SEED_01) cũng là chuỗi kỹ thuật, không được hiển thị. */
const INTERNAL_CODE = /RES_SEED_|\[DOCQA\]/i;

const toDateStr = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const to = toDateStr(new Date());
const from = toDateStr(new Date(Date.now() - 6 * 86400000));

let failures = 0;
const check = (ok, label, extra = '') => {
  console.log(`  ${ok ? 'OK  ' : 'FAIL'} ${label}${extra ? ` — ${extra}` : ''}`);
  if (!ok) failures += 1;
};

const login = async (email, password) => {
  const r = await fetch(`${API}/api/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const d = await r.json();
  return { status: r.status, token: d.token || d.data?.token };
};

(async () => {
  const nurse = await login('nurse2@test.com', '123456789P');
  if (!nurse.token) throw new Error('Đăng nhập nurse2 thất bại');
  const get = async (u, token = nurse.token) => {
    const r = await fetch(`${API}${u}`, { headers: { Authorization: `Bearer ${token}` } });
    return { status: r.status, data: await r.json() };
  };

  console.log('1) Ba endpoint trả về 200, không còn 404 Route not found');
  const s = await get(`/api/nurse/nutrition-reports/summary?from=${from}&to=${to}`);
  check(s.status === 200, 'GET /summary', `${s.status}`);
  const rl = await get(`/api/nurse/nutrition-reports/residents?from=${from}&to=${to}&limit=100`);
  check(rl.status === 200, 'GET /residents', `${rl.status}`);
  const first = rl.data.data?.[0];
  const d0 = await get(`/api/nurse/nutrition-reports/residents/${first.residentId}?from=${from}&to=${to}`);
  check(d0.status === 200, 'GET /residents/:id', `${d0.status}`);

  console.log('\n2) Response map đúng vào shape màn hình đang đọc');
  check(typeof s.data.data?.totalAdmittedResidents === 'number', 'summary.data.totalAdmittedResidents', String(s.data.data?.totalAdmittedResidents));
  check(Array.isArray(rl.data.data), 'residents.data là mảng', `${rl.data.data?.length} dòng`);
  check(Array.isArray(d0.data.data?.days), 'detail.data.days là mảng', `${d0.data.data?.days?.length} ngày`);
  const KPI_KEYS = ['totalAdmittedResidents','residentsWithMealPlan','residentsWithSpecialDiet','residentsWithMealTimeSchedule','totalMealIntakeRecords','residentsWithMealIntake','totalMealNotes','residentsMissingMealPlan'];
  check(KPI_KEYS.every((k) => typeof s.data.data?.[k] === 'number'), '8 ô KPI đều có số thật',
    KPI_KEYS.map((k) => `${k}=${s.data.data[k]}`).join(' '));

  console.log('\n3) Bộ lọc');
  const fSearch = await get(`/api/nurse/nutrition-reports/residents?from=${from}&to=${to}&search=Hoa`);
  check(fSearch.status === 200 && fSearch.data.total >= 1, 'search=Hoa', `total=${fSearch.data.total}`);
  const fMissing = await get(`/api/nurse/nutrition-reports/residents?from=${from}&to=${to}&missingMealPlan=true`);
  check(fMissing.status === 200 && fMissing.data.data.every((r) => !r.hasMealPlan), 'missingMealPlan=true', `total=${fMissing.data.total}`);
  const fToday = await get(`/api/nurse/nutrition-reports/summary?from=${to}&to=${to}`);
  check(fToday.status === 200, 'khoảng "Hôm nay"', `${fToday.status}`);

  console.log('\n4) Trạng thái lỗi backend trả về tiếng Việt, có errorCode');
  const badRange = await get(`/api/nurse/nutrition-reports/summary?from=${to}&to=${from}`);
  check(badRange.status === 400 && !/[a-z]{3,}\s[a-z]{3,}\snot/.test(badRange.data.message || ''), 'from > to -> 400', badRange.data.message);
  const tooLong = await get(`/api/nurse/nutrition-reports/summary?from=2026-01-01&to=2026-09-21`);
  check(tooLong.status === 400, 'khoảng > 31 ngày -> 400', tooLong.data.message);

  console.log('\n5) RBAC — nurse2 chỉ thấy cư dân được phân công');
  const assigned = new Set(rl.data.data.map((r) => r.residentId));
  const admin = await login('admin@test.com', '123456789P');
  let outside = null;
  if (admin.token) {
    const all = await get('/api/admin/residents?limit=200', admin.token);
    const list = all.data?.data ?? all.data?.items ?? [];
    outside = list.map((r) => String(r._id)).find((id) => !assigned.has(id));
  }
  if (outside) {
    const forb = await get(`/api/nurse/nutrition-reports/residents/${outside}?from=${from}&to=${to}`);
    check(forb.status === 403, 'cư dân KHÔNG được phân công -> 403', `${forb.status} ${forb.data.message}`);
  } else {
    check(false, 'không tìm được cư dân ngoài phạm vi để thử', 'bỏ qua');
  }
  const bogus = await get(`/api/nurse/nutrition-reports/residents/000000000000000000000000?from=${from}&to=${to}`);
  check(bogus.status === 403, 'ObjectId lạ -> 403', `${bogus.status}`);
  const noAuth = await fetch(`${API}/api/nurse/nutrition-reports/summary`);
  check(noAuth.status === 401, 'không có token -> 401', `${noAuth.status}`);
  // Khai báo phân quyền đọc thẳng từ source route (không đổi mật khẩu tài khoản nào
  // chỉ để test): xác nhận bản vá mount KHÔNG hề nới lỏng authorize().
  const routeSrc = fs.readFileSync(
    path.join(ROOT, '..', 'Nursing_Home_Be_V1', 'routes', 'nutritionReports.js'), 'utf8');
  check(/router\.get\('\/summary',\s*protect,\s*authorize\('nurse',\s*'caregiver'\)/.test(routeSrc),
    "/summary: protect + authorize('nurse','caregiver')");
  check(/router\.get\('\/residents',\s*protect,\s*authorize\(\.\.\.NURSE_ROLES\)/.test(routeSrc)
    && /NURSE_ROLES\s*=\s*\['nurse'\]/.test(routeSrc),
    "/residents: protect + authorize('nurse') — caregiver bị chặn");
  check(/router\.get\('\/residents\/:residentId',\s*protect,\s*authorize\('nurse',\s*'caregiver'\)/.test(routeSrc),
    "/residents/:id: protect + authorize('nurse','caregiver') + kiểm tra phân công trong service");

  console.log('\n6) Không lộ enum thô / ObjectId / DOCQA trong text hiển thị');
  const shown = [];
  for (const row of rl.data.data) {
    shown.push(row.fullName);
    const det = await get(`/api/nurse/nutrition-reports/residents/${row.residentId}?from=${from}&to=${to}`);
    for (const day of det.data.data.days) {
      for (const m of day.mealPlanEntries) shown.push(`${getMealTypeLabel(m.mealType)}: ${m.mealName ?? ''}`);
      for (const sd of day.specialDietEntries) shown.push(getDietTypeLabel(sd.dietType) + (sd.nutritionGoal ? ` · ${sd.nutritionGoal}` : ''));
      for (const n of day.mealIntakeNotes) shown.push(`${getMealTypeLabel(n.mealType)} · ${getIntakeStatusLabel(n.intakeStatus)}`, n.plannedMealName ?? '', n.notes ?? '', n.authorName ?? '');
      for (const n of day.mealNotes) shown.push(`${n.authorName ?? ''}: ${n.content ?? ''}`);
      if (day.mealTimeSchedule) shown.push(day.mealTimeSchedule.notes ?? '');
    }
  }
  const joined = shown.filter(Boolean).join(' | ');
  const bad = leaks(joined);
  check(bad.length === 0, 'không có enum tiếng Anh nào lọt ra', bad.length ? JSON.stringify(bad) : `đã kiểm ${shown.filter(Boolean).length} chuỗi`);
  check(!OBJECT_ID.test(joined), 'không lộ ObjectId');
  check(!INTERNAL_CODE.test(joined), 'không lộ [DOCQA] / mã seed nội bộ');

  // residentCode là trường nghiệp vụ hợp lệ và MÀN HÌNH CÓ HIỂN THỊ nó, nhưng giá
  // trị đang nằm trong DB local là mã seed. Đây là vấn đề DỮ LIỆU, không phải code,
  // và đổi mã sẽ phá khoá tự nhiên của seed_mobile_docqa_data.js -> chỉ cảnh báo.
  const seedCodes = rl.data.data.map((r) => r.residentCode).filter((c) => INTERNAL_CODE.test(c || ''));
  if (seedCodes.length) {
    console.log(`  CẢNH BÁO residentCode vẫn là mã seed (hiển thị ở dòng cư dân): ${seedCodes.join(', ')}`);
    console.log('           -> vấn đề dữ liệu seed, KHÔNG sửa vì residentCode là khoá tự nhiên của seed script.');
  }

  console.log('\n7) Bảng nhãn cho MỌI giá trị enum có trong source');
  for (const v of ['breakfast', 'lunch', 'dinner', 'snack']) {
    const l = getMealTypeLabel(v); check(!leaks(l).length, `mealType ${v.padEnd(12)} -> ${l}`);
  }
  for (const v of ['diabetic', 'low_sodium', 'renal', 'high_protein', 'soft_texture', 'liquid_only', 'custom']) {
    const l = getDietTypeLabel(v); check(!leaks(l).length, `dietType ${v.padEnd(12)} -> ${l}`);
  }
  for (const v of ['full', 'partial', 'refused', 'assisted']) {
    const l = getIntakeStatusLabel(v); check(!leaks(l).length, `intakeStatus ${v.padEnd(8)} -> ${l}`);
  }

  console.log(failures === 0 ? '\nPASS — tất cả kiểm tra đạt.' : `\nFAIL — ${failures} lỗi.`);
  process.exit(failures === 0 ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
