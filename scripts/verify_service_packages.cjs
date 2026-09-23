/**
 * So khớp Gói dịch vụ giữa Web và Mobile trên CÙNG backend + DB local.
 *
 * Web  : GET /api/admin/service-packages   (admin, ServicePackagesPage.jsx)
 * Mobile: GET /api/medical/service-packages (nurse, useServicePackages.ts)
 * Cả hai vào chung servicePackageController.listServicePackages.
 *
 * Nhãn hiển thị được lấy từ chính src/utils/servicePackageLabels.ts đang chạy
 * trong app (biên dịch bằng ts.transpileModule), không viết lại logic trong test.
 *
 * Chạy: node scripts/verify_service_packages.cjs
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

const { useServicePackageLabels, SERVICE_PACKAGE_TIERS } = loadTs('src/utils/servicePackageLabels.ts', {
  'react-i18next': { useTranslation: () => ({ t }) },
});
const { getTierLabel, getActiveLabel, formatVnd } = useServicePackageLabels();

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

const qs = (o) => Object.entries(o).filter(([, v]) => v !== undefined).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');

(async () => {
  const nurse = await login('nurse2@test.com', '123456789P');
  if (!nurse.token) throw new Error('Đăng nhập nurse2 thất bại');
  const admin = await login('admin@test.com', '123456789P');

  const get = async (u, token) => {
    const r = await fetch(`${API}${u}`, { headers: { Authorization: `Bearer ${token}` } });
    return { status: r.status, data: await r.json() };
  };
  // Đúng tham số mà mỗi bên thực sự gửi đi.
  const web = (params = {}) => get(`/api/admin/service-packages?${qs({ isActive: true, limit: 100, ...params })}`, admin.token);
  const mob = (params = {}) => get(`/api/medical/service-packages?${qs({ isActive: true, limit: 100, ...params })}`, nurse.token);

  console.log('1) Hai endpoint cùng trả 200');
  const w = await web();
  const m = await mob();
  check(w.status === 200, 'Web  GET /api/admin/service-packages', `${w.status}`);
  check(m.status === 200, 'Mobile GET /api/medical/service-packages', `${m.status}`);

  console.log('\n2) Bảng đối chiếu theo _id (không so bằng tiêu đề)');
  const wMap = new Map(w.data.data.map((p) => [String(p._id), p]));
  const mMap = new Map(m.data.data.map((p) => [String(p._id), p]));
  const ids = [...new Set([...wMap.keys(), ...mMap.keys()])];
  console.log(`  Web: ${wMap.size} gói | Mobile: ${mMap.size} gói | hợp: ${ids.length}`);
  console.log('  ' + 'Package ID'.padEnd(26) + 'Web Mob ' + 'Tên'.padEnd(26) + 'Hạng'.padEnd(12) + 'Giá'.padEnd(16) + 'Trạng thái'.padEnd(16) + 'Kết quả');
  const FIELDS = ['name', 'tier', 'monthlyPrice', 'description', 'isActive', 'packageCode'];
  for (const id of ids) {
    const a = wMap.get(id); const b = mMap.get(id);
    let verdict = 'PASS';
    if (!a || !b) verdict = 'FAIL(thiếu 1 bên)';
    else {
      const diff = FIELDS.filter((f) => JSON.stringify(a[f]) !== JSON.stringify(b[f]));
      const svc = JSON.stringify(a.services) !== JSON.stringify(b.services) ? ['services'] : [];
      if (diff.length || svc.length) verdict = `FAIL(${[...diff, ...svc].join(',')})`;
    }
    const p = b || a;
    console.log('  ' + id.padEnd(26) + (a ? ' ✓ ' : ' ✗ ') + (b ? ' ✓  ' : ' ✗  ')
      + String(p.name).slice(0, 25).padEnd(26)
      + getTierLabel(p.tier).padEnd(12)
      + formatVnd(p.monthlyPrice).padEnd(16)
      + getActiveLabel(p.isActive).padEnd(16) + verdict);
    if (verdict !== 'PASS') failures += 1;
  }
  check(wMap.size === mMap.size && ids.length === wMap.size, 'Web và Mobile cùng tập _id');

  console.log('\n3) Tìm kiếm cho kết quả tương đương');
  for (const term of ['Gói', 'Cao cấp', 'VIP', 'KhongTonTai']) {
    const [a, b] = await Promise.all([web({ search: term }), mob({ search: term })]);
    const aIds = a.data.data.map((p) => String(p._id)).sort().join(',');
    const bIds = b.data.data.map((p) => String(p._id)).sort().join(',');
    check(aIds === bIds, `search="${term}"`, `web=${a.data.total} mobile=${b.data.total}`);
  }

  console.log('\n4) Lọc theo hạng cho cùng tập dữ liệu');
  let sumTier = 0;
  for (const tier of SERVICE_PACKAGE_TIERS) {
    const [a, b] = await Promise.all([web({ tier }), mob({ tier })]);
    const aIds = a.data.data.map((p) => String(p._id)).sort().join(',');
    const bIds = b.data.data.map((p) => String(p._id)).sort().join(',');
    const allMatch = b.data.data.every((p) => p.tier === tier);
    sumTier += b.data.total;
    check(aIds === bIds && allMatch, `tier=${tier} -> "${getTierLabel(tier)}"`, `${b.data.total} gói`);
  }
  check(sumTier === mMap.size, 'tổng 4 hạng = tổng danh sách', `${sumTier}/${mMap.size}`);

  console.log('\n5) Thứ tự sắp xếp giống nhau (service dùng { createdAt: -1 })');
  check(w.data.data.map((p) => String(p._id)).join(',') === m.data.data.map((p) => String(p._id)).join(','),
    'thứ tự _id trùng khớp');

  console.log('\n6) Chi tiết gói: Mobile đọc đúng khoá `servicePackage`');
  const someId = ids[0];
  const d = await get(`/api/medical/service-packages/${someId}`, nurse.token);
  check(d.status === 200 && !!d.data.servicePackage, 'GET /medical/service-packages/:id', `${d.status}`);
  check(String(d.data.servicePackage?._id) === someId, 'chi tiết đúng bản ghi đã chọn');

  console.log('\n7) Không lộ enum thô / DOCQA trong dữ liệu hiển thị');
  const shown = [];
  for (const p of mMap.values()) {
    shown.push(p.name, p.description ?? '', ...(p.services ?? []));
    shown.push(getTierLabel(p.tier), getActiveLabel(p.isActive), formatVnd(p.monthlyPrice));
  }
  const joined = shown.filter(Boolean).join(' | ');
  // 'vip' loại trừ: nhãn tiếng Việt của nó cũng là "VIP" nên không phân biệt được.
  const rawEnum = ['basic', 'standard', 'premium'].filter((wd) => new RegExp(`(^|[^a-zA-Z])${wd}([^a-zA-Z]|$)`, 'i').test(joined));
  check(rawEnum.length === 0, 'không có enum tier tiếng Anh', rawEnum.length ? JSON.stringify(rawEnum) : `đã kiểm ${shown.length} chuỗi`);
  check(!/docqa/i.test(joined), 'không có DOCQA trong name/description/services');
  check(!/\b[0-9a-f]{24}\b/.test(joined), 'không lộ ObjectId');
  const codes = [...mMap.values()].map((p) => p.packageCode).filter((c) => /docqa/i.test(c));
  if (codes.length) {
    console.log(`  GHI CHÚ packageCode vẫn chứa DOCQA (khoá upsert, Mobile KHÔNG hiển thị): ${codes.join(', ')}`);
  }

  console.log('\n8) Định dạng tiền tệ theo quy ước dự án');
  check(formatVnd(8000000) === '8.000.000 ₫', 'formatVnd(8000000)', formatVnd(8000000));
  check(formatVnd(0) === '0 ₫', 'formatVnd(0)', formatVnd(0));
  check(formatVnd(null) === '0 ₫', 'formatVnd(null)', formatVnd(null));
  check([...mMap.values()].every((p) => /^[\d.]+ ₫$/.test(formatVnd(p.monthlyPrice))), 'mọi giá đúng định dạng "x.xxx.xxx ₫"');

  console.log('\n9) Nhãn tiếng Việt cho mọi giá trị enum');
  for (const tier of SERVICE_PACKAGE_TIERS) {
    const l = getTierLabel(tier);
    check(l !== tier && l.length > 0, `tier ${tier.padEnd(9)} -> ${l}`);
  }
  check(getActiveLabel(true) === 'Đang hoạt động', 'isActive=true  -> Đang hoạt động', getActiveLabel(true));
  check(getActiveLabel(false) === 'Ngừng hoạt động', 'isActive=false -> Ngừng hoạt động', getActiveLabel(false));

  console.log('\n10) RBAC');
  const noAuth = await fetch(`${API}/api/medical/service-packages`);
  check(noAuth.status === 401, 'không token -> 401', `${noAuth.status}`);
  const nurseOnAdmin = await get('/api/admin/service-packages', nurse.token);
  check(nurseOnAdmin.status === 403, 'nurse KHÔNG vào được route admin -> 403', `${nurseOnAdmin.status}`);
  const routeSrc = fs.readFileSync(path.join(ROOT, '..', 'Nursing_Home_Be_V1', 'routes', 'medicalServicePackages.js'), 'utf8');
  check(/router\.use\(protect,\s*authorize\('doctor',\s*'nurse',\s*'admin',\s*'family'\)\)/.test(routeSrc),
    "route medical: protect + authorize('doctor','nurse','admin','family')");
  check(!/router\.(post|put|delete|patch)/.test(routeSrc), 'route medical chỉ có GET — nurse không sửa/xoá được');
  const mobileSrc = fs.readFileSync(path.join(ROOT, 'src/screens/nurse/ServicePackagesScreen.tsx'), 'utf8')
    + fs.readFileSync(path.join(ROOT, 'src/screens/nurse/ServicePackageDetailScreen.tsx'), 'utf8');
  check(!/(api\.(post|put|delete|patch))/.test(mobileSrc), 'Mobile không có hành động ghi (không copy nút admin)');

  console.log('\n11) Nút quay lại');
  const listSrc = fs.readFileSync(path.join(ROOT, 'src/screens/nurse/ServicePackagesScreen.tsx'), 'utf8');
  check(/<BackHeader[\s\S]*?onBack=\{\(\) => navigation\.goBack\(\)\}/.test(listSrc), 'màn hình danh sách dùng BackHeader + goBack()');
  check(!/styles\.topBar/.test(listSrc), 'header tự chế cũ (không có nút back) đã gỡ');
  const navSrc = fs.readFileSync(path.join(ROOT, 'src/navigation/NurseNavigator.tsx'), 'utf8');
  check(/createNativeStackNavigator/.test(navSrc) && /name="ServicePackages"/.test(navSrc),
    'nằm trong native stack -> back phần cứng Android do React Navigation xử lý sẵn');

  console.log(failures === 0 ? '\nPASS — tất cả kiểm tra đạt.' : `\nFAIL — ${failures} lỗi.`);
  process.exit(failures === 0 ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
