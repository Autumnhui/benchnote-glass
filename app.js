/* ============================================================
   实验台 Bench — 实验室记录 / 试剂 / 工具箱 / 台账 (PWA, 纯前端)
   设计：Apple 风格，无 AI 味
   ============================================================ */

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const STORE = {
  exp: 'bench.exp', reag: 'bench.reag', samples: 'bench.samples',
  templates: 'bench.templates', instruments: 'bench.instruments',
  incidents: 'bench.incidents', results: 'bench.results', todos: 'bench.todos',
  safety: 'bench.safety',
  seeded: 'bench.seeded', settings: 'bench.settings'
};

function load(key, fallback) {
  try { const v = JSON.parse(localStorage.getItem(key)); return v == null ? fallback : v; }
  catch (e) { return fallback; }
}

/* 全部工具与模块（首页快捷工具从中挑选，最多 8 个） */
const ALL_TOOLS = [
  { key: 'timer', i: '⏱️', t: '计时器', d: '跳手机原生计时', fn: 'openTimerTool()' },
  { key: 'buffer', i: '🧫', t: '缓冲液配制', d: '自动算各组分质量', fn: 'openBufferTool()' },
  { key: 'rcf', i: '🌀', t: '离心力换算', d: 'RPM ↔ 相对离心力 g', fn: 'openRcfTool()' },
  { key: 'dilution', i: '💧', t: '稀释', d: 'C₁V₁=C₂V₂ · 梯度', fn: 'openDilutionTool()' },
  { key: 'unit', i: '🔢', t: '单位换算', d: '温度/质量/体积', fn: 'openUnitTool()' },
  { key: 'primer', i: '🧬', t: '引物', d: '互补/GC%/Tm', fn: 'openPrimerTool()' },
  { key: 'qr', i: '🔳', t: '标签二维码', d: '生成样品二维码', fn: 'openQRTool()' },
  { key: 'result', i: '📈', t: '结果录入', d: '数据+趋势图', fn: 'openResultTool()' },
  { key: 'template', i: '📋', t: '实验模板', d: '克隆常用 protocol', fn: 'openTemplates()' },
  { key: 'instruments', i: '⚙️', t: '仪器台账', d: '使用与校准到期', fn: 'openInstruments()' },
  { key: 'incidents', i: '⚠️', t: '异常随手记', d: '拍照+语音留痕', fn: 'openIncidents()' },
  { key: 'handover', i: '🤝', t: '交接班待办', d: '任务与负责人', fn: 'openHandover()' },
  { key: 'weekly', i: '🗓️', t: '周报 / 组会素材', d: '一键汇总本周实验', fn: 'openWeeklyReport()' },
  { key: 'safety', i: '🛡️', t: '安全 Checklist', d: '危化品 / 生物安全确认', fn: 'openSafetyChecklist()' }
];
/* 首页默认展示的 8 个（不含后续加入的模块） */
const DEFAULT_QUICK = ['timer', 'buffer', 'rcf', 'dilution', 'unit', 'primer', 'weekly', 'template'];
const QUICK_KEY = 'bench.quickTools';
function getQuickTools() {
  let keys = load(QUICK_KEY, null);
  if (!Array.isArray(keys) || !keys.length) keys = DEFAULT_QUICK.slice();
  const map = {}; ALL_TOOLS.forEach((t) => { map[t.key] = t; });
  const list = keys.map((k) => map[k]).filter(Boolean);
  return list.length ? list : DEFAULT_QUICK.map((k) => map[k]).filter(Boolean);
}

function save(key, val) { localStorage.setItem(key, JSON.stringify(val)); }
// Cloudflare Worker 代理地址：默认 Key 只存在于 Worker 密钥里，前端不发 Key。
// 部署 Worker 后把你的 *.workers.dev 地址填到这里（详见 benchnote-worker/）。
const AGNES_PROXY = 'https://benchnote-agnes-proxy.m4dwzbrfcj.workers.dev';
function proxyWsUrl() { return 'wss://' + AGNES_PROXY.replace(/^https?:\/\//, ''); }
function getSettings() { const s = Object.assign({ voiceOn: true, agnesKey: '', xfAppid: '', xfApiKey: '', xfApiSecret: '' }, load(STORE.settings, {})); return s; }
function setSettings(s) { save(STORE.settings, s); }
function uid(p) { return p + Date.now() + Math.floor(Math.random() * 1000); }

/* ---------------- 种子数据 ---------------- */
const DEFAULT_TEMPLATES = [
  { id: 'tp1', title: '外泌体浓缩与缓冲液置换', raw: '14:00 取外泌体样本 2 mL 批号 EV-2607 转入超滤管；15:00 4000 g 离心 10 min 收集截留液；16:00 缓冲液置换 3 次 每次 500 μL PBS' },
  { id: 'tp2', title: '质粒小量提取', raw: '09:00 挑单菌落接种 5 mL LB + 卡那霉素 37℃ 220 rpm 过夜；次日 09:00 取 1 mL 菌液 12000 g 离心 1 min 收集菌体；加 250 μL P1 重悬；加 250 μL P2 裂解；加 350 μL N3 冰上 5 min 12000 g 离心 10 min 取上清过柱' },
  { id: 'tp3', title: '细胞传代', raw: '弃旧培养基 PBS 洗 1 次；加 1 mL 0.25% 胰酶 37℃ 2 min；加 2 mL 完全培养基终止 吹打 5 次 分至 2 个 T25 瓶' }
];
function ensureTemplateDefaults() {
  const t = load(STORE.templates, null);
  if (Array.isArray(t) && t.length) return;   // 用户已有模板则不覆盖
  save(STORE.templates, DEFAULT_TEMPLATES);
}
function seed() {
  if (localStorage.getItem(STORE.seeded)) return;
  const experiments = [
    { id: 'e1', title: '外泌体浓缩与缓冲液置换', createdAt: '2026-07-13T14:05:00', operator: '实验员',
      raw: '14:00 取外泌体样本 2 mL 批号 EV-2607 转入超滤管；15:00 4000 g 离心 10 min 收集截留液；16:00 缓冲液置换 3 次 每次 500 μL PBS',
      steps: [
        { time: '14:00', action: '取', material: '外泌体样本', lot: 'EV-2607', amount: '2', unit: 'mL', param: '', note: '转入超滤管' },
        { time: '15:00', action: '离心', material: '截留液', lot: '', amount: '10', unit: 'min', param: '4000 g', note: '收集截留液' },
        { time: '16:00', action: '缓冲液置换', material: 'PBS', lot: '', amount: '500', unit: 'μL', param: '3 次', note: '' }
      ] },
    { id: 'e2', title: 'AKTA 层析纯化', createdAt: '2026-07-12T09:30:00', operator: '实验员',
      raw: '09:30 平衡层析柱 5 CV 缓冲液 A；10:00 上样 1.5 mL 样品 批号 P-2206 流速 1 mL/min；11:30 收集峰3 共 3 mL',
      steps: [
        { time: '09:30', action: '平衡', material: '层析柱', lot: '', amount: '5', unit: 'CV', param: '缓冲液 A', note: '' },
        { time: '10:00', action: '上样', material: '样品', lot: 'P-2206', amount: '1.5', unit: 'mL', param: '流速 1 mL/min', note: '' },
        { time: '11:30', action: '收集', material: '峰3', lot: '', amount: '3', unit: 'mL', param: '', note: '' }
      ] }
  ];
  const reagents = [
    { id: 'r1', name: '超滤管 100kD', lot: 'UF2603', qty: 3, unit: '支', location: '4℃柜A', expiry: '2027-01-10', min: 2, supplier: 'Millipore' },
    { id: 'r2', name: 'PBS 缓冲液', lot: 'PB2605', qty: 2, unit: 'L', location: '4℃柜A', expiry: '2026-07-20', min: 1, supplier: '自配' },
    { id: 'r3', name: '蛋白酶K', lot: 'PK2512', qty: 1, unit: '支', location: '-20℃冰箱', expiry: '2026-07-02', min: 1, supplier: 'Thermo' },
    { id: 'r4', name: '色谱填料 Capto', lot: 'CM2601', qty: 1, unit: 'mL', location: '4℃柜B', expiry: '2027-03-01', min: 2, supplier: 'Cytiva' },
    { id: 'r5', name: '移液器吸头 200μL', lot: 'TP2606', qty: 500, unit: '个', location: '常温柜', expiry: '2028-05-01', min: 100, supplier: 'Axygen' }
  ];
  const samples = [
    { id: 's1', name: 'pET28a 质粒', type: '质粒', box: 'B1', row: 'A', col: 1, expiry: '2027-01-01', note: '浓度 320 ng/μL' },
    { id: 's2', name: 'HEK293T 细胞', type: '细胞系', box: 'B1', row: 'C', col: 4, expiry: '2026-08-10', note: 'P12 代' },
    { id: 's3', name: '引物 Fw-actin', type: '引物', box: 'B1', row: 'E', col: 7, expiry: '2027-06-01', note: '100 μM' },
    { id: 's4', name: '外泌体样本 #7', type: '样本', box: 'B1', row: 'G', col: 10, expiry: '2026-07-25', note: '−80℃ 保存' }
  ];
  const instruments = [
    { id: 'i1', name: '高速离心机 H-1', calibration: '2026-09-01', note: '转子 R24A' },
    { id: 'i2', name: '酶标仪 M-2', calibration: '2026-07-05', note: '波长校准' }
  ];
  const results = [
    { id: 'rs1', label: 'OD600 菌液', value: 0.21, unit: '', time: '2026-07-13T10:00:00' },
    { id: 'rs2', label: 'OD600 菌液', value: 0.58, unit: '', time: '2026-07-13T11:00:00' },
    { id: 'rs3', label: 'OD600 菌液', value: 1.12, unit: '', time: '2026-07-13T12:00:00' },
    { id: 'rs4', label: 'OD600 菌液', value: 1.74, unit: '', time: '2026-07-13T13:00:00' }
  ];
  const todos = [
    { id: 't1', text: '把 B1 盒的外泌体样本 #7 转存至 −80℃ 主库', done: false, who: '小李' },
    { id: 't2', text: '离心机 H-1 校准到期前安排送检', done: false, who: '' }
  ];
  save(STORE.exp, experiments);
  save(STORE.reag, reagents);
  save(STORE.samples, samples);
  save(STORE.templates, DEFAULT_TEMPLATES.slice());
  save(STORE.instruments, instruments);
  save(STORE.incidents, []);
  save(STORE.results, results);
  save(STORE.todos, todos);
  localStorage.setItem(STORE.seeded, '1');
}

/* ---------------- 状态 ---------------- */
let currentView = 'overview';
let reagSeg = 'reag';
let reagFilter = 'all';
let reagSearch = '';
let freezerBox = 'B1';
let editingExpId = null;
let editingReagId = null;
let currentSteps = [];
let resultMetric = 'OD600 菌液';

/* ---------------- 工具 ---------------- */
function nowISO() { return new Date().toISOString(); }
function daysUntil(dateStr) {
  if (!dateStr || dateStr === '—') return Infinity;
  const d = (new Date(dateStr + 'T00:00:00') - new Date()) / 86400000;
  return Math.ceil(d);
}
function fmtDate(iso) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}月${d.getDate()}日 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
function reagStatus(r) {
  const days = daysUntil(r.expiry);
  if (days < 0) return { key: 'bad', text: '已过期' };
  if (days <= 7) return { key: 'bad', text: '临期·禁领' };
  if (days <= 30) return { key: 'warn', text: '临期<30天' };
  if (Number(r.qty) <= Number(r.min || 0)) return { key: 'warn', text: '需补货' };
  return { key: 'ok', text: '正常' };
}
function toast(msg) {
  const t = $('toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove('show'), 1800);
}

/* ---------------- 结构化解析（域感知） ---------------- */
function structure(raw) {
  const steps = [];
  const lines = String(raw).split(/[。\n；;]+/).map((s) => s.trim()).filter(Boolean);
  const unitRe = 'mg|g|kg|μg|ug|μL|ul|ml|mL|L|瓶|支|个|片|管|盒|袋|CV|min';
  lines.forEach((line) => {
    const step = { time: '', action: '', material: '', lot: '', amount: '', unit: '', param: '', note: '' };
    let s = line;
    const tm = s.match(/^(\d{1,2}[:：]\d{2})/);
    if (tm) { step.time = tm[1]; s = s.slice(tm[0].length).trim(); }
    const lotm = s.match(/批号?[：:\s]*([A-Za-z0-9\-]{2,})/i);
    if (lotm) { step.lot = lotm[1]; s = s.replace(lotm[0], ' ').trim(); }
    const amt = s.match(new RegExp('([\\d.]+)\\s*(' + unitRe + ')'));
    if (amt) { step.amount = amt[1]; step.unit = amt[2].replace('ul', 'μL').replace('ug', 'μg'); s = s.replace(amt[0], ' ').trim(); }
    const param = s.match(/(流速|转速|温度|离心|时间|压力|波长|pH|浓度|CV)[^，,；;]*/);
    if (param) { step.param = param[0].trim(); s = s.replace(param[0], ' ').trim(); }
    const act = s.match(/^(称取|称|取|加入|加|添加|离心|上样|收集|孵育|过滤|浓缩|透析|混匀|涡旋|静置|稀释|重悬|转移|平衡|洗脱|冲洗|洗涤|检测|测定|配制)/);
    if (act) { step.action = act[1]; s = s.replace(act[1], '').trim(); }
    step.material = s.replace(/^(了|到|入|至|用|进行|的)/, '').replace(/[，,；;]+$/, '').trim();
    if (step.time || step.action || step.material || step.lot || step.amount || step.param) steps.push(step);
  });
  return steps;
}

/* ---------------- 视图切换 ---------------- */
function switchView(view) {
  currentView = view;
  document.querySelectorAll('.view').forEach((v) => v.classList.add('hide'));
  $('view-' + view).classList.remove('hide');
  document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t.dataset.view === view));
  renderAll();
  if (window.scrollTo) window.scrollTo(0, 0);
}
function renderAll() {
  if (currentView === 'overview') renderOverview();
  else if (currentView === 'experiments') renderExperiments();
  else if (currentView === 'reagents') renderReagents();
  else if (currentView === 'tools') renderTools();
  else if (currentView === 'more') renderMore();
  setHeader();
  setFab();
}
function setHeader() {
  const exps = load(STORE.exp, []);
  const reags = load(STORE.reag, []);
  if (currentView === 'overview') {
    const d = new Date();
    const wd = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'][d.getDay()];
    $('viewTitle').textContent = '实验台';
    $('viewSub').textContent = `${d.getMonth() + 1}月${d.getDate()}日 ${wd}`;
  } else if (currentView === 'experiments') {
    $('viewTitle').textContent = '实验记录'; $('viewSub').textContent = `共 ${exps.length} 条`;
  } else if (currentView === 'reagents') {
    $('viewTitle').textContent = reagSeg === 'reag' ? '试剂库存' : '冻存库';
    $('viewSub').textContent = reagSeg === 'reag' ? `共 ${reags.length} 种` : `共 ${load(STORE.samples, []).length} 份`;
  } else if (currentView === 'tools') {
    $('viewTitle').textContent = '工具箱'; $('viewSub').textContent = '实验常用计算与小工具';
  } else if (currentView === 'more') {
    $('viewTitle').textContent = '更多'; $('viewSub').textContent = 'API · AI 设置 · 数据备份 · 功能引导';
  }
}
function setFab() {
  const fab = $('fab');
  if (currentView === 'experiments') { fab.classList.remove('hidden'); fab.textContent = '+'; }
  else if (currentView === 'reagents') { fab.classList.remove('hidden'); fab.textContent = '+'; }
  else { fab.classList.add('hidden'); }
}

function emptyState(title, sub) {
  return `<div class="empty"><svg viewBox="0 0 24 24"><path d="M6 3h12"/><path d="M7 3v6l-3 9a2 2 0 0 0 2 3h12a2 2 0 0 0 2-3l-3-9V3"/><path d="M10 12h4"/></svg><p><b>${esc(title)}</b></p><p>${esc(sub)}</p></div>`;
}

/* ---------------- 概览（紧凑统计条 + 快捷入口） ---------------- */
function renderOverview() {
  const exps = load(STORE.exp, []);
  const reags = load(STORE.reag, []);
  const weekAgo = Date.now() - 7 * 86400000;
  const weekExp = exps.filter((e) => new Date(e.createdAt).getTime() >= weekAgo).length;
  const expiring = reags.filter((r) => { const d = daysUntil(r.expiry); return d <= 30 && d >= 0; }).length;
  const expired = reags.filter((r) => daysUntil(r.expiry) < 0).length;
  const low = reags.filter((r) => Number(r.qty) <= Number(r.min || 0)).length;

  let html = `<div class="statbar">
    <div class="s"><span class="ico">📝</span><div class="num">${weekExp}</div><div class="lbl">本周记录</div></div>
    <div class="s"><span class="ico">🧪</span><div class="num">${reags.length}</div><div class="lbl">试剂种类</div></div>
    <div class="s"><span class="ico">⏳</span><div class="num">${expiring}</div><div class="lbl">30天临期</div></div>
    <div class="s"><span class="ico">🛒</span><div class="num">${low + expired}</div><div class="lbl">需处理</div></div>
  </div>`;

  // 快捷入口（从工具中自行配置，最多 8 个）
  const qt = getQuickTools();
  html += `<div class="section-title"><span>快捷工具</span><span class="more" onclick="openQuickConfig()">配置</span></div><div class="quick">`;
  qt.forEach((t) => {
    html += `<div class="q" onclick="${t.fn}"><div class="qi">${t.i}</div><div class="qt">${t.t}</div></div>`;
  });
  html += '</div>';

  // 预警
  const alerts = [];
  reags.forEach((r) => {
    const st = reagStatus(r);
    if (st.key === 'bad') alerts.push({ color: 'var(--red)', name: r.name, desc: `批号 ${r.lot} · ${st.text}（${r.expiry}）` });
    else if (st.key === 'warn' && st.text === '需补货') alerts.push({ color: 'var(--orange)', name: r.name, desc: `库存 ${r.qty}${r.unit} ≤ 安全库存 ${r.min}${r.unit}` });
    else if (st.key === 'warn') alerts.push({ color: 'var(--orange)', name: r.name, desc: `批号 ${r.lot} · ${st.text}（${r.expiry}）` });
  });
  if (alerts.length) {
    html += '<div class="section-title">需要关注</div>';
    alerts.forEach((a) => {
      html += `<div class="alert"><div class="dot" style="background:${a.color}"></div><div class="txt"><b>${esc(a.name)}</b><p>${esc(a.desc)}</p></div></div>`;
    });
  } else {
    html += '<div class="section-title">状态</div><div class="card"><div class="row1"><h3>一切正常</h3></div><div class="meta">无临期、过期或低库存试剂。</div></div>';
  }

  // 最近实验
  html += '<div class="section-title">最近实验</div>';
  exps.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 3).forEach((e) => {
    html += `<div class="card tap" onclick="openExpSheet('${e.id}')"><div class="row1"><h3>${esc(e.title)}</h3></div><div class="meta">${fmtDate(e.createdAt)} · ${e.steps.length} 个步骤</div><div class="snippet">${esc(e.raw)}</div></div>`;
  });
  if (!exps.length) {
    html += `<div class="empty"><svg viewBox="0 0 24 24"><path d="M6 3h12"/><path d="M7 3v6l-3 9a2 2 0 0 0 2 3h12a2 2 0 0 0 2-3l-3-9V3"/><path d="M10 12h4"/></svg><p><b>还没有实验记录</b></p><p>用语音或文字记录第一条</p><button class="btn" style="margin-top:14px" onclick="openExpSheet()">+ 新建实验记录</button></div>`;
  }

  $('view-overview').innerHTML = html;
}

/* ---------------- 实验记录 ---------------- */
function renderExperiments() {
  const exps = load(STORE.exp, []).slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  let html = '<div class="section-title">全部记录</div>';
  if (!exps.length) html += emptyState('还没有实验记录', '点下方 + 用语音或文字记录');
  else {
    exps.forEach((e) => {
      const lots = [...new Set(e.steps.map((s) => s.lot).filter(Boolean))];
      html += `<div class="card tap" onclick="openExpSheet('${e.id}')">
        <div class="row1"><h3>${esc(e.title)}</h3><span class="tag gray">${fmtDate(e.createdAt)}</span></div>
        <div class="meta">${e.steps.length} 个步骤${lots.length ? ' · 批号 ' + esc(lots.join('、')) : ''}</div>
        <div class="snippet">${esc(e.raw)}</div></div>`;
    });
  }
  $('view-experiments').innerHTML = html;
}

/* ---------------- 试剂 / 冻存 ---------------- */
function renderReagents() {
  if (reagSeg === 'freezer') return renderFreezer();
  const reags = load(STORE.reag, []);
  let list = reags.filter((r) => {
    if (reagSearch && !(r.name + r.lot + r.location).toLowerCase().includes(reagSearch.toLowerCase())) return false;
    if (reagFilter === 'all') return true;
    const st = reagStatus(r);
    if (reagFilter === 'expired') return daysUntil(r.expiry) < 0;
    if (reagFilter === 'expiring') return st.text.includes('临期');
    if (reagFilter === 'low') return st.text === '需补货';
    return true;
  });
  let html = `<div class="seg">
    <button class="${reagSeg === 'reag' ? 'active' : ''}" onclick="setReagSeg('reag')">试剂</button>
    <button class="${reagSeg === 'freezer' ? 'active' : ''}" onclick="setReagSeg('freezer')">冻存库</button>
  </div>`;
  html += `<input class="search" id="reagSearch" placeholder="搜索名称 / 批号 / 位置" value="${esc(reagSearch)}" oninput="onReagSearch(this.value)">`;
  html += '<div class="chips">';
  [['all', '全部'], ['expiring', '临期'], ['expired', '过期'], ['low', '需补货']].forEach(([k, l]) => {
    html += `<div class="chip ${reagFilter === k ? 'active' : ''}" onclick="setReagFilter('${k}')">${l}</div>`;
  });
  html += '</div>';
  if (!list.length) html += emptyState('没有符合条件的试剂', '调整筛选或点 + 添加');
  else {
    list.forEach((r) => {
      const st = reagStatus(r);
      const tagCls = st.key === 'ok' ? 'ok' : st.key === 'warn' ? 'warn' : 'bad';
      html += `<div class="card tap" onclick="openReagSheet('${r.id}')">
        <div class="row1"><h3>${esc(r.name)}</h3><span class="tag ${tagCls}">${st.text}</span></div>
        <div class="meta">批号 ${esc(r.lot)} · 库存 ${r.qty}${r.unit} · ${esc(r.location)} · 效期 ${esc(r.expiry)}</div></div>`;
    });
  }
  const needBuy = reags.filter((r) => Number(r.qty) <= Number(r.min || 0) || daysUntil(r.expiry) < 0 || (daysUntil(r.expiry) <= 30 && daysUntil(r.expiry) >= 0));
  if (needBuy.length) html += `<button class="btn secondary" style="margin-top:6px" onclick="openPurchase()">生成请购单（${needBuy.length}）</button>`;
  $('view-reagents').innerHTML = html;
}
function setReagSeg(s) { reagSeg = s; renderReagents(); setHeader(); }
function setReagFilter(f) { reagFilter = f; renderReagents(); }
function onReagSearch(v) { reagSearch = v; renderReagents(); }

function renderFreezer() {
  const samples = load(STORE.samples, []);
  const boxes = [...new Set(samples.map((s) => s.box))];
  if (!boxes.includes(freezerBox)) freezerBox = boxes[0] || 'B1';
  let html = `<div class="seg">
    <button class="${reagSeg === 'reag' ? 'active' : ''}" onclick="setReagSeg('reag')">试剂</button>
    <button class="${reagSeg === 'freezer' ? 'active' : ''}" onclick="setReagSeg('freezer')">冻存库</button>
  </div>`;
  html += '<div class="chips">';
  boxes.forEach((b) => { html += `<div class="chip ${freezerBox === b ? 'active' : ''}" onclick="setFreezerBox('${b}')">${b}</div>`; });
  html += '</div>';
  const here = samples.filter((s) => s.box === freezerBox);
  const inBox = {};
  here.forEach((s) => { inBox[s.row + s.col] = s; });
  const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  html += '<div class="freezer">';
  html += '<div class="colhead"></div>';
  for (let c = 1; c <= 12; c++) html += `<div class="colhead">${c}</div>`;
  rows.forEach((r) => {
    html += `<div class="colhead">${r}</div>`;
    for (let c = 1; c <= 12; c++) {
      const s = inBox[r + c];
      if (s) html += `<div class="cell filled" onclick="openSampleSheet('${s.id}')" title="${esc(s.name)}">${c}</div>`;
      else html += `<div class="cell" onclick="openSampleSheet(null,'${r}',${c})"></div>`;
    }
  });
  html += '</div>';
  html += `<div class="meta" style="margin-top:10px">点击空格新增样本，点击蓝格查看。本盒 ${here.length} / 96 份。</div>`;
  $('view-reagents').innerHTML = html;
}
function setFreezerBox(b) { freezerBox = b; renderFreezer(); }

/* ---------------- 工具箱 ---------------- */
function renderTools() {
  let html = '<div class="section-title">全部工具</div><div class="tool-grid">';
  ALL_TOOLS.forEach((t) => {
    html += `<div class="tool" onclick="${t.fn}"><div class="ti">${t.i}</div><div class="tt">${t.t}</div><div class="td">${esc(t.d)}</div></div>`;
  });
  html += '</div>';
  html += `<button class="btn secondary" style="margin-top:14px" onclick="openQuickConfig()">⚙️ 配置首页快捷工具</button>`;
  $('view-tools').innerHTML = html;
}

/* ---------------- 首页快捷工具配置 ---------------- */
function openQuickConfig() {
  const sel = getQuickTools().map((t) => t.key);
  let html = `<div class="grabber"></div><h2>配置首页快捷工具</h2>
    <p class="hint">从下方工具中选择最多 8 个显示在首页概览。当前已选 <span id="qcCount">${sel.length}</span>/8。</p><div class="list">`;
  ALL_TOOLS.forEach((t) => {
    const on = sel.includes(t.key);
    html += `<div class="list-row" onclick="toggleQuick('${t.key}')">
      <div class="lr-ico">${t.i}</div>
      <div class="lr-main"><div class="lr-title">${t.t}</div><div class="lr-sub">${esc(t.d)}</div></div>
      <div class="lr-right"><div class="check ${on ? 'on' : ''}" id="qc_${t.key}">${on ? '✓' : ''}</div></div></div>`;
  });
  html += '</div><div class="btn-row" style="margin-top:10px">\n    <button class="btn ghost" onclick="resetQuick()">恢复默认</button>\n    <button class="btn" onclick="closeSheet()">完成</button>\n  </div>';
  openSheet(html);
}
function resetQuick() {
  save(QUICK_KEY, DEFAULT_QUICK.slice());
  renderOverview();
  openQuickConfig();
  toast('已恢复默认快捷工具');
}
function toggleQuick(key) {
  let sel = getQuickTools().map((t) => t.key);
  if (sel.includes(key)) sel = sel.filter((k) => k !== key);
  else { if (sel.length >= 8) { toast('最多选择 8 个'); return; } sel.push(key); }
  save(QUICK_KEY, sel);
  const el = $('qc_' + key); if (el) { const on = sel.includes(key); el.classList.toggle('on', on); el.textContent = on ? '✓' : ''; }
  const c = $('qcCount'); if (c) c.textContent = sel.length;
  renderOverview();
}

/* ---------------- 更多（设置中心：API / AI / 备份 / 引导） ---------------- */
function renderMore() {
  const st = getSettings();
  const xfOk = iflytekReady();
  const agnesOk = agnesReady();
  let html = '<div class="section-title">API 与密钥</div>';
  html += `<div class="card">
    <div class="row1"><h3>讯飞语音听写</h3><span class="tag ${xfOk ? 'ok' : 'bad'}">${xfOk ? '已配置' : '未配置'}</span></div>
    <div class="kg-step"><span class="kg-num">1</span><div>
      <div class="kg-t">获取讯飞凭证</div>
      <div class="kg-d">① 打开 <a href="https://www.xfyun.cn/" target="_blank" rel="noopener">xfyun.cn</a> 注册并登录；② 控制台 → 创建应用，服务勾选「语音听写 iat」；③ 在应用详情复制下方三项并粘贴保存。</div>
    </div></div>
    <div class="field"><label>APPID</label><input id="xfAppid" type="text" value="${st.xfAppid ? esc(st.xfAppid) : ''}" placeholder="留空=使用内置代理（推荐）"></div>
    <div class="field"><label>APIKey</label><input id="xfApiKey" type="text" value="${st.xfApiKey ? esc(st.xfApiKey) : ''}" placeholder="${st.xfApiKey ? '讯飞 APIKey' : '留空=使用内置代理（推荐）'}"></div>
    <div class="field"><label>APISecret</label><input id="xfApiSecret" type="password" value="${st.xfApiSecret ? esc(st.xfApiSecret) : ''}" placeholder="${st.xfApiSecret ? '讯飞 APISecret' : '留空=使用内置代理（推荐）'}"></div>
    <button class="btn secondary" onclick="saveXfKey()">保存讯飞配置</button>
    <div class="help">留空即使用内置代理（由 Cloudflare Worker 转发签名，密钥不暴露在前端）；想用自己的账号请粘贴上方三项再保存。</div>
  </div>`;
  html += `<div class="card" style="margin-top:12px">
    <div class="row1"><h3>AI 智能整理</h3><span class="tag ${agnesOk ? 'ok' : 'bad'}">${agnesOk ? '已配置' : '未配置'}</span></div>
    <div class="kg-step"><span class="kg-num">2</span><div>
      <div class="kg-t">获取 Agnes Key</div>
      <div class="kg-d">留空即可使用内置代理（由 Cloudflare Worker 转发，无需 Key，Key 不暴露在前端）；也可粘贴自己的 Agnes Key 直连 <a href="https://agnes-ai.com/" target="_blank" rel="noopener">agnes-ai.com</a>。</div>
    </div></div>
    <div class="field"><label>Agnes API Key</label><input id="agnesKey" type="password" value="${st.agnesKey ? esc(st.agnesKey) : ''}" placeholder="${st.agnesKey ? 'Agnes API Key' : '留空=使用内置代理（推荐）'}"></div>
    <button class="btn secondary" onclick="saveAgnesKey()">保存 Agnes 配置</button>
    <div class="help">未填写将自动使用内置默认凭证，可直接体验；想用自己的账号请粘贴上方 Key 再保存。</div>
  </div>`;
  html += '<div class="section-title">数据备份</div>';
  html += `<button class="btn" onclick="exportData()">📤 导出全部数据</button>
    <button class="btn secondary" style="margin-top:10px" onclick="pickImport()">📥 导入数据</button>
    <input id="importFile" type="file" accept="application/json,.json" style="display:none" onchange="onImportFile(this)">
    <div class="help">导出为 JSON 文件；换设备时导入即可恢复全部记录与配置。</div>`;
  html += '<div class="section-title">帮助</div>';
  html += `<div class="list-row" onclick="openOnboarding()"><div class="lr-ico">👋</div><div class="lr-main"><div class="lr-title">功能引导</div><div class="lr-sub">重新查看功能介绍与密钥配置提示</div></div><div class="lr-right">›</div></div>`;
  $('view-more').innerHTML = html;
}
function toggleVoice() {
  const st = getSettings(); st.voiceOn = !st.voiceOn; setSettings(st);
  const sw = $('swVoice'); if (sw) sw.classList.toggle('on', st.voiceOn);
  if (st.voiceOn) speak('语音提示已开启');
}

/* ============================================================
   实验记录 Sheet（含语音/讯飞）
   ============================================================ */
function openExpSheet(id) {
  editingExpId = id || null;
  currentSteps = [];
  const exp = id ? load(STORE.exp, []).find((e) => e.id === id) : null;
  if (exp) currentSteps = JSON.parse(JSON.stringify(exp.steps || []));
  const title = exp ? exp.title : '';
  const raw = exp ? exp.raw : '';
  const operator = exp ? exp.operator : '实验员';

  let html = `<div class="grabber"></div><h2>${exp ? '实验记录' : '新建实验记录'}</h2>
    <p class="hint">点击麦克风说话，文字自动进入“原始记录”；可再次点击麦克风继续补充。单次录音最长 60 秒（讯飞限制）。</p>
    <div class="field">
      <label>原始记录（可语音或手填，支持多次追加）</label>
      <div class="voice">
        <button class="mic" id="micBtn" title="语音输入">
          <svg viewBox="0 0 24 24"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><path d="M12 18v3"/></svg>
        </button>
        <div class="vlabel" id="vlabel">点击说话，自动转为记录</div>
        <button class="vtoggle" id="voiceToggle" title="语音提示开关">🔊 语音提示</button>
      </div>
      <textarea id="expRaw" placeholder="例：14:00 取外泌体样本 2 mL 批号 EV-2607 转入超滤管；15:00 4000 g 离心 10 min">${esc(raw)}</textarea>
    </div>
    <div class="field"><label>标题</label><input id="expTitle" value="${esc(title)}" placeholder="如：外泌体浓缩"></div>
    <div class="field"><label>记录人</label><input id="expOp" value="${esc(operator)}" placeholder="操作人"></div>
    <div class="btn-row" style="margin-top:6px">
      <button class="btn secondary" id="structureBtn">整理为结构化步骤</button>
      <button class="btn ghost" id="aiBtn" onclick="aiStructure()">🤖 AI 智能整理</button>
    </div>
    <div id="stepList" style="margin-top:14px"></div>
    <div class="btn-row" style="margin-top:16px">
      ${exp ? '<button class="btn danger" onclick="deleteExp()">删除</button>' : ''}
      <button class="btn" onclick="saveExp()">保存记录</button>
    </div>
    ${exp ? '' : '<button class="btn ghost" style="margin-top:10px" onclick="saveExpAsTemplate()">存为模板</button>'}`;

  openSheet(html);
  if (exp) renderSteps();
  bindMic();
}
function renderSteps() {
  const box = $('stepList');
  if (!currentSteps.length) { box.innerHTML = ''; return; }
  let html = '<div class="section-title">结构化步骤（可修改）</div>';
  currentSteps.forEach((s, i) => {
    html += `<div class="step">
      <div class="sidx">步骤 ${i + 1}</div>
      <div class="srow">
        <input data-i="${i}" data-f="time" value="${esc(s.time)}" placeholder="时间">
        <input data-i="${i}" data-f="action" value="${esc(s.action)}" placeholder="动作">
      </div>
      <div class="srow"><input data-i="${i}" data-f="material" value="${esc(s.material)}" placeholder="物料/对象"></div>
      <div class="srow">
        <input data-i="${i}" data-f="lot" value="${esc(s.lot)}" placeholder="批号">
        <input data-i="${i}" data-f="amount" value="${esc(s.amount)}" placeholder="用量" style="max-width:90px">
        <input data-i="${i}" data-f="unit" value="${esc(s.unit)}" placeholder="单位" style="max-width:80px">
      </div>
      <div class="srow"><input data-i="${i}" data-f="param" value="${esc(s.param)}" placeholder="参数（流速/离心力等）"></div>
    </div>`;
  });
  box.innerHTML = html;
  box.querySelectorAll('input').forEach((inp) => {
    inp.addEventListener('input', () => { currentSteps[+inp.dataset.i][inp.dataset.f] = inp.value; });
  });
}

/* ---------------- 语音：Web Speech 兜底 ---------------- */
function bindWebSpeech(btn) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { btn.style.opacity = .4; btn.onclick = () => toast('当前浏览器不支持语音，请手动输入'); return; }
  let rec;
  btn.onclick = () => {
    if (rec && rec._on) { rec.stop(); return; }
    rec = new SR();
    rec.lang = 'zh-CN'; rec.interimResults = false; rec.maxAlternatives = 1; rec._on = true;
    $('vlabel').textContent = '正在聆听…说完自动停止';
    btn.classList.add('recording');
    const ta0 = $('expRaw'); if (ta0) ta0.classList.add('listening');
    speak('请开始说话');
    rec.onresult = (e) => {
      const text = e.results[0][0].transcript;
      const t = $('expRaw');
      t.value = t.value ? t.value + (t.value.endsWith('；') || t.value.endsWith(';') || t.value.endsWith('。') ? '' : '；') + text : text;
      t.scrollTop = t.scrollHeight;
    };
    rec.onerror = () => { toast('语音识别失败，请手动输入'); };
    rec.onend = () => { rec._on = false; btn.classList.remove('recording'); $('vlabel').textContent = '点击说话，自动转为记录'; const t = $('expRaw'); if (t) t.classList.remove('listening'); if (rec && !rec._on) speak('已记录'); setTimeout(aiStructure, 300); };
    try { rec.start(); } catch (e) { rec._on = false; btn.classList.remove('recording'); }
  };
}

/* ---------------- 讯飞语音听写（WebSocket，密钥经 Worker 代理） ---------------- */
function xfCreds() {
  const st = getSettings();
  const appid = (st.xfAppid || '').trim();
  const apiKey = (st.xfApiKey || '').trim();
  const apiSecret = (st.xfApiSecret || '').trim();
  if (appid && apiKey && apiSecret) return { appid, apiKey, apiSecret, useProxy: false }; // 用户自己的凭证：浏览器直连签名
  if (AGNES_PROXY) return { appid: '', apiKey: '', apiSecret: '', useProxy: true };        // 走代理，密钥在 Worker 端
  return { appid: '', apiKey: '', apiSecret: '', useProxy: false };                        // 都没配：不可用
}
function iflytekReady() {
  const st = getSettings();
  const hasUser = !!(st.xfAppid && st.xfApiKey && st.xfApiSecret);
  return hasUser || !!AGNES_PROXY;
}

/* 内置默认 Agnes Key，便于开箱即用；用户可在「设置 → AI 智能整理」覆盖。 */
function agnesCreds() {
  const st = getSettings();
  const userKey = (st.agnesKey || '').trim();
  if (userKey) return { key: userKey, useProxy: false }; // 用户自己的 Key：直连 agnes-ai.com
  if (AGNES_PROXY) return { key: '', useProxy: true };    // 走代理，Key 在 Worker 端
  return { key: '', useProxy: false };                    // 都没配：不可用
}
function agnesReady() {
  const st = getSettings();
  return !!(st.agnesKey && st.agnesKey.trim()) || !!AGNES_PROXY;
}
let voiceOn = getSettings().voiceOn;
function speak(text) {
  if (!voiceOn || !window.speechSynthesis) return;
  try { const u = new SpeechSynthesisUtterance(text); u.lang = 'zh-CN'; u.rate = 1.05; u.pitch = 1; speechSynthesis.cancel(); speechSynthesis.speak(u); } catch (e) {}
}
function bindVoiceToggle() {
  const b = $('voiceToggle'); if (!b) return;
  b.textContent = voiceOn ? '🔊 语音提示' : '🔇 语音提示';
  b.onclick = () => { voiceOn = !voiceOn; const st = getSettings(); st.voiceOn = voiceOn; setSettings(st); b.textContent = voiceOn ? '🔊 语音提示' : '🔇 语音提示'; if (voiceOn) speak('语音提示已开启'); };
}
function base64Bytes(bytes) { let bin = ''; for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]); return btoa(bin); }
function mergeXfSeg(seg, t, pgs, rg) {
  if (pgs === 'rpl' && Array.isArray(rg) && rg.length === 2) return seg.slice(0, rg[0]) + t + seg.slice(rg[1] + 1);
  return seg + t;
}
async function iflytekAuthUrl() {
  const c = xfCreds();
  const host = 'iat-api.xfyun.cn';
  const date = new Date().toUTCString();
  const reqLine = 'GET /v2/iat HTTP/1.1';
  const origin = `host: ${host}\ndate: ${date}\n${reqLine}`;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(c.apiSecret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(origin)));
  const signature = base64Bytes(sig);
  const authOrigin = `api_key="${c.apiKey}", algorithm="hmac-sha256", headers="host date request-line", signature="${signature}"`;
  const authorization = base64Bytes(enc.encode(authOrigin));
  return `wss://${host}/v2/iat?authorization=${encodeURIComponent(authorization)}&date=${encodeURIComponent(date)}&host=${host}`;
}
function bindMic() {
  const btn = $('micBtn'); if (!btn) return;
  if (iflytekReady()) { bindIflytek(btn); return; }
  bindWebSpeech(btn);
}
function bindIflytek(btn) {
  let ctx, stream, proc, ws, timer, maxTimer, buf = [], first = true, sending = false, seg = '', segBase = '';
  const ta = () => $('expRaw');
  function renderRaw() {
    const t = ta(); if (!t) return;
    let v = segBase || '';
    if (seg) { if (v && !/[；;。]$/.test(v)) v += '；'; v += seg; }
    t.value = v; t.scrollTop = t.scrollHeight;
  }
  btn.onclick = async () => {
    if (sending) { stop(); return; }
    sending = true; seg = ''; segBase = (ta() ? ta().value : '');
    try { stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, sampleRate: 16000 } }); }
    catch (e) { sending = false; toast('无法访问麦克风，请检查授权'); return; }
    const t0 = ta(); if (t0) t0.classList.add('listening');
    const AC = window.AudioContext || window.webkitAudioContext;
    ctx = new AC();
    const src = ctx.createMediaStreamSource(stream);
    proc = ctx.createScriptProcessor(4096, 1, 1);
    proc.onaudioprocess = (e) => { buf.push(new Float32Array(e.inputBuffer.getChannelData(0))); };
    src.connect(proc); proc.connect(ctx.destination);
    btn.classList.add('recording');
    $('vlabel').textContent = '正在聆听…再次点击结束';
    speak('请开始说话');
    maxTimer = setTimeout(() => { speak('已到时长上限'); toast('已达讯飞单次上限 60 秒，已自动停止'); stop(); }, 58000);
    try {
      const c = xfCreds();
      ws = c.useProxy ? new WebSocket(proxyWsUrl()) : new WebSocket(await iflytekAuthUrl());
    }
    catch (e) { toast('讯飞连接失败'); stop(); return; }
    ws.onopen = () => { timer = setInterval(flush, 40); };
    ws.onmessage = (ev) => {
      try {
        const j = JSON.parse(ev.data);
        if (j.code !== 0) { toast('讯飞错误 ' + j.code + ' ' + j.message); stop(); return; }
        const r = j.data && j.data.result;
        if (r && r.ws) {
          let t = ''; r.ws.forEach((w) => w.cw && w.cw.forEach((c) => t += c.w));
          if (t) { seg = mergeXfSeg(seg, t, r.pgs, r.rg); renderRaw(); }
        }
      } catch (e) {}
    };
    ws.onerror = () => { toast('讯飞连接异常'); stop(); };
  };
  function flush() {
    if (!buf.length) return;
    let len = 0; buf.forEach((c) => len += c.length);
    const flat = new Float32Array(len); let o = 0; buf.forEach((c) => { flat.set(c, o); o += c.length; });
    buf = [];
    const ctxRate = ctx ? ctx.sampleRate : 16000;
    const ratio = ctxRate / 16000, n = Math.round(flat.length / ratio), out = new Int16Array(n);
    for (let i = 0; i < n; i++) { const s = Math.max(-1, Math.min(1, flat[Math.min(flat.length - 1, Math.floor(i * ratio))]));
      out[i] = s < 0 ? s * 0x8000 : s * 0x7FFF; }
    const status = first ? 0 : 1; first = false;
    const b64 = base64Bytes(new Uint8Array(out.buffer));
    const frame = { data: { status, format: 'audio/L16;rate=16000', encoding: 'raw', audio: b64 } };
    if (status === 0) { const c = xfCreds(); frame.common = c.useProxy ? {} : { app_id: c.appid }; frame.business = { language: 'zh_cn', domain: 'iat', accent: 'mandarin', vad_eos: 2000 }; }
    if (ws && ws.readyState === 1) ws.send(JSON.stringify(frame));
  }
  function stop() {
    try { if (timer) clearInterval(timer); } catch (e) {}
    try { if (maxTimer) clearTimeout(maxTimer); } catch (e) {}
    try { if (first === false && ws && ws.readyState === 1) ws.send(JSON.stringify({ data: { status: 2 } })); } catch (e) {}
    try { if (ws) ws.close(); } catch (e) {}
    try { if (proc) proc.disconnect(); if (stream) stream.getTracks().forEach((t) => t.stop()); } catch (e) {}
    if (ctx) ctx.close();
    sending = false; first = true; buf = [];
    const t = ta(); if (t) t.classList.remove('listening');
    btn.classList.remove('recording'); $('vlabel').textContent = '点击说话，自动转为记录'; speak('已记录');
    setTimeout(aiStructure, 300);
  }
}
function saveExp() {
  const title = $('expTitle').value.trim() || '未命名实验';
  const raw = $('expRaw').value.trim();
  const operator = $('expOp').value.trim() || '实验员';
  if (!raw) { toast('请先填写或语音记录内容'); return; }
  if (!currentSteps.length) currentSteps = structure(raw);
  const exps = load(STORE.exp, []);
  if (editingExpId) {
    const i = exps.findIndex((e) => e.id === editingExpId);
    exps[i] = { ...exps[i], title, raw, operator, steps: currentSteps };
  } else {
    exps.push({ id: uid('e'), title, raw, operator, createdAt: nowISO(), steps: currentSteps });
  }
  save(STORE.exp, exps); closeSheet(); toast('已保存'); renderAll();
}
function saveExpAsTemplate() {
  const raw = $('expRaw').value.trim();
  const title = ($('expTitle').value.trim()) || '未命名实验';
  if (!raw) { toast('请先记录内容再存为模板'); return; }
  const templates = load(STORE.templates, []);
  templates.push({ id: uid('tp'), title, raw });
  save(STORE.templates, templates);
  toast('已存为模板'); closeSheet();
}
function deleteExp() {
  if (!editingExpId) return;
  const exps = load(STORE.exp, []).filter((e) => e.id !== editingExpId);
  save(STORE.exp, exps); closeSheet(); renderAll(); toast('已删除');
}

/* ---------------- 试剂 Sheet ---------------- */
function openReagSheet(id) {
  editingReagId = id || null;
  const r = id ? load(STORE.reag, []).find((x) => x.id === id) : null;
  const v = (k) => (r ? esc(r[k]) : '');
  let html = `<div class="grabber"></div><h2>${r ? '试剂详情' : '添加试剂'}</h2>
    <p class="hint">记录批号、效期与安全库存，系统自动提醒临期与补货。</p>
    <div class="field"><label>名称</label><input id="rName" value="${v('name')}" placeholder="如：PBS 缓冲液"></div>
    <div class="field"><label>批号</label><input id="rLot" value="${v('lot')}" placeholder="如：PB2605"></div>
    <div class="field"><label>数量 / 单位</label>
      <div style="display:flex;gap:10px"><input id="rQty" type="number" value="${v('qty')}" placeholder="数量" style="flex:1"><input id="rUnit" value="${v('unit') || '瓶'}" placeholder="单位" style="max-width:120px"></div></div>
    <div class="field"><label>存放位置</label><input id="rLoc" value="${v('location')}" placeholder="如：4℃柜A"></div>
    <div class="field"><label>有效期</label><input id="rExp" type="date" value="${v('expiry')}"></div>
    <div class="field"><label>安全库存（低于即提醒补货）</label><input id="rMin" type="number" value="${v('min') || 0}" placeholder="如：1"></div>
    <div class="field"><label>供应商</label><input id="rSup" value="${v('supplier')}" placeholder="选填"></div>
    <div class="btn-row" style="margin-top:8px">
      ${r ? '<button class="btn danger" onclick="deleteReag()">删除</button>' : ''}
      <button class="btn" onclick="saveReag()">保存</button>
    </div>`;
  openSheet(html);
}
function saveReag() {
  const name = $('rName').value.trim();
  if (!name) { toast('请填写名称'); return; }
  const r = { name, lot: $('rLot').value.trim(), qty: $('rQty').value, unit: $('rUnit').value.trim() || '瓶',
    location: $('rLoc').value.trim(), expiry: $('rExp').value, min: $('rMin').value || 0, supplier: $('rSup').value.trim() };
  const reags = load(STORE.reag, []);
  if (editingReagId) { const i = reags.findIndex((x) => x.id === editingReagId); reags[i] = { ...reags[i], ...r }; }
  else reags.push({ id: uid('r'), ...r });
  save(STORE.reag, reags); closeSheet(); toast('已保存'); renderAll();
}
function deleteReag() {
  if (!editingReagId) return;
  const reags = load(STORE.reag, []).filter((x) => x.id !== editingReagId);
  save(STORE.reag, reags); closeSheet(); renderAll(); toast('已删除');
}

/* ---------------- 冻存样本 Sheet ---------------- */
function openSampleSheet(id, row, col) {
  const s = id ? load(STORE.samples, []).find((x) => x.id === id) : null;
  const v = (k) => (s ? esc(s[k]) : '');
  const r = s ? s.row : (row || 'A');
  const c = s ? s.col : (col || 1);
  let html = `<div class="grabber"></div><h2>${s ? '样本详情' : '新增样本'}</h2>
    <p class="hint">位置 ${freezerBox} · ${r}${c}</p>
    <div class="field"><label>名称</label><input id="sName" value="${v('name')}" placeholder="如：pET28a 质粒"></div>
    <div class="field"><label>类型</label><input id="sType" value="${v('type') || '样本'}" placeholder="质粒/细胞系/引物/样本"></div>
    <div class="field"><label>备注</label><input id="sNote" value="${v('note')}" placeholder="浓度/代数等"></div>
    <div class="field"><label>效期</label><input id="sExp" type="date" value="${v('expiry')}"></div>
    <div class="btn-row" style="margin-top:8px">
      ${s ? '<button class="btn danger" onclick="deleteSample()">删除</button>' : ''}
      <button class="btn" onclick="saveSample('${freezerBox}','${r}',${c})">保存</button>
    </div>`;
  openSheet(html);
}
function saveSample(box, row, col) {
  const name = $('sName').value.trim();
  if (!name) { toast('请填写名称'); return; }
  const data = { name, type: $('sType').value.trim() || '样本', note: $('sNote').value.trim(), expiry: $('sExp').value, box, row, col };
  const samples = load(STORE.samples, []);
  if (editingSampleId) { const i = samples.findIndex((x) => x.id === editingSampleId); samples[i] = { ...samples[i], ...data }; }
  else samples.push({ id: uid('s'), ...data });
  save(STORE.samples, samples); closeSheet(); renderAll(); toast('已保存');
}
let editingSampleId = null;
function deleteSample() {
  if (!editingSampleId) return;
  const samples = load(STORE.samples, []).filter((x) => x.id !== editingSampleId);
  save(STORE.samples, samples); closeSheet(); renderAll(); toast('已删除');
}
// 复用 openSampleSheet 时记录 editingSampleId
const _openSampleSheet = openSampleSheet;
openSampleSheet = function (id, row, col) {
  editingSampleId = id || null;
  _openSampleSheet(id, row, col);
};

/* ---------------- 请购单 ---------------- */
function openPurchase() {
  const reags = load(STORE.reag, []);
  const need = reags.filter((r) => Number(r.qty) <= Number(r.min || 0) || daysUntil(r.expiry) < 0 || (daysUntil(r.expiry) <= 30 && daysUntil(r.expiry) >= 0));
  let lines = '请购单（自动生成）\n';
  let html = '<div class="grabber"></div><h2>请购单</h2><p class="hint">系统根据“低库存 + 临期/过期”自动汇总，可复制后走采购流程。</p>';
  if (!need.length) html += emptyState('暂无需采购项', '');
  else {
    need.forEach((r) => {
      const reason = daysUntil(r.expiry) < 0 ? '已过期' : daysUntil(r.expiry) <= 30 ? `临期(${r.expiry})` : '低于安全库存';
      const suggest = Math.max(Number(r.min) * 3 - Number(r.qty), Number(r.min));
      html += `<div class="purchase-item"><span><b>${esc(r.name)}</b> · ${esc(r.lot)}<br><span style="color:var(--muted);font-size:12px">${reason} · 供应商 ${esc(r.supplier || '—')}</span></span><span style="text-align:right">建议 ${suggest}${esc(r.unit)}</span></div>`;
      lines += `- ${r.name} | 批号 ${r.lot} | 建议采购 ${suggest}${r.unit} | 原因：${reason} | 供应商：${r.supplier || '—'}\n`;
    });
    html += `<div class="copy-box" id="poText">${esc(lines)}</div>
      <button class="btn" style="margin-top:14px" onclick="copyPO()">复制请购单</button>`;
  }
  openModal(html);
}
function copyPO() { const t = $('poText').textContent; navigator.clipboard?.writeText(t).then(() => toast('已复制'), () => toast('复制失败')); }

/* ============================================================
   计时器：跳手机原生 App（跨平台适配）
   ============================================================ */
let webTimerId = null, webTimerEnd = 0, _wakeLock = null, webTimerLabel = '';
function openTimerTool() {
  let html = `<div class="grabber"></div><h2>计时器</h2>
    <p class="hint">点“启动手机计时器”直接唤起安卓时钟 / iPhone 日历闹钟（自动适配）。也可使用网页计时兜底。</p>
    <div class="field"><label>时长（分钟）</label><input id="tMin" type="number" value="10" min="0.1" step="0.5"></div>
    <div class="field"><label>标签（可选）</label><input id="tLabel" placeholder="如：A 管 4000g 离心"></div>
    <div class="timer-presets">
      <div class="p" onclick="setTimerPreset(5)">5 分</div>
      <div class="p" onclick="setTimerPreset(10)">10 分</div>
      <div class="p" onclick="setTimerPreset(15)">15 分</div>
      <div class="p" onclick="setTimerPreset(30)">30 分</div>
      <div class="p" onclick="setTimerPreset(60)">60 分</div>
    </div>
    <button class="btn" onclick="launchPhoneTimer()">启动手机计时器</button>
    <button class="btn secondary" style="margin-top:10px" onclick="startWebTimer()">用网页计时（需保持屏幕常亮）</button>
    <div class="timer-result" id="webTimer">
      <div class="timer-big" id="wtBig">00:00</div>
      <div class="timer-actions"><button class="btn danger" onclick="stopWebTimer()">停止</button></div>
    </div>`;
  openSheet(html);
}
function setTimerPreset(m) { const e = $('tMin'); if (e) e.value = m; }
function launchPhoneTimer() {
  const min = parseFloat($('tMin').value) || 10;
  const sec = Math.round(min * 60);
  const label = ($('tLabel').value || '实验计时').slice(0, 40);
  const ua = navigator.userAgent;
  const isAndroid = /Android/i.test(ua);
  const isIOS = /iPhone|iPad|iPod/i.test(ua);
  if (isAndroid) {
    const intent = `intent://com.google.android.deskclock/#Intent;action=android.intent.action.SET_TIMER;package=com.google.android.deskclock;S.android.intent.extra.MESSAGE=${encodeURIComponent(label)};i.android.intent.extra.LENGTH_SECONDS=${sec};end`;
    toast('正在唤起手机计时器…');
    window.location.href = intent;
    setTimeout(() => { toast('若未自动跳转，请手动打开时钟 App 设置计时'); }, 1800);
  } else if (isIOS) {
    iosCalendarTimer(sec, label);
  } else {
    startWebTimer();
  }
}
function iosCalendarTimer(sec, label) {
  const start = new Date(Date.now() + sec * 1000);
  const pad = (n) => String(n).padStart(2, '0');
  const fmt = (d) => `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
  const ics = `BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//bench//CN\nBEGIN:VEVENT\nUID:${Date.now()}@bench\nDTSTAMP:${fmt(new Date())}\nDTSTART:${fmt(start)}\nDTEND:${fmt(new Date(start.getTime() + 60000))}\nSUMMARY:${label}\nBEGIN:VALARM\nTRIGGER:-PT0S\nACTION:DISPLAY\nDESCRIPTION:${label}\nEND:VALARM\nEND:VEVENT\nEND:VCALENDAR`;
  toast('已生成日历提醒，点“添加”即可在手机上计时');
  window.location.href = 'data:text/calendar;charset=utf-8,' + encodeURIComponent(ics);
}
function startWebTimer() {
  webTimerLabel = ($('tLabel').value || '计时结束').slice(0, 60);
  const min = parseFloat($('tMin').value) || 10;
  const sec = Math.round(min * 60);
  webTimerEnd = Date.now() + sec * 1000;
  const box = $('webTimer'); if (box) box.classList.add('show');
  tickWebTimer();
  clearInterval(webTimerId);
  webTimerId = setInterval(tickWebTimer, 250);
  try { if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission().catch(() => {}); } catch (e) {}
  try { if (navigator.wakeLock) navigator.wakeLock.request('screen').then((l) => { _wakeLock = l; }).catch(() => {}); } catch (e) {}
}
function tickWebTimer() {
  const left = Math.max(0, Math.round((webTimerEnd - Date.now()) / 1000));
  const m = Math.floor(left / 60), s = left % 60;
  const big = $('wtBig'); if (big) big.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  if (left <= 0) { stopWebTimer(); fireTimerAlarm(webTimerLabel); }
}
function stopWebTimer() {
  clearInterval(webTimerId);
  const box = $('webTimer'); if (box) box.classList.remove('show');
  try { if (_wakeLock) { _wakeLock.release(); _wakeLock = null; } } catch (e) {}
}
function beep() {
  try {
    const C = window.AudioContext || window.webkitAudioContext; const c = new C();
    [0, 0.2, 0.4, 0.6, 0.8, 1.0].forEach((t) => {
      const o = c.createOscillator(), g = c.createGain(); o.type = 'square';
      o.frequency.value = (Math.round(t * 10) % 4 === 0) ? 1046 : 784;
      o.connect(g); g.connect(c.destination);
      const tm = c.currentTime + t;
      o.start(tm); g.gain.setValueAtTime(0.0001, tm);
      g.gain.exponentialRampToValueAtTime(0.8, tm + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, tm + 0.16);
      o.stop(tm + 0.18);
    });
  } catch (e) {}
}

let alarmIv = null, alarmTo = null;
function fireTimerAlarm(label) {
  const ring = () => {
    beep();
    if (navigator.vibrate) try { navigator.vibrate([300, 150, 300, 150, 300]); } catch (e) {}
  };
  ring();
  if (alarmIv) clearInterval(alarmIv);
  alarmIv = setInterval(ring, 1300);
  alarmTo = setTimeout(stopAlarm, 30000);
  if ('Notification' in window && Notification.permission === 'granted') {
    try { new Notification('⏰ 时间到', { body: label || '计时结束', tag: 'bench-timer' }); } catch (e) {}
  }
  const ov = $('alarmOverlay');
  if (ov) { ov.querySelector('.alarm-label').textContent = label || '计时结束'; ov.classList.add('show'); }
}
function stopAlarm() {
  if (alarmIv) { clearInterval(alarmIv); alarmIv = null; }
  if (alarmTo) { clearTimeout(alarmTo); alarmTo = null; }
  if (navigator.vibrate) try { navigator.vibrate(0); } catch (e) {}
  const ov = $('alarmOverlay'); if (ov) ov.classList.remove('show');
}

/* ============================================================
   缓冲液配制计算器
   ============================================================ */
const RECIPES = {
  '1×PBS': { perL: [['NaCl', 8.0, 'g'], ['KCl', 0.2, 'g'], ['Na₂HPO₄', 1.42, 'g'], ['KH₂PO₄', 0.27, 'g']] },
  '10×PBS': { perL: [['NaCl', 80.0, 'g'], ['KCl', 2.0, 'g'], ['Na₂HPO₄', 14.2, 'g'], ['KH₂PO₄', 2.7, 'g']] },
  '1M Tris-HCl(pH8.0)': { perL: [['Tris 碱', 121.14, 'g']] },
  '0.5M EDTA(pH8.0)': { perL: [['EDTA-Na₂·2H₂O', 186.1, 'g']] },
  'LB 肉汤': { perL: [['胰蛋白胨', 10.0, 'g'], ['酵母提取物', 5.0, 'g'], ['NaCl', 10.0, 'g']] },
  '50×TAE': { perL: [['Tris 碱', 242.0, 'g'], ['Na₂EDTA·2H₂O', 37.2, 'g'], ['冰乙酸', 57.1, 'mL']] }
};
function openBufferTool() {
  const opts = Object.keys(RECIPES).map((k) => `<option value="${k}">${k}</option>`).join('');
  let html = `<div class="grabber"></div><h2>缓冲液配制</h2>
    <p class="hint">选择配方与目标体积，自动给出各组分称量质量。</p>
    <div class="field"><label>配方</label><select id="bufRecipe">${opts}</select></div>
    <div class="field"><label>目标体积（mL）</label><input id="bufVol" type="number" value="500" min="1"></div>
    <button class="btn" onclick="calcBuffer()">计算</button>
    <div id="bufOut"></div>`;
  openSheet(html);
}
function calcBuffer() {
  const r = RECIPES[$('bufRecipe').value];
  const volL = (parseFloat($('bufVol').value) || 0) / 1000;
  if (!r || !volL) { toast('请填写体积'); return; }
  let h = `<div class="out">`;
  r.perL.forEach(([name, perL, unit]) => {
    const amt = (perL * volL);
    const disp = amt >= 10 ? amt.toFixed(1) : amt.toFixed(3);
    h += `<div class="line"><span>${esc(name)}</span><b>${disp} ${unit}</b></div>`;
  });
  h += `<div class="line"><span>定容至</span><b>${parseFloat($('bufVol').value)} mL</b></div></div>
    <div class="help">数据取自常用配方，实际请按实验 SOP 与 pH 调整复核。</div>`;
  $('bufOut').innerHTML = h;
}

/* ============================================================
   离心力换算 RPM ↔ g
   ============================================================ */
function openRcfTool() {
  let html = `<div class="grabber"></div><h2>离心力换算</h2>
    <p class="hint">相对离心力 g = 1.118×10⁻⁶ × r(毫米) × RPM²。输入半径 + 任一项即可互算。</p>
    <div class="field"><label>转子半径（mm）</label><input id="rcfR" type="number" value="100"></div>
    <div class="field"><label>转速 RPM</label><input id="rcfRpm" type="number" placeholder="如 4000"></div>
    <div class="field"><label>相对离心力 g</label><input id="rcfG" type="number" placeholder="如 3000"></div>
    <button class="btn" onclick="calcRcf()">计算</button>
    <div id="rcfOut"></div>`;
  openSheet(html);
}
function calcRcf() {
  const r = parseFloat($('rcfR').value);
  const rpm = $('rcfRpm').value === '' ? null : parseFloat($('rcfRpm').value);
  const g = $('rcfG').value === '' ? null : parseFloat($('rcfG').value);
  if (!r) { toast('请填写半径'); return; }
  if (rpm != null && g == null) {
    const gg = 1.118e-6 * r * rpm * rpm;
    $('rcfG').value = gg.toFixed(0);
    $('rcfOut').innerHTML = `<div class="out"><div class="line"><span>相对离心力</span><b>${gg.toFixed(0)} ×g</b></div></div>`;
  } else if (g != null && rpm == null) {
    const rr = Math.sqrt(g / (1.118e-6 * r));
    $('rcfRpm').value = rr.toFixed(0);
    $('rcfOut').innerHTML = `<div class="out"><div class="line"><span>转速</span><b>${rr.toFixed(0)} RPM</b></div></div>`;
  } else if (rpm != null && g != null) {
    const gg = 1.118e-6 * r * rpm * rpm;
    $('rcfOut').innerHTML = `<div class="out"><div class="line"><span>实际离心力</span><b>${gg.toFixed(0)} ×g</b></div><div class="line"><span>设定 RPM</span><b>${rpm}</b></div></div>`;
  } else { toast('请至少填写 RPM 或 g 之一'); }
}

/* ============================================================
   稀释计算器
   ============================================================ */
function openDilutionTool() {
  let html = `<div class="grabber"></div><h2>稀释计算器</h2>
    <p class="hint">单次：C₁V₁=C₂V₂。梯度：自动给出每步加样量。</p>
    <div class="seg">
      <button class="active" onclick="setDilMode('single',this)">单次</button>
      <button onclick="setDilMode('serial',this)">梯度</button>
    </div>
    <div id="dilBody"></div>
    <button class="btn" onclick="calcDil()">计算</button>
    <div id="dilOut"></div>`;
  openSheet(html);
  setDilMode('single', null, true);
}
let dilMode = 'single';
function setDilMode(m, btn, skipRender) {
  dilMode = m;
  if (btn) { btn.parentElement.querySelectorAll('button').forEach((b) => b.classList.remove('active')); btn.classList.add('active'); }
  const body = $('dilBody');
  if (m === 'single') {
    body.innerHTML = `
      <div class="field"><label>母液浓度 C₁</label><input id="dC1" type="number" placeholder="如 10"></div>
      <div class="field"><label>目标浓度 C₂</label><input id="dC2" type="number" placeholder="如 1"></div>
      <div class="field"><label>目标体积 V₂</label><input id="dV2" type="number" placeholder="如 100"> <small style="color:var(--muted)">（单位一致即可）</small></div>`;
  } else {
    body.innerHTML = `
      <div class="field"><label>起始浓度（相对）</label><input id="sCs" type="number" value="100"></div>
      <div class="field"><label>终点浓度（相对）</label><input id="sCe" type="number" value="1"></div>
      <div class="field"><label>稀释步数</label><input id="sN" type="number" value="4"></div>
      <div class="field"><label>每管终体积（μL）</label><input id="sVf" type="number" value="100"></div>`;
  }
}
function calcDil() {
  const out = $('dilOut');
  if (dilMode === 'single') {
    const c1 = parseFloat($('dC1').value), c2 = parseFloat($('dC2').value), v2 = parseFloat($('dV2').value);
    if (!c1 || !c2 || !v2) { toast('请填全三项'); return; }
    const v1 = c2 * v2 / c1;
    out.innerHTML = `<div class="out"><div class="line"><span>取母液 V₁</span><b>${v1.toFixed(2)}</b></div>
      <div class="line"><span>加稀释液</span><b>${(v2 - v1).toFixed(2)}</b></div>
      <div class="line"><span>得到</span><b>${v2}（浓度 ${c2}）</b></div></div>`;
  } else {
    const cs = parseFloat($('sCs').value), ce = parseFloat($('sCe').value), n = parseInt($('sN').value), vf = parseFloat($('sVf').value);
    if (!cs || !ce || !n || !vf) { toast('请填全'); return; }
    const f = Math.pow(ce / cs, 1 / n);
    let h = `<div class="tbl"><div class="tr head"><div class="td">步骤</div><div class="td">取上管</div><div class="td">加稀释液</div><div class="td">终浓度(相对)</div></div>`;
    for (let i = 1; i <= n; i++) {
      const conc = cs * Math.pow(f, i);
      const take = vf * f / (1 + f);
      h += `<div class="tr"><div class="td">${i}</div><div class="td">${take.toFixed(1)} μL</div><div class="td">${(vf - take).toFixed(1)} μL</div><div class="td">${conc.toFixed(2)}</div></div>`;
    }
    h += '</div><div class="help">每步取上管 ${ (vf * f / (1 + f)).toFixed(1) } μL 加稀释液至 ${vf} μL，依次 1→${n} 管。</div>';
    out.innerHTML = h;
  }
}

/* ============================================================
   单位换算
   ============================================================ */
function openUnitTool() {
  let html = `<div class="grabber"></div><h2>单位换算</h2>
    <p class="hint">输入一个数值，即时显示同量程各单位等价量。</p>
    <div class="field"><label>类别</label><select id="uCat" onchange="convUnit()">
      <option value="temp">温度</option><option value="mass">质量</option><option value="vol">体积</option></select></div>
    <div class="field"><label>数值</label><input id="uVal" type="number" value="37" oninput="convUnit()"></div>
    <div class="field"><label>单位</label><select id="uFrom" onchange="convUnit()"></select></div>
    <div id="uOut"></div>`;
  openSheet(html);
  convUnit();
}
const UNIT_DEFS = {
  temp: { C: (v) => v, K: (v) => v + 273.15, F: (v) => v * 9 / 5 + 32,
    inv: { C: (v) => v, K: (v) => v - 273.15, F: (v) => (v - 32) * 5 / 9 }, units: ['C', 'K', 'F'] },
  mass: { g: (v) => v, mg: (v) => v / 1000, ug: (v) => v / 1e6,
    inv: { g: (v) => v, mg: (v) => v * 1000, ug: (v) => v * 1e6 }, units: ['g', 'mg', 'μg'] },
  vol: { L: (v) => v, mL: (v) => v / 1000, uL: (v) => v / 1e6,
    inv: { L: (v) => v, mL: (v) => v * 1000, uL: (v) => v * 1e6 }, units: ['L', 'mL', 'μL'] }
};
function convUnit() {
  const cat = $('uCat').value || 'temp';
  const v = parseFloat($('uVal').value);
  const def = UNIT_DEFS[cat];
  if (!def) return;
  const fromSel = $('uFrom');
  if (fromSel && fromSel.dataset.cat !== cat) {
    fromSel.innerHTML = def.units.map((u) => `<option value="${u}">${u}</option>`).join('');
    fromSel.dataset.cat = cat;
  }
  const from = $('uFrom').value || def.units[0];
  if (isNaN(v)) { $('uOut').innerHTML = ''; return; }
  const base = def.inv[from](v);
  let h = '<div class="out">';
  def.units.forEach((u) => { h += `<div class="line"><span>${u}</span><b>${def[u](base).toLocaleString(undefined, { maximumFractionDigits: 6 })}</b></div>`; });
  h += '</div>';
  $('uOut').innerHTML = h;
}

/* ============================================================
   引物 / 序列工具
   ============================================================ */
function openPrimerTool() {
  let html = `<div class="grabber"></div><h2>引物 / 序列</h2>
    <p class="hint">输入 DNA 序列（A/T/C/G），自动计算长度、互补链、GC% 与 Tm。</p>
    <div class="field"><label>序列（5'→3'）</label><textarea id="prSeq" placeholder="如 ATGCGTACGTTAGC">ATGCGTACGTTAGC</textarea></div>
    <button class="btn" onclick="calcPrimer()">分析</button>
    <div id="prOut"></div>`;
  openSheet(html);
  calcPrimer();
}
function calcPrimer() {
  let seq = ($('prSeq').value || '').toUpperCase().replace(/[^ATCG]/g, '');
  if (!seq) { $('prOut').innerHTML = '<div class="help">请输入有效 DNA 序列（仅 A/T/C/G）。</div>'; return; }
  const comp = { A: 'T', T: 'A', C: 'G', G: 'C' };
  const rc = seq.split('').reverse().map((c) => comp[c]).join('');
  const gc = (seq.match(/[GC]/g) || []).length;
  const gcPct = (gc / seq.length * 100);
  const at = seq.length - gc;
  const tmWallace = 2 * at + 4 * gc;
  const tmBasic = 64.9 + 41 * (gc - 16.4) / seq.length;
  $('prOut').innerHTML = `<div class="out">
    <div class="line"><span>长度</span><b>${seq.length} bp</b></div>
    <div class="line"><span>GC 含量</span><b>${gcPct.toFixed(1)}%</b></div>
    <div class="line"><span>Tm（Wallace）</span><b>${tmWallace} ℃</b></div>
    <div class="line"><span>Tm（基础）</span><b>${tmBasic.toFixed(1)} ℃</b></div>
    <div class="line"><span>反向互补 5'→3'</span><b style="font-size:12px;word-break:break-all">${rc}</b></div>
  </div>`;
}

/* ============================================================
   标签 / 二维码
   ============================================================ */
function openQRTool() {
  const samples = load(STORE.samples, []);
  const opts = ['<option value="">— 自定义 —</option>'].concat(samples.map((s) => `<option value="${esc(s.name + (s.note ? ' | ' + s.note : ''))}">${esc(s.name)}</option>`)).join('');
  let html = `<div class="grabber"></div><h2>标签二维码</h2>
    <p class="hint">输入文本或选择样本，生成可打印 / 扫码的二维码。</p>
    <div class="field"><label>内容</label><textarea id="qrText" placeholder="如 SMP-2026-007 | 外泌体 #7">SMP-2026-007 | 外泌体 #7</textarea></div>
    <div class="field"><label>从冻存库选择</label><select id="qrSel" onchange="document.getElementById('qrText').value=this.value">${opts}</select></div>
    <button class="btn" onclick="genQR()">生成</button>
    <div id="qrOut" style="margin-top:14px;text-align:center"></div>`;
  openSheet(html);
  genQR();
}
function genQR() {
  const text = ($('qrText').value || '').trim();
  const out = $('qrOut');
  if (!text) { out.innerHTML = ''; return; }
  try {
    const qr = qrcode(0, 'M');
    qr.addData(text); qr.make();
    out.innerHTML = `<div style="background:#fff;display:inline-block;padding:12px;border-radius:12px;box-shadow:var(--shadow)">${qr.createSvgTag({ cellSize: 4, margin: 8 })}</div>
      <div class="help">长按可保存图片；打印后贴于管/盒。内容：${esc(text)}</div>`;
  } catch (e) { out.innerHTML = '<div class="help">生成失败，文本可能过长。</div>'; }
}

/* ============================================================
   结果录入 + 迷你图表
   ============================================================ */
function openResultTool() {
  const results = load(STORE.results, []);
  const metrics = [...new Set(results.map((r) => r.label))];
  if (!metrics.includes(resultMetric) && metrics.length) resultMetric = metrics[0];
  const opts = metrics.map((m) => `<option value="${esc(m)}" ${m === resultMetric ? 'selected' : ''}>${esc(m)}</option>`).join('') || '<option>暂无数据</option>';
  let html = `<div class="grabber"></div><h2>结果图表</h2>
    <p class="hint">录入数值并查看趋势。选择指标查看其随时间变化。</p>
    <div class="field"><label>选择指标</label><select id="resMetric" onchange="resultMetric=this.value;openResultTool()">${opts}</select></div>
    <div id="resChart"></div>
    <div class="section-title">新增一条</div>
    <div class="field"><label>指标名</label><input id="resLabel" value="${esc(resultMetric)}" placeholder="如 OD600 菌液"></div>
    <div class="field" style="display:flex;gap:10px"><input id="resVal" type="number" step="any" placeholder="数值" style="flex:2"><input id="resUnit" placeholder="单位" style="flex:1"></div>
    <button class="btn" onclick="addResult()">添加并记录</button>
    <div id="resList" style="margin-top:14px"></div>`;
  openSheet(html);
  renderResultChart();
  renderResultList();
}
function renderResultChart() {
  const results = load(STORE.results, []).filter((r) => r.label === resultMetric).sort((a, b) => new Date(a.time) - new Date(b.time));
  const box = $('resChart'); if (!box) return;
  if (results.length < 1) { box.innerHTML = '<div class="help">该指标暂无数据，添加后自动绘图。</div>'; return; }
  const vals = results.map((r) => parseFloat(r.value));
  const min = Math.min(...vals), max = Math.max(...vals);
  const W = 300, H = 160, pad = 24;
  const x = (i) => pad + i * (W - 2 * pad) / Math.max(1, results.length - 1);
  const y = (v) => H - pad - (max === min ? 0.5 : (v - min) / (max - min)) * (H - 2 * pad);
  let pts = results.map((r, i) => `${x(i).toFixed(1)},${y(parseFloat(r.value)).toFixed(1)}`).join(' ');
  let svg = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">`;
  svg += `<line x1="${pad}" y1="${H - pad}" x2="${W - pad}" y2="${H - pad}" stroke="#e5e5ea"/>`;
  svg += `<polyline points="${pts}" fill="none" stroke="#0071e3" stroke-width="2.5" stroke-linejoin="round"/>`;
  results.forEach((r, i) => { svg += `<circle cx="${x(i).toFixed(1)}" cy="${y(parseFloat(r.value)).toFixed(1)}" r="3.5" fill="#0071e3"/>`; });
  svg += `<text x="${pad}" y="${pad - 8}" font-size="11" fill="#86868b">${max.toFixed(2)}</text><text x="${pad}" y="${H - pad + 4}" font-size="11" fill="#86868b">${min.toFixed(2)}</text>`;
  svg += `</svg>`;
  box.innerHTML = `<div class="chart">${svg}</div>`;
}
function addResult() {
  const label = ($('resLabel').value || '').trim();
  const val = parseFloat($('resVal').value);
  if (!label || isNaN(val)) { toast('请填写指标与数值'); return; }
  const results = load(STORE.results, []);
  results.push({ id: uid('rs'), label, value: val, unit: $('resUnit').value.trim(), time: nowISO() });
  save(STORE.results, results);
  resultMetric = label;
  toast('已记录');
  openResultTool();
}
function renderResultList() {
  const box = $('resList'); if (!box) return;
  const results = load(STORE.results, []).filter((r) => r.label === resultMetric).sort((a, b) => new Date(b.time) - new Date(a.time));
  if (!results.length) { box.innerHTML = ''; return; }
  let h = '<div class="section-title">历史</div>';
  results.slice(0, 8).forEach((r) => {
    h += `<div class="list-row" onclick="deleteResult('${r.id}')"><div class="lr-main"><div class="lr-title">${parseFloat(r.value)}${esc(r.unit || '')}</div><div class="lr-sub">${fmtDate(r.time)}</div></div><div class="lr-right" style="color:var(--red)">删除</div></div>`;
  });
  box.innerHTML = h;
}
function deleteResult(id) {
  const results = load(STORE.results, []).filter((r) => r.id !== id);
  save(STORE.results, results); openResultTool();
}

/* ============================================================
   更多：模板 / 仪器 / 异常 / 交接
   ============================================================ */
function openTemplates() {
  const tpls = load(STORE.templates, []);
  let html = `<div class="grabber"></div><h2>实验模板</h2>
    <p class="hint">用常用 protocol 一键新建记录；也可在新建记录时点“存为模板”。</p>`;
  if (!tpls.length) html += emptyState('还没有模板', '在新建实验记录时点“存为模板”');
  else {
    tpls.forEach((t) => {
      html += `<div class="list-row" onclick="useTemplate('${t.id}')"><div class="lr-ico">📋</div>
        <div class="lr-main"><div class="lr-title">${esc(t.title)}</div><div class="lr-sub">${esc(t.raw.slice(0, 28))}…</div></div><div class="lr-right">用 ›</div></div>`;
    });
  }
  html += `<button class="btn" style="margin-top:8px" onclick="newTemplate()">+ 新建模板</button>`;
  openSheet(html);
}
function useTemplate(id) {
  const t = load(STORE.templates, []).find((x) => x.id === id);
  if (!t) return;
  closeSheet();
  openExpSheet(null);
  const ta = $('expRaw'); if (ta) { ta.value = t.raw; }
  const ti = $('expTitle'); if (ti) ti.value = t.title;
  toast('已套用模板，可继续记录');
}
function newTemplate() {
  let html = `<div class="grabber"></div><h2>新建模板</h2>
    <div class="field"><label>模板名称</label><input id="ntTitle" placeholder="如：每周外泌体纯化"></div>
    <div class="field"><label>步骤文本</label><textarea id="ntRaw" placeholder="同实验记录写法，可多句用；分隔"></textarea></div>
    <button class="btn" onclick="saveNewTemplate()">保存模板</button>`;
  openSheet(html);
}
function saveNewTemplate() {
  const title = ($('ntTitle').value || '').trim();
  const raw = ($('ntRaw').value || '').trim();
  if (!title || !raw) { toast('请填全'); return; }
  const tpls = load(STORE.templates, []);
  tpls.push({ id: uid('tp'), title, raw });
  save(STORE.templates, tpls);
  toast('已保存'); openTemplates();
}
function openInstruments() {
  const insts = load(STORE.instruments, []);
  let html = `<div class="grabber"></div><h2>仪器台账</h2><p class="hint">记录使用与校准日期，临期自动提醒。</p>`;
  if (!insts.length) html += emptyState('暂无仪器', '点下方添加');
  else {
    insts.forEach((it) => {
      const d = daysUntil(it.calibration);
      const cls = d < 0 ? 'r' : d <= 30 ? 'o' : 'g';
      const tag = d < 0 ? '已过期' : d <= 30 ? `校准剩 ${d} 天` : `校准剩 ${d} 天`;
      html += `<div class="list-row" onclick="editInstrument('${it.id}')"><div class="lr-ico ${cls}">⚙️</div>
        <div class="lr-main"><div class="lr-title">${esc(it.name)}</div><div class="lr-sub">${it.note || ''} · 校准 ${esc(it.calibration)}</div></div>
        <div class="lr-right" style="color:${d <= 30 ? 'var(--orange)' : 'var(--muted)'}">${tag}</div></div>`;
    });
  }
  html += `<button class="btn" style="margin-top:8px" onclick="editInstrument(null)">+ 添加仪器</button>`;
  openSheet(html);
}
function editInstrument(id) {
  const it = id ? load(STORE.instruments, []).find((x) => x.id === id) : null;
  const v = (k) => (it ? esc(it[k]) : '');
  let html = `<div class="grabber"></div><h2>${it ? '仪器详情' : '添加仪器'}</h2>
    <div class="field"><label>名称</label><input id="iName" value="${v('name')}"></div>
    <div class="field"><label>备注</label><input id="iNote" value="${v('note')}" placeholder="转子/波长等"></div>
    <div class="field"><label>校准到期日</label><input id="iCal" type="date" value="${v('calibration')}"></div>
    <div class="btn-row"><button class="btn danger" onclick="delInstrument('${id || ''}')">删除</button><button class="btn" onclick="saveInstrument()">保存</button></div>`;
  openSheet(html);
}
let editingInstId = null;
function saveInstrument() {
  const name = ($('iName').value || '').trim();
  if (!name) { toast('请填名称'); return; }
  const data = { name, note: $('iNote').value.trim(), calibration: $('iCal').value };
  const insts = load(STORE.instruments, []);
  if (editingInstId) { const i = insts.findIndex((x) => x.id === editingInstId); insts[i] = { ...insts[i], ...data }; }
  else insts.push({ id: uid('i'), ...data });
  save(STORE.instruments, insts); openInstruments();
}
function delInstrument(id) { if (!id) return; const insts = load(STORE.instruments, []).filter((x) => x.id !== id); save(STORE.instruments, insts); openInstruments(); }
const _editInstrument = editInstrument;
editInstrument = function (id) { editingInstId = id || null; _editInstrument(id); };

function openIncidents() {
  const incs = load(STORE.incidents, []).sort((a, b) => new Date(b.time) - new Date(a.time));
  let html = `<div class="grabber"></div><h2>异常随手记</h2><p class="hint">实验异常当场记录，可拍照留痕，关联当前实验。</p>`;
  if (!incs.length) html += emptyState('暂无异常记录', '点下方添加');
  else {
    incs.forEach((ic) => {
      html += `<div class="list-row" onclick="showIncident('${ic.id}')"><div class="lr-ico r">⚠️</div>
        <div class="lr-main"><div class="lr-title">${esc(ic.text.slice(0, 24) || '异常')}</div><div class="lr-sub">${fmtDate(ic.time)}${ic.photo ? ' · 含图片' : ''}</div></div><div class="lr-right">›</div></div>`;
    });
  }
  html += `<button class="btn" style="margin-top:8px" onclick="addIncident()">+ 记录异常</button>`;
  openSheet(html);
}
function addIncident() {
  let html = `<div class="grabber"></div><h2>记录异常</h2>
    <div class="field"><label>描述</label><textarea id="icText" placeholder="如：电泳条带异常，疑似样品降解"></textarea></div>
    <div class="field"><label>拍照（选填）</label><input id="icPhoto" type="file" accept="image/*" onchange="previewIncident(this)"></div>
    <img id="icPrev" class="preview-img" style="display:none">
    <button class="btn" onclick="saveIncident()">保存</button>`;
  openSheet(html);
}
function previewIncident(inp) {
  const f = inp.files[0]; if (!f) return;
  const rd = new FileReader();
  rd.onload = () => { const img = $('icPrev'); img.src = rd.result; img.style.display = 'block'; };
  rd.readAsDataURL(f);
}
function saveIncident() {
  const text = ($('icText').value || '').trim();
  if (!text) { toast('请填写描述'); return; }
  const incs = load(STORE.incidents, []);
  incs.push({ id: uid('ic'), text, photo: $('icPrev').style.display !== 'none' ? $('icPrev').src : '', time: nowISO() });
  save(STORE.incidents, incs); toast('已记录'); openIncidents();
}
function showIncident(id) {
  const ic = load(STORE.incidents, []).find((x) => x.id === id); if (!ic) return;
  let html = `<div class="grabber"></div><h2>异常详情</h2>
    <div class="detail"><div class="line"><span class="k">时间</span><span>${fmtDate(ic.time)}</span></div>
    <div class="line"><span class="k">描述</span><span>${esc(ic.text)}</span></div></div>
    ${ic.photo ? `<img src="${ic.photo}" class="preview-img">` : ''}
    <button class="btn danger" style="margin-top:14px" onclick="delIncident('${id}')">删除</button>`;
  openSheet(html);
}
function delIncident(id) { const incs = load(STORE.incidents, []).filter((x) => x.id !== id); save(STORE.incidents, incs); openIncidents(); }

function openHandover() {
  const todos = load(STORE.todos, []);
  let html = `<div class="grabber"></div><h2>交接班 / 待办</h2><p class="hint">记录需要同事接续的任务与负责人。</p>`;
  if (!todos.length) html += emptyState('暂无待办', '点下方添加');
  else {
    todos.forEach((t) => {
      html += `<div class="list-row" onclick="toggleTodo('${t.id}')"><div class="lr-ico ${t.done ? 'g' : ''}">${t.done ? '✅' : '🔲'}</div>
        <div class="lr-main"><div class="lr-title" style="${t.done ? 'text-decoration:line-through;color:var(--muted)' : ''}">${esc(t.text)}</div>
        <div class="lr-sub">${t.who ? '负责人 ' + esc(t.who) : '未指定'}</div></div>
        <div class="lr-right" onclick="event.stopPropagation();delTodo('${t.id}')">✕</div></div>`;
    });
  }
  html += `<div class="field" style="margin-top:14px"><label>新任务</label><input id="todoText" placeholder="如：明天换液"></div>
    <div class="field"><label>负责人（选填）</label><input id="todoWho" placeholder="如：小李"></div>
    <button class="btn" onclick="addTodo()">添加</button>`;
  openSheet(html);
}
function addTodo() {
  const text = ($('todoText').value || '').trim();
  if (!text) { toast('请填写任务'); return; }
  const todos = load(STORE.todos, []);
  todos.push({ id: uid('td'), text, who: $('todoWho').value.trim(), done: false });
  save(STORE.todos, todos); openHandover();
}
function toggleTodo(id) {
  const todos = load(STORE.todos, []);
  const t = todos.find((x) => x.id === id); if (t) t.done = !t.done;
  save(STORE.todos, todos); openHandover();
}
function delTodo(id) { const todos = load(STORE.todos, []).filter((x) => x.id !== id); save(STORE.todos, todos); openHandover(); }

/* ============================================================
   周报 / 组会素材（一键汇总本周实验）
   ============================================================ */
let weeklyText = '';
let weeklyRaw = '';
function openWeeklyReport() {
  let html = `<div class="grabber"></div><h2>周报 / 组会素材</h2>
    <p class="hint">根据实验记录一键汇总，直接复制用于周报或组会汇报。</p>
    <div class="field"><label>统计范围</label><select id="wrRange">
      <option value="week">本周（周一至今）</option>
      <option value="7">最近 7 天</option>
      <option value="30">最近 30 天</option>
      <option value="all">全部</option>
    </select></div>
    <div class="btn-row" style="margin-top:6px">
      <button class="btn secondary" onclick="genWeekly()">生成</button>
      <button class="btn ghost" id="aiOptWeekly" onclick="aiOptimizeWeekly()">🤖 AI 优化</button>
    </div>
    <div id="wrOut"></div>`;
  openSheet(html);
  genWeekly();
}
function genWeekly() {
  const range = $('wrRange').value;
  let exps = load(STORE.exp, []).slice();
  const now = new Date();
  if (range === 'week') {
    const dow = (now.getDay() + 6) % 7;
    const monday = new Date(now); monday.setHours(0, 0, 0, 0); monday.setDate(now.getDate() - dow);
    exps = exps.filter((e) => new Date(e.createdAt) >= monday);
  } else if (range === '7') exps = exps.filter((e) => new Date(e.createdAt).getTime() >= Date.now() - 7 * 86400000);
  else if (range === '30') exps = exps.filter((e) => new Date(e.createdAt).getTime() >= Date.now() - 30 * 86400000);
  exps.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  if (!exps.length) { $('wrOut').innerHTML = '<div class="help">该范围暂无实验记录。</div>'; return; }
  const byDay = {};
  exps.forEach((e) => {
    const d = new Date(e.createdAt); const key = `${d.getMonth() + 1}月${d.getDate()}日`;
    (byDay[key] = byDay[key] || []).push(e);
  });
  const label = { week: '本周', '7': '最近7天', '30': '最近30天', all: '全部' }[range];
  let text = `实验周报（${label}）\n共 ${exps.length} 条记录、${Object.keys(byDay).length} 天\n`;
  Object.keys(byDay).forEach((day) => {
    text += `\n【${day}】\n`;
    byDay[day].forEach((e) => {
      text += `· ${e.title}${e.operator ? '（' + e.operator + '）' : ''}\n`;
      (e.steps || []).forEach((s) => {
        const parts = [s.time, s.action, [s.amount, s.unit].filter(Boolean).join(''), s.material, s.lot ? '批号' + s.lot : '', s.param].filter(Boolean);
        if (parts.length) text += `   - ${parts.join(' ')}\n`;
      });
    });
  });
  weeklyRaw = text;
  weeklyText = text;
  renderWeeklyOut(`${exps.length} 条 · ${Object.keys(byDay).length} 天`, text, false);
}
function renderWeeklyOut(meta, text, canRevert) {
  let html = `<div class="report-meta">${meta}</div>\n<div class="report-box">${esc(text)}</div>\n<button class="btn secondary" style="margin-top:12px" onclick="copyWeekly()">复制文本</button>`;
  if (canRevert) html += `\n<button class="btn ghost" style="margin-top:10px" onclick="revertWeekly()">↩ 查看原文</button>`;
  const box = $('wrOut'); if (box) box.innerHTML = html;
}
function revertWeekly() { weeklyText = weeklyRaw; renderWeeklyOut('原文', weeklyRaw, false); }
function stripFence(s) { s = (s || '').trim(); const m = s.match(/^```(?:markdown|md|text)?\s*([\s\S]*?)\s*```$/i); return m ? m[1].trim() : s; }
async function aiOptimizeWeekly() {
  if (!weeklyRaw) { toast('请先生成周报'); return; }
  if (!agnesReady()) { toast('请先在「设置」填写 Agnes Key 或部署代理'); return; }
  const btn = $('aiOptWeekly');
  if (btn) { btn.disabled = true; btn.textContent = 'AI 优化中…'; }
  try {
    const c = agnesCreds();
    if (!c.key && !c.useProxy) throw new Error('no key');
    const base = c.useProxy ? AGNES_PROXY : 'https://apihub.agnes-ai.com';
    const headers = { 'Content-Type': 'application/json' };
    if (!c.useProxy) headers['Authorization'] = 'Bearer ' + c.key;
    const sys = `你是资深科研工作者的周报 / 组会汇报润色助手。下面是一份由实验记录自动汇总出的周报草稿（偏流水账、条目化，可能带口语或语音转写痕迹）。请将其优化为一份可直接用于周报或组会汇报的素材，要求：\n\n1. 去除 AI 味：禁用「首先/其次/总之」「值得一提的是」「综上所述」「赋能」「抓手」「闭环」「进一步」等套话与空话；不堆砌形容词；用科研一线人员自然、克制的口吻写作。\n2. 工作详实：在草稿事实基础上合理补全技术细节与逻辑（如实验目的、关键参数、结果现象、异常及处理），但不要编造不存在的数据；保留批号、用量、条件等关键信息；按「做了什么—怎么做的—看到什么」组织。\n3. 结构化但不死板：可保留日期/项目分组；每部分用简短小标题或要点；重点工作适当展开，常规工作合并简述。\n4. 心得与收获：文末增加「本周心得 / 收获」小节，结合本周工作提炼 2–4 条真实、具体的体会（如方法改进、踩过的坑、对现象的新理解、下一步想法），避免空泛口号。\n5. 可选：基于本周进展给出 1–3 条具体、可执行的「下周计划」。\n\n重要：只输出纯文本，不要使用任何 Markdown 标记符号（不要用 # 号标题、星号加粗、减号列表、反引号 等），也不要用代码块包裹。用自然段落、空行分隔，以及 1. 2. 3. 这样的纯数字编号即可。不要解释你的修改，若草稿无可整理内容请直接说明。`;
    const res = await fetch(base + '/v1/chat/completions', {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({ model: 'agnes-2.0-flash', messages: [{ role: 'system', content: sys }, { role: 'user', content: weeklyRaw }], temperature: 0.5, max_tokens: 4000 })
    });
    if (!res.ok) throw new Error('agnes ' + res.status);
    const j = await res.json();
    let content = (j && j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || '';
    content = stripFence(content);
    if (!content) throw new Error('empty');
    weeklyText = content;
    renderWeeklyOut('AI 已优化', content, true);
    toast('AI 已优化'); if (voiceOn) speak('AI 已优化');
  } catch (e) {
    toast('AI 优化失败：' + (e.message || e));
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '🤖 AI 优化'; }
  }
}
function copyWeekly() { copyText(weeklyText); }

/* ============================================================
   安全 Checklist（危化品 / 生物安全 现场确认）
   ============================================================ */
const SAFETY_ITEMS = [
  { cat: '危化品操作', items: [
    { id: 'chem1', text: '已确认试剂名称、浓度与危险性（GHS 标识）' },
    { id: 'chem2', text: '佩戴相应 PPE（护目镜 / 手套 / 实验服）' },
    { id: 'chem3', text: '在通风橱内操作挥发性 / 有毒试剂' },
    { id: 'chem4', text: '已了解中和与应急冲洗方法' }
  ] },
  { cat: '生物安全', items: [
    { id: 'bio1', text: '明确生物安全等级（BSL-1/2/3）与操作规范' },
    { id: 'bio2', text: '生物安全柜已紫外消毒并正常运行' },
    { id: 'bio3', text: '锐器使用有专用容器，不回套针帽' },
    { id: 'bio4', text: '操作后废弃物按规定灭活处理' }
  ] },
  { cat: '高温 / 高压 / 低温', items: [
    { id: 'hp1', text: '高压灭菌锅压力与排气确认正常' },
    { id: 'hp2', text: '热源 / 烘箱周边无易燃物' },
    { id: 'hp3', text: '液氮 / 干冰操作做好防冻伤防护' }
  ] },
  { cat: '废液与应急', items: [
    { id: 'wd1', text: '废液分类收集，不混入下水道' },
    { id: 'wd2', text: '洗眼器 / 喷淋 / 灭火器位置已知且可用' },
    { id: 'wd3', text: '紧急联系电话与逃生路线清楚' }
  ] }
];
function openSafetyChecklist() {
  const saved = load(STORE.safety, { checks: {}, operator: '', date: '' });
  let html = `<div class="grabber"></div><h2>安全 Checklist</h2>
    <p class="hint">危险操作前逐项确认，完成后可保存留痕。</p>
    <div class="field"><label>操作人</label><input id="scOp" value="${esc(saved.operator || '')}" placeholder="操作人"></div>`;
  SAFETY_ITEMS.forEach((group) => {
    html += `<div class="check-cat">${esc(group.cat)}</div>`;
    group.items.forEach((it) => {
      const on = saved.checks && saved.checks[it.id] ? ' on' : '';
      html += `<div class="check-item${on}" data-id="${it.id}" onclick="toggleCheck(this)"><div class="check-box"></div><div class="check-txt">${esc(it.text)}</div></div>`;
    });
  });
  const total = SAFETY_ITEMS.reduce((a, g) => a + g.items.length, 0);
  const done = saved.checks ? Object.keys(saved.checks).filter((k) => saved.checks[k]).length : 0;
  html += `<div class="report-meta" id="scProg">已完成 ${done}/${total}</div>
    <button class="btn" onclick="saveSafety()">完成并保存</button>
    <div class="help" style="margin-top:10px">仅供个人现场确认提示，不替代实验室正式 SOP 与审批。</div>`;
  openSheet(html);
}
function toggleCheck(el) {
  el.classList.toggle('on');
  const total = SAFETY_ITEMS.reduce((a, g) => a + g.items.length, 0);
  const done = document.querySelectorAll('.check-item.on').length;
  const p = $('scProg'); if (p) p.textContent = `已完成 ${done}/${total}`;
}
function saveSafety() {
  const checks = {};
  document.querySelectorAll('.check-item').forEach((el) => { checks[el.getAttribute('data-id')] = el.classList.contains('on'); });
  save(STORE.safety, { checks, operator: ($('scOp').value || '').trim(), date: nowISO() });
  toast('已保存安全确认记录');
}

/* ============================================================
   Agnes AI 智能整理（语音/文本 → 结构化字段）
   ============================================================ */
async function callAgnesParse(raw) {
  const c = agnesCreds();
  if (!c.key && !c.useProxy) throw new Error('no key');
  const base = c.useProxy ? AGNES_PROXY : 'https://apihub.agnes-ai.com';
  const headers = { 'Content-Type': 'application/json' };
  if (!c.useProxy) headers['Authorization'] = 'Bearer ' + c.key;
  const sys = `你是实验室电子记录本（ELN）的资深实验记录整理助手。用户会给你一段「原始实验记录」（可能口语化、零散、含语音转写误差）。请按以下要求处理：

1. 先整体理解本次实验的目的与流程；
2. 将记录**总结归纳**为条理清晰、可复现的实验步骤序列：去除口语冗余、补全被省略的动作、合并同类操作、按时间或逻辑顺序排列；不要把每句话原样当成一步，也不要遗漏关键操作；
3. 把能识别的信息分别填入下方 JSON 的对应字段。

只输出 JSON（不要解释、不要 Markdown 代码块），结构如下：
{
  "title": "一句话准确概括本次实验，如「外泌体超滤浓缩」",
  "operator": "记录人姓名；原始记录未提及则填空字符串",
  "steps": [
    {
      "time": "步骤发生时刻，形如 HH:MM；无则空",
      "action": "本步核心动作，规范为动词，如：取/加入/加/离心/上样/收集/孵育/过滤/浓缩/稀释/重悬/转移/平衡/洗脱/检测/配制/涡旋/混匀；可留空",
      "material": "操作对象或物料，如「外泌体样本」「超滤管」「PBS」；无则空",
      "lot": "批号/货号，如 EV-2607；无则空",
      "amount": "用量数值，如 2 / 4000 / 10；无则空",
      "unit": "单位，须与 amount 配对，如 mL / g / L / μL / 支 / 个 / 孔 / min / ℃ / rpm / ×g；无则空",
      "param": "关键条件参数，如「4000×g 离心 10 min」「37℃ 孵育 30 min」「0.22 μm 过滤」；无则空"
    }
  ]
}

注意：amount 与 unit 必须成对出现；离心力统一用 ×g、转速用 rpm、温度用 ℃、时间用 min；同一物料多次使用应分别成步；只输出 JSON。`;
  const res = await fetch(base + '/v1/chat/completions', {
    method: 'POST',
    headers: headers,
    body: JSON.stringify({ model: 'agnes-2.0-flash', messages: [{ role: 'system', content: sys }, { role: 'user', content: raw }], temperature: 0.2, max_tokens: 2000 })
  });
  if (!res.ok) throw new Error('agnes ' + res.status);
  const j = await res.json();
  const content = j && j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content;
  if (!content) throw new Error('empty');
  return extractJSON(content);
}
function extractJSON(s) {
  const a = s.indexOf('{'); const b = s.lastIndexOf('}');
  if (a < 0 || b < 0 || b <= a) return null;
  try { return JSON.parse(s.slice(a, b + 1)); } catch (e) { return null; }
}
function normalizeStep(s) {
  s = s || {};
  return { time: s.time || '', action: s.action || '', material: s.material || '', lot: s.lot || '', amount: s.amount || '', unit: s.unit || '', param: s.param || '', note: s.note || '' };
}
function applyAgnesResult(data) {
  if (data.title) { const t = $('expTitle'); if (t) t.value = data.title; }
  if (data.operator) { const o = $('expOp'); if (o) o.value = data.operator; }
  if (Array.isArray(data.steps) && data.steps.length) {
    currentSteps = data.steps.map(normalizeStep).filter((s) => s.time || s.action || s.material || s.lot || s.amount || s.param);
    renderSteps();
  }
}
async function aiStructure() {
  const raw = $('expRaw') ? $('expRaw').value.trim() : '';
  if (!raw) { toast('请先记录或输入内容'); return; }
  if (!agnesReady()) { toast('请先在「设置」填写 Agnes Key'); return; }
  const aiBtn = $('aiBtn'); const oldTxt = aiBtn ? aiBtn.textContent : '';
  if (aiBtn) { aiBtn.disabled = true; aiBtn.textContent = 'AI 整理中…'; }
  try {
    const data = await callAgnesParse(raw);
    if (data && (data.title || (Array.isArray(data.steps) && data.steps.length))) {
      applyAgnesResult(data);
      toast('AI 已整理'); if (voiceOn) speak('AI 已整理');
    } else {
      currentSteps = structure(raw); renderSteps();
      toast('AI 未返回有效结构，已用本地整理');
    }
  } catch (e) {
    currentSteps = structure(raw); renderSteps();
    toast('AI 整理失败，已用本地整理');
  } finally {
    if (aiBtn) { aiBtn.disabled = false; aiBtn.textContent = oldTxt || '🤖 AI 智能整理'; }
  }
}

/* ============================================================
   设置：语音 / AI / 数据备份（导出导入）
   ============================================================ */
function saveXfKey() {
  const st = getSettings();
  st.xfAppid = ($('xfAppid').value || '').trim();
  st.xfApiKey = ($('xfApiKey').value || '').trim();
  st.xfApiSecret = ($('xfApiSecret').value || '').trim();
  setSettings(st);
  toast(iflytekReady() ? '讯飞配置已保存' : '已保存（凭证不完整，将回退默认）');
}
function saveAgnesKey() {
  const st = getSettings();
  st.agnesKey = ($('agnesKey').value || '').trim();
  setSettings(st);
  toast(agnesReady() ? 'Agnes 配置已保存' : '已保存（Key 不完整，将回退默认）');
}

function exportData() {
  const data = { _app: 'bench', _version: 1, _exportedAt: new Date().toISOString() };
  Object.keys(STORE).forEach((k) => { data[k] = load(STORE[k], null); });
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'bench-backup-' + new Date().toISOString().slice(0, 10) + '.json';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  toast('已导出全部数据');
}
function pickImport() { const f = $('importFile'); if (f) f.click(); }
function onImportFile(inp) { const f = inp.files[0]; if (f) importData(f); inp.value = ''; }
function importData(file) {
  const rd = new FileReader();
  rd.onload = () => {
    try {
      const data = JSON.parse(rd.result);
      if (!data || data._app !== 'bench') { toast('不是有效的实验台备份文件'); return; }
      openImportConfirm(data);
    } catch (e) { toast('文件解析失败'); }
  };
  rd.readAsText(file);
}
let pendingImport = null;
function openImportConfirm(data) {
  pendingImport = data;
  const keys = Object.keys(STORE).filter((k) => k in data && data[k] != null);
  let html = `<div class="grabber"></div><h2>导入数据</h2>
    <p class="hint">将恢复 ${keys.length} 类数据（实验 / 试剂 / 样本 / 待办 / 设置等）。请选择导入方式：</p>
    <div class="field"><label>导入方式</label><div class="seg">
      <button class="active" id="impModeReplace" onclick="setImpMode('replace',this)">覆盖导入</button>
      <button id="impModeMerge" onclick="setImpMode('merge',this)">合并导入</button>
    </div></div>
    <div class="help" id="impDesc">覆盖导入：用备份完全替换当前数据。合并导入：按 id 合并，保留现有未重复项。</div>
    <div class="btn-row" style="margin-top:14px">
      <button class="btn danger" onclick="applyImport(getImpMode())">确认导入</button>
      <button class="btn secondary" onclick="closeModal()">取消</button>
    </div>`;
  openModal(html);
}
function setImpMode(m, btn) {
  document.querySelectorAll('#impModeReplace,#impModeMerge').forEach((b) => b.classList.remove('active'));
  btn.classList.add('active');
  const desc = $('impDesc');
  if (desc) desc.textContent = m === 'replace' ? '覆盖导入：用备份完全替换当前数据。' : '合并导入：按 id 合并，保留现有未重复项。';
}
function getImpMode() { return $('impModeReplace').classList.contains('active') ? 'replace' : 'merge'; }
function applyImport(mode) {
  const data = pendingImport;
  if (!data) { toast('无数据'); return; }
  Object.keys(STORE).forEach((k) => {
    if (!(k in data) || data[k] == null) return;
    const incoming = data[k];
    if (mode === 'merge' && Array.isArray(incoming) && Array.isArray(load(STORE[k], []))) {
      const cur = load(STORE[k], []); const map = {};
      cur.forEach((x) => { if (x && x.id) map[x.id] = x; });
      incoming.forEach((x) => { if (x && x.id) map[x.id] = x; else cur.push(x); });
      save(STORE[k], Object.values(map));
    } else {
      save(STORE[k], incoming);
    }
  });
  pendingImport = null;
  closeModal(); toast('导入完成'); renderAll();
}

/* ============================================================
   首次引导
   ============================================================ */
const ONBOARDED = 'bench.onboarded';
function maybeOnboard() { if (!localStorage.getItem(ONBOARDED)) showOnboarding(false); }
function openOnboarding() { showOnboarding(true); }
function showOnboarding(fromSettings) {
  const feats = [
    { i: '🎙️', t: '语音记录实验', d: '说话即转为文字，支持讯飞长录音，自动追加到原始记录。' },
    { i: '🧪', t: '试剂 / 冻存管家', d: '批号、效期、安全库存自动提醒临期与补货。' },
    { i: '🤖', t: 'AI 智能整理', d: '配置 Agnes Key 后，语音转写自动解析为标题与结构化步骤。' },
    { i: '🧰', t: '常用工具箱', d: '离心力换算、缓冲液配制、稀释、引物分析、二维码标签、计时器。' },
    { i: '🗓️', t: '周报 / 安全 Checklist', d: '一键汇总本周实验，危险操作前逐项安全确认。' },
    { i: '💾', t: '数据可备份迁移', d: '设置中导出 / 导入全部数据，换设备不丢失。' }
  ];
  const cards = feats.map((f) => `<div class="ob-card"><div class="ob-ico">${f.i}</div><div class="ob-t">${f.t}</div><div class="ob-d">${esc(f.d)}</div></div>`).join('');
  const html = `<div class="ob">
    <div class="ob-hero">👋</div>
    <h2 style="text-align:center;margin:6px 0 2px">欢迎使用「实验台」</h2>
    <p class="hint" style="text-align:center">纯前端实验室助手，数据存在你自己的设备里。先看几个能干的事：</p>
    <div class="ob-grid">${cards}</div>
    <button class="btn" style="margin-top:8px" onclick="finishOnboarding()">${fromSettings ? '知道了' : '开始使用'}</button>
  </div>`;
  openModal(html);
}
function finishOnboarding() { try { localStorage.setItem(ONBOARDED, '1'); } catch (e) {} closeModal(); }

/* ---------------- 复制文本 ---------------- */
function copyText(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => toast('已复制')).catch(() => fallbackCopy(text));
  } else fallbackCopy(text);
}
function fallbackCopy(text) {
  try {
    const ta = document.createElement('textarea'); ta.value = text;
    ta.style.position = 'fixed'; ta.style.opacity = '0'; ta.style.top = '0';
    document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
    toast('已复制');
  } catch (e) { toast('复制失败，请手动选择'); }
}

/* ---------------- 通用 Sheet / Modal ---------------- */
function openSheet(html) { $('sheet').innerHTML = html; $('sheetBackdrop').classList.add('show'); $('sheet').classList.add('show'); }
function closeSheet() { $('sheet').classList.remove('show'); $('sheetBackdrop').classList.remove('show'); }
function openModal(html) { $('modal').innerHTML = html; $('modalBackdrop').classList.add('show'); $('modal').classList.add('show'); }
function closeModal() { $('modal').classList.remove('show'); $('modalBackdrop').classList.remove('show'); }

/* ---------------- Apple 流体交互：Sheet 下滑拖拽关闭 ----------------
   仅从顶部抓手(.grabber)起拖；拖拽中 1:1 跟手、向上橡皮筋不可越顶；
   释放按「速度接力 + 位移阈值」决定关闭或回弹；settle 用 rAF 半隐式欧拉
   弹簧，释放途中再次抓住可立即中断（present 值续接），符合可中断原则。
------------------------------------------------------------------- */
(function () {
  const sheet = document.getElementById('sheet');
  const bd = document.getElementById('sheetBackdrop');
  if (!sheet || !bd) return;
  const VH = () => sheet.offsetHeight || Math.round(window.innerHeight * 0.9);
  let drag = null;   // {startY, startTy, lastY, lastT, vy, moved}
  let raf = 0;

  function rubberband(o, dim, constant) { constant = constant || 0.55; return (o * dim * constant) / (dim + constant * Math.abs(o)); }
  function curTy() {
    const t = getComputedStyle(sheet).transform;
    if (t && t !== 'none') { const m = t.match(/matrix\(([^)]+)\)/); if (m) return parseFloat(m[1].split(',')[5]); }
    return sheet.classList.contains('show') ? 0 : VH();
  }
  function onDown(e) {
    if (!sheet.classList.contains('show')) return;
    if (!e.target.closest('.grabber')) return;
    cancelAnimationFrame(raf);
    e.preventDefault();
    try { sheet.setPointerCapture(e.pointerId); } catch (_) {}
    sheet.style.transition = 'none'; bd.style.transition = 'none';
    drag = { startY: e.clientY, startTy: curTy(), lastY: e.clientY, lastT: performance.now(), vy: 0, moved: false };
  }
  function onMove(e) {
    if (!drag) return;
    const dy = e.clientY - drag.startY;
    if (Math.abs(dy) > 4) drag.moved = true;
    const h = VH();
    let ty = drag.startTy + dy;
    if (ty < 0) ty = -rubberband(-ty, h);                 // 向上拖：橡皮筋，不可越过顶部
    sheet.style.transform = 'translate(-50%,' + ty + 'px)';
    bd.style.opacity = Math.max(0, 1 - ty / h);
    const now = performance.now(), dt = now - drag.lastT;
    if (dt > 0) { drag.vy = (e.clientY - drag.lastY) / dt * 1000; drag.lastY = e.clientY; drag.lastT = now; }
  }
  function onUp() {
    if (!drag) return;
    const h = VH(), ty = curTy(), vy = drag.vy;
    drag = null;
    const dismiss = (vy > 550 && ty > 0) || ty > h * 0.42;  // 快速下甩 或 拖过 42% → 关闭
    settle(dismiss ? h : 0, vy);
  }
  function settle(target, vy) {
    let x = curTy(), v = vy || 0, k = 200, c = (target === 0 ? 26 : 22), last = performance.now();
    function step(now) {
      let dt = (now - last) / 1000; last = now; if (!(dt > 0)) dt = 1 / 60; if (dt > 1 / 30) dt = 1 / 30;
      const a = -k * (x - target) - c * v; v += a * dt; x += v * dt;   // 半隐式欧拉弹簧
      const h = VH();
      if (Math.abs(x - target) < 0.5 && Math.abs(v) < 0.5) {
        x = target;
        sheet.style.transform = ''; bd.style.opacity = ''; bd.style.transition = ''; sheet.style.transition = '';
        if (target !== 0) { closeSheet(); if (navigator.vibrate) { try { navigator.vibrate(10); } catch (_) {} } }
        return;
      }
      sheet.style.transform = 'translate(-50%,' + x + 'px)';
      bd.style.opacity = Math.max(0, 1 - x / h);
      raf = requestAnimationFrame(step);
    }
    raf = requestAnimationFrame(step);
  }
  sheet.addEventListener('pointerdown', onDown);
  sheet.addEventListener('pointermove', onMove);
  sheet.addEventListener('pointerup', onUp);
  sheet.addEventListener('pointercancel', onUp);
  sheet.addEventListener('lostpointercapture', onUp);
})();

/* ---------------- 事件绑定 ---------------- */
document.querySelectorAll('.tab').forEach((t) => t.addEventListener('click', () => switchView(t.dataset.view)));
$('fab').addEventListener('click', () => {
  if (currentView === 'experiments') openExpSheet(null);
  else if (currentView === 'reagents') { if (reagSeg === 'freezer') openSampleSheet(null); else openReagSheet(null); }
});
$('sheetBackdrop').addEventListener('click', closeSheet);
$('modalBackdrop').addEventListener('click', closeModal);

/* ---------------- 启动 ---------------- */
seed();
const _openExp = openExpSheet;
openExpSheet = function (id) {
  _openExp(id);
  bindVoiceToggle();
  const sb = $('structureBtn');
  if (sb) sb.onclick = () => {
    currentSteps = structure($('expRaw').value);
    renderSteps();
    const n = currentSteps.length; toast('已整理 ' + n + ' 个步骤'); speak('已整理 ' + n + ' 个步骤');
  };
};
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').then((r) => { if (r && r.update) r.update(); }).catch(() => {}));
}
ensureTemplateDefaults();
maybeOnboard();
renderAll();
