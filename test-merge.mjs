// 本地测试：讯飞流式结果合并逻辑（与 app.js 中 mergeXfSeg 完全一致）
// 模拟讯飞 onmessage 逐帧返回，验证 apd 追加 / rpl 同音字替换，确认无重复拼接。

function mergeXfSeg(seg, t, pgs, rg) {
  if (pgs === 'rpl' && Array.isArray(rg) && rg.length === 2) {
    const s = rg[0], e = rg[1];
    return seg.slice(0, s) + t + seg.slice(e + 1);
  }
  return seg + t;
}

// 把一帧转成 {ws, pgs, rg}
function frame(words, pgs, rg) {
  return { ws: words.map((w) => ({ cw: [{ w }] })), pgs, rg };
}

function run(frames) {
  let seg = '';
  for (const f of frames) {
    let t = '';
    f.ws.forEach((w) => w.cw.forEach((c) => (t += c.w)));
    if (t) seg = mergeXfSeg(seg, t, f.pgs, f.rg);
  }
  return seg;
}

let pass = 0, fail = 0;
function assert(name, got, want) {
  const ok = got === want;
  console.log(`${ok ? '✅' : '❌'} ${name}\n   期望: ${JSON.stringify(want)}\n   实际: ${JSON.stringify(got)}`);
  ok ? pass++ : fail++;
}

// 用例1：普通逐帧追加（标准 iat，每帧只给增量新文本）
assert(
  '普通流式追加',
  run([frame(['我'], 'apd', [0, 0]), frame(['今天'], 'apd', [0, 0]), frame(['做'], 'apd'), frame(['实验'], 'apd')]),
  '我今天做实验'
);

// 用例2：同音字纠正（rpl）—— 先识别成"室验"，再被纠正为"实验"
// seg 逐步: 我 -> 我做了 -> 我做了室 -> 我做了室验
// 纠正帧 rpl rg=[3,4] 把下标3..4("室验")替换为"实验" -> 我做了实验
assert(
  '同音字 rpl 替换（无重复）',
  run([
    frame(['我'], 'apd'),
    frame(['做了'], 'apd'),
    frame(['室'], 'apd'),
    frame(['验'], 'apd'),
    frame(['实验'], 'rpl', [3, 4]),
  ]),
  '我做了实验'
);

// 用例3：未带 pgs 字段的帧按追加处理（兜底）
assert(
  '缺 pgs 字段兜底为追加',
  run([frame(['离心'], null), frame(['十分钟'], null)]),
  '离心十分钟'
);

// 用例4：多句连续（模拟两次会话：第一句结束后重新开 seg）
const seg1 = run([frame(['取'], 'apd'), frame(['样本'], 'apd')]); // "取样本"
const seg2 = run([frame(['离心'], 'apd'), frame(['十分钟'], 'apd')]); // "离心十分钟"
assert('两次会话分别合并', seg1 + '；' + seg2, '取样本；离心十分钟');

console.log(`\n结果: ${pass} 通过 / ${fail} 失败`);
process.exit(fail ? 1 : 0);
