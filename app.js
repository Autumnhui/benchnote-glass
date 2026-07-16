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
function getSettings() { const s = Object.assign({ voiceOn: false, agnesKey: '', xfAppid: '', xfApiKey: '', xfApiSecret: '' }, load(STORE.settings, {})); return s; }
function setSettings(s) { save(STORE.settings, s); }
function uid(p) { return p + Date.now() + Math.floor(Math.random() * 1000); }

/* ---------------- 种子数据 ---------------- */
const DEFAULT_TEMPLATES = [
  { id: 'tp1', title: '外泌体浓缩与缓冲液置换', type: '蛋白', raw: '14:00 取{{样本名}} 2 mL 批号 {{批号}} 转入超滤管；15:00 4000 g 离心 10 min 收集截留液；16:00 缓冲液置换 3 次 每次 500 μL PBS',
    consumables: [
      { name: '超滤管 15 mL 30 kDa', brand: '迈博瑞', cat: '耗材' },
      { name: '0.22 μm 针头滤器', brand: '迈博瑞', cat: '耗材' },
      { name: 'PBS 缓冲液 (1× pH7.4)', brand: 'Biosharp/迈邦', cat: '试剂' },
      { name: '50 mL 离心管', brand: 'Bioland/耐思', cat: '耗材' },
      { name: '10 mL 血清移液管', brand: 'Bioland/Nest', cat: '耗材' },
    ] },
  { id: 'tp2', title: '质粒小量提取', type: '分子', raw: '09:00 挑单菌落接种 5 mL LB + 卡那霉素 37℃ 220 rpm 过夜；次日 09:00 取 1 mL 菌液 12000 g 离心 1 min 收集菌体；加 250 μL P1 重悬；加 250 μL P2 裂解；加 350 μL N3 冰上 5 min 12000 g 离心 10 min 取上清过柱',
    consumables: [
      { name: 'LB 液体培养基', brand: 'Solarbio', cat: '试剂' },
      { name: '卡那霉素 (50 mg/mL)', brand: 'Solarbio', cat: '试剂' },
      { name: 'P1/P2/N3 缓冲液', brand: '通用', cat: '试剂' },
      { name: '1.5 mL EP 管', brand: 'Axygen/Bioland', cat: '耗材' },
      { name: '质粒小提试剂盒', brand: '通用', cat: '试剂' },
      { name: 'Benzonase 核酸酶 (去RNA)', brand: 'NEB', cat: '试剂' },
    ] },
  { id: 'tp3', title: '细胞传代', type: '细胞培养', raw: '弃旧培养基 PBS 洗 1 次；加 1 mL 0.25% 胰酶 37℃ 2 min；加 2 mL 完全培养基终止 吹打 5 次 分至 2 个 T25 瓶',
    consumables: [
      { name: '完全培养基 (DMEM/RPMI)', brand: '迈邦/Lonza', cat: '试剂' },
      { name: '0.25% 胰酶-EDTA', brand: '迈邦/Biosharp', cat: '试剂' },
      { name: 'PBS (1×)', brand: '迈邦/Biosharp', cat: '试剂' },
      { name: 'T25 细胞培养瓶', brand: 'Bioland/Nest', cat: '耗材' },
      { name: '胎牛血清 FBS', brand: 'Bioland FORLAB/Lonza', cat: '试剂' },
      { name: '10 mL 移液管', brand: 'Bioland/Nest', cat: '耗材' },
      { name: '15/50 mL 离心管', brand: 'Bioland/Nest', cat: '耗材' },
    ] },
  { id: 'tp4', title: '蛋白纯化（AKTA）', type: '蛋白', raw: '09:30 平衡层析柱 5 CV 缓冲液 A；10:00 上样 {{样本名}} 批号 {{批号}} 流速 1 mL/min；11:30 收集主峰 共 3 mL',
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
  if (localStorage.getItem('bench.tplMigrated')) return;
  localStorage.setItem('bench.tplMigrated', '1');
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
  if (localStorage.getItem('bench.tplConsumables')) return;
  localStorage.setItem('bench.tplConsumables', '1');
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
  if (localStorage.getItem('bench.tplPreset')) return;
  localStorage.setItem('bench.tplPreset', '1');
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
  if (localStorage.getItem('bench.expMigrated')) return;
  localStorage.setItem('bench.expMigrated', '1');
  const exps = load(STORE.exp, []);
  const map = { e1: ['外泌体', '纯化'], e2: ['层析', '纯化'] };
  let changed = false;
  exps.forEach((e) => { if (map[e.id] && !Array.isArray(e.tags)) { e.tags = map[e.id]; changed = true; } });
  if (changed) save(STORE.exp, exps);
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
  updateTitleScale();
}
/* 标题随滚动逐渐收缩：前 90px 内从 30px 缩到 19px，并释放顶部留白 */
let _titleRaf = 0;
function onScrollTitle() {
  if (_titleRaf) return;                       // rAF 节流：每帧最多算一次，避免滚动时频繁重排
  _titleRaf = requestAnimationFrame(() => { _titleRaf = 0; updateTitleScale(); });
}
function updateTitleScale() {
  const h1 = $('viewTitle'), sub = $('viewSub'), inner = document.querySelector('.topbar-inner');
  if (!h1 || !inner) return;
  const y = window.scrollY || document.documentElement.scrollTop || 0;
  const f = Math.min(Math.max(y / 90, 0), 1);
  h1.style.fontSize = (30 - 11 * f).toFixed(1) + 'px';
  h1.style.lineHeight = (1.15 - 0.18 * f).toFixed(2);
  inner.style.paddingTop = (14 - 5 * f).toFixed(1) + 'px';
  inner.style.paddingBottom = (11 - 4 * f).toFixed(1) + 'px';
  if (sub) { sub.style.opacity = (1 - 0.65 * f).toFixed(2); sub.style.fontSize = (13 - 2.5 * f).toFixed(1) + 'px'; }
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
    $('viewTitle').textContent = '试剂/耗材 库存管理';
    $('viewSub').textContent = reagSeg === 'reag' ? `共 ${reags.length} 种` : `共 ${load(STORE.samples, []).length} 份`;
  } else if (currentView === 'tools') {
    $('viewTitle').textContent = '工具箱'; $('viewSub').textContent = '实验常用计算与小工具';
  } else if (currentView === 'more') {
    $('viewTitle').textContent = '更多'; $('viewSub').textContent = 'API · AI 设置 · 数据备份 · 功能引导';
  }
}
function setFab() {
  const fab = $('fab');
  const on = (currentView === 'experiments' || currentView === 'reagents');
  if (on) { fab.classList.remove('hidden'); fab.textContent = '+'; }
  else { fab.classList.add('hidden'); }
  document.body.classList.toggle('fab-on', on);
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
    if (st.key === 'bad') alerts.push({ id: r.id, color: 'var(--red)', name: r.name, desc: `货号 ${r.lot} · ${st.text}（${r.expiry}）` });
    else if (st.key === 'warn' && st.text === '需补货') alerts.push({ id: r.id, color: 'var(--orange)', name: r.name, desc: `库存 ${r.qty}${r.unit} ≤ 安全库存 ${r.min}${r.unit}` });
    else if (st.key === 'warn') alerts.push({ id: r.id, color: 'var(--orange)', name: r.name, desc: `货号 ${r.lot} · ${st.text}（${r.expiry}）` });
  });
  if (alerts.length) {
    html += '<div class="section-title">需要关注</div>';
    alerts.forEach((a) => {
      html += `<div class="alert"><div class="dot" style="background:${a.color}"></div><div class="txt"><b>${esc(a.name)}</b><p>${esc(a.desc)}</p></div><button class="inquire-mini" onclick="event.stopPropagation();inquireReag('${a.id}')">询价</button></div>`;
    });
    html += `<button class="btn secondary" style="margin-top:6px" onclick="inquireExpiring()">📤 一键询价全部（${alerts.length}）</button>`;
  } else {
    html += '<div class="section-title">状态</div><div class="card"><div class="row1"><h3>一切正常</h3></div><div class="meta">无临期、过期或低库存试剂。</div></div>';
  }

  // 最近实验
  html += '<div class="section-title">最近实验</div>';
  exps.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 3).forEach((e) => {
    html += `<div class="card tap" onclick="openExpSheet('${e.id}')"><div class="row1"><h3>${esc(e.title)}</h3></div><div class="meta">${fmtDate(e.createdAt)} · ${e.steps.length} 个步骤</div><div class="snippet">${esc(e.raw)}</div></div>`;
  });
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
  let exps = load(STORE.exp, []).slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
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
  let html = `<div class="section-title">记录（${exps.length}）</div>`;
  if (!exps.length) html += emptyState('没有匹配的记录', '调整筛选或点 + 新建');
  else {
    exps.forEach((e) => {
      const lots = [...new Set((e.steps || []).map((s) => s.lot).filter(Boolean))];
      const tags = (e.tags || []).map((t) => `<span class="tag gray">#${esc(t)}</span>`).join(' ');
      const metaLot = e.lot || (lots.length ? lots.join('、') : '');
      const metaParts = [(e.steps || []).length + ' 个步骤'];
      if (e.sample) metaParts.push('样本 ' + esc(e.sample));
      if (metaLot) metaParts.push('批号 ' + esc(metaLot));
      html += `<div class="card tap" onclick="openExpSheet('${e.id}')">
        <div class="row1"><h3>${esc(e.title)}</h3><span class="tag gray">${fmtDate(e.createdAt)}</span></div>
        <div class="meta">${metaParts.join(' · ')}</div>
        ${tags ? '<div class="tags-row">' + tags + '</div>' : ''}
        <div class="snippet">${esc(e.raw)}</div></div>`;
    });
  }
  box.innerHTML = html;
}

/* ---------------- 试剂 / 冻存 ---------------- */
function renderReagents() {
  if (reagSeg === 'freezer') return renderFreezer();
  if (reagSeg === 'calendar') return renderExpiryCalendar();
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
  html += `<button class="btn secondary" style="margin:6px 0 12px;width:100%" onclick="openReagBatch()">📥 批量导入试剂耗材</button>`;
  if (!list.length) html += emptyState('没有符合条件的试剂', '调整筛选或点 + 添加');
  else {
    list.forEach((r) => {
      const st = reagStatus(r);
      const tagCls = st.key === 'ok' ? 'ok' : st.key === 'warn' ? 'warn' : 'bad';
      const canInquire = st.text === '需补货' || st.text === '已过期' || st.text.includes('临期');
      const inquireBtn = canInquire ? `<button class="inquire-mini" onclick="event.stopPropagation();inquireReag('${r.id}')" title="发送询价给供应商">询价</button>` : '';
      html += `<div class="card tap" onclick="openReagSheet('${r.id}')">
        <div class="row1"><h3>${esc(r.name)}</h3><span class="tag ${tagCls}">${st.text}</span></div>
        <div class="meta-row"><div class="meta">库存 ${r.qty}${r.unit} · ${esc(r.location)}</div>${inquireBtn ? `<div class="meta-act">${inquireBtn}</div>` : ''}</div>
        <div class="meta meta-expiry">效期 ${esc(r.expiry)} · 货号 ${esc(r.lot)}</div>
      </div>`;
    });
  }
  const needBuy = reags.filter((r) => Number(r.qty) <= Number(r.min || 0) || daysUntil(r.expiry) < 0 || (daysUntil(r.expiry) <= 30 && daysUntil(r.expiry) >= 0));
  if (needBuy.length) html += `<button class="btn secondary" style="margin-top:6px" onclick="openPurchase()">生成请购单（${needBuy.length}）</button>`;
  $('view-reagents').innerHTML = html;
}
function setReagSeg(s) { reagSeg = s; renderReagents(); setHeader(); }
function setReagFilter(f) { reagFilter = f; renderReagents(); }
function onReagSearch(v) { reagSearch = v; renderReagents(); const inp = $('reagSearch'); if (inp) { inp.focus(); const len = inp.value.length; inp.setSelectionRange(len, len); } }
function renderExpiryCalendar() {
  const reags = load(STORE.reag, []);
  let html = `<div class="seg">
    <button class="${reagSeg === 'reag' ? 'active' : ''}" onclick="setReagSeg('reag')">试剂/耗材</button>
    <button class="${reagSeg === 'freezer' ? 'active' : ''}" onclick="setReagSeg('freezer')">冻存库</button>
    <button class="${reagSeg === 'calendar' ? 'active' : ''}" onclick="setReagSeg('calendar')">效期日历</button>
  </div>`;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const dow = (today.getDay() + 6) % 7; // 周一=0
  const start = new Date(today); start.setDate(today.getDate() - dow);
  const dayMark = {};
  reags.forEach((r) => { if (r.expiry && r.expiry !== '—') { (dayMark[r.expiry] = dayMark[r.expiry] || []).push(r); } });
  const wd = ['一', '二', '三', '四', '五', '六', '日'];
  html += '<div class="expcal">';
  wd.forEach((w) => { html += `<div class="expcal-head">${w}</div>`; });
  for (let i = 0; i < 35; i++) {
    const d = new Date(start); d.setDate(start.getDate() + i);
    const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const isToday = d.getTime() === today.getTime();
    const marks = dayMark[ds] || [];
    let inner = `<div class="ec-num">${d.getDate()}</div>`;
    marks.slice(0, 2).forEach((m) => { inner += `<div class="ec-dot ${reagStatus(m).key}" title="${esc(m.name)}">${esc(m.name.slice(0, 4))}</div>`; });
    if (marks.length > 2) inner += `<div class="ec-more">+${marks.length - 2}</div>`;
    html += `<div class="expcal-cell${isToday ? ' today' : ''}">${inner}</div>`;
  }
  html += '</div>';
  const groups = [
    ['已过期', (r) => daysUntil(r.expiry) < 0, 'bad'],
    ['7 天内到期', (r) => { const d = daysUntil(r.expiry); return d >= 0 && d <= 7; }, 'warn'],
    ['30 天内到期', (r) => { const d = daysUntil(r.expiry); return d > 7 && d <= 30; }, 'info']
  ];
  html += '<div class="section-title">采购 / 处理清单</div>';
  let any = false;
  groups.forEach(([title, fn, cls]) => {
    const list = reags.filter((r) => r.expiry && r.expiry !== '—' && fn(r));
    if (list.length) {
      any = true;
      html += `<div class="ec-group"><div class="ec-gtitle ${cls}">${title}（${list.length}）</div>`;
      list.sort((a, b) => daysUntil(a.expiry) - daysUntil(b.expiry)).forEach((r) => {
        const d = daysUntil(r.expiry);
        const dd = d < 0 ? `逾期${-d}天` : `剩${d}天`;
        const tk = reagStatus(r).key;
        const ico = { ok: 'g', warn: 'o', bad: 'r' }[tk];
        html += `<div class="list-row" onclick="openReagSheet('${r.id}')"><div class="lr-ico ${ico}">⏳</div>
          <div class="lr-main"><div class="lr-title">${esc(r.name)}</div><div class="lr-sub">批号 ${esc(r.lot)} · ${esc(r.location)} · 效期 ${esc(r.expiry)}</div>
          <span class="tag ${tk}" style="margin-top:6px;display:inline-block">${dd}</span>
          <div style="margin-top:6px"><button class="inquire-mini" onclick="event.stopPropagation();inquireReag('${r.id}')" title="发送询价给供应商">询价</button></div></div></div>`;
      });
      html += '</div>';
    }
  });
  if (!any) html += emptyState('未来 30 天无到期试剂', '');
  const needBuy = reags.filter((r) => Number(r.qty) <= Number(r.min || 0) || daysUntil(r.expiry) < 0 || (daysUntil(r.expiry) <= 30 && daysUntil(r.expiry) >= 0));
  if (needBuy.length) html += `<button class="btn secondary" style="margin-top:8px" onclick="openPurchase()">生成请购单（${needBuy.length}）</button>`;
  $('view-reagents').innerHTML = html;
}

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
    <button class="btn secondary mini" onclick="openFreezerBatch()">📥 批量填充</button>
    <button class="btn secondary mini ${freezerMulti ? 'on' : ''}" onclick="toggleFreezerMulti()">${freezerMulti ? '✓ 多选开' : '☑️ 多选'}</button>
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
  const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  html += '<div class="freezer">';
  html += '<div class="colhead"></div>';
  for (let c = 1; c <= 12; c++) html += `<div class="colhead">${c}</div>`;
  rows.forEach((r) => {
    html += `<div class="colhead">${r}</div>`;
    for (let c = 1; c <= 12; c++) {
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
  html += `<div class="meta" style="margin-top:10px">点击${freezerMulti ? '格子可勾选 / 取消选中' : '空格新增样本，点击蓝格查看'}。本盒 ${here.length} / 96 份。</div>`;
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
  save(STORE.samples, samples); freezerSel.clear(); renderFreezer(); toast('已删除 ' + n + ' 份');
}
function fmMoveSel() { if (!freezerSel.size) { toast('未选中任何样本'); return; } openFreezerMove(); }

/* 冻存盒管理：新建 / 重命名 / 删除 */
function addFreezerBox() {
  const boxes = getBoxes();
  let i = 1; while (boxes.includes('B' + i)) i++;
  const def = 'B' + i;
  let html = `<div class="grabber"></div><h2>新建冻存盒</h2>
    <p class="hint">给新盒子起个名字，如 ${def}、液氮罐1。</p>
    <div class="field"><label>盒子名称</label><input id="nbName" value="${def}" placeholder="如 B2"></div>
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
  boxes.push(name); save(STORE.boxes, boxes);
  freezerBox = name; freezerSel.clear(); freezerMulti = false;
  closeSheet(); renderFreezer(); toast('已创建盒子 ' + name);
}
let _renameOld = '';
function openBoxManager() {
  const boxes = getBoxes();
  const samples = load(STORE.samples, []);
  let rows = boxes.map((b, i) => {
    const cnt = samples.filter((s) => s.box === b).length;
    return `<div class="list-row">
      <div class="lr-main"><div class="lr-title">${esc(b)}</div><div class="lr-sub">${cnt} 份样本</div></div>
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
  let html = '<div class="section-title">API 与密钥</div>';
  html += '<p class="hint" style="margin:0 0 8px">建议自行配置；默认配置可能失效，填入下方自有凭证即可提速。</p>';
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
  html += '<div class="section-title">数据备份</div>';
  html += `<button class="btn" onclick="exportData()">📤 导出全部数据</button>
    <button class="btn secondary" style="margin-top:10px" onclick="pickImport()">📥 导入数据</button>
    <input id="importFile" type="file" accept="application/json,.json" style="display:none" onchange="onImportFile(this)">
    <div class="help">导出为 JSON 文件；换设备时导入即可恢复全部记录与配置。</div>`;
  html += '<div class="section-title">帮助</div>';
  html += `<div class="list-row" onclick="openOnboarding()"><div class="lr-ico">👋</div><div class="lr-main"><div class="lr-title">功能引导</div><div class="lr-sub">重新查看功能介绍与密钥配置提示</div></div><div class="lr-right">›</div></div>`;
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
  let html = `<div class="grabber"></div><h2>${r ? '库存详细' : '添加库存'}</h2>
    <p class="hint">记录货号、效期与安全库存，系统自动提醒临期与补货。</p>
    <div class="field"><label>名称</label><input id="rName" value="${v('name')}" placeholder="如：PBS 缓冲液"></div>
    <div class="field"><label>品牌</label><input id="rSup" value="${v('supplier')}" placeholder="如：Thermo / Sigma（选填）"></div>
    <div class="field-row">
      <div class="field"><label>数量 / 单位</label>
        <div style="display:flex;gap:10px"><input id="rQty" type="number" value="${v('qty')}" placeholder="数量" style="flex:1"><input id="rUnit" value="${v('unit') || '瓶'}" placeholder="单位" style="max-width:120px"></div></div>
      <div class="field"><label>安全库存（低于即提醒补货）</label><input id="rMin" type="number" value="${v('min') || 0}" placeholder="如：1"></div>
    </div>
    <div class="field"><label>存放位置</label><input id="rLoc" value="${v('location')}" placeholder="如：4℃柜A"></div>
    <div class="field-row">
      <div class="field"><label>有效期</label><input id="rExp" type="date" value="${v('expiry')}"></div>
      <div class="field"><label>货号</label><input id="rLot" value="${v('lot')}" placeholder="如：PB2605"></div>
    </div>
    <div class="field"><label>品牌偏好（询价时使用）</label><input id="rBrand" value="${v('brand')}" placeholder="如：迈博瑞 / Lonza / Solarbio（选填）"></div>
    <div class="btn-row" style="margin-top:8px">
      ${r ? '<button class="btn danger" onclick="deleteReag()">删除</button>' : ''}
      ${r ? '<button class="btn secondary" onclick="inquireReag(\'' + r.id + '\')">📤 询价</button>' : ''}
      <button class="btn" onclick="saveReag()">保存</button>
    </div>`;
  openSheet(html);
}
function saveReag() {
  const name = $('rName').value.trim();
  if (!name) { toast('请填写名称'); return; }
  const r = { name, lot: $('rLot').value.trim(), qty: $('rQty').value, unit: $('rUnit').value.trim() || '瓶',
    location: $('rLoc').value.trim(), expiry: $('rExp').value, min: $('rMin').value || 0, supplier: $('rSup').value.trim(), brand: ($('rBrand') ? $('rBrand').value.trim() : '') };
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

/* ---------------- 试剂批量导入（文本 + Excel） ---------------- */
const REAG_TPL_COLS = ['名称', '批号', '数量', '单位', '位置', '效期(YYYY-MM-DD)'];
let reagExcelRows = [];
function openReagBatch() {
  reagExcelRows = [];
  let html = `<div class="grabber"></div><h2>批量导入试剂耗材</h2>
    <p class="hint">两种方式：① 粘贴多行文本（字段用 <b>逗号 / 制表符</b> 分隔：名称, 批号, 数量, 单位, 位置, 效期）；② 下载 Excel 模板填写后导入。</p>
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
      idx.lot = s.findIndex((c) => c.includes('批号') || c.includes('货号'));
      idx.qty = s.findIndex((c) => c.includes('数量'));
      idx.unit = s.findIndex((c) => c.includes('单位'));
      idx.location = s.findIndex((c) => c.includes('位置'));
      idx.expiry = s.findIndex((c) => c.includes('效期'));
      break;
    }
  }
  if (hi < 0) { // 无表头：按默认顺序假设
    Object.assign(idx, { name: 0, lot: 1, qty: 2, unit: 3, location: 4, expiry: 5 });
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
      lot: String(r[idx.lot] == null ? '' : r[idx.lot]).trim(),
      qty,
      unit: (String(r[idx.unit] == null ? '' : r[idx.unit]).trim()) || '瓶',
      location: String(r[idx.location] == null ? '' : r[idx.location]).trim(),
      expiry: String(r[idx.expiry] == null ? '' : r[idx.expiry]).trim(),
      min: 0, supplier: ''
    });
  }
  return out;
}
function parseReagLines(text) {
  const out = [];
  text.split(/\r?\n/).map((s) => s.trim()).filter(Boolean).forEach((line) => {
    const parts = line.includes('\t') ? line.split('\t') : line.split(/[,，]/);
    const f = parts.map((s) => s.trim());
    const [name, lot, qty, unit, location, expiry] = f;
    if (!name) return;
    out.push({ name, lot: lot || '', qty: qty || 1, unit: unit || '瓶', location: location || '', expiry: expiry || '', min: 0, supplier: '' });
  });
  return out;
}
function renderReagBatchPreview() {
  const box = $('rbPreview'); if (!box) return;
  const arr = parseReagLines(($('rbText') || {}).value || '');
  const total = arr.length + reagExcelRows.length;
  let inner = '';
  if (reagExcelRows.length) inner += `<div class="bp-row ok">📊 Excel：${reagExcelRows.length} 条</div>`;
  if (arr.length) inner += arr.slice(0, 5).map((r) => `<div class="bp-row">${esc(r.name)} · ${esc(r.lot || '—')} · ${esc(r.qty)}${esc(r.unit)} · ${esc(r.location || '—')}</div>`).join('') + (arr.length > 5 ? `<div class="bp-row muted">…文本共 ${arr.length} 条</div>` : '');
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
    const i = reags.findIndex((x) => x.name === r.name && x.lot === r.lot);
    if (i >= 0) { reags[i] = { ...reags[i], ...r }; updated++; }
    else { reags.push({ id: uid('r'), ...r }); added++; }
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
  let html = '<div class="grabber"></div><h2>请购单</h2><p class="hint">系统根据"低库存 + 临期/过期"自动汇总，可复制后走采购流程，或一键发给供应商。</p>';
  if (!need.length) html += emptyState('暂无需采购项', '');
  else {
    need.forEach((r) => {
      const reason = daysUntil(r.expiry) < 0 ? '已过期' : daysUntil(r.expiry) <= 30 ? `临期(${r.expiry})` : '低于安全库存';
      const suggest = Math.max(Number(r.min) * 3 - Number(r.qty), Number(r.min));
      html += `<div class="purchase-item"><span><b>${esc(r.name)}</b> · 货号 ${esc(r.lot)}<br><span style="color:var(--muted);font-size:12px">${reason} · 品牌 ${esc(r.supplier || '—')}</span></span><span style="text-align:right">建议 ${suggest}${esc(r.unit)}</span></div>`;
      lines += `- ${r.name} | 货号 ${r.lot} | 建议采购 ${suggest}${r.unit} | 原因：${reason} | 品牌：${r.supplier || '—'}\n`;
    });
    html += `<div class="copy-box" id="poText">${esc(lines)}</div>
      <div class="btn-row" style="margin-top:14px">
        <button class="btn secondary" onclick="copyPO()">📋 复制请购单</button>
        <button class="btn" onclick="inquireExpiring()">📤 发送给供应商</button>
      </div>
      <div class="supplier-hint">发送给供应商：自动生成含联系方式的询价单，扫码加 <b>${SUPPLIERS.research.contact}</b>（${SUPPLIERS.research.shortName}）微信即可。</div>`;
  }
  openModal(html);
}
function copyPO() { const t = $('poText').textContent; navigator.clipboard?.writeText(t).then(() => toast('已复制'), () => toast('复制失败')); }

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
      <button class="btn secondary" onclick="copyInquireText()">📋 复制询价文本</button>
      <button class="btn" onclick="window.location.href='${sp.phoneTel}'">📞 拨号</button>
    </div>
    <div class="supplier-brand">${esc(sp.brandText)}</div>
    ${equipLine}`;
  openSheet(html);
}
function copyInquireText() { const t = $('inquireText').textContent; const who = _activeSupplier ? _activeSupplier.contact : SUPPLIER.contact; navigator.clipboard?.writeText(t).then(() => toast('已复制，去微信粘贴给 ' + who), () => toast('复制失败')); }
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
  const reason = st.text === '需补货' ? '库存不足' : st.text === '已过期' ? '已过期需替换' : st.text.includes('临期') ? `临期（剩${daysUntil(r.expiry)}天）` : '常规采购';
  const suggest = Math.max(Number(r.min) * 3 - Number(r.qty), Number(r.min) || 1);
  openInquireSheet([{ name: r.name, spec: r.spec || r.location, qty: suggest, unit: r.unit, lot: r.lot, reason, brandHint: r.brand || '请推荐' }], '询价 · ' + r.name, 'reagent');
}

/* ② 批量询价（来自效期日历采购清单） */
function inquireExpiring() {
  const reags = load(STORE.reag, []);
  const groups = [
    ['已过期', (r) => daysUntil(r.expiry) < 0],
    ['7 天内到期', (r) => { const d = daysUntil(r.expiry); return d >= 0 && d <= 7; }],
    ['30 天内到期', (r) => { const d = daysUntil(r.expiry); return d > 7 && d <= 30; }],
    ['需补货', (r) => Number(r.qty) <= Number(r.min || 0)]
  ];
  const items = [];
  groups.forEach(([_, fn]) => reags.filter(fn).forEach((r) => {
    const st = reagStatus(r);
    const reason = st.text === '需补货' ? '库存不足' : daysUntil(r.expiry) < 0 ? '已过期' : `剩${daysUntil(r.expiry)}天`;
    const suggest = Math.max(Number(r.min) * 3 - Number(r.qty), Number(r.min) || 1);
    items.push({ name: r.name, spec: r.location, qty: suggest, unit: r.unit, lot: r.lot, reason, brandHint: r.brand || '' });
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
      <button class="btn secondary" onclick="copyServiceText()">📋 复制服务需求</button>
      <button class="btn" onclick="window.location.href='${sp.phoneTel}'">📞 拨号</button>
    </div>
    <div class="supplier-brand">${esc(sp.brandText)}</div>
    ${equipLine}`;
  openSheet(html);
}
function copyServiceText() { const t = $('svcText').textContent; const who = _activeSupplier ? _activeSupplier.contact : SUPPLIER.contact; navigator.clipboard?.writeText(t).then(() => toast('已复制，去微信粘贴给 ' + who), () => toast('复制失败')); }

/* ④ 实验模板推荐耗材 → 询价 */
function inquireTemplate(tplId) {
  const t = load(STORE.templates, []).find((x) => x.id === tplId);
  if (!t || !t.consumables) return;
  const items = t.consumables.map((c) => ({ name: c.name, spec: c.cat, qty: 1, unit: '份', reason: '模板「' + t.title + '」推荐', brandHint: c.brand }));
  openInquireSheet(items, '模板耗材询价 · ' + t.title, 'template');
}

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
    <p class="hint">填入变量，生成带时间线的实验记录。</p>
    <p class="warn-preset">⚠ 此为常规实验模板，步骤来源于公开 protocol，请自行确认后使用。</p>`;
  const prefill = { '样本名': agnesSample, '批号': agnesLot };
  toks.forEach((tk, i) => { const v = prefill[tk] || ''; html += `<div class="field"><label>${esc(tk)}</label><input id="tv_${i}" value="${esc(v)}" placeholder="填入${esc(tk)}"${v ? ' data-auto="1"' : ''}></div>`; });
  html += `<div class="field"><label>标题</label><input id="tfTitle" value="${esc(t.title)}"></div>`;
  html += `<div class="field"><label>记录人</label><input id="tfOp" value="实验员"></div>`;
  html += `<div class="field"><label>起始时间（可选，用于重排时间线）</label><input id="tfStart" type="time"></div>`;
  html += `<div id="tfPreview" class="step" style="margin-top:6px"></div>`;
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
  let html = `<div class="grabber"></div>
    <div class="sheet-head"><button class="back-btn" onclick="openTemplates()">← 返回</button><h2>新建模板</h2></div>
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
  if (!agnesReady()) { toast('请先在「设置 → API 与密钥」配置 Agnes（留空即用内置默认）'); return; }
  const btn = $('aiOptWeekly');
  if (btn) { btn.disabled = true; btn.textContent = 'AI 优化中…'; }
  toast('⏳ AI 正在优化周报，约需 10–40 秒，请勿离开…', 5000);
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
      body: JSON.stringify({ model: 'agnes-1.5-flash', messages: [{ role: 'system', content: sys }, { role: 'user', content: weeklyRaw }], temperature: 0.5, max_tokens: 4000, stream: false })
    });
    clearTimeout(to);
    if (!res.ok) throw new Error('agnes ' + res.status);
    const j = await res.json();
    let content = (j && j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || '';
    content = stripFence(content);
    if (!content) throw new Error('empty');
    weeklyText = content;
    renderWeeklyOut('AI 已优化', content, true);
    toast('✅ AI 已优化周报', 3500); if (voiceOn) speak('AI 已优化');
  } catch (e) {
    const msg = (e && e.name === 'AbortError') ? 'AI 服务无响应（超时，模型较慢或网络不佳）' : ('AI 优化失败：' + (e.message || e));
    toast('❌ ' + msg + '，请重试或在「设置」重测连通', 4500);
    console.warn('[Agnes] 周报优化失败：', e);
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
  toast('⏳ AI 正在整理，约需 10–40 秒，请稍候…', 5000);
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
function lockScroll() { document.documentElement.classList.add('overlay-open'); }
function unlockScroll() {
  if (!$('sheet').classList.contains('show') && !$('modal').classList.contains('show'))
    document.documentElement.classList.remove('overlay-open');
}
function openSheet(html) { $('sheet').innerHTML = '<div class="sheet-close-wrap"><button class="sheet-close" onclick="closeSheet()" aria-label="关闭">✕</button></div>' + html; $('sheet').scrollTop = 0; $('sheetBackdrop').classList.add('show'); $('sheet').classList.add('show'); lockScroll(); }
function closeSheet() { $('sheet').classList.remove('show'); $('sheetBackdrop').classList.remove('show'); unlockScroll(); }
function openModal(html) { $('modal').innerHTML = html; $('modal').scrollTop = 0; $('modalBackdrop').classList.add('show'); $('modal').classList.add('show'); lockScroll(); }
function closeModal() { $('modal').classList.remove('show'); $('modalBackdrop').classList.remove('show'); unlockScroll(); }

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

/* ---------------- 事件绑定 ---------------- */
document.querySelectorAll('.tab').forEach((t) => t.addEventListener('click', () => switchView(t.dataset.view)));
$('fab').addEventListener('click', () => {
  if (currentView === 'experiments') openExpSheet(null);
  else if (currentView === 'reagents') { if (reagSeg === 'freezer') openSampleSheet(null); else openReagSheet(null); }
});
$('sheetBackdrop').addEventListener('click', closeSheet);
$('modalBackdrop').addEventListener('click', closeModal);
window.addEventListener('scroll', onScrollTitle, { passive: true });

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
migrateTemplates();
migrateTemplateConsumables();
migratePresetTemplates();
migrateExperiments();
maybeOnboard();
renderAll();
updateTitleScale();
