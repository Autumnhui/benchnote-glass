/* ============================================================
   实验台 Bench — 实验室记录 / 试剂 / 工具箱 / 台账 (PWA, 纯前端)
   设计：Apple 风格，无 AI 味
   ============================================================ */

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const STORE = {
  exp: 'bench.exp', reag: 'bench.reag', samples: 'bench.samples', boxes: 'bench.boxes',
  templates: 'bench.templates', instruments: 'bench.instruments',
  incidents: 'bench.incidents', results: 'bench.results', todos: 'bench.todos',
  safety: 'bench.safety', units: 'bench.units', boxMeta: 'bench.boxMeta',
  seeded: 'bench.seeded', settings: 'bench.settings'
};

/* ---------------- 自定义单位管理 ---------------- */
const DEFAULT_UNITS = ['瓶','支','L','mL','μL','g','mg','kg','盒','袋','包','箱','片','粒','管','个','对','次','板','条','卷','套'];
function getUserUnits() { return load(STORE.units, []); }
function saveUserUnits(list) { save(STORE.units, list); }
/* ---------------- 单位选择与管理 ---------------- */
function getAllUnits() {
  const custom = getUserUnits();
  const all = [...DEFAULT_UNITS];
  custom.forEach((u) => { if (!all.includes(u)) all.push(u); });
  return all;
}
/* ---------------- 单位选择与管理 ---------------- */
// 选择模式：弹出可选单位，点击选中并填入对应输入框
function openUnitPicker(e, idx) {
  e.stopPropagation();
  const all = getAllUnits();
  const list = getUserUnits();
  let html = `<div style="position:relative"><h2 style="margin:0 0 12px;padding-right:32px">可选单位</h2><span onclick="closeModal()" style="position:absolute;top:-4px;right:0;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-size:18px;color:var(--muted);cursor:pointer;border-radius:50%">✕</span></div>
    <div id="unitTagArea" style="margin-bottom:8px;display:flex;flex-wrap:wrap;gap:8px">
      ${all.map((u) => `<span class="unit-tag pick-tag" data-unit="${esc(u)}" onclick="pickUnit(${idx},&quot;${esc(u)}&quot;)">${esc(u)}</span>`).join('')}
    </div>
    <div style="display:flex;gap:8px;margin-bottom:4px"><input id="newUnitInput" placeholder="输入新单位" style="flex:1;min-width:160px"><button style="width:auto;padding:6px 14px;font-size:14px" class="btn" onclick="addUnitInPicker()">添加</button><button class="btn del-btn-in-picker" style="width:auto;padding:6px 14px;font-size:14px;background:rgba(255,59,48,.12);color:var(--red,#ff3b30);border:1px solid rgba(255,59,48,.3)" onclick="toggleUnitDeleteInPicker(${idx})">删除</button></div>
    <div style="font-size:12px;color:var(--muted)">仅显示自定义单位时，可删除</div>`;
  openModal(html);
  _pickerIdx = idx;
}
let _pickerIdx = null;
let _unitDeleting = false;
function toggleUnitDeleteInPicker(idx) {
  _unitDeleting = !_unitDeleting;
  const area = $('unitTagArea');
  if (!area) return;
  const all = getAllUnits();
  const list = getUserUnits();
  const showDel = _unitDeleting;
  area.innerHTML = all.map((u) => {
    const isCustom = list.includes(u);
    const eu = esc(u);
    const delAttr = showDel && isCustom ? `removeUnitInPicker(&quot;${eu}&quot;,${idx})` : '';
    const delIcon = showDel && isCustom ? '<span class="unit-del-x">✕</span>' : '';
    return `<span class="unit-tag ${(showDel && isCustom) ? 'deleting' : 'pick-tag'}" data-unit="${eu}" onclick="${delAttr || `pickUnit(${idx},&quot;${eu}&quot;)`}">${eu}${delIcon}</span>`;
  }).join('');
  // 切换删除按钮文字（保留添加栏不动）
  const delBtn = document.querySelector('.del-btn-in-picker');
  if (delBtn) delBtn.textContent = showDel ? '完成' : '删除';
}
function addUnitInPicker() {
  const v = $('newUnitInput').value.trim();
  if (!v) return;
  const list = getUserUnits();
  if (list.includes(v) || DEFAULT_UNITS.includes(v)) { toast('单位已存在'); return; }
  list.push(v); saveUserUnits(list);
  // 刷新 tag 区域，显示全部单位
  const area = $('unitTagArea');
  if (!area) return;
  const all = getAllUnits();
  const curList = getUserUnits();
  area.innerHTML = all.map((u) => {
    const isCustom = curList.includes(u);
    const eu = esc(u);
    if (_unitDeleting && isCustom) {
      return `<span class="unit-tag deleting" data-unit="${eu}" onclick="removeUnitInPicker(&quot;${eu}&quot;,${_pickerIdx})">${eu}<span class="unit-del-x">✕</span></span>`;
    }
    return `<span class="unit-tag pick-tag" data-unit="${eu}" onclick="pickUnit(${_pickerIdx},&quot;${eu}&quot;)">${eu}</span>`;
  }).join('');
  $('newUnitInput').value = '';
}
function removeUnitInPicker(u, idx) {
  const list = getUserUnits().filter((x) => x !== u);
  saveUserUnits(list);
  // 刷新 tag 区域，显示全部单位
  const area = $('unitTagArea');
  if (!area) return;
  const curList = getUserUnits();
  const all = getAllUnits();
  area.innerHTML = all.map((u2) => {
    const isCustom = curList.includes(u2);
    const eu2 = esc(u2);
    const delIcon = isCustom ? '<span class="unit-del-x">✕</span>' : '';
    return `<span class="unit-tag ${isCustom ? 'deleting' : 'pick-tag'}" data-unit="${eu2}" onclick="${isCustom ? `removeUnitInPicker(&quot;${eu2}&quot;,${idx})` : `pickUnit(${idx},&quot;${eu2}&quot;)`}">${eu2}${delIcon}</span>`;
  }).join('');
}
// 选中单位：填入输入框并关闭
function pickUnit(idx, unit) {
  const inp = document.querySelector(`.lot-input[data-field="unit"][data-lot-idx="${idx}"]`);
  if (inp) inp.value = unit;
  closeModal();
}
/* ---------------- IndexedDB 存储层（兼容 load/save 同步接口） ---------------- */
// 启动时从 IndexedDB 加载全部数据到内存 _cache，save 同步写 _cache + 异步写 IndexedDB，
// load 从 _cache 同步读取。现有 load/save 调用处零改动。
const DB_NAME = 'BenchNoteDB', DB_VER = 1, DB_STORE = 'data';
let _dbReady = false, _db = null;
const _cache = {};  // key -> JSON string（与 localStorage 格式一致）

function _dbOpen() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VER);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(DB_STORE)) db.createObjectStore(DB_STORE);
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = (e) => reject(e.target.error);
  });
}

function _dbGetAll(db) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, 'readonly');
    const store = tx.objectStore(DB_STORE);
    const req = store.openCursor();
    const map = {};
    req.onsuccess = (e) => {
      const cursor = e.target.result;
      if (cursor) { map[cursor.key] = cursor.value; cursor.continue(); }
      else resolve(map);
    };
    req.onerror = (e) => reject(e.target.error);
  });
}

function _dbPut(db, key, val) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, 'readwrite');
    const req = tx.objectStore(DB_STORE).put(val, key);
    req.onsuccess = () => resolve();
    req.onerror = (e) => reject(e.target.error);
  });
}

function _dbDel(db, key) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, 'readwrite');
    const req = tx.objectStore(DB_STORE).delete(key);
    req.onsuccess = () => resolve();
    req.onerror = (e) => reject(e.target.error);
  });
}

// 页面启动时调用：从 IndexedDB 加载全量数据到 _cache，回退到 localStorage
async function initDB() {
  try {
    _db = await _dbOpen();
    const data = await _dbGetAll(_db);
    // 把 IndexedDB 数据加载到 _cache
    Object.keys(data).forEach((k) => { _cache[k] = data[k]; });
    // 对 _cache 中没有但 localStorage 中有的 key，做一次性迁移
    const allKeys = Object.values(STORE).concat(['bench.quickTools']);
    allKeys.forEach((k) => {
      if (!(k in _cache)) {
        try {
          const v = localStorage.getItem(k);
          if (v != null) { _cache[k] = v; _dbPut(_db, k, v).catch(() => {}); }
        } catch (e) { /* ignore */ }
      }
    });
    _dbReady = true;
  } catch (e) {
    console.warn('IndexedDB 不可用，回退 localStorage', e);
    _dbReady = false;
  }
}

// 兼容现有 load(key, fallback) 同步接口
function load(key, fallback) {
  // 优先从 _cache 读取
  if (key in _cache) {
    try { return JSON.parse(_cache[key]); } catch (e) { return fallback; }
  }
  // 无论 _dbReady 与否，都 fallback 到 localStorage
  try {
    const v = JSON.parse(localStorage.getItem(key));
    if (v != null) {
      // 顺便补回 _cache，加速后续读取
      _cache[key] = localStorage.getItem(key);
      return v;
    }
    return fallback;
  } catch (e) { return fallback; }
}

// 兼容现有 save(key, val) 同步接口
function save(key, val) {
  const str = JSON.stringify(val);
  // 同步写 _cache（无论 _dbReady 与否，保证页面内一致性）
  _cache[key] = str;
  // 同步写 localStorage（兼容层，也用于未加载完的场景）
  try { localStorage.setItem(key, str); } catch (e) { /* quota 超限忽略 */ }
  // 异步写 IndexedDB
  if (_dbReady && _db) {
    _dbPut(_db, key, str).catch((e) => console.warn('IndexedDB 写入失败', e));
  }
}

// 页面启动时等 IndexedDB 就绪
let _dbInitPromise = null;
function ensureDB() {
  if (!_dbInitPromise) {
    // IndexedDB 超时兜底：3 秒后若仍未成功，标记为不启用，让 load/save 走 localStorage
    setTimeout(() => {
      if (!_dbReady) {
        console.warn('IndexedDB 初始化超时，回退 localStorage');
        _dbReady = false;
      }
    }, 3000);
    _dbInitPromise = initDB();
  }
  return _dbInitPromise;
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
  { key: 'coa', i: '🧾', t: 'CoA 智能审查', d: '拍照识别+翻译+判定', fn: 'openCoATool()' },
  { key: 'template', i: '📋', t: '实验模板', d: '克隆常用 protocol', fn: 'openTemplates()' },
  { key: 'instruments', i: '⚙️', t: '仪器台账', d: '使用与校准到期', fn: 'openInstruments()' },
  { key: 'incidents', i: '⚠️', t: '异常随手记', d: '拍照+语音留痕', fn: 'openIncidents()' },
  { key: 'handover', i: '🤝', t: '交接班待办', d: '任务与负责人', fn: 'openHandover()' },
  { key: 'weekly', i: '🗓️', t: '周报 / 组会素材', d: '一键汇总本周实验', fn: 'openWeeklyReport()' },
  { key: 'safety', i: '🛡️', t: '安全 Checklist', d: '危化品 / 生物安全确认', fn: 'openSafetyChecklist()' }
];
/* 首页默认展示的 8 个（不含后续加入的模块） */
const DEFAULT_QUICK = ['timer', 'coa', 'rcf', 'dilution', 'unit', 'primer', 'weekly', 'template'];
const QUICK_KEY = 'bench.quickTools';
function getQuickTools() {
  let keys = load(QUICK_KEY, null);
  if (!Array.isArray(keys) || !keys.length) keys = DEFAULT_QUICK.slice();
  const map = {}; ALL_TOOLS.forEach((t) => { map[t.key] = t; });
  const list = keys.map((k) => map[k]).filter(Boolean);
  return list.length ? list : DEFAULT_QUICK.map((k) => map[k]).filter(Boolean);
}

// 内置凭证（Agnes / 讯飞）以混淆形式存放，运行时还原后浏览器直连官方接口，不再依赖任何代理。
// 说明：以下仅为混淆（XOR+base64），并非加密——可防止明文泄露，但前端仍可反解；适合自用场景。
const _OBF_SALT = 'B3nchN0te_xf_agnes_2024';
function _obfDec(s) {
  try {
    const k = _OBF_SALT, b = atob(s); let o = '';
    for (let i = 0; i < b.length; i++) o += String.fromCharCode(b.charCodeAt(i) ^ k.charCodeAt(i % k.length));
    return o;
  } catch (e) { return ''; }
}
const EMBED = {
  agnes: _obfDec('MVhDFCJ4YyYqaEAJK1RVOQZAKwtHWVkPZFohAzx+JQkbISobFVAjFisSA0MLBQFbBAQn'),
  xfAppid: _obfDec('JgFcBwl+CUE='),
  xfApiKey: _obfDec('dwtWV199UUZWaEgEbFZVC11EOVABBAUgUQtTDnZURgQ='),
  xfApiSecret: _obfDec('GFk/GicadQ4rGDVXEjUEWyhBFkp9AGE4fDkyEgACOg0=')
};
function getSettings() { const s = Object.assign({ voiceOn: false, agnesKey: '', xfAppid: '', xfApiKey: '', xfApiSecret: '', expDays: 30, notifyExp: false, lastNotifyDate: '' }, load(STORE.settings, {})); return s; }
function setSettings(s) { save(STORE.settings, s); }
function expDays() { const d = Number(getSettings().expDays); return (d && d > 0) ? d : 30; }
function uid(p) { return p + Date.now() + Math.floor(Math.random() * 1000); }

/* ---------------- 种子数据 ---------------- */
const DEFAULT_TEMPLATES = [
  { id: 'tp1', title: '外泌体浓缩与缓冲液置换', type: '蛋白', preset: true, raw: '14:00 取{{样本名}} 2 mL 批号 {{批号}} 转入超滤管；15:00 4000 g 离心 10 min 收集截留液；16:00 缓冲液置换 3 次 每次 500 μL PBS',
    consumables: [
      { name: '超滤管 15 mL 30 kDa', brand: '迈博瑞', cat: '耗材' },
      { name: '0.22 μm 针头滤器', brand: '迈博瑞', cat: '耗材' },
      { name: 'PBS 缓冲液 (1× pH7.4)', brand: 'Biosharp/迈邦', cat: '试剂' },
      { name: '50 mL 离心管', brand: 'Bioland/耐思', cat: '耗材' },
      { name: '10 mL 血清移液管', brand: 'Bioland/Nest', cat: '耗材' },
    ] },
  { id: 'tp2', title: '质粒小量提取', type: '分子', preset: true, raw: '09:00 挑单菌落接种 5 mL LB + 卡那霉素 37℃ 220 rpm 过夜；次日 09:00 取 1 mL 菌液 12000 g 离心 1 min 收集菌体；加 250 μL P1 重悬；加 250 μL P2 裂解；加 350 μL N3 冰上 5 min 12000 g 离心 10 min 取上清过柱',
    consumables: [
      { name: 'LB 液体培养基', brand: 'Solarbio', cat: '试剂' },
      { name: '卡那霉素 (50 mg/mL)', brand: 'Solarbio', cat: '试剂' },
      { name: 'P1/P2/N3 缓冲液', brand: '通用', cat: '试剂' },
      { name: '1.5 mL EP 管', brand: 'Axygen/Bioland', cat: '耗材' },
      { name: '质粒小提试剂盒', brand: '通用', cat: '试剂' },
      { name: 'Benzonase 核酸酶 (去RNA)', brand: 'NEB', cat: '试剂' },
    ] },
  { id: 'tp3', title: '细胞传代', type: '细胞培养', preset: true, raw: '弃旧培养基 PBS 洗 1 次；加 1 mL 0.25% 胰酶 37℃ 2 min；加 2 mL 完全培养基终止 吹打 5 次 分至 2 个 T25 瓶',
    consumables: [
      { name: '完全培养基 (DMEM/RPMI)', brand: '迈邦/Lonza', cat: '试剂' },
      { name: '0.25% 胰酶-EDTA', brand: '迈邦/Biosharp', cat: '试剂' },
      { name: 'PBS (1×)', brand: '迈邦/Biosharp', cat: '试剂' },
      { name: 'T25 细胞培养瓶', brand: 'Bioland/Nest', cat: '耗材' },
      { name: '胎牛血清 FBS', brand: 'Bioland FORLAB/Lonza', cat: '试剂' },
      { name: '10 mL 移液管', brand: 'Bioland/Nest', cat: '耗材' },
      { name: '15/50 mL 离心管', brand: 'Bioland/Nest', cat: '耗材' },
    ] },
  { id: 'tp4', title: '蛋白纯化（AKTA）', type: '蛋白', preset: true, raw: '09:30 平衡层析柱 5 CV 缓冲液 A；10:00 上样 {{样本名}} 批号 {{批号}} 流速 1 mL/min；11:30 收集主峰 共 3 mL',
    consumables: [
      { name: 'Protein A 填料 / 预装柱', brand: '楚天微球', cat: '耗材' },
      { name: 'Tris/Hepes/NaCl 等缓冲液组分', brand: 'Sigma/Solarbio', cat: '试剂' },
      { name: '超滤离心管 30 kDa', brand: '迈博瑞', cat: '耗材' },
      { name: '0.22 μm 滤膜', brand: '迈博瑞/Sigma', cat: '耗材' },
      { name: 'C-Flex 工艺管路', brand: '圣戈班', cat: '耗材' },
      { name: 'Benzonase 核酸酶', brand: 'NEB/迈博瑞', cat: '试剂' },
    ] },
  { id: 'sc12', title: '贴壁细胞传代', type: '细胞培养', preset: true, raw: '取出细胞，显微镜下观察细胞状态和密度，判断是否需要传代。；将所需耗材，如培养皿等放入超净台，打开紫外照射，灭菌30min。从4℃冰箱中取出胰酶、PBS、完全培养基，置于37℃水浴锅中预热。；紫外照射结束后，将细胞放入超净台中，吸去培养基（稍稍倾斜，好吸一些），贴壁加入2ml PBS润洗细胞（这是10cm大皿，中皿的话加入0.5-1ml足够），贴壁是；向培养皿中加入预热好的的胰酶（大皿1ml，中皿0.5ml），轻轻晃动培养皿使胰酶浸润到所有细胞层。；将培养皿放入37℃培养箱中消化，细胞消化时间约2min。不同细胞，消化时间会不同，需要自行探索。；可以在第一次消化的时候，每隔1min拿出来观察一下，如何判断已经消化好了：显微镜下观察，约70-80%细胞收缩变圆后，轻拍培养容器外壁，可看到细胞层像流沙一样脱；加入2ml完全培养基终止消化（中皿加入1ml即可）。通过轻微吹打使细胞脱离培养皿底部，使全部细胞完全脱离皿底。；把细胞悬液转移到15ml离心管中，再加入3ml培养基润洗培养皿后，转移到离心管中。室温，1000 rpm 离心 5 min。吸弃上清，用完全培养基重悬细胞。；吸取部分细胞加入到新的培养皿中，并添加足够的培养基（大皿10ml，中皿4-5ml）。轻轻摇晃均匀。马克笔在培养皿盖上做好标记，包括细胞系名称，代数，传代时间，传',
    consumables: [
      { name: '完全培养基(DMEM/RPMI)', brand: '迈邦/Lonza', cat: '试剂' },
      { name: '0.25%胰酶-EDTA', brand: '迈邦/Biosharp', cat: '试剂' },
      { name: 'PBS(1×)', brand: '迈邦/Biosharp', cat: '试剂' },
      { name: 'T25细胞培养瓶', brand: 'Bioland/Nest', cat: '耗材' },
      { name: '胎牛血清FBS', brand: 'Bioland/Lonza', cat: '试剂' },
      { name: '10mL移液管', brand: 'Bioland/Nest', cat: '耗材' },
      { name: '15/50mL离心管', brand: 'Bioland/Nest', cat: '耗材' },
    ] },
  { id: 'sc26', title: '细胞冻存及复苏', type: '细胞培养', preset: true, raw: 'DMSO：血清：培养基=1：2：7。培养基就用养细胞用的培养基。现配现用。；如果实验室用的是购买的冻存液，那就不用配。；将待冻存细胞培养至对数生长期，且状态良好。吸弃培养基，贴壁加入PBS清洗2次（大皿1ml，中皿0.5ml）。；加入预热的胰酶（大皿1ml，中皿0.5ml），轻轻晃动培养皿，使胰酶浸润到所有细胞。；放入培养箱消化2-3min（具体消化时间跟平时传代一样）。；加入2ml完全培养基终止消化（中皿加1ml即可）。；轻轻吹打细胞，使所有细胞脱落，转移至15ml离心管中，1000rpm离心5min。离心过程中可标记冻存管（冻存时间，细胞名称等）；吸弃上清，加入1ml培养基重悬后，细胞计数。；再次1000rpm离心5min，吸弃上清后，根据计数结果，加入冻存液重悬，使细胞浓度为1x106个/ml。；将细胞和培液转移至离心管，1000rpm离心5min。；4℃ 20min→-20℃ 30min→-80℃过夜→转移至液氮保存。；如果实验室用的是购买的非程序性冻存液，直接存放到-80℃中，短期可保存在-80℃，长期冻存需转移至液氮。；水浴锅打开，预热至37℃。；提前准备好15ml离心管，加入5ml预热好的完全培养基。；将细胞从液氮中取出，迅速放入干净的PE手套中，投入到水浴锅中。（放入PE手套，能够有效隔绝水浴锅导致的污染，同时不影响温度）；晃动冻存管管，加速细胞融化。（1min内融化完全）；取出冻存管，酒精喷洒消毒后，转移至超净台，吸取冻存液，转移至至准备好的15ml离心管中。；1000rpm离心5min；吸弃上清（除去细胞碎片和DMSO），加入1ml完全培养基重悬细胞，转移至培养皿中，添加足量培养基混匀后，正常培养即可。',
    consumables: [
      { name: '冻存液(90%FBS+10%DMSO)', brand: '通用', cat: '试剂' },
      { name: '完全培养基', brand: '迈邦/Lonza', cat: '试剂' },
      { name: 'DMSO', brand: 'Sigma', cat: '试剂' },
      { name: '冻存管', brand: 'Bioland/Nest', cat: '耗材' },
      { name: '程序降温盒', brand: '通用', cat: '耗材' },
      { name: 'PBS(1×)', brand: '迈邦', cat: '试剂' },
    ] },
  { id: 'sc25', title: 'Transwell迁移/侵袭测定实验', type: '细胞功能', preset: true, raw: '吸去细胞培养基，加入无血清培养基饥饿12h。；Transwell小室制备；如果是迁移实验可以省去此步骤。；在冰上，用预冷的无血清培养基将基质胶稀释到1mg/ml（基质胶室温下会凝固）。；取60µL基质胶溶液，垂直加入Transwell小室中，均匀平铺在小室底部，注意不要产生气泡。于37℃孵育1-3小时，使基质胶聚合成凝胶薄膜。；小心吸出未结合的基质胶。每孔加入100ul无血清培养基后，于培养箱孵育30min，进行基底膜水化。；小心吸出小室中的液体，检查液体是否穿过小室进入到24孔板中，如果没有，即可用于细胞接种。；在24孔板下室中加入500ul含10% FBS的完全培养基，用镊子将Transwell小室置于24孔板内。；将用无血清培养基饥饿了12h的细胞消化，离心弃上清后，用PBS洗1次，用无血清培养基重悬细胞，并调整到合适的细胞密度（一般为1-10x105cells/ml，根；吸取200ul细胞悬液加入到上室，放入培养箱培养12-48h（具体时间要参考文献，根据实验调整）。；到达设定的检测时间后，取出Transwell小室，吸干培养基，用PBS浸湿的棉签轻轻擦拭小室，除去膜表面未迁移的细胞，但是要小心不要刮破膜。；取新的24孔板，加入600ul 4%多聚甲醛，将小室放入后，室温固定30min。；取出小室，浸入到PBS中洗一次。；在新的24板孔中，加入600ul结晶紫染色液，将小室放入其中，室温染色15min。；取出小室，浸入到PBS中，洗3-5次。（可以在不同的板孔中加入800ul PBS，依次放入其中涮洗）。；晾干水分，即可进行镜检计数。',
    consumables: [
      { name: 'Matrigel/胶原', brand: 'Corning/通用', cat: '耗材' },
      { name: 'Transwell小室', brand: 'Corning/Bioland', cat: '耗材' },
      { name: '完全培养基', brand: '迈邦/Lonza', cat: '试剂' },
      { name: '0.25%胰酶', brand: '迈邦', cat: '试剂' },
      { name: '结晶紫染液', brand: 'Sigma/Solarbio', cat: '试剂' },
      { name: '4%多聚甲醛', brand: '通用', cat: '试剂' },
      { name: '24孔板', brand: 'Bioland/Nest', cat: '耗材' },
    ] },
  { id: 'sc7', title: '慢病毒制备及转染', type: '细胞转染', preset: true, raw: '45um滤器；Polybrene；包病毒前一天，将生长状态良好的293T细胞接种到6孔板中，密度约40%（使在转染的时候，密度达到70%左右即可）。；细胞转染（把病毒包装质粒转入293T细胞中）；使用脂质体转染试剂将病毒包装质粒转入到293T细胞中，按照说明书要求进行。；三质粒转染常用的比例是：10ug含目的基因质粒+7.5ug pSPAX2+2.5ug pMD2.G（6孔板或中皿）。；质粒和脂质体转染试剂的混合液加入到细胞中后，放于培养箱中培养。；转染6h后换液，转染48h后收集病毒上清液于50ml离心管中，4℃保存。培养皿中补充新鲜培养基继续培养24h。再次收集病毒上清液于50ml离心管中，将所有的病毒；转染前一天，将生长良好的靶细胞接种于6孔板，接种密度能保证第二天转染时细胞密度达到40%-50%即可。；慢病毒转染；第二天，吸弃旧的培养基，加入适量新鲜培养基以及适量病毒上清液（6孔板总体积为2ml，我们一般是1ml培养基+1ml病毒液）。加入适量polybrene，使pol；24h后，吸弃病毒液（注意生物安全），更换为新鲜的完全培养基，继续培养。之后正常培养，传代即可。；可采用挑单克隆或者分选等方式获得稳转株。',
    consumables: [
      { name: '293T细胞', brand: '通用', cat: '试剂' },
      { name: '脂质体转染试剂', brand: 'Thermo', cat: '试剂' },
      { name: '质粒(目的/pSPAX2/pMD2.G)', brand: '通用', cat: '试剂' },
      { name: 'Polybrene', brand: 'Sigma', cat: '试剂' },
      { name: '0.45μm滤器', brand: '迈博瑞', cat: '耗材' },
      { name: '6孔板', brand: 'Bioland/Nest', cat: '耗材' },
    ] },
  { id: 'sc11', title: '细胞免疫荧光染色', type: '免疫荧光', preset: true, raw: '2%的Triton X-100（PBS配制）；5%的BSA（PBS配制）或者10%的与二抗同源的山羊血清（PBS配制）；一抗、荧光二抗、DAPI染料；根据实验需求选择合适大小的盖玻片，一般6孔板就用24*24的即可（你也可以买专门的细胞爬片，除了贵没毛病）。；将盖玻片置于浓硫酸中浸泡并过夜，第二天用流动水冲洗20遍，再放入无水乙醇中浸泡6小时。取出，用ddH2O冲洗3次，烘干后，高压消毒。（着急用也可以用75%乙醇静；在孔板里准备放爬片的位置滴少量培养基，然后放玻片，防止加细胞悬液时玻片漂起。根据实验需求选择密度的细胞加入到6孔板中，放入培养箱中培养。；按照实验需求，培养到一定时间，取出孔板，使用镊子出去爬片（有时候爬片和孔板贴合的很紧，可以借助注射器针头撬起来再取爬片）。；将爬片放入培养皿中，使用PBS将爬片浸洗3次，每次3min。加入4%的多聚甲醛，完全浸没盖玻片，室温固定15min。然后用PBS浸洗3次，每次5min。；细胞透化、封闭及染色；使用0.2%的Triton X-100（PBS配制）室温透化细胞20min（如果要染色的是膜表面蛋白，这一步可以不做。透化的目的是让抗体能进入到细胞内部）。PB；加入5%的BSA（PBS配制）或者10%的与二抗同源的山羊血清（PBS配制），室温孵育1h进行封闭（这一步结束后，吸去封闭液即可，不需要洗涤）。；根据抗体说明书，使用封闭液稀释一抗，加入足量的一抗稀释液，4℃过夜孵育（置于摇床上）。；孵育完成后，用PBST洗3次，每次10min。加入足量的荧光二抗稀释液，室温孵育1h。PBST洗3次，每次5min。；滴加DAPI染色液，避光染色5-15min（一般5min就够了）。PBST洗3次，每次5min。；用吸水纸吸干爬片上的液体，用含抗荧光淬灭剂的封片液封片即可。',
    consumables: [
      { name: '4%多聚甲醛', brand: '通用', cat: '试剂' },
      { name: '0.2% Triton X-100', brand: 'Sigma', cat: '试剂' },
      { name: '一抗(目标蛋白)', brand: 'Abcam/BioLegend', cat: '试剂' },
      { name: '二抗(荧光标记)', brand: 'Abcam', cat: '试剂' },
      { name: 'PBST', brand: '迈邦', cat: '试剂' },
      { name: '抗荧光淬灭封片液', brand: '通用', cat: '试剂' },
      { name: '共聚焦玻片', brand: '通用', cat: '耗材' },
    ] },
  { id: 'sc1', title: 'Western Blot 全流程详解', type: '蛋白', preset: true, raw: '组织：剪碎后放入EP管中，加入适量裂解液（20mg可加入150-250ul），匀浆器破碎后冰上裂解10-30min。裂解充分后，4℃，12000rpm离心5mi；悬浮细胞：4℃，（离心速度根据细胞类型决定），离心5min去除培养基，加入预冷的PBS清洗后离心去除PBS（清洗3次）。加入适量裂解液，冰上裂解10-30min；贴壁细胞：吸弃培养基，加入预冷的PBS清洗后，吸弃（清洗3次，冰上操作）。加入适量裂解液（1x106细胞加入100-200ul），枪边吹边裂解。用细胞刮刮下细胞；常使用BCA法进行定量。除此以外，还有Lowry法以及Bradford法。；定量完成后，按4:1比例混合蛋白样本与5×Loading Buffer（如40ul样本+10ul Buffer）。金属浴95℃，10min。12000rpm，离；SDS PAGE配胶；安装好胶板和胶架后，进行检漏。（加入蒸馏水，放置一段时间后，观察蒸馏水是否减少，确认不漏后，倒去蒸馏水，垫好吸水纸，倒立切斜放置，吸干内部残留蒸馏水。）；配制并加入分离胶。分离胶配方如下，根据实际需要选择合适浓度的分离胶（这一步尤其要小心，记好哪种组分加过了，哪种还没加）。配好后加入到胶板中，加至两侧夹住玻璃板的；约20-30min后分离胶凝固，倒去上层无水乙醇，用吸水纸吸干净液体。配制上层浓缩胶。配方如下。配好后加入到胶板中，小心插入梳子。；浓缩胶凝固后，小心拔去梳子，组装好电泳装置，内层加满电泳缓冲液，外侧加2-3cm深。设计好样品点样顺序，即可点样。15孔泳道最大上样量30ul，10孔最大上样量；点样结束，补充外侧电泳缓冲液至上下胶分界线处，盖好盖子（电极）。恒压80V电泳。；进入分离胶后，调整电压为130V，继续电泳，溴酚蓝（大小约1 kDa）跑至底部即终止电泳。；PVDF膜在甲醇中浸泡1 min转入转膜缓冲液中，滤纸也泡入转膜缓冲液中。按顺序在转膜夹板的海绵层上放两层滤纸、胶、膜、两层滤纸，注意逐出气泡，封紧后放入电转槽；转膜结束后，TBST洗膜3次，每次5min（置于摇床上）。将膜放于封闭液（5%脱脂奶粉）中置于摇床上，室温孵育1h或者4℃过夜。；将膜置于有足量一抗的盒子或者封闭袋子中，置于摇床，室温孵育1h或4℃过夜。；一抗孵育结束后，TBST洗膜3次，每次5min（置于摇床上）。；根据一抗来源选择合适的二抗，按推荐比例稀释后，将膜置于其中，置于摇床，室温孵育1h。；二抗孵育结束后，TBST洗膜3次，每次5min（置于摇床上）。；按照显影液说明书要求进行使用。多设置一些曝光时间。',
    consumables: [
      { name: '10×电泳缓冲液', brand: '通用', cat: '试剂' },
      { name: '30%丙烯酰胺', brand: 'Sigma', cat: '试剂' },
      { name: '转膜缓冲液', brand: '通用', cat: '试剂' },
      { name: 'PVDF膜', brand: '迈博瑞/Sigma', cat: '耗材' },
      { name: '一抗', brand: 'Abcam/BioLegend', cat: '试剂' },
      { name: '二抗(HRP)', brand: 'Abcam', cat: '试剂' },
      { name: 'ECL发光液', brand: '通用', cat: '试剂' },
      { name: '脱脂奶粉', brand: '通用', cat: '试剂' },
    ] },
  { id: 'sc8', title: '蛋白纯化（镍柱）', type: '蛋白', preset: true, raw: '2M NaOH溶液；100mM NaSO4溶液；ddH2O；Ni2+ 能够螯合配体填充并固定在层析介质上，组氨酸（His）带有一个咪唑基团，该基团能够与 Ni2+ 形成配位键并选择性结合，而不带有 His-tag的蛋白不；随后通过高浓度的咪唑缓冲液与 His-Tag 竞争结合 Ni2+，将目的蛋白洗脱并进行收集，从而得到较为纯净的目的蛋白。；柱子使用太久积累了很多杂蛋白，或者Ni2+褪去了，就需要用用EDTA将Ni2+螯合下来，再用NaOH清洗柱料后，重新螯合Ni离子，即可完成镍柱重生。；将Ni2+亲和柱接在泵头上，用ddH2O冲洗5个柱体积。；用EDTA溶液冲洗5个柱体积，用ddH2O冲洗5个柱体积。；使用0.2 M NaOH溶液冲洗5个柱体积，用ddH2O冲洗10个柱体积。；使用NiSO4溶液填充亲和柱，冲洗5个柱体积，用ddH2O冲洗5个柱体积。；用低浓度咪唑盐缓冲液重悬菌块，然后进行超声破碎。这里需要自己去优化超声破碎的实验条件（破碎后清澈透亮、匀质为佳）。然后4℃，12000rpm，离心30min，收；用低浓度咪唑盐缓冲液冲洗柱子，大概5个柱体积。；将样品加入到柱子中。流速要低一点。使用5个柱体积的低浓度咪唑缓冲液（20mM，但是具体浓度是要根据实验进行调整的，可以查文献找找资料）缓慢冲洗柱子，去除非特异性；使用高浓度咪唑洗脱液将目的蛋白从镍柱上洗脱下来，并收集。在首次纯化某个目的蛋白的实验中，要设置多个梯度的咪唑洗脱液（如50mM，100mM，200nM，300m；最后用500mM咪唑冲洗柱子，2个柱体积，再用ddH2O冲洗5个柱体积，再用20%乙醇冲洗3个柱体积后，于4℃保存在20%乙醇溶液中。',
    consumables: [
      { name: 'Ni-NTA树脂', brand: '楚天微球/通用', cat: '耗材' },
      { name: '平衡缓冲液(20mM Tris+500mM NaCl)', brand: 'Sigma/Solarbio', cat: '试剂' },
      { name: '咪唑', brand: 'Solarbio', cat: '试剂' },
      { name: '洗脱缓冲液(300mM咪唑)', brand: 'Sigma', cat: '试剂' },
      { name: '超滤管', brand: '迈博瑞', cat: '耗材' },
      { name: '层析柱', brand: '通用', cat: '耗材' },
    ] },
  { id: 'sc13', title: '考马斯亮蓝染色', type: '蛋白', preset: true, raw: '通过SDS-PAGE电泳分离蛋白质，并根据蛋白质的大小和电荷选择合适的凝胶和电泳条件。；电泳结束后，取出凝胶，放置于干净的器皿中（我们6孔板，12孔板这些拆过的盒子都用来做WB实验了），用ddH2O清洗3次，每次30sec。；倒去ddH2O，加入考马斯亮蓝染色液，确保染色液完全覆盖凝胶。放置于摇床上振荡染色。一般需要染色30min-2h（取决于凝胶厚度），直至凝胶与染色液颜色十分接近；将凝胶转移至脱色液中，置于摇床上脱色至条带清晰。期间，可数次更换脱色液。',
    consumables: [
      { name: '考马斯亮蓝R250', brand: 'Sigma', cat: '试剂' },
      { name: '甲醇', brand: 'Sigma', cat: '试剂' },
      { name: '乙酸', brand: 'Solarbio', cat: '试剂' },
      { name: '脱色液', brand: '通用', cat: '试剂' },
      { name: '摇床', brand: '通用', cat: '耗材' },
    ] },
  { id: 'sc3', title: 'RNA抽提（Trizol法）', type: '分子', preset: true, raw: '动物组织/植物材料：将准确称取的RNA提取样品转移液氮预冷的研钵中，用研杵研磨组织（研磨过程中需要不断向研钵中补加液氮），直至研磨成粉末状，然后向粉末中加入适量；悬浮细胞：4℃，12000rpm，离心5min去除培养基，加入预冷的PBS清洗后离心去除PBS（清洗3次）。加入适量Trizol（一般1x106-1x107细胞；贴壁细胞：吸弃培养基，加入预冷的PBS清洗后，吸弃（清洗3次，冰上操作）。加入适量Trizol（一般1x106-1x107细胞加入1ml Trizol）。用细胞；按照1ml Trizol加入200ul氯仿的比例假如氯仿，充分混匀后室温放置15min（不可用涡旋振荡仪）。；4℃，12000rpm，离心15min。小心取出离心管，此时匀浆液分为三层：上清液（含RNA）、中间蛋白层、下层有机相。吸取上清液转移至另新的离心管中（1ml ；向离心管中加入相同体积预冷的异丙醇，上下颠倒混匀。-20℃放置10min后，4℃，12000rpm，离心15min。吸弃上清（先用大枪头吸，再用小枪头吸保护沉淀；使用DEPC水和无水乙醇配制75%乙醇。向沉淀中加入和初始Trizol等体积的75%乙醇，漂洗RNA。4℃，12000rpm，离心10min，吸弃上清。打开离心；加入适量DEPC水溶解RNA，在Nanodrop上测定RNA浓度。纯度完好的RNA：1.8＜260/280＜2.0，260/230>2',
    consumables: [
      { name: 'Trizol', brand: 'Thermo/Invitrogen', cat: '试剂' },
      { name: '氯仿', brand: 'Sigma', cat: '试剂' },
      { name: '异丙醇', brand: 'Sigma', cat: '试剂' },
      { name: '无水乙醇', brand: 'Solarbio', cat: '试剂' },
      { name: 'DEPC水', brand: '通用', cat: '试剂' },
      { name: '1.5mL EP管', brand: 'Axygen/Bioland', cat: '耗材' },
    ] },
  { id: 'sc5', title: 'qPCR实验流程', type: 'PCR', preset: true, raw: '每个样品，每对引物需要做3个平行复孔；同时每对引物需要2个阴性对照（详细在第2步配制反应体系中）。；稀释cDNA：一般将逆转录产物稀释2-10倍（根据实验情况再调整，最终是qPCR Ct值在18-28范围内的稀释倍数比较好）。；在超净台中，用马克笔在qPCR板上划线。按照要q的基因不同，划分成一个一个不同的小区域。这一步是为了防止加样时眼花，加错孔（试过一次就知道，96孔加样，太容易出；取出SYBR Green，置于冰上溶解。；SYBR Green：10ul；F primer：0.5ul  R primer：0.5ul；ddH2O：4ul  cDNA：5ul；每个样品，每对引物需要做3个平行复孔；同时每对引物需要2个阴性对照。；eg：有3个样品，2对引物+1对内参基因引物。配置体系时：1对引物用1个EP管，这里加内参引物共3对，就准备3个EP管。；内参的作用主要是校正样品间的差异。；1个EP管中（即针对同一个引物），需要配3（样品数）*3（复孔）+2（阴性对照）=11个体系。一般来说，因为体系配好后分到各个孔的过程会有损耗，所以会多配1-2；切记：这种配置方式，配mix的时候，样本不能加进去，等转移到对应的孔里，再分别添加样本。；确保封板膜与pcr板紧密贴合，避免出现气泡和松动，防止样本蒸发和交叉污染。；离心，确保所有组分混匀。（我们离心条件一般是：4℃，3000rpm，3min）；预变性（Holding Stage）：95℃ 5min；循环阶段（Cycling Stage）：95℃ 10sec；60℃ 30sec',
    consumables: [
      { name: 'SYBR Green Mix', brand: 'Thermo/Bio-RAD', cat: '试剂' },
      { name: '引物(目的/内参)', brand: '通用', cat: '试剂' },
      { name: 'ddH₂O', brand: '通用', cat: '试剂' },
      { name: 'qPCR板/八连管', brand: 'Axygen', cat: '耗材' },
      { name: '封板膜', brand: 'Axygen/Bioland', cat: '耗材' },
    ] },
  { id: 'sc27', title: 'PCR实验原理及详细步骤', type: 'PCR', preset: true, raw: '高温变性：双链DNA模板经过高温（90℃-96℃）加热一定时间(10~30s)后，氢键断裂，解链变成两条单链DNA。；低温退火：当温度降至55℃-65℃左右（根据引物Tm值设置）时，引物与模板DNA单链的互补配对，形成局部双链。；延伸：将温度调至70℃-75℃左右（DNA聚合酶最适反应温度），在Taq DNA聚合酶的作用下，以dNTP为原料，从引物的3′端开始按照5′→3′端的方向延伸，；模板可以是任意来源的DNA（也可以是RNA，此处不做讨论）。比如基因组DNA，质粒DNA，cDNA，无论是从细胞还是组织来源，或者细菌真菌都可以。不同来源有不同；前面有一篇引物设计讲得很详细了，可以去瞅瞅。；根据你的实验规划，算一下要做多少组PCR，因为每一组要加的PCR预混液、ddH2O、以及引物（针对同一基因，不同模板的PCR，此时引物相同，模板不同。如果是针对；配反应体系是很多实验都要用到的操作。；以上体系不是一成不变的。；一般PCR mix都是2X的，意味着如果配20ul体系，就加10ul。30ul体系，就加15ul。；引物一般0.5-1ul，只要上下游引物一致即可。；模板体积取决于浓度，浓度高就少一点。；最后用ddH2O补足即可。；这里就可以看到，如果要做10管PCR，分开一管一管加这些试剂，非常耗费时间，而且像引物这样小体积的，误差会比较大。；这样，在1个ep管中配制了198 ul的体系，混匀后分装到10个PCR管中，每管18 ul，再分别加入2 ul对应的模板。加样过程直接贴壁加入即可，不需要特别注；这一步主要是根据引物的Tm、扩增片段的长度以及Taq 酶来决定的。；要注意的是：从PCR仪中取出后，还要瞬时离心一次，因为温度高，很多液体蒸发导致不在底部。',
    consumables: [
      { name: 'PCR Mix(高保真酶)', brand: 'NEB/Thermo', cat: '试剂' },
      { name: 'dNTP', brand: 'NEB', cat: '试剂' },
      { name: 'Taq酶', brand: 'NEB', cat: '试剂' },
      { name: '引物', brand: '通用', cat: '试剂' },
      { name: '琼脂糖', brand: 'Solarbio', cat: '试剂' },
      { name: 'PCR管', brand: 'Axygen', cat: '耗材' },
    ] },
  { id: 'sc4', title: '分子克隆全流程（T4 连接酶）', type: '分子', preset: true, raw: '对目的基因PCR（设计引物要带上酶切位点，酶切位点选择质粒上有的）获取片段，跑胶，鉴定长度，长度无误，才可以进行下一步（多p一点，免得后面做连接不够用）。；胶回（ps：切胶之前就打开水浴锅，75℃，节约时间）。胶回按照试剂盒protocol来就可以。测定浓度。新手一定记住用完水浴锅关掉或者调低温度，不然很容易烧干的；按照设计的酶切位点选择内切酶。配30ul体系：酶各1ul，酶切目标10ug，剩下的用双蒸水补齐。37℃水浴锅里酶切6h。（配两个体系，基因片段和质粒各一个体系进；载体质粒切开了，环状DNA和线型DNA跑胶的速度就不一样，以此来判断是否切开了。记住，一定要同时跑一个没有经过酶切的载体，作为对照。这样才方便判断有没有切开。基；SolutionI酶：    5ul；片段：          4ul；载体：          1ul；片段和载体的量不是固定的，根据浓度做调整就好。一般质粒：目的片段（摩尔比）=1:3-1:10之间。；默认每个核苷酸分子量是相同的，那单个DNA（无论是质粒还是目的片段）的质量和bp数成正比。这样去计算用量。；第二天早上转化，取感受态菌和连接产物，冰上融化。；将连接产物转移到菌中，混匀，放冰上30min。；热击：42℃，90s（严格步骤），放冰上2min。；加入800ul LB培养液，37℃半小时（置于摇床）。此时把培养平板拿出放入培养箱预热。；30min孵育结束后，取出培养液，离心：3000g，3-5min。；吸去上清，留约50-60ul培养液，涂板。放到37℃培养箱中培养。（一般我是下午五六点放进去，差不多隔天早上八点多菌落长到合适大小）；第三天早上挑取单克隆，摇菌（我一般挑20个）：EP管里放1ml LB培养液，镊子酒精灯灭菌后，夹取小枪头，挑取单个菌落放入EP管中。37℃，摇床摇2-3h即可。；以摇好的菌液作为PCR模版（直接吸取2ul），使用目的片段的引物，进行菌液PCR，之后跑胶。这一步的目的是初步鉴定是否为阳性克隆。；然后挑选跑胶结果为阳性的菌液，送测序。剩余菌液保存在4℃。带测序结果出来后，挑选构建成功的菌液，进行后续操作。',
    consumables: [
      { name: '载体质粒', brand: '通用', cat: '试剂' },
      { name: 'T4 DNA连接酶', brand: 'NEB', cat: '试剂' },
      { name: '限制性内切酶', brand: 'NEB', cat: '试剂' },
      { name: '感受态细胞', brand: '通用', cat: '试剂' },
      { name: '胶回收试剂盒', brand: '通用', cat: '试剂' },
      { name: 'LB培养基', brand: 'Solarbio', cat: '试剂' },
    ] },
  { id: 'sc127', title: '感受态细胞的制备--氯化钙法', type: '分子', preset: true, raw: '冷冻离心机（可离50ml离心管的），超净工作台或生物安全柜，高压蒸汽灭菌锅，细菌培养箱；1mol/l 氯化钙溶液（500ml以上，提前灭菌后4度备用），LB培养基（于1L锥形瓶中配置250ml培养基，好后立即灭菌，置于超净工作台中备用），1L锥形瓶；Day 1；将原始菌株（DH5α、stbl3等）在冰上溶解；；通过划线的方式将原始菌株接种到无抗性的LB固体培养基，过夜培养；；Day 2；挑取单菌斑至含5mL LB培养基（无抗）的50ml离心管中，在37℃，200rpm的培养箱，过夜培养；（时间控制在14-16h，务必预留充足的氧气以供工程菌生长；按1:100稀释至含250mL LB培养基（无抗）的1L锥形瓶中，使用透气膜（30mm）封口，37度培养2h后，每15min测一次OD600值至OD600值达到；将250mL菌液分装至4个50ml离心管中，放于冰上10min，使菌液冷却至0℃；；于4℃，2000xg，离心10min，倒出培养基，倒置10s使多余液体流尽，使用200ul枪头吸尽多余液体。（使用固定式离心转子，使菌体离心附着至管壁底部一侧且；每个离心管加2mL预冷的0.1mol/L CaCl2轻轻重悬细胞，再用CaCl2定容至30mL，冰上放置30min；（重悬时，手持离心管上部，将离心管下部置于冰；于4℃，2000xg，离心10min，倒出多余的培养基，倒置10s使多余液体流尽，使用200ul枪头吸尽多余液体。；用2mL 预冷的0.1mol/L CaCl2重悬细胞，4℃冰箱放置4h或过夜。；Day 3；每50ml离心管加858ul 50%甘油或者230 ul 80%的甘油（终浓度15%），在冰上将感受态按200ul分装，立即放入液氮中使其迅速降温，随后放置-8；注意：感受态制作是全程冰上操作保持低温，切忌温度剧烈变化，动作务必轻柔，以保证感受态细胞的效率。',
    consumables: [
      { name: 'CaCl₂(0.1M)', brand: 'Sigma', cat: '试剂' },
      { name: 'LB培养基', brand: 'Solarbio', cat: '试剂' },
      { name: '甘油', brand: 'Sigma', cat: '试剂' },
      { name: '50mL离心管', brand: 'Bioland/Nest', cat: '耗材' },
      { name: '冰浴盒', brand: '通用', cat: '耗材' },
    ] },
  { id: 'sc15', title: '免疫共沉淀（Co-IP）', type: '分子', preset: true, raw: '吸去培养皿中的培液，加入预冷的PBS洗细胞3次。；吸弃PBS，加入预冷的RIPA buffer（一般大皿加入1ml，中皿0.5ml即可）。；用预冷的细胞刮将细胞从培养皿上刮下，转移到1.5ml EP管中，放于冰盒里，冰盒放在摇床上，缓慢晃动裂解15min。；4℃，14000g，离心15min。将上清转移至新的EP管中。；BCA测定蛋白浓度。；准备Protein A agarose，用2倍体积的PBS 洗珠子，3000rpm，离心3min后，吸弃上清。再次加入PBS清洗，总共洗3次。；用PBS将琼脂糖珠配制成50%浓度（体积比）。整个过程需要剪掉枪尖部分，避免操作中破坏琼脂糖珠（因为枪头尖太细）。；第一种：抗体+裂解液孵育后，再加入微珠孵育，然后清洗，洗脱。优点是蛋白得率和纯度高。；第二种：抗体+微珠孵育，清洗后再加入裂解液，然后清洗，洗脱。抗体不够纯时，使用这种方法，可以去除掉抗体的非特异性结合。；第三种：抗体+裂解液+微珠一起孵育，然后清洗，洗脱。优点是节约时间，缺点是可能会有非特异性结合。；向蛋白裂解液中加入适量一抗。抗体量及终浓度要通过预实验（梯度稀释）或者查阅文献和说明书来确定。；4℃孵育过夜，旋转或振荡使结合充分。；第2天，加入适量的（根据蛋白量加，一般100ug蛋白加10ul）50%的Protein A agarose。4℃翻转孵育2-4h。；4℃，14000rpm瞬时离心5s，吸去上清，用预冷的RIPA buffer洗3遍，每次500ul。也可以使用PBS清洗。；加入适量（根据实验确定体积。比如最后想点3个孔道跑WB，1个点20ul，那就加70ul，多10ul是为了防止损耗）2×SDS上样缓冲液将琼脂糖珠-抗原抗体复合物；煮样5min，14000g离心1-2min，收集上清，电泳前再煮样5min变性。',
    consumables: [
      { name: 'RIPA裂解液', brand: '通用', cat: '试剂' },
      { name: 'BCA蛋白定量试剂盒', brand: '通用', cat: '试剂' },
      { name: 'Protein A/G agarose', brand: 'Abcam/通用', cat: '耗材' },
      { name: '一抗', brand: 'Abcam', cat: '试剂' },
      { name: '二抗', brand: 'Abcam', cat: '试剂' },
      { name: 'PBS', brand: '迈邦', cat: '试剂' },
    ] },
  { id: 'sc18', title: 'GST Pull-down', type: '分子', preset: true, raw: '将诱饵蛋白的编码序列插入到表达载体中GST标签的下游。常用的GST表达载体为：pGEX-4T-1。；预实验：检测蛋白表达；将构建好的载体转化到BL21大肠杆菌感受态中，可以通过PCR或者测序等方式确定转化成功。；将转化成功的菌株扩大培养，到OD值为0.6-0.8时，加入IPTG诱导蛋白表达（可以设置不同的IPTG浓度梯度，如0.3，0.5，0.7mM，以找到最合适的浓度；诱导结束后，4℃，5000rpm，离心10min。吸弃上清，加入适量PBS，再次相同条件离心10min，吸弃上清，按照10ml菌液加1ml PBS的比例，加入P；破碎后，4℃，10000rpm离心15min，转移上清至新的EP管中，加入Loading buffer，煮样10min。；通过Western检测蛋白表达的效果。；蛋白大量表达及纯化鉴定；经过上述预实验，得到最适的IPTG诱导条件。对细菌进行大量培养，并诱导表达。；按照预实验的步骤，破碎后收集上清液（含有连上了GST的诱饵蛋白）。如果暂时不用，保存在-80℃。；在裂解液上清中加入适量的50% Glutathione Sepharose 4B，4℃轻轻摇动孵育2小时。；4℃，4000rpm离心5min，吸弃上清，此时剩下的就是连上了GST-诱饵蛋白的Sepharose。；加入200ul预冷的PBS，轻轻晃动洗涤珠子，然后4℃，4000rpm离心5min，吸弃上清。重复洗3次。这是为了洗去非特异性结合的蛋白。；目标蛋白可连上His标签进行表达、制备纯化。；Pull-down实验；实验组：结合有GST-诱饵蛋白的珠子里，加入适量His-目标蛋白溶液，4℃，旋转孵育6h。；对照组：结合有GST蛋白的珠子，加入适量His-目标蛋白溶液，4℃，旋转孵育6h。；4℃，4000rpm离心5min，吸弃上清。；贴壁加入500ul 预冷的PBS，轻轻晃动洗涤珠子。4℃，4000rpm离心5min，吸弃上清。重复洗3次。；加入Loading buffer，煮样10min后，进行后续Western检测。',
    consumables: [
      { name: 'BL21菌株', brand: '通用', cat: '试剂' },
      { name: 'IPTG', brand: 'Sigma', cat: '试剂' },
      { name: 'GST标签融合蛋白', brand: '通用', cat: '试剂' },
      { name: 'Glutathione琼脂糖', brand: '通用', cat: '耗材' },
      { name: 'PBS', brand: '迈邦', cat: '试剂' },
      { name: 'Loading buffer', brand: '通用', cat: '试剂' },
    ] },
  { id: 'sc23', title: '石蜡切片HE染色（苏木精-伊红染色）', type: '病理组织', preset: true, raw: '提前准备好待染色的石蜡切片（如果是冰冻切片，基本步骤一样，不用做脱蜡，染色时间短一些即可）。；二甲苯I中10min，然后放入二甲苯II中10min（染色剂为水溶性，水与石蜡不溶，在染色前必须将石蜡脱尽，否则不能染色）。；100%乙醇、95%乙醇、85%乙醇、75%、50%乙醇中各5 min。；自来水冲洗2min。；浸入苏木精染色液中，染色3-5min，用自来水冲洗。染色过程中切勿干片，否则会导致切片收缩、变形，影响组织形态。；然后自来水冲洗2min。；在1%的盐酸酒精分化液中分化3-5s。然后自来水冲洗3min，洗2次。；浸入淡氨水中，3-5min，使细胞蓝化。然后自来水冲洗3min。；浸入伊红染色液中，染色2min（色时间由组织大小和切片厚度还有组织类型决定），自来水冲洗2min。；75%、85%、90%乙醇各脱水1次，95%乙醇脱水2次，100%乙醇脱水3次，每次1min；二甲苯I：1min，然后放入二甲苯II：1min。；在组织中央滴加中性树胶，缓慢放下盖玻片（避免气泡）。',
    consumables: [
      { name: '梯度乙醇(50-100%)', brand: 'Solarbio', cat: '试剂' },
      { name: '二甲苯', brand: 'Sigma', cat: '试剂' },
      { name: '苏木精染液', brand: '通用', cat: '试剂' },
      { name: '伊红染液', brand: '通用', cat: '试剂' },
      { name: '中性树胶', brand: '通用', cat: '耗材' },
      { name: '载玻片/盖玻片', brand: '通用', cat: '耗材' },
    ] },
];

/* ---------------- 供应商/合作伙伴配置（自然获客入口） ----------------
   两家公司：斯达康面向科研用户，康腾面向企业用户。
   按上下文自动路由（仪器校准→康腾，其他→斯达康）。
   改这里即可全站生效。                                            */
const SUPPLIERS = {
  research: {
    id: 'research', name: '广州斯达康生物科技有限公司', shortName: '斯达康生物',
    audience: '科研用户', tagline: '科研试剂耗材 · 实验老师一站对接',
    contact: '农丽萍', phone: '18688470610', phoneTel: 'tel://18688470610',
    email: 'anissa.nong@kangtengbio.com', website: 'https://www.kangtengbio.com',
    wechatQr: 'wechat-qr.png',
    brandText: '代理品牌：Thermo · Sigma · MCE · Bio-RAD · NEB · Abcam · 百普赛斯 · Stemcell · Solarbio · Biosharp · Nest · Axygen · 义翘神州 · Texwipe 等',
    equipmentText: ''
  },
  enterprise: {
    id: 'enterprise', name: '广州康腾生物科技有限公司', shortName: '康腾生物',
    audience: '企业客户', tagline: '生物制药工艺链 · 研发到放行一站搞定',
    contact: '张经理', phone: '189-2226-6118', phoneTel: 'tel://18922266118',
    email: 'zhangyongsheng@kangtengbio.com', website: 'https://www.kangtengbio.com',
    wechatQr: 'kangteng-qr.png',
    brandText: '授权品牌：Lonza龙沙 · 迈邦 · 楚天微球 · 圣戈班 · 迈博瑞 · 贝兰伯 · BioLegend · Applikon\n优势代理：Thermo · Sigma · MCE · Bio-RAD · NEB · Abcam · 百普赛斯 · Stemcell · Solarbio · Nest 等',
    equipmentText: '仪器设备：中科都菱冰箱(2-8℃/-86℃) · 液氮罐 · 离心机',
    article: 'https://mp.weixin.qq.com/s/vZjuDG_NfYHbIxeirysBFA'
  }
};
/* 按上下文路由：仪器校准走康腾(代理中科都菱等设备)，其他场景走斯达康 */
function pickSupplier(ctx) {
  if (ctx === 'instrument' || ctx === 'service') return SUPPLIERS.enterprise;
  return SUPPLIERS.research;
}
const SUPPLIER = SUPPLIERS.research; /* 向后兼容（默认指向斯达康） */
function ensureTemplateDefaults() {
  const t = load(STORE.templates, null);
  if (Array.isArray(t) && t.length) return;   // 用户已有模板则不覆盖
  save(STORE.templates, DEFAULT_TEMPLATES);
}
/* 模板变量迁移：把旧版默认模板升级为含 {{变量}} 的版本，并补齐 tp4（仅执行一次） */
function migrateTemplates() {
  if (load('bench.tplMigrated', false)) return;
  save('bench.tplMigrated', true);
  const tpls = load(STORE.templates, []);
  const tokenMap = {
    tp1: '14:00 取{{样本名}} 2 mL 批号 {{批号}} 转入超滤管；15:00 4000 g 离心 10 min 收集截留液；16:00 缓冲液置换 3 次 每次 500 μL PBS',
    tp2: '09:00 挑单菌落接种 5 mL LB + 卡那霉素 37℃ 220 rpm 过夜；次日 09:00 取 1 mL 菌液 12000 g 离心 1 min 收集菌体；加 250 μL P1 重悬；加 250 μL P2 裂解；加 350 μL N3 冰上 5 min 12000 g 离心 10 min 取上清过柱',
    tp3: '弃旧培养基 PBS 洗 1 次；加 1 mL 0.25% 胰酶 37℃ 2 min；加 2 mL 完全培养基终止 吹打 5 次 分至 2 个 T25 瓶'
  };
  let changed = false;
  tpls.forEach((t) => { if (tokenMap[t.id] && !t.raw.includes('{{')) { t.raw = tokenMap[t.id]; changed = true; } });
  if (!tpls.find((t) => t.id === 'tp4')) { tpls.push({ id: 'tp4', title: '蛋白纯化（AKTA）', raw: '09:30 平衡层析柱 5 CV 缓冲液 A；10:00 上样 {{样本名}} 批号 {{批号}} 流速 1 mL/min；11:30 收集主峰 共 3 mL' }); changed = true; }
  if (changed) save(STORE.templates, tpls);
}
/* 模板耗材迁移：给已有模板补上 consumables 字段（仅执行一次） */
function migrateTemplateConsumables() {
  if (load('bench.tplConsumables', false)) return;
  save('bench.tplConsumables', true);
  const tpls = load(STORE.templates, []);
  let changed = false;
  tpls.forEach((t) => {
    const def = DEFAULT_TEMPLATES.find((d) => d.id === t.id);
    if (def && def.consumables && !t.consumables) { t.consumables = def.consumables; changed = true; }
  });
  if (changed) save(STORE.templates, tpls);
}
/* 预设模板迁移：把平台预设模板（preset:true，爬取自破土狗等公开 protocol）补齐到
   用户模板库；并为旧模板补上 type 字段，便于按类型分组（仅执行一次） */
function migratePresetTemplates() {
  if (load('bench.tplPreset', false)) return;
  save('bench.tplPreset', true);
  const tpls = load(STORE.templates, []);
  const have = new Set(tpls.map((t) => t.id));
  let changed = false;
  DEFAULT_TEMPLATES.forEach((d) => {
    if (d.preset && !have.has(d.id)) { tpls.push(JSON.parse(JSON.stringify(d))); changed = true; }
  });
  tpls.forEach((t) => { if (!t.type) { const d = DEFAULT_TEMPLATES.find((x) => x.id === t.id); t.type = d && d.type ? d.type : '其他'; changed = true; } });
  if (changed) save(STORE.templates, tpls);
}
/* 实验记录标签迁移：给内置示例记录补上标签，便于筛选演示（仅执行一次） */
function migrateExperiments() {
  if (load('bench.expMigrated', false)) return;
  save('bench.expMigrated', true);
  const exps = load(STORE.exp, []);
  const map = { e1: ['外泌体', '纯化'], e2: ['层析', '纯化'] };
  let changed = false;
  exps.forEach((e) => { if (map[e.id] && !Array.isArray(e.tags)) { e.tags = map[e.id]; changed = true; } });
  if (changed) save(STORE.exp, exps);
}
/* 试剂数据迁移：旧单条字段 → lots 数组 */
function migrateReagLots() {
  if (load('bench.reagMigrated', false)) return;
  const reags = load(STORE.reag, []);
  let changed = false;
  reags.forEach((r) => {
    if (r.lots && r.lots.length) return;
    r.lots = [{
      id: uid('l'),
      lot: r.lot || '',
      batch: r.batch || '',
      qty: Number(r.qty) || 0,
      unit: r.unit || '瓶',
      location: r.location || '',
      expiry: r.expiry || '',
      opened: '',
      status: '未使用'
    }];
    changed = true;
  });
  if (changed) save(STORE.reag, reags);
  save('bench.reagMigrated', true);
}
function seed() {
  if (load(STORE.seeded, false)) return;
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
    { id: 'r1', name: '超滤管 100kD', min: 2, supplier: 'Millipore', lots: [
      { id: 'l1', lot: 'UF2603', batch: '', qty: 3, unit: '支', location: '4℃柜A', expiry: '2027-01-10', opened: '', status: '未使用' }
    ]},
    { id: 'r2', name: 'PBS 缓冲液', min: 1, supplier: '自配', lots: [
      { id: 'l2', lot: 'PB2605', batch: 'B001', qty: 2, unit: 'L', location: '4℃柜A', expiry: '2026-07-20', opened: '', status: '在用' }
    ]},
    { id: 'r3', name: '蛋白酶K', min: 1, supplier: 'Thermo', lots: [
      { id: 'l3', lot: 'PK2512', batch: '', qty: 1, unit: '支', location: '-20℃冰箱', expiry: '2026-07-02', opened: '', status: '未使用' }
    ]},
    { id: 'r4', name: '色谱填料 Capto', min: 2, supplier: 'Cytiva', lots: [
      { id: 'l4', lot: 'CM2601', batch: 'C2401', qty: 0.5, unit: 'mL', location: '4℃柜B', expiry: '2027-03-01', opened: '2026-06-15', status: '在用' },
      { id: 'l5', lot: 'CM2601', batch: 'C2402', qty: 1, unit: 'mL', location: '4℃柜B', expiry: '2027-09-01', opened: '', status: '未使用' }
    ]},
    { id: 'r5', name: '移液器吸头 200μL', min: 100, supplier: 'Axygen', lots: [
      { id: 'l6', lot: 'TP2606', batch: '', qty: 500, unit: '个', location: '常温柜', expiry: '2028-05-01', opened: '', status: '未使用' }
    ]}
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
  save(STORE.seeded, true);
}

/* ---------------- 状态 ---------------- */
let currentView = 'overview';
let reagSeg = 'reag';
let reagFilter = 'all';
let reagLotFilter = 'all';
let reagSearch = '';
let calYear, calMonth; // 效期日历：默认当前月（calMonth 0-based）
let freezerBox = 'B1';
let freezerSearch = '';
let freezerMulti = false;
let freezerSel = new Set();
let editingExpId = null;
let editingReagId = null;
let currentSteps = [];
let resultMetric = 'OD600 菌液';
let expSearch = '';
let expFilter = 'all';
let expTag = '';
let expSelectMode = false;
let expSel = new Set();
let reagSelectMode = false;
let reagSel = new Set();

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
/* ---------------- 批次辅助函数 ---------------- */
// 获取试剂的汇总数量和最短效期
function reagTotalQty(r) {
  if (!r.lots || !r.lots.length) return Number(r.qty) || 0;
  return r.lots.reduce((s, l) => s + (Number(l.qty) || 0), 0);
}
function reagLotsExpired(r) {
  if (!r.lots || !r.lots.length) return daysUntil(r.expiry) < 0;
  return r.lots.some((l) => l.expiry && daysUntil(l.expiry) < 0);
}
function reagMinExpiry(r) {
  if (!r.lots || !r.lots.length) return r.expiry || '';
  const vals = r.lots.map((l) => l.expiry).filter(Boolean);
  if (!vals.length) return '';
  vals.sort();
  return vals[0];
}
function reagLotsExpiring(r) {
  const e = reagMinExpiry(r);
  if (!e) return false;
  const d = daysUntil(e);
  return d <= expDays() && d >= 0;
}
function reagHasLot(r, lot) {
  if (!r.lots) return (r.lot || '') === lot;
  return r.lots.some((l) => l.lot === lot);
}
function reagGetLotStr(r) {
  if (!r.lots || !r.lots.length) return r.lot || '';
  return [...new Set(r.lots.map((l) => l.lot).filter(Boolean))].join('/');
}

function reagStatus(r) {
  const expired = reagLotsExpired(r);
  if (expired) return { key: 'bad', text: '已过期' };
  const expiring = reagLotsExpiring(r);
  if (expiring) return { key: 'warn', text: '临期' };
  if (reagTotalQty(r) <= Number(r.min || 0)) return { key: 'warn', text: '需补货' };
  return { key: 'ok', text: '正常' };
}

function toast(msg, ms) {
  const t = $('toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove('show'), ms || 1800);
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
  _barBaseH = 0; _titleF = -1;                  // 标题文字变了，重新测量基准高度
  updateTitleScale();
}
/* 标题随滚动收缩（iOS 大标题风格）：前 90px 内整块从满尺寸收缩到 ~66%。
   做法：对整个 .topbar（玻璃卡 + 边框 + 标题）施加 transform:scale(s)，origin top-left，
   整块等比一起缩小（不再只缩内层导致边框/块不同步）。同时为 .topbar 设负 marginBottom
   收回缩放后空出的高度，使下方内容跟随上移、不产生空白。
   分享按钮位于 .topbar 内，随整块一起朝左上移动；通过 --inv(=1/s) 反向缩放保持自身大小不变。 */
let _titleRaf = 0, _titleF = -1, _barBaseH = 0;
function measureBar() {
  const top = document.querySelector('.topbar');
  if (!top) return;
  _barBaseH = top.offsetHeight;                                           // 默认 81（.topbar 固定高度，不随收缩变化）
  document.documentElement.style.setProperty('--baseH', _barBaseH + 'px'); // 供 .content 同步上移消除留白
}
function onScrollTitle() {
  if (_titleRaf) return;                       // rAF 节流：每帧最多算一次
  _titleRaf = requestAnimationFrame(() => { _titleRaf = 0; updateTitleScale(); });
}
function updateTitleScale() {
  const sub = $('viewSub');
  if (!_barBaseH) measureBar();
  const y = window.scrollY || document.documentElement.scrollTop || 0;
  const f = Math.min(Math.max(y / 90, 0), 1);
  if (f === _titleF) return;                   // 无变化跳过
  _titleF = f;
  const s = 1 - 0.34 * f;                       // 整块 100% -> 66%
  // 整条收缩全走 transform（合成层、零重排、玻璃模糊不每帧重算 => 丝滑）：
  //  - .topbar-card（玻璃卡+边框）：scaleY(s) origin top left => 满宽不变、高度向上收小、边框跟着一起缩
  //  - .topbar-inner（文字）：scaleX(s) origin top left => 与卡片 scaleY 合成后文字等比缩小、钉在左上角（不向左缩宽度）
  //  - .content：translateY 同步上移，消除卡片变小后的顶部留白
  //  - 分享按钮在 .topbar 内、不缩放，靠 CSS calc(--s/--baseH) 的 transform 始终垂直居中于卡片
  //  .topbar 本身只作 sticky 容器、不缩放 => 吸顶稳定不破
  document.documentElement.style.setProperty('--s', s.toFixed(3));
  if (sub) sub.style.opacity = (1 - 0.7 * f).toFixed(2);
}
function renderAll() {
  if (currentView === 'overview') renderOverview();
  else if (currentView === 'experiments') renderExperiments();
  else if (currentView === 'reagents') renderReagents();
  else if (currentView === 'tools') renderTools();
  else if (currentView === 'more') renderMore();
  setHeader();
  setFab();
  setShareBtn();
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
    $('viewTitle').textContent = '试剂/耗材 库存管理';
    $('viewSub').textContent = reagSeg === 'freezer' ? `共 ${load(STORE.samples, []).length} 份` : `共 ${reags.length} 种`;
  } else if (currentView === 'tools') {
    $('viewTitle').textContent = '工具箱'; $('viewSub').textContent = '实验常用计算与小工具';
  } else if (currentView === 'more') {
    $('viewTitle').textContent = '更多'; $('viewSub').textContent = 'API · AI 设置 · 数据备份 · 功能引导';
  }
}
function setFab() {
  const fab = $('fab');
  const on = (currentView === 'experiments' || currentView === 'reagents');
  if (on) { fab.classList.remove('hidden'); }
  else { fab.classList.add('hidden'); }
  document.body.classList.toggle('fab-on', on);
}

/* ---------------- 实验台 / 更多页 分享 ---------------- */
const SHARE_URL = 'https://labbench.pages.dev';
const SHARE_TITLE = '实验台 · BenchNote';
const SHARE_DESC = '实验室全能助手 · 记录 · 库存 · Protocol';
function setShareBtn() {
  const b = $('shareBtn');
  if (!b) return;
  b.classList.toggle('hidden', !(currentView === 'overview' || currentView === 'more'));
}
function buildQRDataUrl(size) {
  const qr = qrcode(0, 'M');
  qr.addData(SHARE_URL); qr.make();
  const count = qr.getModuleCount();
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = '#0b0b0c';
  const cell = size / count;
  for (let r = 0; r < count; r++)
    for (let c = 0; c < count; c++)
      if (qr.isDark(r, c)) ctx.fillRect(Math.round(c * cell), Math.round(r * cell), Math.ceil(cell), Math.ceil(cell));
  return cv.toDataURL('image/png');
}
function openShare() {
  const qr = buildQRDataUrl(440);
  let html = `<div class="grabber"></div>
  <div class="share-card">
    <div class="sc-icon">🧪</div>
    <div class="sc-name">${SHARE_TITLE}</div>
    <div class="sc-desc">${SHARE_DESC}</div>
    <img class="sc-qr" src="${qr}" alt="二维码">
    <div class="sc-url">${SHARE_URL}</div>
    <div class="sc-tip">扫码即刻打开 · 免安装</div>
  </div>
  <div class="share-actions">
    <button class="btn ghost" onclick="saveShareImage()">保存图片</button>
    <button class="btn primary" onclick="shareVia()">分享</button>
  </div>`;
  openSheet(html);
}
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
/* 白色烧瓶 logo（矢量绘制，跨平台必定显示，不依赖 emoji 字体） */
function drawFlask(ctx, cx, cy, s) {
  ctx.save();
  ctx.translate(cx, cy); ctx.scale(s, s);
  ctx.strokeStyle = '#ffffff'; ctx.fillStyle = 'rgba(255,255,255,.95)';
  ctx.lineWidth = 4.5; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-7, -26); ctx.lineTo(-7, -8); ctx.lineTo(-20, 22); ctx.lineTo(20, 22); ctx.lineTo(7, -8); ctx.lineTo(7, -26);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-15, 4); ctx.lineTo(15, 4); ctx.lineTo(18, 20); ctx.lineTo(-18, 20); ctx.closePath();
  ctx.fill();
  ctx.beginPath(); ctx.moveTo(-15, 4); ctx.lineTo(15, 4); ctx.stroke();
  ctx.restore();
}
function saveShareImage() {
  const W = 640, H = 800;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');
  ctx.textAlign = 'center';                     // 所有文字水平居中（之前换矢量 logo 时误删了这行）
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, '#f5f3ff'); g.addColorStop(1, '#eaf1ff');
  ctx.fillStyle = g; roundRect(ctx, 0, 0, W, H, 44); ctx.fill();
  const ig = ctx.createLinearGradient(0, 0, 80, 80);
  ig.addColorStop(0, '#7c6cff'); ig.addColorStop(1, '#34c8ff');
  ctx.fillStyle = ig; roundRect(ctx, W / 2 - 40, 56, 80, 80, 22); ctx.fill();
  drawFlask(ctx, W / 2, 96, 1);
  ctx.fillStyle = '#1a1a1e'; ctx.font = '700 26px sans-serif'; ctx.textBaseline = 'alphabetic';
  ctx.fillText(SHARE_TITLE, W / 2, 192);
  ctx.fillStyle = '#6b6f76'; ctx.font = '15px sans-serif';
  ctx.fillText(SHARE_DESC, W / 2, 220);
  const qSize = 320, qx = (W - qSize) / 2, qy = 262;
  ctx.fillStyle = '#fff'; roundRect(ctx, qx - 18, qy - 18, qSize + 36, qSize + 36, 28); ctx.fill();
  const qr = qrcode(0, 'M'); qr.addData(SHARE_URL); qr.make();
  const count = qr.getModuleCount(); const cell = qSize / count;
  ctx.fillStyle = '#0b0b0c';
  for (let r = 0; r < count; r++)
    for (let c = 0; c < count; c++)
      if (qr.isDark(r, c)) ctx.fillRect(qx + c * cell, qy + r * cell, Math.ceil(cell), Math.ceil(cell));
  ctx.fillStyle = '#5a52e0'; ctx.font = '600 16px sans-serif';
  ctx.fillText(SHARE_URL, W / 2, qy + qSize + 70);
  ctx.fillStyle = '#6b6f76'; ctx.font = '14px sans-serif';
  ctx.fillText('扫码即刻打开 · 免安装', W / 2, qy + qSize + 100);
  const a = document.createElement('a');
  a.href = cv.toDataURL('image/png');
  a.download = '实验台-BenchNote.png';
  document.body.appendChild(a); a.click(); a.remove();
  toast('已保存到本地');
}
function shareVia() {
  const text = `推荐一个好用的实验室助手「${SHARE_TITLE}」——语音/文字记实验、AI 一键整理成规范记录，试剂耗材库存管理、Protocol 模板、二维码标签，打开即用，免安装。\n${SHARE_URL}`;
  if (navigator.share) {
    navigator.share({ title: SHARE_TITLE, text, url: SHARE_URL }).then(() => toast('已分享，快去发送吧')).catch(() => {});
  } else {
    fallbackCopy(text, '已复制，快去分享吧');
    closeSheet();
  }
}

function emptyState(title, sub) {
  return `<div class="empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/><path d="M8 3v18"/><path d="M11 8h5"/><path d="M11 12h5"/><path d="M11 16h3"/></svg><p><b>${esc(title)}</b></p><p>${esc(sub)}</p></div>`;
}

/* ---------------- 概览（紧凑统计条 + 快捷入口） ---------------- */
function renderOverview() {
  const exps = load(STORE.exp, []);
  const reags = load(STORE.reag, []);
  const weekAgo = Date.now() - 7 * 86400000;
  const weekExp = exps.filter((e) => new Date(e.createdAt).getTime() >= weekAgo).length;
  const expiring = reags.filter((r) => reagLotsExpiring(r)).length;
  const expired = reags.filter((r) => reagLotsExpired(r)).length;
  const low = reags.filter((r) => reagTotalQty(r) <= Number(r.min || 0)).length;

  let html = `<div class="statbar">
    <div class="s tap" onclick="switchView('experiments')"><span class="ico">📝</span><div class="num">${weekExp}</div><div class="lbl">本周记录</div></div>
    <div class="s tap" onclick="switchView('reagents');setReagSeg('reag');setReagFilter('all')"><span class="ico">🧪</span><div class="num">${reags.length}</div><div class="lbl">试剂种类</div></div>
    <div class="s tap" onclick="switchView('reagents');setReagSeg('reag');setReagFilter('expiring')"><span class="ico">⏳</span><div class="num">${expiring}</div><div class="lbl">30天临期</div></div>
    <div class="s tap" onclick="switchView('reagents');setReagSeg('reag');setReagFilter('low')"><span class="ico">🛒</span><div class="num">${low}</div><div class="lbl">需补货</div></div>
    <div class="s tap" onclick="switchView('reagents');setReagSeg('reag');setReagFilter('expired')"><span class="ico">🗑️</span><div class="num">${expired}</div><div class="lbl">已过期</div></div>
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
    const tot = reagTotalQty(r);
    const lotStr = reagGetLotStr(r);
    const minExp = reagMinExpiry(r);
    if (st.key === 'bad') alerts.push({ id: r.id, color: 'var(--red)', name: r.name, desc: `货号 ${lotStr} · ${st.text}（${minExp}）` });
    else if (st.key === 'warn' && st.text === '需补货') alerts.push({ id: r.id, color: 'var(--orange)', name: r.name, desc: `库存 ${tot}${(r.lots||[r])[0].unit} ≤ 安全库存 ${r.min}${(r.lots||[r])[0].unit}` });
    else if (st.key === 'warn') alerts.push({ id: r.id, color: 'var(--orange)', name: r.name, desc: `货号 ${lotStr} · ${st.text}（${minExp}）` });
  });
  if (alerts.length) {
    html += '<div class="section-title">需要关注</div>';
    alerts.forEach((a) => {
      html += `<div class="alert"><div class="dot" style="background:${a.color}"></div><div class="txt"><b>${esc(a.name)}</b><p>${esc(a.desc)}</p></div><button class="inquire-mini" onclick="event.stopPropagation();inquireReag('${a.id}')">询价</button></div>`;
    });
    html += `<button class="btn" style="margin-top:6px" onclick="inquireExpiring()">📤 一键询价全部（${alerts.length}）</button>`;
  } else {
    html += '<div class="section-title">状态</div><div class="card"><div class="row1"><h3>一切正常</h3></div><div class="meta">无临期、过期或低库存试剂。</div></div>';
  }

  // 最近实验
  html += '<div class="section-title">最近实验</div>';
  exps.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 3).forEach((e) => {
    html += `<div class="card tap" onclick="openExpSheet('${e.id}')"><div class="row1"><h3>${esc(e.title)}</h3></div><div class="meta">${fmtDate(e.createdAt)} · ${e.steps.length} 个步骤</div><div class="snippet">${esc(e.raw)}</div></div>`;
  });
  if (exps.length) html += `<button class="btn" style="margin-top:8px" onclick="switchView('experiments')">📋 查看所有实验</button>`;
  if (!exps.length) {
    html += `<div class="empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/><path d="M8 3v18"/><path d="M11 8h5"/><path d="M11 12h5"/><path d="M11 16h3"/></svg><p><b>还没有实验记录</b></p><p>用语音或文字记录第一条</p><button class="btn" style="margin-top:14px" onclick="openExpSheet()">+ 新建实验记录</button></div>`;
  }

  $('view-overview').innerHTML = html;
}

/* ---------------- 实验记录 ---------------- */
function renderExperiments() {
  const exps = load(STORE.exp, []);
  const allTags = [...new Set(exps.flatMap((e) => Array.isArray(e.tags) ? e.tags : []))];
  let html = `<input class="search" id="expSearchInput" placeholder="搜索标题 / 内容 / 记录人 / 批号 / 标签" value="${esc(expSearch)}" oninput="onExpSearch(this.value)">`;
  html += '<div class="chips">';
  [['all', '全部'], ['week', '本周'], ['month', '本月']].forEach(([k, l]) => {
    html += `<div class="chip ${expFilter === k ? 'active' : ''}" onclick="setExpFilter('${k}')">${l}</div>`;
  });
  allTags.forEach((t) => { html += `<div class="chip ${expTag === t ? 'active' : ''}" onclick="setExpTag('${esc(t)}')">#${esc(t)}</div>`; });
  html += '</div>';
  html += '<div id="expListInner"></div>';
  $('view-experiments').innerHTML = html;
  renderExpList();
}
function onExpSearch(v) { expSearch = v; renderExpList(); }
function setExpFilter(f) { expFilter = f; renderExperiments(); }
function setExpTag(t) { expTag = (expTag === t ? '' : t); renderExperiments(); }
function renderExpList() {
  const box = $('expListInner'); if (!box) return;
  const exps = getVisibleExps();
  let html = `<div class="section-title">记录（${exps.length}）<span class="more" onclick="toggleExpSelect()">${expSelectMode ? '完成' : '🗂️ 批量管理'}</span></div>`;
  if (expSelectMode) html += batchToolbarHTML('exp');
  if (!exps.length) html += emptyState('没有匹配的记录', '调整筛选或点 + 新建');
  else {
    exps.forEach((e) => {
      const lots = [...new Set((e.steps || []).map((s) => s.lot).filter(Boolean))];
      const tags = (e.tags || []).map((t) => `<span class="tag gray">#${esc(t)}</span>`).join(' ');
      const metaLot = e.lot || (lots.length ? lots.join('、') : '');
      const metaParts = [(e.steps || []).length + ' 个步骤'];
      if (e.sample) metaParts.push('样本 ' + esc(e.sample));
      if (metaLot) metaParts.push('批号 ' + esc(metaLot));
      const selOn = expSel.has(e.id);
      const cls = 'card' + (expSelectMode ? ' selmode' : '') + (selOn ? ' sel' : '');
      const click = expSelectMode ? `toggleExpSel('${e.id}')` : `openExpSheet('${e.id}')`;
      const chk = expSelectMode ? '<div class="chk"></div>' : '';
      const pinTag = e.pinned ? '<span class="tag info">置顶</span>' : '';
      html += `<div class="${cls}" onclick="${click}">
        ${chk}
        <div class="row1"><h3>${esc(e.title)}</h3><span class="tag gray">${fmtDate(e.createdAt)}</span></div>
        <div class="meta">${metaParts.join(' · ')}</div>
        ${tags ? '<div class="tags-row">' + tags + (e.pinned ? ' ' + pinTag : '') + '</div>' : (e.pinned ? '<div class="tags-row">' + pinTag + '</div>' : '')}
        <div class="snippet">${esc(e.raw)}</div></div>`;
    });
  }
  box.innerHTML = html;
}

/* ---------------- 实验记录：批量管理 ---------------- */
function batchToolbarHTML(kind) {
  const sel = kind === 'reag' ? reagSel : expSel;
  const dis = sel.size ? '' : 'disabled';
  const toggleFn = kind === 'reag' ? 'toggleReagSelect' : 'toggleExpSelect';
  return `<div class="fm-toolbar">
    <span class="fm-count">已选 ${sel.size} 项</span>
    <div class="fm-btns">
      <button class="mini-btn" onclick="${kind}SelectAll()">全选</button>
      <button class="mini-btn" onclick="${kind}ClearSel()">清空</button>
      <button class="mini-btn" onclick="${kind}PinSel()" ${dis}>置顶</button>
      <button class="mini-btn danger" onclick="${kind}DeleteSel()" ${dis}>删除</button>
      <button class="mini-btn" onclick="${toggleFn}()">取消</button>
    </div></div>`;
}
function getVisibleExps() {
  let exps = load(STORE.exp, []).slice().sort((a, b) =>
    ((b.pinned ? 1 : 0) - (a.pinned ? 1 : 0)) || (new Date(b.createdAt) - new Date(a.createdAt)));
  if (expSearch) {
    const q = expSearch.toLowerCase();
    exps = exps.filter((e) => (e.title + ' ' + (e.raw || '') + ' ' + (e.operator || '') + ' ' +
      (e.sample || '') + ' ' + (e.lot || '') + ' ' +
      (e.steps || []).map((s) => (s.material || '') + ' ' + (s.lot || '')).join(' ') + ' ' +
      (e.tags || []).join(' ')).toLowerCase().includes(q));
  }
  if (expFilter === 'week') { const w = Date.now() - 7 * 86400000; exps = exps.filter((e) => new Date(e.createdAt).getTime() >= w); }
  if (expFilter === 'month') { const m = Date.now() - 30 * 86400000; exps = exps.filter((e) => new Date(e.createdAt).getTime() >= m); }
  if (expTag) exps = exps.filter((e) => Array.isArray(e.tags) && e.tags.includes(expTag));
  return exps;
}
function toggleExpSelect() { expSelectMode = !expSelectMode; if (!expSelectMode) expSel.clear(); renderExperiments(); }
function toggleExpSel(id) { if (expSel.has(id)) expSel.delete(id); else expSel.add(id); renderExpList(); }
function expSelectAll() { getVisibleExps().forEach((e) => expSel.add(e.id)); renderExpList(); }
function expClearSel() { expSel.clear(); renderExpList(); }
function expPinSel() {
  if (!expSel.size) { toast('先选择记录'); return; }
  const exps = load(STORE.exp, []);
  const allPinned = exps.filter((e) => expSel.has(e.id)).every((e) => e.pinned);
  exps.forEach((e) => { if (expSel.has(e.id)) e.pinned = !allPinned; });
  save(STORE.exp, exps);
  toast(allPinned ? '已取消置顶' : '已置顶 ' + expSel.size + ' 条');
  expSelectMode = false; expSel.clear(); renderExperiments();
}
function expDeleteSel() {
  if (!expSel.size) { toast('先选择记录'); return; }
  const n = expSel.size;
  if (!confirm(`删除选中的 ${n} 条记录？此操作不可撤销。`)) return;
  const exps = load(STORE.exp, []).filter((e) => !expSel.has(e.id));
  save(STORE.exp, exps); expSel.clear(); expSelectMode = false; renderExperiments();
  toast('已删除 ' + n + ' 条');
}

/* ---------------- 试剂 / 冻存 ---------------- */
function renderReagents() {
  if (reagSeg === 'freezer') return renderFreezer();
  if (reagSeg === 'calendar') return renderExpiryCalendar();
  const reags = load(STORE.reag, []);
  const list = getVisibleReags();
  let html = `<div class="seg">
    <button class="${reagSeg === 'reag' ? 'active' : ''}" onclick="setReagSeg('reag')">试剂/耗材</button>
    <button class="${reagSeg === 'freezer' ? 'active' : ''}" onclick="setReagSeg('freezer')">冻存库</button>
    <button class="${reagSeg === 'calendar' ? 'active' : ''}" onclick="setReagSeg('calendar')">效期日历</button>
  </div>`;
  html += `<input class="search" id="reagSearch" placeholder="搜索名称 / 货号 / 位置" value="${esc(reagSearch)}" oninput="onReagSearch(this.value)">`;
  html += '<div class="chips">';
  [['all', '全部'], ['expiring', '临期'], ['expired', '过期'], ['low', '需补货']].forEach(([k, l]) => {
    html += `<div class="chip ${reagFilter === k ? 'active' : ''}" onclick="setReagFilter('${k}')">${l}</div>`;
  });
  html += '</div>';
  // 批次状态筛选行
  html += '<div class="chips" style="margin-top:4px">';
  const lotStatuses = [['all', '全部批次'], ['unused', '未使用'], ['inuse', '在用'], ['usedup', '用完'], ['discard', '废弃']];
  lotStatuses.forEach(([k, l]) => {
    html += `<div class="chip ${reagLotFilter === k ? 'active' : ''}" onclick="setReagLotFilter('${k}')">${l}</div>`;
  });
  html += '</div>';
  html += `<div class="reag-batch-row">
    <button class="btn" style="flex:1" onclick="openReagBatch()">📥 批量导入</button>
    <button class="btn secondary" style="flex:1" onclick="toggleReagSelect()">${reagSelectMode ? '完成' : '🗂️ 批量管理'}</button>
  </div>`;
  if (reagSelectMode) html += batchToolbarHTML('reag');
  if (!list.length) html += emptyState('没有符合条件的试剂', '调整筛选或点 + 添加');
  else {
    html += '<div class="reag-grid">';
    list.forEach((r) => {
      const st = reagStatus(r);
      const tagCls = st.key === 'ok' ? 'ok' : st.key === 'warn' ? 'warn' : 'bad';
      const canInquire = !reagSelectMode && (st.text === '需补货' || st.text === '已过期' || st.text.includes('临期'));
      const inquireBtn = canInquire ? `<button class="inquire-mini" onclick="event.stopPropagation();inquireReag('${r.id}')" title="发送询价给供应商">询价</button>` : '';
      const selOn = reagSel.has(r.id);
      const cls = 'card' + (reagSelectMode ? ' selmode' : '') + (selOn ? ' sel' : '');
      const click = reagSelectMode ? `toggleReagSel('${r.id}')` : `openReagSheet('${r.id}')`;
      const chk = reagSelectMode ? '<div class="chk"></div>' : '';
      const pinMark = r.pinned ? ' · 置顶' : '';
      const tagHtml = st.key === 'ok' ? (r.pinned ? '<span class="tag info">置顶</span>' : '') : `<span class="tag ${tagCls}">${st.text}${pinMark}</span>`;

      // 汇总信息（用已有批次函数）
      const totalQty = reagTotalQty(r);
      const minExpiry = reagMinExpiry(r);
      const lots = r.lots || [];
      const batchCount = lots.length || 1;
      const lotStrs = [...new Set((lots.length ? lots : [{ lot: r.lot||'' }]).map((l) => l.lot).filter(Boolean))];
      const expiredCount = lots.filter(l => l.expiry && daysUntil(l.expiry) < 0).length;
      const expiringCount = lots.filter(l => l.expiry && daysUntil(l.expiry) <= expDays() && daysUntil(l.expiry) >= 0).length;
      let batchSummary = `${batchCount} 批 · 最短效期 ${esc(minExpiry || '—')}`;
      if (expiredCount) batchSummary += ` · ${expiredCount}批已过期`;
      else if (expiringCount) batchSummary += ` · ${expiringCount}批将到期`;

      html += `<div class="${cls}" onclick="${click}">
        ${chk}
        <div class="card-body">
        <div class="r-row r-name">${esc(r.name)}</div>
        <div class="r-row"><span class="r-label">品牌</span><span class="r-val">${esc(r.supplier || r.brand || '—')}</span></div>
        <div class="r-row"><span class="r-label">货号</span><span class="r-val">${lotStrs.length ? esc(lotStrs.join('/')) : '—'}</span></div>
        <div class="r-row"><span class="r-label">库存</span><span class="r-val">${totalQty}${lots[0].unit}（${batchCount} 批）</span></div>
        <div class="r-row"><span class="r-label">位置</span><span class="r-val">${esc(lots[0].location || '—')}</span></div>
        <div class="r-row"><span class="r-label">最短效期</span><span class="r-val">${esc(minExpiry || '—')}</span></div>
        </div>
        <div class="card-actions">${tagHtml ? tagHtml : ''}${inquireBtn || ''}</div>
      </div>`;

    });
    html += '</div>';
  }
  const needBuy = reags.filter((r) => reagTotalQty(r) <= Number(r.min || 0) || reagLotsExpired(r) || reagLotsExpiring(r));
  if (needBuy.length) html += `<button class="btn" style="margin-top:6px" onclick="inquireExpiring()">📤 一键询价全部（${needBuy.length}）</button>`;
  $('view-reagents').innerHTML = html;
}
/* ---------------- 试剂：批量管理 ---------------- */
function getVisibleReags() {
  const reags = load(STORE.reag, []);
  const idx = new Map(reags.map((r, i) => [r.id, i]));
  let list = reags.filter((r) => {
    if (reagSearch) {
      const lotsStr = (r.lots||[]).map((l) => (l.lot||'')+'/'+(l.batch||'')+'/'+(l.location||'')).join(' ');
      if (!(r.name + ' ' + (r.lot||'') + ' ' + (r.location||'') + ' ' + lotsStr).toLowerCase().includes(reagSearch.toLowerCase())) return false;
    }
    // 批次状态筛选（先于 reagFilter，避免 reagFilter==='all' 直接 return true 跳过）
    if (reagLotFilter !== 'all') {
      const statusMap = { 'unused': '未使用', 'inuse': '在用', 'usedup': '用完', 'discard': '废弃' };
      const target = statusMap[reagLotFilter];
      if (!(r.lots||[]).some((l) => (l.status||'未使用') === target)) return false;
    }
    if (reagFilter === 'all') return true;
    const st = reagStatus(r);
    if (reagFilter === 'expired') return reagLotsExpired(r);
    if (reagFilter === 'expiring') return st.text.includes('临期');
    if (reagFilter === 'low') return st.text === '需补货';
    return true;
  });
  list.sort((a, b) => ((b.pinned ? 1 : 0) - (a.pinned ? 1 : 0)) || (idx.get(a.id) - idx.get(b.id)));
  return list;
}
function toggleReagSelect() { reagSelectMode = !reagSelectMode; if (!reagSelectMode) reagSel.clear(); renderReagents(); }
function toggleReagSel(id) { if (reagSel.has(id)) reagSel.delete(id); else reagSel.add(id); renderReagents(); }
function reagSelectAll() { getVisibleReags().forEach((r) => reagSel.add(r.id)); renderReagents(); }
function reagClearSel() { reagSel.clear(); renderReagents(); }
function reagPinSel() {
  if (!reagSel.size) { toast('先选择试剂'); return; }
  const reags = load(STORE.reag, []);
  const allPinned = reags.filter((r) => reagSel.has(r.id)).every((r) => r.pinned);
  reags.forEach((r) => { if (reagSel.has(r.id)) r.pinned = !allPinned; });
  save(STORE.reag, reags);
  toast(allPinned ? '已取消置顶' : '已置顶 ' + reagSel.size + ' 项');
  reagSelectMode = false; reagSel.clear(); renderReagents();
}
function reagDeleteSel() {
  if (!reagSel.size) { toast('先选择试剂'); return; }
  const n = reagSel.size;
  if (!confirm(`删除选中的 ${n} 项试剂？此操作不可撤销。`)) return;
  const reags = load(STORE.reag, []).filter((r) => !reagSel.has(r.id));
  save(STORE.reag, reags); reagSel.clear(); reagSelectMode = false; renderReagents();
  toast('已删除 ' + n + ' 项');
}
function setReagSeg(s) { reagSeg = s; renderReagents(); setHeader(); }
function setReagFilter(f) { reagFilter = f; renderReagents(); }
function setReagLotFilter(f) { reagLotFilter = f; renderReagents(); }
function onReagSearch(v) { reagSearch = v; renderReagents(); const inp = $('reagSearch'); if (inp) { inp.focus(); const len = inp.value.length; inp.setSelectionRange(len, len); } }
function renderExpiryCalendar() {
  const reags = load(STORE.reag, []);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  // 默认当前月
  if (calYear == null) { calYear = today.getFullYear(); calMonth = today.getMonth(); }
  let html = `<div class="seg">
    <button class="${reagSeg === 'reag' ? 'active' : ''}" onclick="setReagSeg('reag')">试剂/耗材</button>
    <button class="${reagSeg === 'freezer' ? 'active' : ''}" onclick="setReagSeg('freezer')">冻存库</button>
    <button class="${reagSeg === 'calendar' ? 'active' : ''}" onclick="setReagSeg('calendar')">效期日历</button>
  </div>`;
  // 月份导航
  const mn = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];
  html += `<div class="expcal-nav"><span class="more" onclick="calPrevMonth()">◀ 上月</span><strong>${calYear}年 ${mn[calMonth]}</strong><span class="more" onclick="calNextMonth()">下月 ▶</span></div>`;
  // 构建当月网格
  const first = new Date(calYear, calMonth, 1);
  const lastDay = new Date(calYear, calMonth + 1, 0).getDate();
  const startDow = (first.getDay() + 6) % 7; // 周一=0
  const totalCells = startDow + lastDay;
  const rows = Math.ceil(totalCells / 7);
  const dayMark = {};
  reags.forEach((r) => {
    const e = reagMinExpiry(r);
    if (e && e !== '—') { (dayMark[e] = dayMark[e] || []).push(r); }
  });
  const wd = ['一', '二', '三', '四', '五', '六', '日'];
  html += '<div class="expcal">';
  wd.forEach((w) => { html += `<div class="expcal-head">${w}</div>`; });
  for (let i = 0; i < rows * 7; i++) {
    if (i < startDow || i >= startDow + lastDay) {
      html += '<div class="expcal-cell empty"></div>';
      continue;
    }
    const day = i - startDow + 1;
    const d = new Date(calYear, calMonth, day);
    const ds = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const isToday = d.getTime() === today.getTime();
    const marks = dayMark[ds] || [];
    let inner = `<div class="ec-num">${day}</div>`;
    marks.slice(0, 2).forEach((m) => { inner += `<div class="ec-dot ${reagStatus(m).key}" title="${esc(m.name)}">${esc(m.name.slice(0, 4))}</div>`; });
    if (marks.length > 2) inner += `<div class="ec-more">+${marks.length - 2}</div>`;
    html += `<div class="expcal-cell${isToday ? ' today' : ''}">${inner}</div>`;
  }
  html += '</div>';
  // 采购清单（筛选当月到期）
  html += '<div class="section-title">采购 / 处理清单</div>';
  let any = false;
  const groups = [
    ['已过期', (r) => { const m = reagMinExpiry(r); return reagLotsExpired(r) && m && m.startsWith(`${calYear}-${String(calMonth+1).padStart(2,'0')}`); }, 'bad'],
    ['本月内到期', (r) => { const m = reagMinExpiry(r); const d = reagLotsExpired(r) ? -1 : daysUntil(m); return m && d >= 0 && m.startsWith(`${calYear}-${String(calMonth+1).padStart(2,'0')}`); }, 'warn']
  ];
  groups.forEach(([title, fn, cls]) => {
    const list = reags.filter((r) => fn(r));
    if (list.length) {
      any = true;
      html += `<div class="ec-group"><div class="ec-gtitle ${cls}">${title}（${list.length}）</div>`;
      list.sort((a, b) => daysUntil(reagMinExpiry(a)) - daysUntil(reagMinExpiry(b))).forEach((r) => {
        const me = reagMinExpiry(r);
        const d = reagLotsExpired(r) ? -1 : daysUntil(me);
        const dd = d < 0 ? `逾期${-d}天` : `剩${d}天`;
        const tk = reagStatus(r).key;
        html += `<div class="list-row" onclick="openReagSheet('${r.id}')">
          <div class="lr-main"><div class="lr-title">${esc(r.name)}</div><div class="lr-sub">货号 ${esc(reagGetLotStr(r))} · 最短效期 ${esc(me)}</div>
          <span class="tag ${tk}" style="margin-top:6px;display:inline-block">${dd}</span></div>
          <button class="inquire-mini" onclick="event.stopPropagation();inquireReag('${r.id}')" title="发送询价给供应商">询价</button></div>`;
      });
      html += '</div>';
    }
  });
  if (!any) html += emptyState(calYear + '年' + (calMonth+1) + '月无到期试剂', '');
  const needBuy = reags.filter((r) => reagTotalQty(r) <= Number(r.min || 0) || reagLotsExpired(r) || reagLotsExpiring(r));
  if (needBuy.length) html += `<button class="btn" style="margin-top:6px" onclick="inquireExpiring()">📤 一键询价全部（${needBuy.length}）</button>`;
  $('view-reagents').innerHTML = html;
}
function calPrevMonth() { if (--calMonth < 0) { calMonth = 11; calYear--; } renderExpiryCalendar(); }
function calNextMonth() { if (++calMonth > 11) { calMonth = 0; calYear++; } renderExpiryCalendar(); }

function getBoxes() {
  let boxes = load(STORE.boxes, null);
  const fromSamples = [...new Set(load(STORE.samples, []).map((s) => s.box))];
  if (!boxes || !boxes.length) { boxes = fromSamples.length ? fromSamples : ['B1']; save(STORE.boxes, boxes); }
  fromSamples.forEach((b) => { if (!boxes.includes(b)) boxes.push(b); });
  return boxes;
}

function renderFreezer() {
  const samples = load(STORE.samples, []);
  const boxes = getBoxes();
  if (!boxes.includes(freezerBox)) freezerBox = boxes[0] || 'B1';
  let html = `<div class="seg">
    <button class="${reagSeg === 'reag' ? 'active' : ''}" onclick="setReagSeg('reag')">试剂/耗材</button>
    <button class="${reagSeg === 'freezer' ? 'active' : ''}" onclick="setReagSeg('freezer')">冻存库</button>
    <button class="${reagSeg === 'calendar' ? 'active' : ''}" onclick="setReagSeg('calendar')">效期日历</button>
  </div>`;
  html += '<div class="chips">';
  boxes.forEach((b, i) => { html += `<div class="chip ${freezerBox === b ? 'active' : ''}" onclick="setFreezerBoxByIndex(${i})">${esc(b)}</div>`; });
  html += `<div class="chip add" onclick="addFreezerBox()">＋</div>`;
  html += `<div class="chip more" onclick="openBoxManager()">⋯</div>`;
  html += '</div>';
  html += `<input class="search" id="freezerSearch" placeholder="搜索本盒样本 · 高亮匹配格子" value="${esc(freezerSearch)}" oninput="onFreezerSearch(this.value)">`;
  html += `<div class="freezer-actions">
    <button class="btn" style="flex:1" onclick="openFreezerBatch()">📥 批量填充</button>
    <button class="btn secondary" style="flex:1" onclick="toggleFreezerMulti()">${freezerMulti ? '完成' : '🗂️ 批量管理'}</button>
  </div>`;
  if (freezerMulti) {
    html += `<div class="fm-toolbar">
      <span class="fm-count" id="fmCount">已选 ${freezerSel.size} 份</span>
      <div class="fm-btns">
        <button class="mini-btn" onclick="fmSelectAll()">全选本盒</button>
        <button class="mini-btn" onclick="fmClearSel()">清空</button>
        <button class="mini-btn danger" onclick="fmDeleteSel()">删除</button>
        <button class="mini-btn" onclick="fmMoveSel()">移动到…</button>
      </div></div>`;
  }
  const here = samples.filter((s) => s.box === freezerBox);
  const inBox = {};
  here.forEach((s) => { inBox[s.row + s.col] = s; });
  const term = freezerSearch.trim().toLowerCase();
  const meta = load(STORE.boxMeta, {});
  const boxCfg = meta[freezerBox] || { rows: 8, cols: 12 };
  const rows = [];
  const rn = parseInt(boxCfg.rows) || 8;
  const cn = parseInt(boxCfg.cols) || 12;
  for (let ri = 0; ri < rn; ri++) rows.push(String.fromCharCode(65 + ri));
  html += '<div class="freezer">';
  html += '<div class="colhead"></div>';
  for (let c = 1; c <= cn; c++) html += `<div class="colhead">${c}</div>`;
  rows.forEach((r) => {
    html += `<div class="colhead">${r}</div>`;
    for (let c = 1; c <= cn; c++) {
      const s = inBox[r + c];
      if (s) {
        const match = term && (s.name + ' ' + s.type + ' ' + s.note + ' ' + s.box).toLowerCase().includes(term);
        const sel = freezerMulti && freezerSel.has(s.id);
        const cls = `cell filled${match ? ' hl' : ''}${sel ? ' sel' : ''}`;
        const ds = `data-id="${s.id}" data-name="${esc(s.name)}" data-type="${esc(s.type)}" data-note="${esc(s.note)}" data-box="${esc(s.box)}" data-col="${c}"`;
        if (freezerMulti) html += `<div class="${cls}" ${ds} onclick="toggleFreezerCell('${s.id}')" title="${esc(s.name)}">${sel ? '✓' : c}</div>`;
        else html += `<div class="${cls}" ${ds} onclick="openSampleSheet('${s.id}')" title="${esc(s.name)}">${c}</div>`;
      } else {
        if (freezerMulti) html += `<div class="cell"></div>`;
        else html += `<div class="cell" onclick="openSampleSheet(null,'${r}',${c})"></div>`;
      }
    }
  });
  html += '</div>';
  const totalCells = rn * cn;
  html += `<div class="meta" style="margin-top:10px">点击${freezerMulti ? '格子可勾选 / 取消选中' : '空格新增样本，点击蓝格查看'}。本盒 ${here.length} / ${totalCells} 份。</div>`;
  $('view-reagents').innerHTML = html;
}
function setFreezerBox(b) { freezerBox = b; freezerSel.clear(); renderFreezer(); }
function setFreezerBoxByIndex(i) { const b = getBoxes()[i]; if (b) { freezerBox = b; freezerSel.clear(); renderFreezer(); } }

/* 冻存库搜索高亮（仅切换 class，不重渲染以保留输入焦点） */
function onFreezerSearch(v) {
  freezerSearch = v;
  const term = v.trim().toLowerCase();
  document.querySelectorAll('#view-reagents .freezer .cell.filled').forEach((el) => {
    const hay = (el.dataset.name + ' ' + el.dataset.type + ' ' + el.dataset.note + ' ' + el.dataset.box).toLowerCase();
    el.classList.toggle('hl', !!term && hay.includes(term));
  });
}

/* 冻存库多选 / 批量操作 */
function toggleFreezerMulti() { freezerMulti = !freezerMulti; if (!freezerMulti) freezerSel.clear(); renderFreezer(); }
function toggleFreezerCell(id) {
  if (freezerSel.has(id)) freezerSel.delete(id); else freezerSel.add(id);
  const el = document.querySelector(`#view-reagents .freezer .cell[data-id="${id}"]`);
  if (el) { const on = freezerSel.has(id); el.classList.toggle('sel', on); el.textContent = on ? '✓' : el.dataset.col; }
  const cnt = document.getElementById('fmCount'); if (cnt) cnt.textContent = '已选 ' + freezerSel.size + ' 份';
}
function fmSelectAll() { load(STORE.samples, []).filter((s) => s.box === freezerBox).forEach((s) => freezerSel.add(s.id)); renderFreezer(); }
function fmClearSel() { freezerSel.clear(); renderFreezer(); }
function fmDeleteSel() {
  if (!freezerSel.size) { toast('未选中任何样本'); return; }
  const n = freezerSel.size;
  if (!confirm(`删除选中的 ${n} 份样本？此操作不可撤销。`)) return;
  const samples = load(STORE.samples, []).filter((s) => !freezerSel.has(s.id));
  save(STORE.samples, samples); freezerSel.clear(); freezerMulti = false; renderFreezer(); toast('已删除 ' + n + ' 份');
}
function fmMoveSel() { if (!freezerSel.size) { toast('未选中任何样本'); return; } openFreezerMove(); }

/* 冻存盒管理：新建 / 重命名 / 删除 */
function addFreezerBox() {
  const boxes = getBoxes();
  let i = 1; while (boxes.includes('B' + i)) i++;
  const def = 'B' + i;
  let html = `<div class="grabber"></div><h2>新建冻存盒</h2>
    <p class="hint">给新盒子起个名字，选择格子规格。</p>
    <div class="field"><label>盒子名称</label><input id="nbName" value="${def}" placeholder="如 B2"></div>
    <div class="field"><label>格子规格</label>
      <select id="nbGrid" style="width:100%;padding:8px 10px;border:1px solid var(--line);border-radius:8px;background:var(--glass);font-size:14px;outline:none">
        <option value="8×12">8×12（96 孔，标准）</option>
        <option value="8×8">8×8（64 孔）</option>
        <option value="10×10">10×10（100 孔）</option>
        <option value="6×6">6×6（36 孔）</option>
      </select>
    </div>
    <div class="btn-row" style="margin-top:6px">
      <button class="btn ghost" onclick="closeSheet()">取消</button>
      <button class="btn" onclick="confirmAddBox()">创建</button>
    </div>`;
  openSheet(html);
}
function confirmAddBox() {
  const name = ($('nbName').value || '').trim();
  if (!name) { toast('请输入盒子名称'); return; }
  const boxes = getBoxes();
  if (boxes.includes(name)) { toast('已存在同名盒子'); return; }
  // 读取规格
  const grid = ($('nbGrid') ? $('nbGrid').value : '8×12') || '8×12';
  boxes.push(name);
  save(STORE.boxes, boxes);
  const meta = load(STORE.boxMeta, {});
  meta[name] = { grid: grid, rows: grid.split('×')[0] || '8', cols: grid.split('×')[1] || '12' };
  save(STORE.boxMeta, meta);
  freezerBox = name; freezerSel.clear(); freezerMulti = false;
  closeSheet(); renderFreezer(); toast('已创建盒子 ' + name);
}
let _renameOld = '';
function openBoxManager() {
  const boxes = getBoxes();
  const samples = load(STORE.samples, []);
  let rows = boxes.map((b, i) => {
    const cnt = samples.filter((s) => s.box === b).length;
    const meta = load(STORE.boxMeta, {});
    const info = meta[b] ? meta[b].grid : '';
    return `<div class="list-row">
      <div class="lr-main"><div class="lr-title">${esc(b)}</div><div class="lr-sub">${cnt} 份样本${info ? ' · ' + info : ''}</div></div>
      <div class="lr-right" style="display:flex;gap:8px">
        <button class="mini-btn" onclick="renameBoxByIndex(${i})">重命名</button>
        <button class="mini-btn danger" onclick="deleteBoxByIndex(${i})">删除</button>
      </div></div>`;
  }).join('');
  let html = `<div class="grabber"></div><h2>管理冻存盒</h2>
    <p class="hint">共 ${boxes.length} 个盒子。</p>
    <div class="list">${rows}</div>
    <div class="btn-row" style="margin-top:10px">
      <button class="btn ghost" onclick="addFreezerBox()">＋ 新建</button>
      <button class="btn" onclick="closeSheet()">完成</button>
    </div>`;
  openSheet(html);
}
function renameBoxByIndex(i) { renameBox(getBoxes()[i]); }
function deleteBoxByIndex(i) { deleteBox(getBoxes()[i]); }
function renameBox(old) {
  _renameOld = old;
  let html = `<div class="grabber"></div><h2>重命名盒子</h2>
    <p class="hint">当前：${esc(old)}</p>
    <div class="field"><label>新名称</label><input id="rbNew" value="${esc(old)}" placeholder="如 B2"></div>
    <div class="btn-row" style="margin-top:6px">
      <button class="btn ghost" onclick="openBoxManager()">取消</button>
      <button class="btn" onclick="confirmRenameBox()">保存</button>
    </div>`;
  openSheet(html);
}
function confirmRenameBox() {
  const old = _renameOld;
  const name = ($('rbNew').value || '').trim();
  if (!name) { toast('请输入名称'); return; }
  const boxes = getBoxes();
  if (boxes.includes(name) && name !== old) { toast('已存在同名盒子'); return; }
  const i = boxes.indexOf(old); if (i >= 0) boxes[i] = name; save(STORE.boxes, boxes);
  const samples = load(STORE.samples, []);
  samples.forEach((s) => { if (s.box === old) s.box = name; }); save(STORE.samples, samples);
  if (freezerBox === old) freezerBox = name;
  openBoxManager();
}
function deleteBox(name) {
  const boxes = getBoxes();
  if (boxes.length <= 1) { toast('至少保留一个盒子'); return; }
  const cnt = load(STORE.samples, []).filter((s) => s.box === name).length;
  if (!confirm(`删除盒子「${name}」及其 ${cnt} 份样本？此操作不可撤销。`)) return;
  const samples = load(STORE.samples, []).filter((s) => s.box !== name); save(STORE.samples, samples);
  const nb = getBoxes().filter((b) => b !== name); save(STORE.boxes, nb);
  const meta = load(STORE.boxMeta, {}); delete meta[name]; save(STORE.boxMeta, meta);
  if (freezerBox === name) freezerBox = nb[0];
  freezerSel.clear(); closeSheet(); renderFreezer(); toast('已删除盒子 ' + name);
}

/* 选中样本移动到其他盒子 */
function openFreezerMove() {
  const boxes = getBoxes();
  const boxOpts = boxes.map((b) => `<option ${b === freezerBox ? 'selected' : ''}>${esc(b)}</option>`).join('');
  const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  const rowOpts = rows.map((r) => `<option ${r === 'A' ? 'selected' : ''}>${r}</option>`).join('');
  let colOpts = ''; for (let c = 1; c <= 12; c++) colOpts += `<option ${c === 1 ? 'selected' : ''}>${c}</option>`;
  const n = freezerSel.size;
  let html = `<div class="grabber"></div><h2>移动 ${n} 份样本</h2>
    <p class="hint">将选中的样本按顺序移动到目标盒子，已占用格自动跳过，保留原有信息。</p>
    <div class="field"><label>目标盒子</label><select id="fmBox" class="sel">${boxOpts}</select></div>
    <div class="field"><label>起始位置 / 方向</label><div style="display:flex;gap:10px">
      <select id="fmRow" class="sel">${rowOpts}</select>
      <select id="fmCol" class="sel">${colOpts}</select>
      <select id="fmDir" class="sel"><option value="row" selected>行优先</option><option value="col">列优先</option></select>
    </div></div>
    <div id="fmPreview" class="batch-preview"></div>
    <div class="btn-row" style="margin-top:10px">
      <button class="btn ghost" onclick="closeSheet()">取消</button>
      <button class="btn" id="fmConfirm" onclick="confirmFreezerMove()">移动</button>
    </div>`;
  openSheet(html);
  ['fmBox', 'fmRow', 'fmCol', 'fmDir'].forEach((id) => { const e = $(id); if (e) e.addEventListener('change', renderFreezerMovePreview); });
  renderFreezerMovePreview();
}
function selSamplesOrdered() {
  const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  return load(STORE.samples, []).filter((s) => freezerSel.has(s.id))
    .sort((a, b) => rows.indexOf(a.row) - rows.indexOf(b.row) || a.col - b.col);
}
function renderFreezerMovePreview() {
  const box = $('fmPreview'); if (!box) return;
  const target = $('fmBox').value;
  const ordered = selSamplesOrdered();
  if (!ordered.length) { box.innerHTML = '<div class="bp-row muted">未选中样本</div>'; return; }
  const order = freezerOrder($('fmRow').value, +$('fmCol').value, $('fmDir').value, ordered.length);
  const occupied = load(STORE.samples, []).filter((s) => s.box === target && !freezerSel.has(s.id)).map((s) => s.row + s.col);
  let moved = 0;
  const cells = ordered.map((s, i) => {
    const c = order[i]; if (!c) return `<span class="bp-skip">${esc(s.name)}（超出范围）</span>`;
    const key = c.row + c.col;
    if (occupied.includes(key)) return `<span class="bp-skip">${esc(s.name)}→${c.row}${c.col}(占用)</span>`;
    moved++; return `<span class="bp-ok">${esc(s.name)}→${c.row}${c.col}</span>`;
  });
  box.innerHTML = `<div class="bp-count">将移动 ${moved} 份（跳过 ${ordered.length - moved} 个）</div>` + cells.map((c) => `<div class="bp-row">${c}</div>`).join('');
  const cf = $('fmConfirm'); if (cf) cf.textContent = '移动 ' + moved + ' 份';
}
function confirmFreezerMove() {
  const target = $('fmBox').value;
  const ordered = selSamplesOrdered();
  if (!ordered.length) { toast('未选中样本'); return; }
  const order = freezerOrder($('fmRow').value, +$('fmCol').value, $('fmDir').value, ordered.length);
  const samples = load(STORE.samples, []);
  const occupied = samples.filter((s) => s.box === target && !freezerSel.has(s.id)).map((s) => s.row + s.col);
  let moved = 0;
  ordered.forEach((s, i) => {
    const c = order[i]; if (!c) return;
    const key = c.row + c.col; if (occupied.includes(key)) return;
    const t = samples.find((x) => x.id === s.id);
    if (t) { t.box = target; t.row = c.row; t.col = c.col; }
    occupied.push(key); moved++;
  });
  save(STORE.samples, samples);
  freezerSel.clear(); freezerMulti = false;
  if (!getBoxes().includes(freezerBox)) freezerBox = target;
  closeSheet(); renderFreezer(); toast('已移动 ' + moved + ' 份到 ' + target);
}

/* ---------------- 工具箱 ---------------- */
function renderTools() {
  const quickKeys = getQuickTools().map((t) => t.key);
  const notInQuick = ALL_TOOLS.filter((t) => !quickKeys.includes(t.key));
  const inQuick = ALL_TOOLS.filter((t) => quickKeys.includes(t.key));
  const sorted = [...notInQuick, ...inQuick];
  let html = `<div class="section-title">全部工具 <span style="font-size:11px;color:var(--muted);font-weight:400">未加入首页的排在前面</span></div><div class="tool-grid">`;
  sorted.forEach((t) => {
    const onHome = quickKeys.includes(t.key);
    html += `<div class="tool${onHome ? ' tool-onhome' : ''}" onclick="${t.fn}"><div class="ti">${t.i}</div><div class="tt">${t.t}</div><div class="td">${esc(t.d)}</div>${onHome ? '<div class="tool-badge">首页</div>' : ''}</div>`;
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
  let html = '';
  // 微信内置浏览器提醒（放在 API 与密钥 模块上方）
  if (isWeChat()) {
    html += `<p style="margin:0 0 12px;font-size:14px;font-weight:700;color:#e67e22;line-height:1.5">⚠️ 当前为微信内置浏览器，功能和体验受限，建议 <span style="color:var(--blue);cursor:pointer;text-decoration:underline" onclick="copyWeChatLink()">用浏览器打开</span>。</p>`;
  }
  html += '<div class="section-title" style="margin:18px 6px 1px">AI 密钥配置</div>';
  html += '<p class="hint" style="margin:2px 6px 6px;font-size:12px;color:var(--muted)">建议自行配置；默认配置可能失效。</p>';
  const apiRows = [
    { id: 'xf', title: '语音听写', ok: xfOk, step: '获取讯飞凭证',
      stepD: '① 打开 xfyun.cn 注册登录；② 控制台创建应用，服务勾选「语音听写 iat」；③ 复制下方三项并粘贴保存。',
      fields: `<div class="field"><label>APPID</label><input id="xfAppid" type="text" value="${st.xfAppid ? esc(st.xfAppid) : ''}" placeholder="留空=默认配置（不推荐）"></div>
        <div class="field"><label>APIKey</label><input id="xfApiKey" type="text" value="${st.xfApiKey ? esc(st.xfApiKey) : ''}" placeholder="${st.xfApiKey ? '讯飞 APIKey' : '留空=默认配置（不推荐）'}"></div>
        <div class="field"><label>APISecret</label><input id="xfApiSecret" type="password" value="${st.xfApiSecret ? esc(st.xfApiSecret) : ''}" placeholder="${st.xfApiSecret ? '讯飞 APISecret' : '留空=默认配置（不推荐）'}"></div>`,
      save: '<button class="btn secondary" onclick="saveXfKey()">保存讯飞配置</button>',
      help: '留空即使用内置默认凭证；想用自己的账号请粘贴上方三项再保存。',
      link: { url: 'https://console.xfyun.cn/app/myapp', label: '前往讯飞开放平台控制台' } },
    { id: 'agnes', title: 'AI 整理', ok: agnesOk, step: '获取 Agnes Key',
      stepD: '留空即使用内置默认凭证；也可粘贴自己的 Agnes Key 直连。',
      fields: `<div class="field"><label>Agnes API Key</label><input id="agnesKey" type="password" value="${st.agnesKey ? esc(st.agnesKey) : ''}" placeholder="${st.agnesKey ? 'Agnes API Key' : '留空=默认配置（不推荐）'}"></div>`,
      save: '<button class="btn secondary" onclick="saveAgnesKey()">保存 Agnes 配置</button>',
      help: '未填写将自动使用内置默认凭证，可直接体验；想用自己的账号请粘贴上方 Key 再保存。',
      link: { url: 'https://agnes-ai.com/', label: '前往 Agnes AI 官网' } }
  ];
  apiRows.forEach((r) => {
    html += `<div class="api-row" onclick="toggleApi('${r.id}')">
      <div class="api-row-main"><span class="api-row-title">${r.title}</span><span class="tag ${r.ok ? 'ok' : 'bad'}">${r.ok ? '默认配置' : '未配置'}</span></div>
      <span class="api-caret" id="caret-${r.id}">⌄</span>
    </div>
    <div class="api-detail" id="api-${r.id}" style="display:none">
      <div class="kg-step"><span class="kg-num">·</span><div><div class="kg-t">${r.step}</div><div class="kg-d">${r.stepD}</div></div></div>
      ${r.fields}
      <div class="btn-row" style="gap:8px;flex-wrap:wrap">
        ${r.save}
        <button class="btn secondary" id="test-${r.id}" onclick="testApiConn('${r.id}', this)">🧪 测试连通</button>
      </div>
      <div class="api-stat" id="apistat-${r.id}"></div>
      <div class="help">${r.help}</div>
      ${r.link ? '<a class="api-link" href="' + r.link.url + '" target="_blank" rel="noopener">' + r.link.label + ' ›</a>' : ''}
    </div>`;
  });
  html += '<div class="section-title">效期提醒阈值</div>';
  const notifyOn = st.notifyExp && notifySupported() && (typeof Notification !== 'undefined' && Notification.permission === 'granted');
  // 临期阈值折叠区（同 AI 整理 的折叠逻辑）
  html += `<div class="api-row" onclick="toggleApi('notify')">
    <div class="api-row-main"><span class="api-row-title">临期阈值</span><span class="tag ok">${st.expDays || 30} 天</span></div>
    <span class="api-caret" id="caret-notify">⌄</span>
  </div>`;
  html += `<div class="api-detail" id="api-notify" style="display:none">
    <div class="field"><label>临期阈值（天）</label>
      <input id="setExpDays" type="number" min="1" max="365" value="${st.expDays || 30}">
      <div class="help">效期在此天数内的试剂标记为「临期」并计入提醒（默认 30）。</div>
    </div>
    <button class="btn" onclick="saveExpDays()">保存阈值</button>
  </div>`;
  html += '<div class="section-title">数据备份</div>';
  html += `<div class="btn-row">
      <button class="btn" onclick="exportData()">📤 导出</button>
      <button class="btn secondary" onclick="pickImport()">📥 导入</button>
    </div>
    <input id="importFile" type="file" accept="application/json,.json" style="display:none" onchange="onImportFile(this)">`;
  html += '<div class="section-title">其他</div>';
  html += `<div class="list-row" onclick="openOnboarding()"><div class="lr-ico">👋</div><div class="lr-main"><div class="lr-title">功能引导</div><div class="lr-sub">重新查看功能介绍</div></div><div class="lr-right">›</div></div>`;
  html += `<div class="list-row" onclick="addToHomeScreen()"><div class="lr-ico" style="background:rgba(0,113,227,.12);color:var(--blue)">📱</div><div class="lr-main"><div class="lr-title">添加到桌面</div><div class="lr-sub">添加到桌面可以快速打开并离线可用</div></div><div class="lr-right" style="font-size:18px">›</div></div>`;
  html += `<div class="list-row" onclick="resetData()" style="color:var(--red)"><div class="lr-ico">🔄</div><div class="lr-main"><div class="lr-title">重置全部数据</div><div class="lr-sub">清除所有记录，恢复为初始默认状态</div></div><div class="lr-right">›</div></div>`;
  html += '<div class="section-title">供应合作</div>';
  // 两家公司卡片
  const supList = [SUPPLIERS.research, SUPPLIERS.enterprise];
  supList.forEach((sp) => {
    const equipLine = sp.equipmentText ? `<div class="supplier-brand" style="margin-top:6px">${esc(sp.equipmentText)}</div>` : '';
    const articleBtn = sp.article ? `<a class="btn secondary" href="${sp.article}" target="_blank" rel="noopener">📖 公司介绍</a>` : '';
    const inquireCtx = sp.id === 'enterprise' ? 'instrument' : 'reagent';
    const inquireLabel = '📤 试剂/耗材/仪器询价';
    const audienceTag = sp.audience === '企业客户' ? 'bad' : 'ok';
    const col = sp.id === 'enterprise' ? 'flex-direction:column;align-items:stretch;' : '';
    html += `<div class="card supplier-card-block" style="margin-bottom:12px">
      <div class="row1"><h3>${sp.shortName}</h3><span class="tag ${audienceTag}">${sp.audience}</span></div>
      <p class="supplier-tag" style="margin:6px 0 10px">${sp.tagline}</p>
      <div class="supplier-card">
        <img class="supplier-qr" src="${sp.wechatQr}" alt="微信二维码" onerror="this.style.display='none'">
        <div class="supplier-info">
          <div class="supplier-name">${sp.name}</div>
          <div class="supplier-tag">${sp.tagline}</div>
          <div class="supplier-line">联系人：<b>${sp.contact}</b></div>
          <div class="supplier-line">手机：<a href="${sp.phoneTel}">${sp.phone}</a></div>
        </div>
      </div>
      <div class="supplier-brand">${esc(sp.brandText).replace(/\n/g, '<br>')}</div>
      ${equipLine}
      <div class="btn-row" style="margin-top:12px;${col}">
        ${articleBtn}
        <button class="btn" onclick="inquireSupplier('${inquireCtx}')">${inquireLabel}</button>
      </div>
    </div>`;
  });
  $('view-more').innerHTML = html;
}
/* API 与密钥折叠行：点击向下展开填入 */
function toggleApi(id) {
  const el = $('api-' + id), caret = $('caret-' + id);
  if (!el) return;
  const open = el.style.display === 'none';
  el.style.display = open ? 'block' : 'none';
  if (caret) caret.style.transform = open ? 'rotate(180deg)' : '';
}
/* 测试 AI / 语音连通状态 */
async function testApiConn(id, btn) {
  const stat = $('apistat-' + id);
  const setStat = (s) => { if (stat) stat.innerHTML = s; };
  if (btn) { btn.disabled = true; btn.textContent = '测试中…'; }
  setStat('<span class="api-stat-prog">⏳ 正在测试连通…</span>');
  try {
    if (id === 'agnes') {
      const c = agnesCreds();
      if (!c.key) { setStat('<span class="api-stat-bad">❌ 未配置凭证（无内置默认且未填写 Key）</span>'); return; }
      const base = 'https://apihub.agnes-ai.com';
      const ctrl = new AbortController(); const to = setTimeout(() => ctrl.abort(), 15000);
      // 用 GET /v1/models 验证 Key 有效性——仅查询模型列表，不产生任何生成额度消耗
      const res = await fetch(base + '/v1/models', {
        method: 'GET',
        headers: { 'Authorization': 'Bearer ' + c.key },
        signal: ctrl.signal
      });
      clearTimeout(to);
      if (res.ok) { setStat('<span class="api-stat-ok">✅ 连通正常（Key 有效，可直接 AI 整理）</span>'); speak('连通正常'); toast('Agnes 连通正常'); }
      else { setStat('<span class="api-stat-bad">❌ 失败：HTTP ' + res.status + (res.status === 401 ? '（Key 无效或已失效）' : '') + '</span>'); toast('Agnes 连通失败：HTTP ' + res.status); }
    } else if (id === 'xf') {
      const c = xfCreds();
      if (!c.appid) { setStat('<span class="api-stat-bad">❌ 未配置凭证（无内置默认且未填写三件套）</span>'); return; }
      const url = await iflytekAuthUrl();
      const ok = await new Promise((resolve) => {
        let done = false; let ws;
        try { ws = new WebSocket(url); } catch (e) { resolve(false); return; }
        const to2 = setTimeout(() => { if (!done) { done = true; try { ws.close(); } catch (e) {} resolve(false); } }, 10000);
        ws.onopen = () => { done = true; clearTimeout(to2); try { ws.close(); } catch (e) {} resolve(true); };
        ws.onerror = () => { if (!done) { done = true; clearTimeout(to2); resolve(false); } };
      });
      if (ok) { setStat('<span class="api-stat-ok">✅ 连通正常（WebSocket 握手成功，可语音听写）</span>'); speak('语音连通正常'); toast('讯飞连通正常'); }
      else { setStat('<span class="api-stat-bad">❌ 连接失败（检查凭证或网络）</span>'); toast('讯飞连通失败'); }
    }
  } catch (e) {
    const msg = (e && e.name === 'AbortError') ? '超时（15 秒无响应）' : ('失败：' + (e && e.message || e));
    setStat('<span class="api-stat-bad">❌ ' + msg + '</span>');
    toast('连通测试' + msg);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '🧪 测试连通'; }
  }
}
/* 仪器/校准快捷入口（康腾线） */
function contactServiceFirstInstrument() {
  const insts = load(STORE.instruments, []);
  if (!insts.length) { toast('请先在工具箱→仪器台账添加仪器'); return; }
  // 找最近需要校准的仪器
  const target = insts.slice().sort((a, b) => daysUntil(a.calibration) - daysUntil(b.calibration))[0];
  openInstruments();
  setTimeout(() => { if (target && daysUntil(target.calibration) <= 30) contactService(target); }, 250);
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
  expOrigin = id ? 'edit' : 'new'; /* 模板生成流程会在调用后覆盖为 'template' */
  currentSteps = [];
  const exp = id ? load(STORE.exp, []).find((e) => e.id === id) : null;
  if (exp) currentSteps = JSON.parse(JSON.stringify(exp.steps || []));
  const title = exp ? exp.title : '';
  const raw = exp ? exp.raw : '';
  const operator = exp ? exp.operator : '实验员';

  let html = `<div class="grabber"></div>
    <div class="sheet-head"><button class="back-btn" onclick="expBack()">← 返回</button><h2>${exp ? '实验记录' : '新建实验记录'}</h2></div>
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
    <div class="srow" style="gap:10px">
      <div class="field" style="flex:1"><label>样本名（对应模板 {{样本名}}）</label><input id="expSample" value="${esc(exp && exp.sample || '')}" placeholder="如：外泌体样本"></div>
      <div class="field" style="flex:1"><label>批号（对应模板 {{批号}}）</label><input id="expLot" value="${esc(exp && exp.lot || '')}" placeholder="如：EV-2607"></div>
    </div>
    <div class="field"><label>标签（逗号分隔，便于筛选，如：外泌体, 纯化）</label><input id="expTags" value="${esc((exp && exp.tags || []).join(', '))}" placeholder="选填"></div>
    <div class="btn-row" style="margin-top:6px">
      <button class="btn secondary" id="structureBtn">整理为结构化步骤</button>
      <button class="btn ghost" id="aiBtn" onclick="aiStructure()">🤖 AI 智能整理</button>
    </div>
    <div id="stepList" style="margin-top:14px"></div>
    <div class="sheet-actions">
      ${exp ? '<button class="btn danger" onclick="deleteExp()">删除</button>' : '<button class="btn ghost" onclick="saveExpAsTemplate()">存为模板</button>'}
      <button class="btn" onclick="saveExp()">保存记录</button>
    </div>`;

  openSheet(html);
  if (exp) renderSteps();
  bindMic();
}
function expBack() {
  if (expOrigin === 'template') { expOrigin = ''; openTemplates(); }
  else closeSheet();
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
      toast('✅ 语音识别完成，已写入记录');
    };
    rec.onerror = () => { toast('❌ 语音识别失败，请手动输入'); };
    rec.onend = () => { rec._on = false; btn.classList.remove('recording'); $('vlabel').textContent = '点击说话，自动转为记录'; const t = $('expRaw'); if (t) t.classList.remove('listening'); if (rec && !rec._on) speak('已记录'); setTimeout(aiStructure, 300); };
    try { rec.start(); } catch (e) { rec._on = false; btn.classList.remove('recording'); }
  };
}

/* ---------------- 讯飞语音听写（WebSocket，浏览器直连签名） ---------------- */
function xfCreds() {
  const st = getSettings();
  const appid = (st.xfAppid || '').trim();
  const apiKey = (st.xfApiKey || '').trim();
  const apiSecret = (st.xfApiSecret || '').trim();
  if (appid && apiKey && apiSecret) return { appid, apiKey, apiSecret, useProxy: false }; // 用户自己的凭证：浏览器直连签名
  if (EMBED.xfAppid && EMBED.xfApiKey && EMBED.xfApiSecret) return { appid: EMBED.xfAppid, apiKey: EMBED.xfApiKey, apiSecret: EMBED.xfApiSecret, useProxy: false }; // 内置混淆凭证：浏览器直连签名
  return { appid: '', apiKey: '', apiSecret: '', useProxy: false };                        // 都没配：不可用
}
function iflytekReady() {
  const st = getSettings();
  const hasUser = !!(st.xfAppid && st.xfApiKey && st.xfApiSecret);
  return hasUser || !!(EMBED.xfAppid && EMBED.xfApiKey && EMBED.xfApiSecret);
}

/* 内置默认 Agnes Key（混淆存放），便于开箱即用；用户可在「设置 → AI 智能整理」覆盖。 */
function agnesCreds() {
  const st = getSettings();
  const userKey = (st.agnesKey || '').trim();
  if (userKey) return { key: userKey, useProxy: false }; // 用户自己的 Key：直连 agnes-ai.com
  if (EMBED.agnes) return { key: EMBED.agnes, useProxy: false }; // 内置混淆 Key：直连 agnes-ai.com
  return { key: '', useProxy: false };                    // 都没配：不可用
}
function agnesReady() {
  const st = getSettings();
  return !!(st.agnesKey && st.agnesKey.trim()) || !!EMBED.agnes;
}
let voiceOn = getSettings().voiceOn;
let agnesSample = '', agnesLot = '';
let expOrigin = ''; /* 标记实验记录页来源：'template' 表示从模板生成进入 */
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
    if (sending) { stop('ok'); return; }
    sending = true; seg = ''; segBase = (ta() ? ta().value : '');
    try { stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, sampleRate: 16000 } }); }
    catch (e) { sending = false; toast('❌ 无法访问麦克风，请检查授权'); return; }
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
    maxTimer = setTimeout(() => { toast('⏱️ 已达讯飞单次上限 60 秒，已自动停止'); stop('auto'); }, 58000);
    try {
      ws = new WebSocket(await iflytekAuthUrl());
    }
    catch (e) { toast('❌ 讯飞连接失败'); stop('error'); return; }
    ws.onopen = () => { timer = setInterval(flush, 40); };
    ws.onmessage = (ev) => {
      try {
        const j = JSON.parse(ev.data);
        if (j.code !== 0) { toast('❌ 讯飞错误 ' + j.code + ' ' + j.message); stop('error'); return; }
        const r = j.data && j.data.result;
        if (r && r.ws) {
          let t = ''; r.ws.forEach((w) => w.cw && w.cw.forEach((c) => t += c.w));
          if (t) { seg = mergeXfSeg(seg, t, r.pgs, r.rg); renderRaw(); }
        }
      } catch (e) {}
    };
    ws.onerror = () => { toast('❌ 讯飞连接异常'); stop('error'); };
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
    if (status === 0) { const c = xfCreds(); frame.common = { app_id: c.appid }; frame.business = { language: 'zh_cn', domain: 'iat', accent: 'mandarin', vad_eos: 2000 }; }
    if (ws && ws.readyState === 1) ws.send(JSON.stringify(frame));
  }
  function stop(reason) {
    try { if (timer) clearInterval(timer); } catch (e) {}
    try { if (maxTimer) clearTimeout(maxTimer); } catch (e) {}
    try { if (first === false && ws && ws.readyState === 1) ws.send(JSON.stringify({ data: { status: 2 } })); } catch (e) {}
    try { if (ws) ws.close(); } catch (e) {}
    try { if (proc) proc.disconnect(); if (stream) stream.getTracks().forEach((t) => t.stop()); } catch (e) {}
    if (ctx) ctx.close();
    const gotText = !!(seg && seg.trim());
    sending = false; first = true; buf = [];
    const t = ta(); if (t) t.classList.remove('listening');
    btn.classList.remove('recording'); $('vlabel').textContent = '点击说话，自动转为记录';
    if (reason === 'ok') {
      if (gotText) toast('✅ 语音识别完成，已写入记录');
      if (voiceOn) speak('已记录');
    }
    setTimeout(aiStructure, 300);
  }
}
function saveExp() {
  const title = $('expTitle').value.trim() || '未命名实验';
  const raw = $('expRaw').value.trim();
  const operator = $('expOp').value.trim() || '实验员';
  const sample = $('expSample') ? $('expSample').value.trim() : '';
  const lot = $('expLot') ? $('expLot').value.trim() : '';
  const tags = ($('expTags').value || '').split(/[,，]/).map((s) => s.trim()).filter(Boolean);
  if (!raw) { toast('请先填写或语音记录内容'); return; }
  if (!currentSteps.length) currentSteps = structure(raw);
  const exps = load(STORE.exp, []);
  if (editingExpId) {
    const i = exps.findIndex((e) => e.id === editingExpId);
    exps[i] = { ...exps[i], title, raw, operator, sample, lot, tags, steps: currentSteps };
  } else {
    exps.push({ id: uid('e'), title, raw, operator, sample, lot, tags, createdAt: nowISO(), steps: currentSteps });
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
  const lots = (r && r.lots && r.lots.length) ? r.lots : (r ? [{ lot: r.lot||'', batch: r.batch||'', qty: Number(r.qty)||0, unit: r.unit||'瓶', location: r.location||'', expiry: r.expiry||'', opened: '', status: '未使用' }] : []);
  
  let html = `<div class="grabber"></div><h2>${r ? '库存详细' : '添加库存'}</h2>
    <p class="hint">记录试剂信息与各批次详情，系统自动提醒临期与补货。</p>
    <div class="section-title" style="font-size:13px;margin:8px 0 4px">试剂/耗材信息</div>
    <div class="field"><label>名称</label><div style="display:flex;flex:1;gap:4px"><input id="rName" value="${v('name')}" placeholder="如：PBS 缓冲液" style="flex:1"><span class="ai-scan-btn" onclick="scanReagPhoto()">📷 拍照识别</span></div></div>
    <div class="field-row">
      <div class="field"><label>品牌</label><input id="rSup" value="${v('supplier')}" placeholder="如：Thermo / Sigma"></div>
      <div class="field"><label>货号</label><input id="rLot" value="${v('lot')}" placeholder="如：P1300"></div>
    </div>
    <div class="field-row">
      <div class="field"><label>安全库存（低于即提醒补货）</label><input id="rMin" type="number" value="${v('min') || 0}" placeholder="如：1"></div>
      <div class="field"><label>品牌偏好（询价时使用）</label><input id="rBrand" value="${v('brand')}" placeholder="如：迈博瑞 / Lonza（选填）"></div>
    </div>
    <div class="section-title" style="font-size:13px;margin:12px 0 4px">批次列表</div>
    <div class="lot-sheet-list" id="lotSheetList">`;

  lots.forEach((l, i) => {
    html += `<div class="lot-sheet-row">
      <div class="lot-sheet-fields">
        <div class="lot-sheet-field"><label>货号</label><input data-lot-idx="${i}" class="lot-input" data-field="lot" value="${esc(l.lot||'')}"></div>
        <div class="lot-sheet-field"><label>批号</label><input data-lot-idx="${i}" class="lot-input" data-field="batch" value="${esc(l.batch||'')}"></div>
        <div class="lot-sheet-field"><label>数量</label><input data-lot-idx="${i}" class="lot-input" data-field="qty" type="number" value="${Number(l.qty)||0}"></div>
        <div class="lot-sheet-field"><label>单位</label><input data-lot-idx="${i}" class="lot-input" data-field="unit" value="${esc(l.unit||'瓶')}" readonly onclick="openUnitPicker(event,${i})"></div>
        <div class="lot-sheet-field"><label>位置</label><input data-lot-idx="${i}" class="lot-input" data-field="location" value="${esc(l.location||'')}"></div>
        <div class="lot-sheet-field"><label>效期</label><input data-lot-idx="${i}" class="lot-input" data-field="expiry" type="date" value="${esc(l.expiry||'')}"></div>
        <div class="lot-sheet-field"><label>开瓶日期</label><input data-lot-idx="${i}" class="lot-input" data-field="opened" type="date" value="${esc(l.opened||'')}"></div>
        <div class="lot-sheet-field"><label>状态</label>
          <select data-lot-idx="${i}" class="lot-input" data-field="status">
            ${['未使用','在用','用完','废弃'].map((s) => `<option value="${s}"${s===(l.status||'未使用')?' selected':''}>${s}</option>`).join('')}
          </select>
        </div>
      </div>
      ${lots.length > 1 ? `<button class="lot-del" onclick="removeLotRow(${i})" title="删除此批次">X 删除上面这个批次</button>` : ''}
    </div>`;
  });

  html += `</div>
    <button class="btn ghost" style="width:100%" onclick="addLotRow()">+ 添加批次</button>`;

  // 只在新建模式存 lot-ids，编辑模式从原数据读
  if (r) {
    html += `<div class="btn-row" style="margin-top:12px">
      <button class="btn danger" onclick="deleteReag()">删除试剂</button>
      <button class="btn secondary" onclick="inquireReag('${r.id}')">📤 询价</button>
      <button class="btn" onclick="saveReag()">保存</button>
    </div>`;
  } else {
    html += `<div class="btn-row" style="margin-top:12px"><button class="btn" onclick="saveReag()">保存</button></div>`;
  }
  
  // 存储原始 lot ids 用于编辑模式匹配
  if (r) {
    const lotIds = JSON.stringify(lots.map((l) => l.id).filter(Boolean));
    html += `<span id="lotIdsData" style="display:none">${esc(lotIds)}</span>`;
  }
  
  openSheet(html);
}

/* AI 全屏 loading（拍照识别 / CoA 审查 / AI 整理 通用） */
function showScanLoading(show, msg) {
  let el = document.getElementById('_scanLoading');
  if (!el && show) {
    // 注入 spin 动画（仅一次）
    if (!document.getElementById('_scanSpinStyle')) {
      const st = document.createElement('style');
      st.id = '_scanSpinStyle';
      st.textContent = '@keyframes spin{to{transform:rotate(360deg)}}';
      document.head.appendChild(st);
    }
    el = document.createElement('div');
    el.id = '_scanLoading';
    el.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;flex-direction:column;gap:16px';
    el.innerHTML = `<svg width="44" height="44" viewBox="0 0 44 44" style="animation:spin .85s linear infinite"><circle cx="22" cy="22" r="18" fill="none" stroke="#fff" stroke-width="4" stroke-dasharray="90" stroke-dashoffset="70" stroke-linecap="round"/></svg>
      <span id="_scanLoadingText" style="color:#fff;font-size:16px;font-weight:500;letter-spacing:.5px">${msg || '正在识别标签…'}</span>`;
    document.body.appendChild(el);
  }
  if (el) {
    // 更新文字
    const txt = document.getElementById('_scanLoadingText');
    if (txt && msg) txt.textContent = msg;
    el.style.display = show ? 'flex' : 'none';
  }
}
function scanReagPhoto() {
  if (!agnesReady()) { toast('请先在「设置 → AI」配置 API Key（留空即用内置默认）'); return; }
  // 创建隐藏的 file input 触发拍照/选图
  let inp = document.getElementById('_photoInput');
  if (!inp) {
    inp = document.createElement('input');
    inp.id = '_photoInput';
    inp.type = 'file';
    inp.accept = 'image/*';
    inp.capture = 'environment';
    inp.style.display = 'none';
    document.body.appendChild(inp);
  }
  inp.onchange = async () => {
    const file = inp.files[0];
    if (!file) return;
    inp.value = '';
    showScanLoading(true);
    // canvas 压缩到 max 800px
    const img = await loadImage(file);
    const canvas = document.createElement('canvas');
    let w = img.width, h = img.height;
    const maxDim = 800;
    if (w > maxDim || h > maxDim) {
      if (w > h) { h = h * maxDim / w; w = maxDim; }
      else { w = w * maxDim / h; h = maxDim; }
    }
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, w, h);
    const b64 = canvas.toDataURL('image/jpeg', 0.85).split(',')[1];
    
    try {
      const c = agnesCreds();
      const base = 'https://apihub.agnes-ai.com';
      const res = await fetch(base + '/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + c.key },
        body: JSON.stringify({
          model: 'agnes-1.5-flash',
          messages: [{
            role: 'user',
            content: [
              { type: 'text', text: '识别这张照片中的试剂/耗材标签信息，提取以下字段（若无则填空字符串），只输出 JSON 不要解释：{"name":"试剂名称（中文优先）","supplier":"品牌/厂家","lot":"货号/catalog number","batch":"批号/lot number","expiry":"有效期（YYYY-MM-DD）","unit":"规格单位如 mL/g/支"}。注意：name 是试剂名称，不是供试品名称。若无有效期则 expiry 填空字符串。' },
              { type: 'image_url', image_url: { url: 'data:image/jpeg;base64,' + b64 } }
            ]
          }],
          max_tokens: 500,
          stream: false,
          temperature: 0.1
        })
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const j = await res.json();
      const raw = j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content;
      if (!raw) throw new Error('empty response');
      const data = extractJSON(raw);
      if (!data) throw new Error('parse failed');
      // 填充表单
      const nameInp = $('rName'); if (nameInp && data.name) nameInp.value = data.name;
      const supInp = $('rSup'); if (supInp && data.supplier) supInp.value = data.supplier;
      // 自动填入第一个批次的货号和批号
      if (data.lot || data.batch) {
        const firstLot = document.querySelector('.lot-input[data-field="lot"]');
        const firstBatch = document.querySelector('.lot-input[data-field="batch"]');
        if (firstLot && data.lot) firstLot.value = data.lot;
        if (firstBatch && data.batch) firstBatch.value = data.batch;
      }
      // 自动填入第一个批次的有效期
      if (data.expiry) {
        const firstExp = document.querySelector('.lot-input[data-field="expiry"]');
        if (firstExp) firstExp.value = data.expiry;
      }
      // 自动填入单位
      if (data.unit) {
        const firstUnit = document.querySelector('.lot-input[data-field="unit"]');
        if (firstUnit) firstUnit.value = data.unit;
      }
      showScanLoading(false);
      toast('✅ 识别完成，请确认');
    } catch (e) {
      showScanLoading(false);
      toast('识别失败：' + (e.message || '未知错误'));
      console.warn('[Scan]', e);
    }
  };
  inp.click();
}
function loadImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

function saveReag() {
  const name = $('rName').value.trim();
  if (!name) { toast('请填写名称'); return; }
  const supplier = $('rSup').value.trim();
  const lot = $('rLot') ? $('rLot').value.trim() : '';
  const brand = $('rBrand') ? $('rBrand').value.trim() : '';
  const min = $('rMin').value || 0;
  
  // 读取批次列表输入
  const lotInputs = document.querySelectorAll('#lotSheetList .lot-input');
  const idxMap = {};
  lotInputs.forEach((inp) => {
    const idx = inp.dataset.lotIdx;
    const field = inp.dataset.field;
    if (!idxMap[idx]) idxMap[idx] = {};
    idxMap[idx][field] = inp.value;
  });
  
  const lots = Object.values(idxMap);
  
  // 如果已有批次，合并旧 id
  const reags = load(STORE.reag, []);
  const existing = editingReagId ? reags.find((x) => x.id === editingReagId) : null;
  
  let r;
  if (editingReagId) {
    const i = reags.findIndex((x) => x.id === editingReagId);
    const oldLots = (reags[i].lots || []).filter((l) => l.id);
    const updatedLots = lots.map((l, idx) => {
      const old = oldLots[idx] || {};
      return { id: old.id || uid('l'), lot: l.lot || '', batch: l.batch || '', qty: Number(l.qty) || 0, unit: l.unit || '瓶', location: l.location || '', expiry: l.expiry || '', opened: l.opened || '', status: l.status || '正常' };
    });
    reags[i] = { ...reags[i], name, supplier, lot, brand, min, lots: updatedLots };
    r = reags[i];
  } else {
    r = { id: uid('r'), name, supplier, lot, brand, min, lots: lots.map((l) => ({ id: uid('l'), lot: l.lot || '', batch: l.batch || '', qty: Number(l.qty) || 0, unit: l.unit || '瓶', location: l.location || '', expiry: l.expiry || '', opened: l.opened || '', status: l.status || '正常' })) };
    reags.push(r);
  }
  save(STORE.reag, reags);
  // 自动收集新单位
  const customUnits = getUserUnits();
  let changed = false;
  lots.forEach((l) => {
    if (l.unit && !DEFAULT_UNITS.includes(l.unit) && !customUnits.includes(l.unit)) {
      customUnits.push(l.unit); changed = true;
    }
  });
  if (changed) saveUserUnits(customUnits);
  closeSheet(); toast('已保存'); renderAll();
}
function removeLotRow(idx) {
  const list = $('lotSheetList');
  const rows = list.querySelectorAll('.lot-sheet-row');
  if (rows[idx]) rows[idx].remove();
  // 重新编号剩余的 data-lot-idx
  const remaining = list.querySelectorAll('.lot-sheet-row');
  remaining.forEach((row, i) => {
    row.querySelectorAll('.lot-input').forEach((inp) => inp.dataset.lotIdx = i);
    if (remaining.length > 1) {
      let delBtn = row.querySelector('.lot-del');
    }
  });
}
function addLotRow() {
  const list = $('lotSheetList');
  if (!list) return;
  const rows = list.querySelectorAll('.lot-sheet-row');
  const idx = rows.length;
  const row = document.createElement('div');
  row.className = 'lot-sheet-row';
  row.innerHTML = `<div class="lot-sheet-fields">
    <div class="lot-sheet-field"><label>货号</label><input data-lot-idx="${idx}" class="lot-input" data-field="lot"></div>
    <div class="lot-sheet-field"><label>批号</label><input data-lot-idx="${idx}" class="lot-input" data-field="batch"></div>
    <div class="lot-sheet-field"><label>数量</label><input data-lot-idx="${idx}" class="lot-input" data-field="qty" type="number" value="0"></div>
    <div class="lot-sheet-field"><label>单位</label><input data-lot-idx="${idx}" class="lot-input" data-field="unit" value="瓶" readonly onclick="openUnitPicker(event,${idx})"></div>
    <div class="lot-sheet-field"><label>位置</label><input data-lot-idx="${idx}" class="lot-input" data-field="location"></div>
    <div class="lot-sheet-field"><label>有效期</label><input data-lot-idx="${idx}" class="lot-input" data-field="expiry" type="date"></div>
    <div class="lot-sheet-field"><label>开瓶日期</label><input data-lot-idx="${idx}" class="lot-input" data-field="opened" type="date"></div>
    <div class="lot-sheet-field"><label>状态</label>
      <select data-lot-idx="${idx}" class="lot-input" data-field="status">
        <option>未使用</option><option>在用</option><option>用完</option><option>废弃</option>
      </select>
    </div>
  </div>
  <button class="lot-del" onclick="removeLotRow(${idx})" title="删除此批次">X 删除上面这个批次</button>`;
  list.appendChild(row);
}
function deleteReag() {
  if (!editingReagId) return;
  const reags = load(STORE.reag, []).filter((x) => x.id !== editingReagId);
  save(STORE.reag, reags); closeSheet(); renderAll(); toast('已删除');
}

/* ---------------- 试剂批量导入（文本 + Excel） ---------------- */
const REAG_TPL_COLS = ['名称', '品牌', '货号', '批号', '数量', '单位', '效期(YYYY-MM-DD)', '开瓶日期', '位置', '安全库存', '品牌偏好', '状态'];
let reagExcelRows = [];
function openReagBatch() {
  reagExcelRows = [];
  let html = `<div class="grabber"></div><h2>批量导入试剂耗材</h2>
    <p class="hint">两种方式：① 粘贴多行文本（字段用 <b>逗号 / 制表符</b> 分隔：名称, 品牌, 货号, 批号, 数量, 单位, 效期, 开瓶日期, 位置, 安全库存, 品牌偏好, 状态）；② 下载 Excel 模板填写后导入。</p>
    <div class="btn-row" style="margin:4px 0 10px">
      <button class="btn ghost" onclick="downloadReagTemplate()">⬇️ 下载 Excel 模板</button>
      <button class="btn ghost" onclick="document.getElementById('rbFile').click()">📂 导入 Excel</button>
      <input type="file" id="rbFile" accept=".xlsx,.xls" style="display:none" onchange="onReagExcelFile(this)">
    </div>
    <textarea id="rbText" class="batch-ta" placeholder="粘贴多行试剂（可选，与 Excel 可同时导入）…"></textarea>
    <div id="rbPreview" class="batch-preview"></div>
    <div class="btn-row" style="margin-top:10px">
      <button class="btn ghost" onclick="closeSheet()">取消</button>
      <button class="btn" id="rbConfirm" onclick="confirmReagBatch()">导入</button>
    </div>`;
  openSheet(html);
  const ta = $('rbText'); if (ta) ta.addEventListener('input', renderReagBatchPreview);
  renderReagBatchPreview();
}
function downloadReagTemplate() {
  if (typeof XLSX === 'undefined') { toast('Excel 组件未加载，请刷新页面后重试'); return; }
  const ws = XLSX.utils.aoa_to_sheet([REAG_TPL_COLS]);
  // 状态列（第12列）添加下拉选项
  const statusCol = XLSX.utils.encode_col(REAG_TPL_COLS.length - 1);
  ws['!dataValidations'] = {
    dv1: {
      type: 'list',
      formula1: '"未使用,在用,用完,废弃"',
      sqref: statusCol + '2:' + statusCol + '1000',
      allowBlank: true
    }
  };
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '试剂耗材');
  const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = '试剂耗材导入模板.xlsx';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  toast('✅ 模板已下载：试剂耗材导入模板.xlsx');
}
function onReagExcelFile(input) {
  const f = input.files && input.files[0];
  if (!f) return;
  if (typeof XLSX === 'undefined') { toast('Excel 组件未加载，请刷新页面后重试'); input.value = ''; return; }
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: false });
      const parsed = mapReagExcelRows(rows);
      reagExcelRows = parsed;
      renderReagBatchPreview();
      if (parsed.length) toast('✅ 已解析 ' + parsed.length + ' 条（可在下方确认后导入）');
      else toast('⚠️ 未从 Excel 解析到有效行（请确认首行含「名称」表头）');
    } catch (err) {
      console.warn('[Excel] 解析失败', err);
      toast('❌ Excel 解析失败：' + (err.message || err));
    }
    input.value = '';
  };
  reader.readAsArrayBuffer(f);
}
function mapReagExcelRows(rows) {
  if (!rows || !rows.length) return [];
  // 定位表头行（首格含「名称」），按列名映射，兼容任意列顺序
  let hi = -1;
  const idx = {};
  for (let i = 0; i < rows.length; i++) {
    const s = (rows[i] || []).map((c) => String(c == null ? '' : c).trim());
    const namePos = s.findIndex((c) => c === '名称' || c.includes('名称'));
    if (namePos >= 0) {
      hi = i;
      idx.name = namePos;
      idx.supplier = s.findIndex((c) => c.includes('品牌') && !c.includes('偏好'));
      idx.lot = s.findIndex((c) => c.includes('货号'));
      idx.min = s.findIndex((c) => c.includes('安全库存'));
      idx.brand = s.findIndex((c) => c.includes('品牌偏好'));
      idx.batch = s.findIndex((c) => c.includes('批号'));
      idx.qty = s.findIndex((c) => c.includes('数量'));
      idx.unit = s.findIndex((c) => c.includes('单位'));
      idx.location = s.findIndex((c) => c.includes('位置'));
      idx.expiry = s.findIndex((c) => c.includes('效期') && !c.includes('开瓶'));
      idx.opened = s.findIndex((c) => c.includes('开瓶日期'));
      idx.status = s.findIndex((c) => c.includes('状态'));
      break;
    }
  }
  if (hi < 0) { // 无表头：按默认顺序假设
    Object.assign(idx, { name: 0, supplier: 1, lot: 2, batch: 3, qty: 4, unit: 5, expiry: 6, opened: 7, location: 8, min: 9, brand: 10, status: 11 });
    hi = -1;
  }
  const out = [];
  for (let i = hi + 1; i < rows.length; i++) {
    const r = rows[i] || [];
    const name = String(r[idx.name] == null ? '' : r[idx.name]).trim();
    if (!name) continue;
    let qty = r[idx.qty];
    if (qty === '' || qty == null) qty = 1;
    else if (typeof qty === 'string') { const n = parseFloat(qty); if (!isNaN(n)) qty = n; }
    out.push({
      name,
      supplier: String(r[idx.supplier] == null ? '' : r[idx.supplier]).trim(),
      lot: String(r[idx.lot] == null ? '' : r[idx.lot]).trim(),
      min: idx.min >= 0 ? Number(r[idx.min]) || 0 : 0,
      brand: idx.brand >= 0 ? String(r[idx.brand] == null ? '' : r[idx.brand]).trim() : '',
      batch: String(r[idx.batch] == null ? '' : r[idx.batch]).trim(),
      qty,
      unit: (String(r[idx.unit] == null ? '' : r[idx.unit]).trim()) || '瓶',
      location: String(r[idx.location] == null ? '' : r[idx.location]).trim(),
      expiry: String(r[idx.expiry] == null ? '' : r[idx.expiry]).trim(),
      opened: idx.opened >= 0 ? String(r[idx.opened] == null ? '' : r[idx.opened]).trim() : '',
      status: idx.status >= 0 ? String(r[idx.status] == null ? '' : r[idx.status]).trim() : '未使用'
    });
  }
  return out;
}
function parseReagLines(text) {
  const out = [];
  text.split(/\r?\n/).map((s) => s.trim()).filter(Boolean).forEach((line) => {
    const parts = line.includes('\t') ? line.split('\t') : line.split(/[,，]/);
    const f = parts.map((s) => s.trim());
    const [name, supplier, lot, batch, qty, unit, expiry, opened, location, min, brand, status] = f;
    if (!name) return;
    out.push({ name, supplier: supplier || '', lot: lot || '', batch: batch || '', qty: Number(qty) || 0, unit: unit || '瓶', expiry: expiry || '', opened: opened || '', location: location || '', min: Number(min) || 0, brand: brand || '', status: status || '未使用' });
  });
  return out;
}
function renderReagBatchPreview() {
  const box = $('rbPreview'); if (!box) return;
  const arr = parseReagLines(($('rbText') || {}).value || '');
  const all = arr.concat(reagExcelRows);
  const total = all.length;
  const dupCount = all.filter((r) => load(STORE.reag, []).some((x) => x.name === r.name)).length;
  let inner = '';
  if (reagExcelRows.length) inner += `<div class="bp-row ok">📊 Excel：${reagExcelRows.length} 条</div>`;
  if (arr.length) inner += arr.slice(0, 5).map((r) => `<div class="bp-row">${esc(r.name)} · ${esc(r.supplier || '—')} · 货号 ${esc(r.lot || '—')} · 批号 ${esc(r.batch || '—')} · ${esc(r.qty)}${esc(r.unit)} · ${esc(r.location || '—')}</div>`).join('') + (arr.length > 5 ? `<div class="bp-row muted">…文本共 ${arr.length} 条</div>` : '');
  if (dupCount) inner += `<div class="bp-row warn">⚠ ${dupCount} 条与已有试剂同名同批号，将更新而非新增</div>`;
  if (!total) inner = '<div class="bp-row muted">尚未解析到试剂（可粘贴文本或导入 Excel）</div>';
  box.innerHTML = inner;
  const c = $('rbConfirm'); if (c) c.textContent = '导入 ' + total + ' 条';
}
function confirmReagBatch() {
  const arr = parseReagLines(($('rbText') || {}).value || '');
  const all = arr.concat(reagExcelRows);
  if (!all.length) { toast('没有可导入的试剂'); return; }
  const reags = load(STORE.reag, []);
  let added = 0, updated = 0;
  all.forEach((r) => {
    // 查找同名试剂（不要求货号完全一致，同试剂名合并）
    const i = reags.findIndex((x) => x.name === r.name);
    const lotEntry = { id: uid('l'), lot: r.lot||'', batch: r.batch||'', qty: Number(r.qty)||0, unit: r.unit||'瓶', location: r.location||'', expiry: r.expiry||'', opened: r.opened||'', status: r.status||'未使用' };
    if (i >= 0) {
      // 已有同名的试剂：追加批次
      if (!reags[i].lots) reags[i].lots = [];
      reags[i].lots.push(lotEntry);
      // 更新供应商/品牌/安全库存信息
      if (r.supplier) reags[i].supplier = r.supplier;
      if (r.brand) reags[i].brand = r.brand;
      if (Number(r.min)) reags[i].min = Number(r.min);
      updated++;
    } else {
      // 新增试剂
      reags.push({ id: uid('r'), name: r.name, supplier: r.supplier||'', brand: r.brand||'', min: Number(r.min)||0, lots: [lotEntry] });
      added++;
    }
  });
  save(STORE.reag, reags); closeSheet(); renderAll(); reagExcelRows = [];
  toast(`新增 ${added} · 更新 ${updated}`);
}

/* ---------------- 冻存盒批量填充 ---------------- */
function freezerOrder(startRow, startCol, dir, count) {
  const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  const res = []; let ri = rows.indexOf(startRow), ci = startCol;
  for (let k = 0; k < count; k++) {
    if (ri < 0 || ri > 7 || ci < 1 || ci > 12) break;
    res.push({ row: rows[ri], col: ci });
    if (dir === 'row') { ci++; if (ci > 12) { ci = 1; ri++; } }
    else { ri++; if (ri > 7) { ri = 0; ci++; } }
  }
  return res;
}
function openFreezerBatch() {
  const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  const rowOpts = rows.map((r) => `<option ${r === 'A' ? 'selected' : ''}>${r}</option>`).join('');
  let colOpts = ''; for (let c = 1; c <= 12; c++) colOpts += `<option ${c === 1 ? 'selected' : ''}>${c}</option>`;
  let html = `<div class="grabber"></div><h2>批量填充冻存盒 ${freezerBox}</h2>
    <p class="hint">每行一个样本名，从起始位置起按顺序填入<b>空格</b>（已占用格自动跳过）。</p>
    <div class="field"><label>起始位置 / 方向</label><div style="display:flex;gap:10px">
      <select id="fbRow" class="sel">${rowOpts}</select>
      <select id="fbCol" class="sel">${colOpts}</select>
      <select id="fbDir" class="sel"><option value="row" selected>行优先</option><option value="col">列优先</option></select>
    </div></div>
    <textarea id="fbText" class="batch-ta" placeholder="样本A&#10;样本B&#10;样本C"></textarea>
    <div id="fbPreview" class="batch-preview"></div>
    <div class="btn-row" style="margin-top:10px">
      <button class="btn ghost" onclick="closeSheet()">取消</button>
      <button class="btn" id="fbConfirm" onclick="confirmFreezerBatch()">填充</button>
    </div>`;
  openSheet(html);
  const ta = $('fbText'); if (ta) ta.addEventListener('input', renderFreezerBatchPreview);
  ['fbRow', 'fbCol', 'fbDir'].forEach((id) => { const e = $(id); if (e) e.addEventListener('change', renderFreezerBatchPreview); });
  renderFreezerBatchPreview();
}
function renderFreezerBatchPreview() {
  const box = $('fbPreview'); if (!box) return;
  const names = ($('fbText').value || '').split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  if (!names.length) { box.innerHTML = '<div class="bp-row muted">输入样本名预览</div>'; const cf = $('fbConfirm'); if (cf) cf.textContent = '填充'; return; }
  const order = freezerOrder($('fbRow').value, +$('fbCol').value, $('fbDir').value, names.length);
  const occupied = load(STORE.samples, []).filter((s) => s.box === freezerBox).map((s) => s.row + s.col);
  let willFill = 0;
  const cells = names.map((n, i) => {
    const c = order[i]; if (!c) return `<span class="bp-skip">${esc(n)}（超出范围）</span>`;
    const key = c.row + c.col;
    if (occupied.includes(key)) return `<span class="bp-skip">${esc(n)}→${c.row}${c.col}(占用)</span>`;
    willFill++; return `<span class="bp-ok">${esc(n)}→${c.row}${c.col}</span>`;
  });
  box.innerHTML = `<div class="bp-count">将填充 ${willFill} 格（跳过 ${names.length - willFill} 个）</div>` + cells.map((c) => `<div class="bp-row">${c}</div>`).join('');
  const cf = $('fbConfirm'); if (cf) cf.textContent = '填充 ' + willFill + ' 格';
}
function confirmFreezerBatch() {
  const names = ($('fbText').value || '').split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  if (!names.length) { toast('请输入样本名'); return; }
  const order = freezerOrder($('fbRow').value, +$('fbCol').value, $('fbDir').value, names.length);
  const samples = load(STORE.samples, []);
  const occupied = samples.filter((s) => s.box === freezerBox).map((s) => s.row + s.col);
  let added = 0;
  names.forEach((n, i) => {
    const c = order[i]; if (!c) return;
    const key = c.row + c.col; if (occupied.includes(key)) return;
    samples.push({ id: uid('s'), name: n, type: '样本', box: freezerBox, row: c.row, col: c.col, expiry: '', note: '' });
    occupied.push(key); added++;
  });
  save(STORE.samples, samples); closeSheet(); renderFreezer();
  toast('已填充 ' + added + ' 格');
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
    <div class="field"><label>关联试剂（选填）</label>
      <select id="sReag" style="width:100%;padding:8px 10px;border:1px solid var(--line);border-radius:8px;background:var(--glass);font-size:14px;outline:none;appearance:auto">
        <option value="">— 不关联 —</option>
        ${load(STORE.reag, []).map((r) => `<option value="${r.id}"${s && s.reagId === r.id ? ' selected' : ''}>${esc(r.name)}</option>`).join('')}
      </select>
    </div>
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
  const reagId = ($('sReag') ? $('sReag').value : '') || '';
  const data = { name, type: $('sType').value.trim() || '样本', note: $('sNote').value.trim(), expiry: $('sExp').value, box, row, col, reagId };
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

/* ---------------- 请购单（已移除，统一走一键询价弹窗） ---------------- */

/* ============================================================
   自然获客入口：询价 / 采购单 / 校准服务 / 模板耗材
   所有供应商信息统一读 SUPPLIER；按钮低调，只在需求发生时出现
   ============================================================ */

/* 询价单 sheet（含微信二维码 + 一键复制） */
let _activeSupplier = null; // 当前 sheet 展示的供应商
function openInquireSheet(items, title, ctx) {
  const sp = pickSupplier(ctx || 'reagent'); _activeSupplier = sp;
  // items: [{ name, spec, qty, unit, lot, reason, brandHint }]
  const lines = items.map((it) => `  · ${it.name}${it.spec ? '（' + it.spec + '）' : ''} × ${it.qty}${it.unit || ''}${it.lot ? ' 批号 ' + it.lot : ''}${it.reason ? '  · ' + it.reason : ''}`).join('\n');
  const text = `【实验台 · 询价单】\n联系人：${sp.contact}\n手机：${sp.phone}\n公司：${sp.name}\n\n以下试剂/耗材需要询价：\n${lines}\n\n---\n品牌偏好（如有）：${items[0] && items[0].brandHint || '请推荐'}\n\n如方便请直接报单价/货期，谢谢！`;
  const equipLine = sp.equipmentText ? `<div class="supplier-brand" style="margin-top:6px">${esc(sp.equipmentText)}</div>` : '';
  const html = `<div class="grabber"></div><h2>${title || '询价单'}</h2>
    <p class="hint">系统已按本次需求生成询价文本。扫码添加 <b>${sp.contact}</b>（${sp.shortName}）微信，把询价文本粘过去即可；也可直接拨打电话。</p>
    <div class="supplier-card">
      <img class="supplier-qr" src="${sp.wechatQr}" alt="微信二维码" onerror="this.style.display='none'">
      <div class="supplier-info">
        <div class="supplier-name">${sp.name}</div>
        <div class="supplier-tag">${sp.tagline}</div>
        <div class="supplier-line">服务对象：<b>${sp.audience}</b></div>
        <div class="supplier-line">联系人：<b>${sp.contact}</b></div>
        <div class="supplier-line">手机：<a href="${sp.phoneTel}">${sp.phone}</a></div>
      </div>
    </div>
    <div class="copy-box" id="inquireText" style="margin-top:14px">${esc(text)}</div>
    <div class="btn-row" style="margin-top:12px">
      <button class="btn" onclick="copyInquireText()">📋 复制询价文本</button>
      <button class="btn secondary" onclick="window.location.href='${sp.phoneTel}'">📞 拨号</button>
    </div>
    <div class="supplier-brand">${esc(sp.brandText)}</div>
    ${equipLine}`;
  openSheet(html);
}
function copyInquireText() { copyText($('inquireText').textContent, '已复制，快去分享吧'); }
/* 通用询价入口（更多页供应商卡片）：按 ctx 路由到对应供应商，打开空白询价单让填写 */
function inquireSupplier(ctx) {
  const sp = pickSupplier(ctx || 'reagent');
  openInquireSheet([{ name: '（请填写具体需求：试剂 / 耗材 / 仪器名称、规格、数量）', spec: '', qty: '', unit: '', reason: '' }], '询价 · ' + sp.shortName, ctx || 'reagent');
}

/* ① 单个试剂询价（来自试剂详情/列表） */
function inquireReag(id) {
  const r = load(STORE.reag, []).find((x) => x.id === id);
  if (!r) return;
  const st = reagStatus(r);
  const me = reagMinExpiry(r);
  const reason = st.text === '需补货' ? '库存不足' : st.text === '已过期' ? '已过期需替换' : st.text.includes('临期') ? `临期（剩${daysUntil(me)}天）` : '常规采购';
  const suggest = Math.max(Number(r.min || 0) - reagTotalQty(r), 0);
  const unit = (r.lots && r.lots[0] && r.lots[0].unit) || r.unit || '件';
  openInquireSheet([{ name: r.name, spec: r.spec || r.location, qty: suggest || 1, unit, lot: r.lot || (r.lots && r.lots[0] && r.lots[0].lot) || '', reason, brandHint: r.brand || '请推荐' }], '询价 · ' + r.name, 'reagent');
}

/* ② 批量询价（来自效期日历采购清单） */
function inquireExpiring() {
  const reags = load(STORE.reag, []);
  const ed = expDays();
  const groups = [
    ['已过期', (r) => reagLotsExpired(r)],
    ['7 天内到期', (r) => { const d = daysUntil(reagMinExpiry(r)); return d >= 0 && d <= 7; }],
    [`${ed} 天内到期`, (r) => { const d = daysUntil(reagMinExpiry(r)); return d > 7 && d <= ed; }],
    ['需补货', (r) => reagTotalQty(r) <= Number(r.min || 0)]
  ];
  const items = [];
  const seen = new Set();
  groups.forEach(([_, fn]) => reags.filter(fn).forEach((r) => {
    if (seen.has(r.id)) return;
    seen.add(r.id);
    const me = reagMinExpiry(r);
    const st = reagStatus(r);
    const reason = st.text === '需补货' ? '库存不足' : reagLotsExpired(r) ? '已过期' : me ? `剩${daysUntil(me)}天` : '库存不足';
    const suggest = Math.max(Number(r.min || 0) - reagTotalQty(r), 0);
    const unit = (r.lots && r.lots[0] && r.lots[0].unit) || r.unit || '件';
    items.push({ name: r.name, spec: r.location, qty: suggest || 1, unit, lot: r.lot || (r.lots && r.lots[0] && r.lots[0].lot) || '', reason, brandHint: r.brand || '' });
  }));
  if (!items.length) { toast('当前没有需要询价的试剂'); return; }
  openInquireSheet(items, '采购清单询价（' + items.length + ' 项）', 'reagent');
}

/* ③ 仪器校准 / 维修联系服务商（默认走康腾，代理设备） */
function contactService(it) {
  const sp = pickSupplier('instrument'); _activeSupplier = sp;
  const d = daysUntil(it.calibration);
  const reason = d < 0 ? `已过期 ${-d} 天` : d <= 30 ? `剩 ${d} 天到期` : '预防性维护';
  const text = `【实验台 · 仪器服务咨询】\n\n仪器：${it.name}\n备注：${it.note || '—'}\n校准到期：${it.calibration}（${reason}）\n\n请${sp.contact}协助：\n  1. 校准/检定服务报价\n  2. 备件与耗材配套\n  3. 如有现货请告知货期\n\n---\n${sp.shortName} · ${sp.phone}`;
  const equipLine = sp.equipmentText ? `<div class="supplier-brand" style="margin-top:6px">${esc(sp.equipmentText)}</div>` : '';
  const html = `<div class="grabber"></div><h2>联系服务商</h2>
    <p class="hint">${it.name} 校准${d < 0 ? '已过期' : '临近'}，扫码添加 <b>${sp.contact}</b>（${sp.shortName}）咨询校准/检定/维护服务。</p>
    <div class="supplier-card">
      <img class="supplier-qr" src="${sp.wechatQr}" alt="微信二维码" onerror="this.style.display='none'">
      <div class="supplier-info">
        <div class="supplier-name">${sp.name}</div>
        <div class="supplier-tag">${sp.tagline}</div>
        <div class="supplier-line">服务对象：<b>${sp.audience}</b></div>
        <div class="supplier-line">联系人：<b>${sp.contact}</b></div>
        <div class="supplier-line">手机：<a href="${sp.phoneTel}">${sp.phone}</a></div>
      </div>
    </div>
    <div class="copy-box" id="svcText">${esc(text)}</div>
    <div class="btn-row" style="margin-top:12px">
      <button class="btn" onclick="copyServiceText()">📋 复制服务需求</button>
      <button class="btn secondary" onclick="window.location.href='${sp.phoneTel}'">📞 拨号</button>
    </div>
    <div class="supplier-brand">${esc(sp.brandText)}</div>
    ${equipLine}`;
  openSheet(html);
}
function copyServiceText() { copyText($('svcText').textContent, '已复制，快去分享吧'); }

/* ④ 实验模板推荐耗材 → 询价 */
function inquireTemplate(tplId) {
  const t = load(STORE.templates, []).find((x) => x.id === tplId);
  if (!t || !t.consumables) return;
  const items = t.consumables.map((c) => ({ name: c.name, spec: c.cat, qty: 1, unit: '份', reason: '模板「' + t.title + '」推荐', brandHint: c.brand }));
  openInquireSheet(items, '模板耗材询价 · ' + t.title, 'template');
}

/* ============================================================
   CoA 检验报告智能审查：拍照/上传 → 视觉 OCR + 翻译 + 抽取判定
   复用 Agnes 视觉模型（agnes-1.5-flash 支持图片输入），无需额外 OCR 库
   ============================================================ */
let coaImgData = '';           // 压缩后的图片 dataURL（图片来源）
let coaDocText = '';           // 从文件提取的文字（文档来源）
let coaMode = '';              // 'image' | 'text'
let coaSrcName = '';           // 来源文件名 / 描述
let coaResult = null;          // 最近一次审查结果 JSON
function openCoATool() {
  // 重置状态
  coaImgData = ''; coaDocText = ''; coaMode = ''; coaSrcName = ''; coaResult = null;
  let html = `<div class="grabber"></div><h2>CoA 智能审查</h2>
    <p class="hint">拍照、从相册选图，或选择文件（Excel / Word / PDF 转文字、图片 AI 识别），AI 自动识别、翻译（非中文才译）、抽取检验项并判定合格 / 超标(OOS)。面向 QC / 质量部 / 采购。</p>
    <div class="coa-inputs">
      <button class="coa-btn" onclick="document.getElementById('coaCam').click()"><span class="ico">📷</span><span>拍照</span></button>
      <button class="coa-btn" onclick="document.getElementById('coaAlb').click()"><span class="ico">🖼️</span><span>相册</span></button>
      <button class="coa-btn" onclick="document.getElementById('coaFile').click()"><span class="ico">📄</span><span>文件</span></button>
    </div>
    <input id="coaCam" type="file" accept="image/*" capture="environment" hidden onchange="onCoAInput(this)">
    <input id="coaAlb" type="file" accept="image/*" hidden onchange="onCoAInput(this)">
    <input id="coaFile" type="file" accept=".pdf,.doc,.docx,.xlsx,.xls,image/*" hidden onchange="onCoAInput(this)">
    <div id="coaSrcInfo" class="hint" style="margin-top:10px;display:none"></div>
    <img id="coaPrev" class="preview-img" style="display:none">
    <button class="btn" id="coaRunBtn" style="margin-top:10px" onclick="runCoAReview()">⚡ 智能审查</button>
    <div id="coaOut"></div>
    <p class="hint" style="margin-top:12px">提示：拍照时尽量正对报告、光线均匀、文字清晰，识别更准。文件类（Excel / Word / PDF）会先在本地提取文字再审查。结果仅供辅助，请以正式检验报告为准。</p>`;
  openSheet(html);
}
// 统一入口：相机/相册/文件三个 input 共用，按文件类型分流到图片或文档路径
async function onCoAInput(inp) {
  const f = inp.files && inp.files[0];
  if (inp.value) inp.value = '';          // 允许重复选择同一文件
  if (!f) return;
  const name = f.name || '';
  const isImg = (f.type && f.type.indexOf('image/') === 0) || /\.(png|jpe?g|gif|bmp|webp|heic|heif)$/i.test(name);
  const out = $('coaOut'); if (out) out.innerHTML = '';
  coaResult = null;
  if (isImg) {
    coaMode = 'image'; coaSrcName = name || '图片';
    coaDocText = '';
    const prev = $('coaPrev'); if (prev) prev.style.display = 'none';
    previewCoA(f);
  } else {
    coaMode = 'text'; coaSrcName = name;
    coaImgData = '';
    const prev = $('coaPrev'); if (prev) prev.style.display = 'none';
    await extractCoAText(f);
  }
}
function setCoASrcInfo(t) { const el = $('coaSrcInfo'); if (el) { el.style.display = 'block'; el.textContent = t; } }
// 图片：读入 → 等比压缩到最长边 1600px → 存 dataURL（减少上传体积、加快识别）
function previewCoA(file) {
  const rd = new FileReader();
  rd.onload = () => {
    const im = new Image();
    im.onload = () => {
      const max = 1600; let w = im.width, h = im.height;
      if (w > max || h > max) { if (w >= h) { h = Math.round(h * max / w); w = max; } else { w = Math.round(w * max / h); h = max; } }
      const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
      cv.getContext('2d').drawImage(im, 0, 0, w, h);
      coaImgData = cv.toDataURL('image/jpeg', 0.85);
      const p = $('coaPrev'); if (p) { p.src = coaImgData; p.style.display = 'block'; }
      setCoASrcInfo('已选择图片：' + (coaSrcName || '图片') + '（点击「智能审查」开始）');
    };
    im.src = rd.result;
  };
  rd.readAsDataURL(file);
}
// 文档：客户端提取文字（Excel/Word/PDF），再交给 AI 审查
async function extractCoAText(file) {
  const name = file.name || '';
  setCoASrcInfo('⏳ 正在提取文件文字：' + name + ' …');
  try {
    const ext = (name.split('.').pop() || '').toLowerCase();
    let text = '';
    if (ext === 'xlsx' || ext === 'xls') text = await extractXLSX(file);
    else if (ext === 'docx') text = await extractDOCX(file);
    else if (ext === 'pdf') text = await extractPDF(file);
    else if (ext === 'doc') throw new Error('.doc 旧格式暂不支持，请另存为 .docx 或 .pdf 后重试');
    else text = await file.text().catch(() => '');   // 兜底：尝试当作纯文本
    text = (text || '').trim();
    if (!text) throw new Error('未能从该文件提取到文字');
    coaDocText = text;
    setCoASrcInfo('✅ 已提取文字（' + text.length + ' 字）：' + name + '，点击「智能审查」开始。');
    toast('✅ 文件文字已提取', 2500);
  } catch (e) {
    coaMode = ''; coaDocText = '';
    setCoASrcInfo('⚠️ 提取失败：' + e.message);
    toast('⚠️ ' + e.message);
  }
}
// 懒加载脚本（同一 URL 只加载一次）
const _loadedScripts = {};
function loadScript(src) {
  if (_loadedScripts[src]) return _loadedScripts[src];
  _loadedScripts[src] = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src; s.async = true;
    s.onload = () => resolve(); s.onerror = () => reject(new Error('script load failed: ' + src));
    document.head.appendChild(s);
  });
  return _loadedScripts[src];
}
// Excel / Word：SheetJS 已内置（XLSX）；Word 用 mammoth；PDF 用 pdf.js（均按需懒加载）
async function extractXLSX(file) {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array' });
  let out = '';
  wb.SheetNames.forEach((sn) => { out += '【' + sn + '】\n' + XLSX.utils.sheet_to_csv(wb.Sheets[sn]) + '\n\n'; });
  return out;
}
async function extractDOCX(file) {
  await loadScript('https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.8.0/mammoth.browser.min.js');
  if (typeof mammoth === 'undefined') throw new Error('Word 解析库加载失败（请检查网络）');
  const buf = await file.arrayBuffer();
  const res = await mammoth.extractRawText({ arrayBuffer: buf });
  return res.value || '';
}
async function extractPDF(file) {
  await loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js');
  if (typeof pdfjsLib === 'undefined') throw new Error('PDF 解析库加载失败（请检查网络）');
  if (!pdfjsLib.GlobalWorkerOptions.workerSrc)
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  const buf = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
  let text = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const tc = await page.getTextContent();
    text += tc.items.map((it) => it.str).join(' ') + '\n';
  }
  return text;
}
async function runCoAReview() {
  if (!coaMode) { toast('请先拍照、选图或选择文件'); return; }
  if (coaMode === 'image' && !coaImgData) { toast('请先拍照或选择图片'); return; }
  if (coaMode === 'text' && !coaDocText) { toast('请先选择文件并等待文字提取完成'); return; }
  if (!agnesReady()) { toast('请先在「更多 → API 与密钥」配置 Agnes（留空即用内置默认）'); return; }
  const btn = $('coaRunBtn');
  if (btn) { btn.disabled = true; btn.textContent = 'AI 审查中…'; }
  const out = $('coaOut');
  // 全屏遮罩 + 旋转 SVG
  showScanLoading(true, 'AI 正在审查检验报告…');
  try {
    const c = agnesCreds();
    if (!c.key) throw new Error('no key');
    const base = 'https://apihub.agnes-ai.com';
    const isText = coaMode === 'text';
    const sys = `你是药企 QC / 质量部的 CoA（检验报告 Certificate of Analysis）审查助手。${isText
      ? '用户已提供从文件（Excel / Word / PDF）提取的 CoA 文字（可能含表格），请直接据此审查，无需 OCR。'
      : '用户提供一张检验报告图片。请先 OCR 识别图片中的所有文字（含表格中的检验项、结果、标准限度）。'}
1. ${isText ? '基于提供的文字' : '识别图片中的文字'}；若原文非中文，将「检验项名称」翻译为中文（name_cn），数值、单位、标准限度保持原样不翻译；若原文本就是中文，name_cn 与 name_raw 相同即可。
2. 抽取每个检验项，判定：结果在标准范围内=「合格」；超出标准=「OOS」；无标准或无法判定（如性状描述、缺少限度）=「待确认」。
3. 尽量提取报告抬头信息：产品/物料名称、批号、供应商、检验/报告日期（放入 meta，缺失则留空字符串）。
只输出 JSON（不要 markdown 代码块、不要多余解释），格式：
{"title":"报告标题","lang":"原文语言","meta":{"product":"产品/物料名","batch":"批号","supplier":"供应商","date":"日期"},"items":[{"name_cn":"中文项名","name_raw":"原文项名","result":"结果","spec":"标准限度","verdict":"合格|OOS|待确认"}],"summary":"一句话总体结论"}`;
    const userContent = isText
      ? [{ type: 'text', text: '以下是 CoA 文件提取的文字：\n\n' + coaDocText }]
      : [{ type: 'text', text: '请审查这张检验报告，按要求输出 JSON。' }, { type: 'image_url', image_url: { url: coaImgData } }];
    const ctrl = new AbortController(); const to = setTimeout(() => ctrl.abort(), 60000);
    const res = await fetch(base + '/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + c.key },
      signal: ctrl.signal,
      body: JSON.stringify({
        model: 'agnes-1.5-flash',
        messages: [
          { role: 'system', content: sys },
          { role: 'user', content: userContent }
        ],
        temperature: 0.1, max_tokens: 2000, stream: false
      })
    });
    clearTimeout(to);
    if (!res.ok) throw new Error('agnes ' + res.status);
    const j = await res.json();
    let content = (j && j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || '';
    content = stripFence(content);
    // 容错：截取第一个 { 到最后一个 }
    const s = content.indexOf('{'), e = content.lastIndexOf('}');
    if (s >= 0 && e > s) content = content.slice(s, e + 1);
    let data;
    try { data = JSON.parse(content); } catch (err) { throw new Error('parse'); }
    coaResult = data;
    renderCoAResult(data);
    showScanLoading(false);
    toast('✅ 审查完成', 3000); if (voiceOn) speak('检验报告审查完成');
  } catch (e) {
    showScanLoading(false);
    const msg = e.message === 'parse' ? '识别结果解析失败，请换更清晰的图片或文件重试' : (e.name === 'AbortError' ? '请求超时，请重试' : 'AI 服务异常，请稍后重试');
    if (out) out.innerHTML = `<div class="out" style="background:var(--red-soft)">${msg}</div>`;
    toast(msg);
  } finally {
    showScanLoading(false);
    if (btn) { btn.disabled = false; btn.textContent = '⚡ 智能审查'; }
  }
}
function renderCoAResult(d) {
  const out = $('coaOut'); if (!out) return;
  const items = Array.isArray(d.items) ? d.items : [];
  const tagCls = (v) => v === '合格' ? 'ok' : (v === 'OOS' ? 'bad' : 'warn');
  const oos = items.filter((x) => x.verdict === 'OOS').length;
  const pend = items.filter((x) => x.verdict === '待确认').length;
  const pass = items.filter((x) => x.verdict === '合格').length;
  const m = d.meta || {};
  let html = `<div class="report-meta" style="margin-top:14px">${esc(d.title || '检验报告')}${d.lang && d.lang !== '中文' && !/chinese/i.test(d.lang) ? ` · 原文 ${esc(d.lang)}（已译）` : ''}</div>`;
  // 抬头信息
  const metaBits = [];
  if (m.product) metaBits.push(`品名：${esc(m.product)}`);
  if (m.batch) metaBits.push(`批号：${esc(m.batch)}`);
  if (m.supplier) metaBits.push(`供应商：${esc(m.supplier)}`);
  if (m.date) metaBits.push(`日期：${esc(m.date)}`);
  if (metaBits.length) html += `<div class="hint" style="margin:-2px 0 8px">${metaBits.join(' · ')}</div>`;
  // 总览徽章
  html += `<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px">
    <span class="tag ok">合格 ${pass}</span>${oos ? `<span class="tag bad">OOS ${oos}</span>` : ''}${pend ? `<span class="tag warn">待确认 ${pend}</span>` : ''}</div>`;
  // 检验项列表
  if (!items.length) { html += `<div class="out">未能识别出检验项，请换更清晰的图片或从「工具箱」手动录入。</div>`; }
  else {
    html += `<div class="coa-items">`;
    items.forEach((it) => {
      const cn = esc(it.name_cn || it.name_raw || '检验项');
      const raw = it.name_raw && it.name_cn && it.name_raw !== it.name_cn ? `<span class="coa-raw">${esc(it.name_raw)}</span>` : '';
      html += `<div class="coa-item">
        <div class="coa-item-top"><div class="coa-name">${cn}${raw}</div><span class="tag ${tagCls(it.verdict)}">${esc(it.verdict || '待确认')}</span></div>
        <div class="coa-vals"><span class="coa-res">${esc(it.result || '—')}</span><span class="coa-spec">标准 ${esc(it.spec || '—')}</span></div>
      </div>`;
    });
    html += `</div>`;
  }
  if (d.summary) html += `<div class="out" style="margin-top:12px">${esc(d.summary)}</div>`;
  html += `<button class="btn secondary" style="margin-top:12px" onclick="copyCoA()">复制结果文本</button>`;
  out.innerHTML = html;
}
function copyCoA() {
  if (!coaResult) return;
  const d = coaResult, m = d.meta || {};
  let t = `【CoA 审查】${d.title || ''}\n`;
  const bits = [];
  if (m.product) bits.push('品名:' + m.product);
  if (m.batch) bits.push('批号:' + m.batch);
  if (m.supplier) bits.push('供应商:' + m.supplier);
  if (m.date) bits.push('日期:' + m.date);
  if (bits.length) t += bits.join(' · ') + '\n';
  t += '\n';
  (d.items || []).forEach((it) => { t += `${it.name_cn || it.name_raw}: ${it.result || '—'}（标准 ${it.spec || '—'}）→ ${it.verdict}\n`; });
  if (d.summary) t += '\n结论：' + d.summary;
  fallbackCopy(t); toast('已复制结果文本');
}

/* ============================================================
   计时器：跳手机原生 App（跨平台适配）
   ============================================================ */
let webTimerId = null, webTimerEnd = 0, _wakeLock = null, webTimerLabel = '';
function openTimerTool() {
  let html = `<div class="grabber"></div><h2>计时器</h2>
    <p class="hint">推荐用网页计时（到点闹铃+震动，不依赖 App）；也可尝试跳转手机时钟 App。</p>
    <div class="field"><label>时长（分钟）</label><input id="tMin" type="number" value="10" min="0.1" step="0.5"></div>
    <div class="field"><label>标签（可选）</label><input id="tLabel" placeholder="如：A 管 4000g 离心"></div>
    <div class="timer-presets">
      <div class="p" onclick="setTimerPreset(5)">5 分</div>
      <div class="p" onclick="setTimerPreset(10)">10 分</div>
      <div class="p" onclick="setTimerPreset(15)">15 分</div>
      <div class="p" onclick="setTimerPreset(30)">30 分</div>
      <div class="p" onclick="setTimerPreset(60)">60 分</div>
    </div>
    <button class="btn" onclick="startWebTimer()">▶ 用网页计时（推荐）</button>
    <button class="btn secondary" style="margin-top:10px" onclick="launchPhoneTimer()">📱 跳转手机时钟 App</button>
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
    toast('正在唤起手机时钟…');
    window.location.href = intent;
    setTimeout(() => { toast('若未跳转，手机可能未装谷歌时钟，请用上方网页计时'); }, 1600);
  } else if (isIOS) {
    iosCalendarTimer(sec, label);
    toast('iOS 无法直开时钟App，已生成日历提醒，点"添加"即可到点提醒');
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
    <p class="hint">选类别，输数值，点「换算」查看结果。</p>
    <div class="field"><label>类别</label><select id="uCat" onchange="switchUnitCat()">
      <option value="temp">温度</option>
      <option value="mass">质量</option>
      <option value="vol">体积</option>
      <option value="molar">摩尔质量（g↔mol）</option>
      <option value="conc">浓度（mol/L↔g/L）</option>
    </select></div>
    <div id="uFields"></div>
    <button class="btn" style="margin-top:8px" onclick="convUnit()">换算</button>
    <div id="uOut"></div>`;
  openSheet(html);
  switchUnitCat();
}
const UNIT_DEFS = {
  temp: { units: ['C', 'K', 'F'], toBase: { C: (v) => v, K: (v) => v - 273.15, F: (v) => (v - 32) * 5 / 9 }, fromBase: { C: (v) => v, K: (v) => v + 273.15, F: (v) => v * 9 / 5 + 32 }, label: { C: '℃', K: 'K', F: '℉' } },
  mass: { units: ['g', 'mg', 'ug'], toBase: { g: (v) => v, mg: (v) => v / 1000, ug: (v) => v / 1e6 }, fromBase: { g: (v) => v, mg: (v) => v * 1000, ug: (v) => v * 1e6 }, label: { g: 'g', mg: 'mg', ug: 'μg' } },
  vol: { units: ['L', 'mL', 'uL'], toBase: { L: (v) => v, mL: (v) => v / 1000, uL: (v) => v / 1e6 }, fromBase: { L: (v) => v, mL: (v) => v * 1000, uL: (v) => v * 1e6 }, label: { L: 'L', mL: 'mL', uL: 'μL' } }
};
function switchUnitCat() {
  const cat = $('uCat').value;
  const f = $('uFields'); if (!f) return;
  if (cat === 'molar') {
    f.innerHTML = `<div class="field"><label>数值</label><input id="uVal" type="number" value="1"></div>
      <div class="field"><label>分子量（g/mol）</label><input id="uMw" type="number" value="180.16" placeholder="如葡萄糖 180.16"></div>
      <div class="field"><label>方向</label><select id="uDir"><option value="g2mol">克 g → 摩尔 mol</option><option value="mol2g">摩尔 mol → 克 g</option></select></div>`;
  } else if (cat === 'conc') {
    f.innerHTML = `<div class="field"><label>数值</label><input id="uVal" type="number" value="1"></div>
      <div class="field"><label>分子量（g/mol）</label><input id="uMw" type="number" value="180.16" placeholder="如葡萄糖 180.16"></div>
      <div class="field"><label>方向</label><select id="uDir"><option value="g2m">g/L → mol/L (M)</option><option value="m2g">mol/L (M) → g/L</option></select></div>`;
  } else {
    const def = UNIT_DEFS[cat];
    f.innerHTML = `<div class="field"><label>数值</label><input id="uVal" type="number" value="${cat === 'temp' ? 37 : 1}"></div>
      <div class="field"><label>单位</label><select id="uFrom">${def.units.map((u) => `<option value="${u}">${def.label[u]}</option>`).join('')}</select></div>`;
  }
  const o = $('uOut'); if (o) o.innerHTML = '';
}
function uFmt(n) { if (!isFinite(n)) return '—'; if (n !== 0 && (Math.abs(n) >= 1e6 || Math.abs(n) < 1e-4)) return n.toExponential(3); return n.toLocaleString(undefined, { maximumFractionDigits: 6 }); }
function convUnit() {
  const cat = $('uCat').value;
  const v = parseFloat($('uVal').value);
  if (isNaN(v)) { $('uOut').innerHTML = '<div class="help">请输入数值。</div>'; return; }
  if (cat === 'molar' || cat === 'conc') {
    const mw = parseFloat($('uMw').value);
    const dir = $('uDir').value;
    if (!mw || mw <= 0) { $('uOut').innerHTML = '<div class="help">请输入有效的分子量（g/mol）。</div>'; return; }
    if (cat === 'molar') {
      const mol = dir === 'g2mol' ? v / mw : v, g = dir === 'g2mol' ? v : v * mw;
      $('uOut').innerHTML = `<div class="out"><div class="line"><span>摩尔量</span><b>${uFmt(mol)} mol</b></div><div class="line"><span>质量</span><b>${uFmt(g)} g</b></div><div class="line"><span>分子量</span><b>${mw} g/mol</b></div></div>`;
    } else {
      const molL = dir === 'g2m' ? v / mw : v, gL = dir === 'g2m' ? v : v * mw;
      $('uOut').innerHTML = `<div class="out"><div class="line"><span>摩尔浓度</span><b>${uFmt(molL)} mol/L (M)</b></div><div class="line"><span>质量浓度</span><b>${uFmt(gL)} g/L</b></div><div class="line"><span>分子量</span><b>${mw} g/mol</b></div></div>`;
    }
    return;
  }
  const def = UNIT_DEFS[cat];
  const from = $('uFrom').value;
  const base = def.toBase[from](v);
  let h = '<div class="out">';
  def.units.forEach((u) => { h += `<div class="line"><span>${def.label[u]}</span><b>${uFmt(def.fromBase[u](base))}</b></div>`; });
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
  let html = `<div class="grabber"></div>
    <div class="sheet-head"><h2>实验模板</h2></div>
    <p class="hint">用常用 protocol 一键新建记录；也可在新建记录时点“存为模板”。</p>`;
  if (!tpls.length) html += emptyState('还没有模板', '点右下角“＋”新建模板');
  else {
    const order = ['细胞培养', '细胞功能', '细胞转染', '免疫荧光', '蛋白', '分子', 'PCR', '病理组织', '其他'];
    const groups = {};
    tpls.forEach((t) => { const k = t.type || '其他'; (groups[k] = groups[k] || []).push(t); });
    order.concat(Object.keys(groups).filter((k) => !order.includes(k))).forEach((type) => {
      const list = groups[type]; if (!list || !list.length) return;
      html += `<div class="tpl-group-title">${esc(type)}</div>`;
      list.forEach((t) => {
        html += `<div class="list-row" onclick="useTemplate('${t.id}')"><div class="lr-ico">📋</div>
          <div class="lr-main"><div class="lr-title">${esc(t.title)}</div><div class="lr-sub">${esc(t.raw.slice(0, 26))}…</div></div><div class="lr-right">用 ›</div></div>`;
      });
    });
  }
  html += `<div class="sheet-fab-wrap"><button class="sheet-fab" onclick="newTemplate()" title="新建模板">＋</button></div>`;
  openSheet(html);
}
function extractTokens(raw) {
  const m = [...new Set((raw.match(/\{\{([^}]+)\}\}/g) || []).map((s) => s.slice(2, -2).trim()))];
  return m;
}
function applyTokens(raw, map) {
  return raw.replace(/\{\{([^}]+)\}\}/g, (_, k) => (map[k.trim()] || '{{' + k.trim() + '}}'));
}
function shiftTimes(raw, newStart) {
  if (!newStart || !/^\d{1,2}:\d{2}$/.test(newStart)) return raw;
  const times = [...raw.matchAll(/(\d{1,2}):(\d{2})/g)].map((m) => ({ h: +m[1], m: +m[2], i: m.index, len: m[0].length }));
  if (!times.length) return raw;
  const base = times[0].h * 60 + times[0].m;
  const [nh, nm] = newStart.split(':').map(Number);
  const delta = (nh * 60 + nm) - base;
  let s = raw;
  [...times].sort((a, b) => b.i - a.i).forEach((t) => {
    let tot = t.h * 60 + t.m + delta; tot = ((tot % 1440) + 1440) % 1440;
    const hh = String(Math.floor(tot / 60)).padStart(2, '0');
    const mm = String(tot % 60).padStart(2, '0');
    s = s.slice(0, t.i) + hh + ':' + mm + s.slice(t.i + t.len);
  });
  return s;
}
function useTemplate(id) {
  const t = load(STORE.templates, []).find((x) => x.id === id);
  if (!t) return;
  const toks = extractTokens(t.raw);
  let html = `<div class="grabber"></div>
    <div class="sheet-head"><button class="back-btn" onclick="openTemplates()">← 返回模板</button><h2>套用模板：${esc(t.title)}</h2></div>
    <p class="hint">填入变量，生成带时间线的实验记录。</p>`;
  if (t.preset) html += `<p class="warn-preset">⚠ 此为常规实验模板，步骤来源于公开 protocol，请自行确认后使用。</p>`;
  const prefill = { '样本名': agnesSample, '批号': agnesLot };
  toks.forEach((tk, i) => { const v = prefill[tk] || ''; html += `<div class="field"><label>${esc(tk)}</label><input id="tv_${i}" value="${esc(v)}" placeholder="填入${esc(tk)}"${v ? ' data-auto="1"' : ''}></div>`; });
  html += `<div class="field"><label>标题</label><input id="tfTitle" value="${esc(t.title)}"></div>`;
  html += `<div class="field"><label>记录人</label><input id="tfOp" value="实验员"></div>`;
  if (/\d{1,2}:\d{2}/.test(t.raw)) html += `<div class="field"><label>起始时间（可选；把模板里的 HH:MM 时间点整体平移到你开始做的时刻）</label><input id="tfStart" type="time"></div>`;
  html += `<div id="tfPreview" class="step" style="margin-top:6px;max-height:320px;overflow-y:auto"></div>`;
  if (t.consumables && t.consumables.length) {
    html += `<div class="tpl-consumables"><div class="tpl-ctitle">本实验推荐耗材 <span class="tpl-csub">（可一键询价）</span></div>`;
    t.consumables.forEach((c) => {
      html += `<div class="tpl-crow"><span class="tpl-cname">${esc(c.name)}</span><span class="tpl-cbrand">${esc(c.brand)}</span><span class="tpl-ccat">${esc(c.cat)}</span></div>`;
    });
    html += `<button class="btn secondary tpl-cbtn" onclick="inquireTemplate('${t.id}')">📤 一键询价这些耗材</button></div>`;
  }
  html += `<div class="btn-row" style="margin-top:12px">
    <button class="btn ghost" onclick="closeSheet()">取消</button>
    <button class="btn" onclick="generateFromTemplate('${id}')">生成记录</button></div>`;
  openSheet(html);
  const upd = () => {
    const map = {}; toks.forEach((tk, i) => { map[tk] = $('tv_' + i) ? $('tv_' + i).value : ''; });
    let inst = applyTokens(t.raw, map); inst = shiftTimes(inst, $('tfStart') ? $('tfStart').value : '');
    const st = structure(inst);
    const box = $('tfPreview');
    if (box) box.innerHTML = '<div class="section-title">预览（时间线）</div>' + (st.length
      ? st.map((s) => `<div class="tl-item"><b>${esc(s.time || '')}</b> ${esc(s.action || '')} ${esc(s.material || '')}${s.amount ? ' ' + esc(s.amount) + esc(s.unit || '') : ''}${s.param ? ' · ' + esc(s.param) : ''}</div>`).join('')
      : '<div class="meta">暂无步骤</div>');
  };
  toks.forEach((tk, i) => { const el = $('tv_' + i); if (el) el.addEventListener('input', upd); });
  const st0 = $('tfStart'); if (st0) st0.addEventListener('input', upd);
  upd();
}
function generateFromTemplate(id) {
  const t = load(STORE.templates, []).find((x) => x.id === id);
  if (!t) return;
  const toks = extractTokens(t.raw);
  const map = {}; toks.forEach((tk, i) => { map[tk] = $('tv_' + i) ? $('tv_' + i).value.trim() : ''; });
  let inst = applyTokens(t.raw, map); inst = shiftTimes(inst, $('tfStart') ? $('tfStart').value : '');
  closeSheet();
  openExpSheet(null);
  expOrigin = 'template'; /* 标记来源：返回时回到模板列表 */
  const ta = $('expRaw'); if (ta) ta.value = inst;
  const ti = $('expTitle'); if (ti) ti.value = ($('tfTitle') ? $('tfTitle').value.trim() : '') || t.title;
  const op = $('expOp'); if (op) op.value = ($('tfOp') ? $('tfOp').value.trim() : '') || '实验员';
  currentSteps = structure(inst); renderSteps();
  toast('已生成记录，可继续编辑');
}
function newTemplate() {
  const types = ['细胞培养', '细胞功能', '细胞转染', '免疫荧光', '蛋白', '分子', 'PCR', '病理组织', '其他'];
  const opts = types.map((t) => `<option value="${t}">${t}</option>`).join('');
  let html = `<div class="grabber"></div>
    <div class="sheet-head"><button class="back-btn" onclick="openTemplates()">← 返回</button><h2>新建模板</h2></div>
    <div class="field"><label>模板名称</label><input id="ntTitle" placeholder="如：每周外泌体纯化"></div>
    <div class="field"><label>实验分类</label><select id="ntType">${opts}</select></div>
    <div class="field"><label>步骤文本</label><textarea id="ntRaw" placeholder="如：8:00 取 {{样本名}}；8:30 加入 100μL 缓冲液；10:00 离心 4000g 10min" style="min-height:96px"></textarea></div>
    <p class="hint">写法：时间用 <b>HH:MM</b>（如 8:00）；变量用 <b>{{样本名}}</b> / <b>{{批号}}</b>（套用时自动提示填写）；多步用 <b>；</b> 分隔。留出变量便于复用。</p>
    <div class="tpl-consumables">
      <div class="tpl-ctitle">推荐耗材 <span class="tpl-csub">（套用后可一键询价）</span></div>
      <div id="ntConsumables"></div>
      <button class="btn secondary tpl-cbtn" type="button" onclick="addTplConsumableRow()">＋ 添加耗材</button>
    </div>
    <div id="ntPreview" class="step" style="margin-top:8px"></div>
    <div class="btn-row" style="margin-top:12px">
      <button class="btn ghost" onclick="openTemplates()">取消</button>
      <button class="btn" onclick="saveNewTemplate()">保存模板</button>
    </div>`;
  openSheet(html);
  const raw = $('ntRaw'); if (raw) raw.addEventListener('input', updateNewTplPreview);
  updateNewTplPreview();
}
function addTplConsumableRow(name, brand, cat) {
  const box = $('ntConsumables'); if (!box) return;
  const row = document.createElement('div');
  row.className = 'tpl-crow-edit';
  row.innerHTML = `<input class="ci" placeholder="名称" value="${esc(name || '')}">
    <input class="ci" placeholder="品牌" value="${esc(brand || '')}">
    <input class="ci" placeholder="货号" value="${esc(cat || '')}">
    <button class="ci-del" type="button" onclick="this.parentNode.remove()">✕</button>`;
  box.appendChild(row);
}
function updateNewTplPreview() {
  const el = $('ntRaw'); const box = $('ntPreview');
  if (!el || !box) return;
  const st = structure(el.value);
  box.innerHTML = '<div class="section-title">预览（步骤解析）</div>' + (st.length
    ? st.map((s) => `<div class="tl-item"><b>${esc(s.time || '')}</b> ${esc(s.action || '')} ${esc(s.material || '')}${s.amount ? ' ' + esc(s.amount) + esc(s.unit || '') : ''}${s.param ? ' · ' + esc(s.param) : ''}</div>`).join('')
    : '<div class="meta">暂无步骤</div>');
}
function saveNewTemplate() {
  const title = ($('ntTitle').value || '').trim();
  const raw = ($('ntRaw').value || '').trim();
  if (!title || !raw) { toast('请填全名称和步骤'); return; }
  const type = ($('ntType') ? $('ntType').value : '其他') || '其他';
  const consumables = [];
  document.querySelectorAll('#ntConsumables .tpl-crow-edit').forEach((r) => {
    const ins = r.querySelectorAll('input');
    const name = (ins[0].value || '').trim();
    if (!name) return;
    consumables.push({ name, brand: (ins[1].value || '').trim(), cat: (ins[2].value || '').trim() });
  });
  const tpls = load(STORE.templates, []);
  tpls.push({ id: uid('tp'), title, raw, type, consumables });
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
      const needSvc = d <= 30;
      const itJson = JSON.stringify(it).replace(/"/g, '&quot;');
      const svcBtn = needSvc ? `<button class="inquire-mini" onclick="event.stopPropagation();contactService(${itJson})" title="联系服务商（康腾）">联系服务商</button>` : '';
      html += `<div class="list-row" onclick="editInstrument('${it.id}')"><div class="lr-ico ${cls}">⚙️</div>
        <div class="lr-main"><div class="lr-title">${esc(it.name)}</div><div class="lr-sub">${it.note || ''} · 校准 ${esc(it.calibration)}</div></div>
        <div class="lr-right" style="display:flex;gap:6px;align-items:center">${svcBtn}<span style="color:${d <= 30 ? 'var(--orange)' : 'var(--muted)'}">${tag}</span></div></div>`;
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
    <p class="hint">选择时间范围即自动汇总；可点「AI 优化」润色后复制。</p>
    <div class="field"><label>统计范围</label><select id="wrRange" onchange="genWeekly()">
      <option value="week">本周（周一至今）</option>
      <option value="7">最近 7 天</option>
      <option value="30">最近 30 天</option>
      <option value="all">全部</option>
    </select></div>
    <button class="btn gradient" id="aiOptWeekly" style="margin-top:6px" onclick="aiOptimizeWeekly()">🤖 AI 优化</button>
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
  let html = `<div class="report-meta">${meta}</div>\n<div class="report-box">${esc(text)}</div>\n<div class="weekly-actions" style="display:flex;gap:10px;margin-top:12px">`;
  html += `<button class="btn secondary" id="weeklyCopyBtn" onclick="copyWeekly()">📋 复制文本</button></div>`;
  const box = $('wrOut'); if (box) box.innerHTML = html;
}
function revertWeekly() {
  weeklyText = weeklyRaw;
  const wrOut = $('wrOut');
  if (wrOut) {
    const meta = wrOut.querySelector('.report-meta');
    const box = wrOut.querySelector('.report-box');
    if (meta) meta.textContent = '原文';
    if (box) box.textContent = esc(weeklyRaw);
  }
}
function stripFence(s) { s = (s || '').trim(); const m = s.match(/^```(?:markdown|md|text)?\s*([\s\S]*?)\s*```$/i); return m ? m[1].trim() : s; }
async function aiOptimizeWeekly() {
  if (!weeklyRaw) { toast('请先生成周报'); return; }
  if (!agnesReady()) { toast('请先在「设置 → API 与密钥」配置 Agnes（留空即用内置默认）'); return; }
  const btn = $('aiOptWeekly');
  if (btn) { btn.disabled = true; btn.textContent = '🤖 AI 优化中…'; }
  // 呼吸效果：渐变蓝 → 白色半透明 → 渐变蓝，来回脉动
  const HALF_CYCLE = 3500; // 单程 3.5s（一呼一吸共 7s）
  let breathTimer = null, breathDone = false;
  const startTs = Date.now();
  const pulseStep = () => {
    const elapsed = Date.now() - startTs;
    if (breathDone || !btn) return;
    // t: 0→1→0 三角波
    const cycleTime = elapsed % (HALF_CYCLE * 2);
    const t = cycleTime < HALF_CYCLE ? cycleTime / HALF_CYCLE : 1 - (cycleTime - HALF_CYCLE) / HALF_CYCLE;
    // 背景：渐变蓝 → 白色半透明 → 渐变蓝
    const br = Math.round(94 + (255 - 94) * t);
    const bg = Math.round(87 + (255 - 87) * t);
    const bb = Math.round(254 + (255 - 254) * t);
    const ba = 1 + (0.6 - 1) * t;
    btn.style.background = `rgba(${br},${bg},${bb},${ba.toFixed(3)})`;
    // 文字：白 → ink → 白
    const cr = Math.round(255 + (26 - 255) * t);
    const cg = Math.round(255 + (26 - 255) * t);
    const cb = Math.round(255 + (46 - 255) * t);
    btn.style.color = `rgb(${cr},${cg},${cb})`;
    // boxShadow：蓝色阴影 → 玻璃内高光 → 蓝色阴影
    btn.style.boxShadow = `0 ${(10 - 9 * t).toFixed(0)}px ${(24 - 18 * t).toFixed(0)}px rgba(94,87,254,${(0.34 * (1 - t)).toFixed(3)}), 0 1px 0 rgba(255,255,255,${(0.35 + 0.25 * t).toFixed(3)}) inset`;
    // border：无 → 1px → 无
    btn.style.border = t < 0.5 ? `${(t * 2).toFixed(2)}px solid rgba(255,255,255,${(0.6 * t * 2).toFixed(3)})` : `${(1 - (t - 0.5) * 2).toFixed(2)}px solid rgba(255,255,255,${(0.6 * (1 - (t - 0.5) * 2)).toFixed(3)})`;
    breathTimer = requestAnimationFrame(pulseStep);
  };
  breathTimer = requestAnimationFrame(pulseStep);
  const restoreBtnStyle = () => {
    // 先阻断下一帧 pulseStep 执行，再清内联样式
    breathDone = true;
    if (breathTimer) { cancelAnimationFrame(breathTimer); breathTimer = null; }
    if (btn) {
      btn.style.background = '';
      btn.style.color = '';
      btn.style.boxShadow = '';
      btn.style.border = '';
    }
  };
  // 不重新渲染卡片，只更新 meta 状态，保留原文占位高度
  const wrOut = $('wrOut');
  const existingMeta = wrOut ? wrOut.querySelector('.report-meta') : null;
  const outBox = wrOut ? wrOut.querySelector('.report-box') : null;
  if (existingMeta) existingMeta.textContent = 'AI 正在优化…';
  // 锁定 report-box 当前高度防止塌缩，然后清空内容
  if (outBox) {
    outBox.style.minHeight = outBox.offsetHeight + 'px';
    outBox.textContent = '';
  }
  try {
    const c = agnesCreds();
    if (!c.key) throw new Error('no key');
    const base = 'https://apihub.agnes-ai.com';
    const headers = { 'Content-Type': 'application/json' };
    headers['Authorization'] = 'Bearer ' + c.key;
    const sys = `你是资深科研工作者的周报 / 组会汇报润色助手。下面是一份由实验记录自动汇总出的周报草稿（偏流水账、条目化，可能带口语或语音转写痕迹）。请将其优化为一份可直接用于周报或组会汇报的素材，要求：\n\n1. 去除 AI 味：禁用「首先/其次/总之」「值得一提的是」「综上所述」「赋能」「抓手」「闭环」「进一步」等套话与空话；不堆砌形容词；用科研一线人员自然、克制的口吻写作。\n2. 工作详实：在草稿事实基础上合理补全技术细节与逻辑（如实验目的、关键参数、结果现象、异常及处理），但不要编造不存在的数据；保留批号、用量、条件等关键信息；按「做了什么—怎么做的—看到什么」组织。\n3. 结构化但不死板：可保留日期/项目分组；每部分用简短小标题或要点；重点工作适当展开，常规工作合并简述。\n4. 心得与收获：文末增加「本周心得 / 收获」小节，结合本周工作提炼 2–4 条真实、具体的体会（如方法改进、踩过的坑、对现象的新理解、下一步想法），避免空泛口号。\n5. 可选：基于本周进展给出 1–3 条具体、可执行的「下周计划」。\n\n重要：只输出纯文本，不要使用任何 Markdown 标记符号（不要用 # 号标题、星号加粗、减号列表、反引号 等），也不要用代码块包裹。用自然段落、空行分隔，以及 1. 2. 3. 这样的纯数字编号即可。不要解释你的修改，若草稿无可整理内容请直接说明。`;
    const ctrl = new AbortController(); const to = setTimeout(() => ctrl.abort(), 60000);
    const res = await fetch(base + '/v1/chat/completions', {
      method: 'POST',
      headers: headers,
      signal: ctrl.signal,
      body: JSON.stringify({ model: 'agnes-1.5-flash', messages: [{ role: 'system', content: sys }, { role: 'user', content: weeklyRaw }], temperature: 0.5, max_tokens: 4000, stream: true })
    });
    clearTimeout(to);
    if (!res.ok) throw new Error('agnes ' + res.status);
    // 流式读取 SSE，逐 chunk 追加到文本框
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = '', fullContent = '';
    const doUpdate = () => { if (outBox) outBox.textContent = esc(fullContent); };
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split('\n');
      buf = lines.pop() || '';
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('data:') && trimmed !== 'data: [DONE]') {
          const jsonStr = trimmed.slice(5).trim();
          if (!jsonStr) continue;
          try {
            const chunk = JSON.parse(jsonStr);
            const delta = chunk.choices && chunk.choices[0] && chunk.choices[0].delta && chunk.choices[0].delta.content;
            if (delta) { fullContent += delta; doUpdate(); }
          } catch (e) { /* 个别行解析失败则忽略 */ }
        }
      }
    }
    // 消费剩余 buf
    if (buf.trim().startsWith('data:')) {
      const trimmed = buf.trim();
      if (trimmed.startsWith('data:') && trimmed !== 'data: [DONE]') {
        const jsonStr = trimmed.slice(5).trim();
        if (jsonStr) {
          try {
            const chunk = JSON.parse(jsonStr);
            const delta = chunk.choices && chunk.choices[0] && chunk.choices[0].delta && chunk.choices[0].delta.content;
            if (delta) { fullContent += delta; doUpdate(); }
          } catch (e) {}
        }
      }
    }
    fullContent = stripFence(fullContent);
    if (!fullContent) throw new Error('empty');
    weeklyText = fullContent;
    if (outBox) { outBox.style.minHeight = ''; outBox.textContent = esc(fullContent); }
    if (existingMeta) existingMeta.textContent = 'AI 已优化';
    // 追加「查看原文」按钮到左侧，复制文本按钮渐变为蓝色
    const wrActions = wrOut && wrOut.querySelector('.weekly-actions');
    if (wrActions) {
      // 左侧追加查看原文
      if (!wrActions.querySelector('.weekly-revert')) {
        const rvBtn = document.createElement('button');
        rvBtn.className = 'btn ghost weekly-revert';
        rvBtn.style.cssText = 'font-size:16px;font-weight:600';
        rvBtn.textContent = '📄 查看原文';
        rvBtn.onclick = revertWeekly;
        wrActions.insertBefore(rvBtn, wrActions.firstChild);
      }
      // 复制文本按钮变为渐变蓝（切换类，保留边缘高光）
      const cpBtn = wrActions.querySelector('#weeklyCopyBtn');
      if (cpBtn) {
        cpBtn.className = 'btn gradient';
      }
    }
    toast('✅ AI 已优化周报', 3500); if (voiceOn) speak('AI 已优化');
  } catch (e) {
    const msg = (e && e.name === 'AbortError') ? 'AI 服务无响应（超时，模型较慢或网络不佳）' : ('AI 优化失败：' + (e.message || e));
    // 如果流式至少输出了一些内容，保留它
    if (fullContent) {
      weeklyText = fullContent;
      if (outBox) { outBox.style.minHeight = ''; outBox.textContent = esc(fullContent); }
      if (existingMeta) existingMeta.textContent = 'AI 已优化（部分完成）';
        // 同样追加查看原文 + 渐变复制按钮
        const wrActions = wrOut && wrOut.querySelector('.weekly-actions');
        if (wrActions) {
          if (!wrActions.querySelector('.weekly-revert')) {
            const rvBtn = document.createElement('button');
            rvBtn.className = 'btn ghost weekly-revert';
            rvBtn.style.cssText = 'font-size:16px;font-weight:600';
            rvBtn.textContent = '📄 查看原文';
            rvBtn.onclick = revertWeekly;
            wrActions.insertBefore(rvBtn, wrActions.firstChild);
          }
          const cpBtn = wrActions.querySelector('#weeklyCopyBtn');
          if (cpBtn) {
            cpBtn.className = 'btn gradient';
          }
        }
    }
    toast('❌ ' + msg + '，请重试或在「设置」重测连通', 4500);
    console.warn('[Agnes] 周报优化失败：', e);
  } finally {
    restoreBtnStyle();
    if (btn) { btn.disabled = false; btn.textContent = '🤖 AI 优化'; }
    if (outBox && outBox.style.minHeight) outBox.style.minHeight = '';
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
    <p class="hint">危险操作前逐项确认，完成后「完成并保存」会记录时间并存入实验记录，便于留痕。</p>
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
  const operator = ($('scOp').value || '').trim();
  const ts = nowISO();
  const dt = ts.slice(0, 16).replace('T', ' ');
  // 持久化 checklist 状态（含时间）
  save(STORE.safety, { checks, operator, date: ts });
  // 汇总已确认 / 未完成项
  const done = [], undone = [];
  SAFETY_ITEMS.forEach((g) => g.items.forEach((it) => { (checks[it.id] ? done : undone).push(it.text); }));
  let raw = `操作人：${operator || '—'}\n时间：${dt}\n\n已确认（${done.length} 项）：\n` + (done.map((t) => '✓ ' + t).join('\n') || '（无）');
  if (undone.length) raw += `\n\n未完成（${undone.length} 项）：\n` + undone.map((t) => '· ' + t).join('\n');
  // 同步生成一条实验记录，便于留痕与追溯
  const exps = load(STORE.exp, []);
  exps.unshift({ id: uid('e'), title: '安全 Checklist 确认', raw, operator: operator || '实验员', tags: ['安全', 'Checklist'], createdAt: ts, steps: done.map((t) => '✓ ' + t) });
  save(STORE.exp, exps);
  closeSheet(); renderAll();
  toast('已保存安全确认（含时间）到实验记录');
}

/* ============================================================
   Agnes AI 智能整理（语音/文本 → 结构化字段）
   ============================================================ */
async function callAgnesParse(raw) {
  const c = agnesCreds();
  if (!c.key) throw new Error('no key');
  const base = 'https://apihub.agnes-ai.com';
  const headers = { 'Content-Type': 'application/json' };
  headers['Authorization'] = 'Bearer ' + c.key;
  const sys = `你是实验室电子记录本（ELN）的资深实验记录整理助手。用户会给你一段「原始实验记录」（可能口语化、零散、含语音转写误差）。请按以下要求处理：

1. 先整体理解本次实验的目的与流程；
2. 将记录整理为条理清晰、可复现的实验步骤序列：按时间或逻辑顺序排列；**尽量保留原始记录的每一步关键操作、用量、条件与参数（浓度、体积、温度、时间、转速等），不要省略重要步骤，也不要丢掉关键数值**；仅在动作与对象完全重复时才合并为一步；不要凭空编造记录中未提及的信息；宁可多分几步，也不要把关键操作合并掉；
3. 识别本次实验的「代表性样本名」与「批号/货号」——它们正是实验模板里常用留空占位符 {{样本名}}、{{批号}} 所指的信息。若整条记录围绕同一样本/批号，请填到顶层 sample / lot 字段；若各步骤样本或批号不同，则只在对应 step 内的 material / lot 填写，顶层留空字符串；
4. 把能识别的信息分别填入下方 JSON 的对应字段。

只输出 JSON（不要解释、不要 Markdown 代码块），结构如下：
{
  "title": "一句话准确概括本次实验，如「外泌体超滤浓缩」",
  "operator": "记录人姓名；原始记录未提及则填空字符串",
  "sample": "本次实验的代表性样本名，对应模板留空 {{样本名}}，如「外泌体样本」「菌液 pET28a」；若各步样本不同则留空字符串",
  "lot": "本次实验的代表性批号/货号，对应模板留空 {{批号}}，如 EV-2607；若各步批号不同则留空字符串",
  "steps": [
    {
      "time": "步骤发生时刻，形如 HH:MM；无则空",
      "action": "本步核心动作，规范为动词，如：取/加入/加/离心/上样/收集/孵育/过滤/浓缩/稀释/重悬/转移/平衡/洗脱/检测/配制/涡旋/混匀；可留空",
      "material": "操作对象或物料，如「外泌体样本」「超滤管」「PBS」；无则空",
      "lot": "本步批号/货号，如 EV-2607；无则空",
      "amount": "用量数值，如 2 / 4000 / 10；无则空",
      "unit": "单位，须与 amount 配对，如 mL / g / L / μL / 支 / 个 / 孔 / min / ℃ / rpm / ×g；无则空",
      "param": "关键条件参数，如「4000×g 离心 10 min」「37℃ 孵育 30 min」「0.22 μm 过滤」；无则空"
    }
  ]
}

注意：amount 与 unit 必须成对出现；离心力统一用 ×g、转速用 rpm、温度用 ℃、时间用 min；同一物料多次使用应分别成步；只输出 JSON。`;
  const ctrl = new AbortController(); const to = setTimeout(() => ctrl.abort(), 60000);
  const res = await fetch(base + '/v1/chat/completions', {
    method: 'POST',
    headers: headers,
    signal: ctrl.signal,
    body: JSON.stringify({ model: 'agnes-1.5-flash', messages: [{ role: 'system', content: sys }, { role: 'user', content: raw }], temperature: 0.2, max_tokens: 4000, stream: false })
  });
  clearTimeout(to);
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
  // 顶层 sample / lot：对应模板留空 {{样本名}} / {{批号}}，回填到输入框并缓存，便于套用模板时自动带入
  if (data.sample != null) { const sm = $('expSample'); if (sm) sm.value = data.sample; if (data.sample) agnesSample = data.sample; }
  if (data.lot != null) { const lt = $('expLot'); if (lt) lt.value = data.lot; if (data.lot) agnesLot = data.lot; }
  if (Array.isArray(data.steps) && data.steps.length) {
    currentSteps = data.steps.map(normalizeStep).filter((s) => s.time || s.action || s.material || s.lot || s.amount || s.param);
    renderSteps();
  }
}
async function aiStructure() {
  const raw = $('expRaw') ? $('expRaw').value.trim() : '';
  if (!raw) { toast('请先记录或输入内容'); return; }
  if (!agnesReady()) { toast('请先在「设置 → API 与密钥」配置 Agnes（留空即用内置默认）'); return; }
  const aiBtn = $('aiBtn'); const oldTxt = aiBtn ? aiBtn.textContent : '';
  if (aiBtn) { aiBtn.disabled = true; aiBtn.textContent = 'AI 整理中…'; }
  // 显示全屏 loading
  const origText = document.getElementById('_scanLoadingText');
  if (origText) origText.textContent = 'AI 正在整理…';
  showScanLoading(true);
  try {
    const data = await callAgnesParse(raw);
    if (data && (data.title || (Array.isArray(data.steps) && data.steps.length))) {
      applyAgnesResult(data);
      const n = Array.isArray(data.steps) ? data.steps.length : 0;
      toast('✅ AI 已整理' + (n ? '（' + n + ' 个步骤）' : ''), 3500); if (voiceOn) speak('AI 已整理');
    } else {
      currentSteps = structure(raw); renderSteps();
      toast('⚠️ AI 未返回有效结构，已用本地整理', 3500);
    }
  } catch (e) {
    currentSteps = structure(raw); renderSteps();
    const msg = (e && e.name === 'AbortError') ? 'AI 服务无响应（超时，模型较慢或网络不佳）' : ('AI 整理失败：' + (e.message || e));
    toast('❌ ' + msg + '，已用本地整理', 4500);
    console.warn('[Agnes] 整理失败：', e);
  } finally {
    showScanLoading(false);
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

/* ---------------- 临期通知（PWA Notification） ---------------- */
function notifySupported() { return ('Notification' in window) && ('serviceWorker' in navigator); }
function enableExpNotify() {
  if (!notifySupported()) { toast('当前浏览器不支持通知'); return; }
  if (Notification.permission === 'granted') { setNotify(true); return; }
  if (Notification.permission === 'denied') { toast('通知权限已被拒绝，请在浏览器设置中开启'); return; }
  Notification.requestPermission().then((p) => {
    if (p === 'granted') setNotify(true);
    else toast('未授权通知，无法开启临期提醒');
  });
}
function setNotify(on) {
  const s = getSettings(); s.notifyExp = on; setSettings(s);
  toast(on ? '已开启临期提醒' : '已关闭临期提醒');
  if (on) checkExpNotify();
  renderMore(); // 立即刷新更多页标签
}
function swNotify(title, body) {
  return navigator.serviceWorker.ready.then((reg) => reg.showNotification(title, {
    body: body || '', icon: './icon.svg', tag: 'bench-exp', requireInteraction: false, renotify: true
  }));
}
function checkExpNotify() {
  const s = getSettings();
  if (!s.notifyExp || !notifySupported() || Notification.permission !== 'granted') return;
  const today = new Date().toISOString().slice(0, 10);
  if (s.lastNotifyDate === today) return; // 每天最多一次
  const reags = load(STORE.reag, []);
  const need = reags.filter((r) => reagLotsExpired(r) || reagLotsExpiring(r));
  if (need.length) {
    const expired = need.filter((r) => reagLotsExpired(r)).length;
    const title = expired ? `⚠️ ${expired} 项已过期、${need.length - expired} 项临期` : `⏰ ${need.length} 项试剂临期`;
    const body = need.slice(0, 4).map((r) => r.name).join('、') + (need.length > 4 ? ' 等' : '');
    swNotify(title, body).catch((e) => console.warn('[notify] showNotification failed', e));
  }
  const ns = getSettings(); ns.lastNotifyDate = today; setSettings(ns);
}
function testExpNotify() {
  if (!notifySupported()) { toast('当前浏览器不支持通知'); return; }
  if (Notification.permission !== 'granted') { toast('请先开启「临期提醒」并授权通知'); return; }
  swNotify('✅ 实验台通知测试', '临期提醒工作正常')
    .then(() => toast('已发送测试通知，请查看通知栏'))
    .catch((e) => { console.warn(e); toast('通知发送失败：' + (e.message || e)); });
}
function saveExpDays() {
  const el = $('setExpDays'); if (!el) return;
  const v = Number(el.value);
  if (!v || v < 1) { toast('请输入有效天数（≥1）'); return; }
  const s = getSettings(); s.expDays = v; setSettings(s);
  toast('临期阈值已设为 ' + v + ' 天'); renderAll();
}

/* ============================================================
   首次引导
   ============================================================ */
const ONBOARDED = 'bench.onboarded';
function maybeOnboard() { if (!load(ONBOARDED, false)) showOnboarding(false); }
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
function finishOnboarding() { save(ONBOARDED, true); closeModal(); showWeChatHint(); }
function resetData() {
  openModal(`<div style="padding:24px 16px;text-align:center">
    <p style="font-size:18px;font-weight:600;margin-bottom:8px">🔄 确定要重置全部数据？</p>
    <p class="hint" style="margin-bottom:20px">此操作将清除所有实验记录、试剂库存、冻存样本、模板、仪器台账、异常记录、待办事项以及个人设置。<br><b style="color:var(--red)">建议先导出数据！不可撤销！</b></p>
    <div style="display:flex;gap:10px;justify-content:center">
      <button class="btn ghost" style="flex:1" onclick="closeModal()">取消</button>
      <button class="btn" style="flex:1;background:var(--red-soft);color:var(--red)" onclick="confirmReset()">确认重置</button>
    </div>
  </div>`);
}
function confirmReset() {
  // 清除全部存储 key
  Object.values(STORE).forEach((k) => {
    _cache[k] = undefined;
    try { localStorage.removeItem(k); } catch (e) {}
  });
  // 清除默认模板迁移标记等额外 key
  ['bench.reagMigrated', 'bench.tplMigrated', 'bench.tplConsMigrated', 'bench.tplPresetMigrated', 'bench.expTagMigrated', QUICK_KEY].forEach((k) => {
    _cache[k] = undefined;
    try { localStorage.removeItem(k); } catch (e) {}
  });
  // 清除 IndexedDB
  if (_db && _db.name) {
    try { indexedDB.deleteDatabase(_db.name); } catch (e) {}
  }
  // 重置 onboarded 标记，关闭弹窗后重新显示引导
  save(ONBOARDED, false);
  closeModal();
  toast('✅ 已重置全部数据，即将刷新页面');
  setTimeout(() => { location.reload(true); }, 300);
}
function isWeChat() { return /micromessenger/i.test(navigator.userAgent); }
function isAndroid() { return /Android/i.test(navigator.userAgent); }
function isIOS() { return /iPhone|iPad|iPod/i.test(navigator.userAgent); }

/* ---------------- 添加到桌面 ---------------- */
let _deferredPrompt = null;

// 页面加载时监听 beforeinstallprompt（Android Chrome 触发）
document.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  _deferredPrompt = e;
});

function addToHomeScreen() {
  // 1. 微信 → 提示用浏览器打开
  if (isWeChat()) {
    openModal(`<div style="text-align:center;padding:24px 16px">
      <div style="font-size:38px;margin-bottom:8px">📱</div>
      <p style="font-size:18px;font-weight:600;margin-bottom:8px">无法添加到桌面</p>
      <p class="hint" style="font-size:13px;margin-bottom:18px;line-height:1.6">微信内置浏览器无法添加到桌面，<br>建议点击右上角“<b>…</b>” → <b>用浏览器打开</b><br>或复制链接后到浏览器打开。</p>
      <div style="display:flex;gap:10px">
        <button class="btn ghost" style="flex:1" onclick="closeModal()">关闭</button>
        <button class="btn" style="flex:1" onclick="copyWeChatLink()">🔗 复制链接</button>
      </div>
    </div>`);
    return;
  }

  // 2. Android Chrome → 尝试系统级安装
  if (isAndroid()) {
    if (_deferredPrompt) {
      _deferredPrompt.prompt();
      _deferredPrompt.userChoice.then((result) => {
        if (result.outcome === 'accepted') {
          toast('✅ 已添加到桌面');
        } else {
          renderInstallGuide('android');
        }
        _deferredPrompt = null;
      });
    } else {
      renderInstallGuide('android');
    }
    return;
  }

  // 3. iOS Safari → 直接图文引导
  if (isIOS()) {
    renderInstallGuide('ios');
    return;
  }

  // 4. 桌面浏览器 → 无操作提示
  toast('请用手机浏览器打开本站点，即可添加到桌面');
}

function renderInstallGuide(platform) {
  const steps = platform === 'android'
    ? `<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
        <span style="background:var(--blue);color:#fff;width:22px;height:22px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:12px;flex:none">1</span>
        <span>在浏览器底部点击 <b>分享</b> 或 <b>菜单</b> 按钮</span>
      </div>
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
        <span style="background:var(--blue);color:#fff;width:22px;height:22px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:12px;flex:none">2</span>
        <span>找到 <b>添加到桌面</b></span>
      </div>
      <div style="display:flex;align-items:center;gap:8px">
        <span style="background:var(--blue);color:#fff;width:22px;height:22px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:12px;flex:none">3</span>
        <span>点击添加并 <b>确认</b> 即可完成</span>
      </div>`
    : `<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
        <span style="background:var(--blue);color:#fff;width:22px;height:22px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:12px;flex:none">1</span>
        <span>点击底部或顶部分享 <span style="font-size:20px">⎙</span></span>
      </div>
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
        <span style="background:var(--blue);color:#fff;width:22px;height:22px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:12px;flex:none">2</span>
        <span>找到「<b>添加到主屏幕</b>」</span>
      </div>
      <div style="display:flex;align-items:center;gap:8px">
        <span style="background:var(--blue);color:#fff;width:22px;height:22px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:12px;flex:none">3</span>
        <span>点击「<b>添加</b>」</span>
      </div>`;

  openModal(`<div style="padding:20px 16px">
    <div style="text-align:center;margin-bottom:14px">
      <div style="font-size:38px;margin-bottom:4px">📱</div>
      <p style="font-size:18px;font-weight:600;margin-bottom:4px">添加到桌面</p>
      <p class="hint" style="font-size:13px">添加到主屏幕后即可快速打开并离线可用</p>
    </div>
    <div style="background:var(--bg);border-radius:var(--radius);padding:12px 14px;margin-bottom:14px;font-size:14px;line-height:1.8">
      ${steps}
    </div>
    <div style="display:flex;gap:10px">
      <button class="btn ghost" style="flex:1" onclick="closeModal()">我知道了</button>
    </div>
  </div>`);
}

function showWeChatHint() {
  if (!isWeChat()) return;
  openModal(`<div style="text-align:center;padding:24px 16px">
    <p style="font-size:18px;font-weight:600;margin-bottom:4px">⚠️ 强烈建议在手机浏览器打开</p>
    <p class="hint" style="font-size:13px;margin-bottom:18px">微信内置浏览器部分功能受限（无法安装/推送通知），建议点击右上角"…" → 用浏览器打开。</p>
    <div style="display:flex;gap:10px">
      <button class="btn ghost" style="flex:1" onclick="closeModal()">关闭</button>
      <button class="btn" style="flex:1" onclick="copyWeChatLink()">🔗 复制链接</button>
    </div>
  </div>`);
}
function copyWeChatLink() {
  copyText(window.location.href, '链接已复制，请到浏览器粘贴');
  const modal = document.querySelector('.sheet, .modal-overlay');
  if (modal) closeModal();
}

/* ---------------- 复制文本 ---------------- */
function copyText(text, msg) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => toast(msg || '已复制')).catch(() => fallbackCopy(text, msg));
  } else fallbackCopy(text, msg);
}
function fallbackCopy(text, msg) {
  try {
    const ta = document.createElement('textarea'); ta.value = text;
    ta.style.position = 'fixed'; ta.style.opacity = '0'; ta.style.top = '0';
    document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
    toast(msg || '已复制');
  } catch (e) { toast('复制失败，请手动选择'); }
}

/* ---------------- 通用 Sheet / Modal ---------------- */
function lockScroll() { document.documentElement.classList.add('overlay-open'); }
function unlockScroll() {
  if (!$('sheet').classList.contains('show') && !$('modal').classList.contains('show'))
    document.documentElement.classList.remove('overlay-open');
}
function openSheet(html) { $('sheet').innerHTML = '<div class="sheet-close-wrap"><button class="sheet-close" onclick="closeSheet()" aria-label="关闭">✕</button></div>' + html; $('sheet').scrollTop = 0; $('sheetBackdrop').classList.add('show'); $('sheet').classList.add('show'); lockScroll(); }
function closeSheet() { $('sheet').classList.remove('show'); $('sheetBackdrop').classList.remove('show'); unlockScroll(); }
function openModal(html) { $('modal').innerHTML = html; $('modal').scrollTop = 0; $('modalBackdrop').classList.add('show'); $('modal').classList.add('show'); lockScroll(); }
function closeModal() { $('modal').classList.remove('show'); $('modalBackdrop').classList.remove('show'); unlockScroll(); }
// 点击 backdrop 关闭弹窗
document.addEventListener('click', function(e) {
  if (e.target === $('modalBackdrop')) closeModal();
});

/* ---------------- Apple 流体交互：Sheet 下滑拖拽关闭 ----------------
   从顶部抓手(.grabber)或弹窗空白区均可起拖；先判定手势方向，避免抢走
   向上滚动；仅在内容滚到顶时的向下拖拽才触发关闭，保护内部滚动。
   拖拽中 1:1 跟手、向上橡皮筋不可越顶；释放按「速度接力 + 位移阈值」
   决定关闭或回弹；settle 用 rAF 半隐式欧拉弹簧，途中再抓可中断续接。
------------------------------------------------------------------- */
(function () {
  const sheet = document.getElementById('sheet');
  const bd = document.getElementById('sheetBackdrop');
  if (!sheet || !bd) return;
  const VH = () => sheet.offsetHeight || Math.round(window.innerHeight * 0.9);
  let drag = null;   // {startY, startTy, lastY, lastT, vy, moved}
  let pending = null; // 按下但未确定方向的意图（用于区分滚动与下拉关闭）
  let raf = 0;
  let bound = false;
  function bindWindow() {
    if (bound) return; bound = true;
    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  }
  function unbindWindow() {
    if (!bound) return; bound = false;
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('pointercancel', onUp);
  }

  function rubberband(o, dim, constant) { constant = constant || 0.55; return (o * dim * constant) / (dim + constant * Math.abs(o)); }
  function curTy() {
    const t = getComputedStyle(sheet).transform;
    if (t && t !== 'none') { const m = t.match(/matrix\(([^)]+)\)/); if (m) return parseFloat(m[1].split(',')[5]); }
    return sheet.classList.contains('show') ? 0 : VH();
  }
  function onDown(e) {
    if (!sheet.classList.contains('show')) return;
    const t = e.target;
    // 交互控件与内部滚动区：不触发拖拽，交给原生处理
    if (t.closest('input, textarea, select, button, a, label, [contenteditable], .copy-box, .report-box, .batch-preview, .tbl, .expcal')) return;
    pending = { x: e.clientX, y: e.clientY, id: e.pointerId };
    bindWindow();
  }
  function onMove(e) {
    if (drag) { e.preventDefault(); applyDrag(e); return; }
    if (!pending) return;
    const dy = e.clientY - pending.y, dx = Math.abs(e.clientX - pending.x);
    // 非向下滑动（向上/横向）→ 可能是滚动，放弃拖拽意图，交给原生
    if (dy <= 6 || dx > Math.abs(dy)) { if (dy < -6 || dx > 6) { pending = null; unbindWindow(); } return; }
    // 内容已滚动则交给原生滚动，不抢手势
    if (sheet.scrollTop > 0) { pending = null; unbindWindow(); return; }
    // 确认：从顶部向下拖拽 → 启动关闭手势（抓手或空白区均可）
    cancelAnimationFrame(raf);
    sheet.style.transition = 'none'; bd.style.transition = 'none';
    sheet.classList.add('dragging');
    drag = { startY: pending.y, startTy: curTy(), lastY: pending.y, lastT: performance.now(), vy: 0, moved: false };
    pending = null;
    applyDrag(e);
  }
  function applyDrag(e) {
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
    if (!drag) { pending = null; unbindWindow(); return; }
    const h = VH(), ty = curTy(), vy = drag.vy;
    drag = null; unbindWindow();
    sheet.classList.remove('dragging');
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
})();

/* ---------------- Apple 触觉反馈：动作按钮按下/抬起轻震（⑩） ----------------
   仅动作类控件在 pointerdown 给 8ms、pointerup 给 6ms；导航/列表/卡片不震，
   避免过度反馈（Apple：reserve for meaningful moments）。桌面/不支持设备静默跳过。 */
(function () {
  if (!navigator.vibrate) return;
  var SEL = '.btn, .mini-btn, .fab, .sheet-close, .inquire-mini, .coa-btn, .sheet-fab, .back-btn, .tab';
  document.addEventListener('pointerdown', function (e) {
    var el = e.target && e.target.closest && e.target.closest(SEL);
    if (el && !el.disabled) { try { navigator.vibrate(8); } catch (_) {} }
  }, { passive: true });
  document.addEventListener('pointerup', function (e) {
    var el = e.target && e.target.closest && e.target.closest(SEL);
    if (el && !el.disabled) { try { navigator.vibrate(6); } catch (_) {} }
  }, { passive: true });
})();

/* ---------------- 事件绑定 ---------------- */
document.querySelectorAll('.tab').forEach((t) => t.addEventListener('click', () => switchView(t.dataset.view)));
$('fab').addEventListener('click', () => {
  if (currentView === 'experiments') {
    openModal(`<div style="padding:8px 0;text-align:center">
      <h2 style="margin:8px 0 16px;font-size:18px">新建实验记录</h2>
      <div style="display:flex;gap:12px;justify-content:center">
        <button class="btn" style="flex:1;padding:16px 12px;font-size:16px;flex-direction:column;gap:4px;line-height:1.4" onclick="closeModal();openTemplates()"><span style="font-size:24px">📋</span><span>从模板新建</span></button>
        <button class="btn" style="flex:1;padding:16px 12px;font-size:16px;flex-direction:column;gap:4px;line-height:1.4" onclick="closeModal();openExpSheet(null)"><span style="font-size:24px">✏️</span><span>常规新建</span></button>
      </div>
    </div>`);
  }
  else if (currentView === 'reagents') { if (reagSeg === 'freezer') openSampleSheet(null); else openReagSheet(null); }
});
$('sheetBackdrop').addEventListener('click', closeSheet);
$('modalBackdrop').addEventListener('click', closeModal);
window.addEventListener('scroll', onScrollTitle, { passive: true });
window.addEventListener('resize', () => { _barBaseH = 0; _titleF = -1; updateTitleScale(); }, { passive: true });

/* ---------------- 启动 ---------------- */
(async function boot() {
  try {
    await ensureDB();
  } catch (e) {
    console.warn('IndexedDB 初始化失败，使用 localStorage', e);
    _dbReady = false;
  }
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
  migrateTemplates();
  migrateTemplateConsumables();
  migratePresetTemplates();
  migrateExperiments();
  migrateReagLots();
  maybeOnboard();
  renderAll();
  updateTitleScale();
  // 隐藏骨架屏
  const sk = $('skeleton');
  if (sk) sk.classList.add('hide');
  // 隐藏启动加载指示器
  const bl = $('bootLoader');
  if (bl) bl.classList.add('hide');
  setTimeout(() => { if (bl) bl.remove(); }, 400);
  setTimeout(checkExpNotify, 1500);
  // 禁用 iOS 橡皮筋回弹：到顶或到底时阻止继续拖动
  let __lastSY = 0;
  document.addEventListener('touchstart', () => { __lastSY = window.scrollY; }, { passive: true });
  document.addEventListener('touchmove', (e) => {
    // 弹窗内不拦截
    if (e.target.closest('.sheet-content') || e.target.closest('.modal-content')) return;
    const sy = window.scrollY;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const dy = sy - __lastSY;
    __lastSY = sy;
    // 到顶 + 下拉(手指向下滑, dy<0) 或 到底 + 上拉(手指向上滑, dy>0)
    if ((sy <= 0 && dy < 0) || (sy >= max && dy > 0)) {
      e.preventDefault();
    }
  }, { passive: false });
})();
