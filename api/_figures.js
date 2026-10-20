// 면담 인물 목록 공용 유틸리티. Redis가 연결돼 있으면 Redis를 우선 사용하고,
// 아직 한 번도 저장된 적이 없으면 data/figures.json의 기본값으로 초기화한다.
const fs = require('fs');
const path = require('path');
const store = require('./_store');

const FIGURES_KEY = 'figures:list';

function loadLocalFigures() {
  const file = path.join(__dirname, '..', 'data', 'figures.json');
  const raw = fs.readFileSync(file, 'utf-8');
  return JSON.parse(raw);
}

// 일회성 교체: 저장소에 남아있는 옛 인물을 data/figures.json의 새 인물로 바꾼다.
// 이미 바뀐 뒤에는 아무 일도 하지 않는다. (선생님 페이지에서 직접 추가·삭제한 인물은 건드리지 않음)
const REPLACEMENTS = [
  { from: 'kim-yeonkoung', to: 'an-seyoung', toName: '안세영' },
  { from: 'faker', to: 'yang-inmo', toName: '양인모' }
];

async function migrateReplacements(list) {
  const todo = REPLACEMENTS.filter(function (r) {
    return list.some(function (f) { return f.id === r.from; });
  });
  if (!todo.length) return list;
  const seeds = loadLocalFigures();
  let next = list.slice();
  todo.forEach(function (r) {
    const seed = seeds.filter(function (f) { return f.id === r.to; })[0];
    const already = next.some(function (f) { return f.id === r.to || f.name === r.toName; });
    const out = [];
    next.forEach(function (f) {
      if (f.id === r.from) {
        if (seed && !already) out.push(seed);
      } else {
        out.push(f);
      }
    });
    next = out;
  });
  await store.kv.set(FIGURES_KEY, next);
  return next;
}

// 일회성 자료 갱신: data/figures.json의 자료(material)가 새로 정리된 인물만, 저장소의 자료를 새 것으로 바꾼다.
// figure.materialVersion이 이미 최신이면 아무 일도 하지 않으므로 Redis 요청이 늘지 않는다.
// 사진 등 다른 항목과, 선생님이 직접 추가한 인물은 건드리지 않는다.
const MATERIAL_VERSION = 2;

async function migrateMaterials(list) {
  const stale = list.filter(function (f) { return (f.materialVersion || 0) < MATERIAL_VERSION; });
  if (!stale.length) return list;
  const seeds = loadLocalFigures();
  let changed = false;
  const next = list.map(function (f) {
    if ((f.materialVersion || 0) >= MATERIAL_VERSION) return f;
    const seed = seeds.filter(function (s) { return s.id === f.id; })[0];
    if (!seed) return f; // 선생님이 직접 추가한 인물
    changed = true;
    return Object.assign({}, f, { material: seed.material, materialVersion: MATERIAL_VERSION });
  });
  if (changed) await store.kv.set(FIGURES_KEY, next);
  return next;
}

async function getFigures() {
  if (store.isConfigured()) {
    const existing = await store.kv.get(FIGURES_KEY);
    if (Array.isArray(existing) && existing.length) {
      return await migrateMaterials(await migrateReplacements(existing));
    }
    const seed = loadLocalFigures();
    await store.kv.set(FIGURES_KEY, seed);
    return seed;
  }
  return loadLocalFigures();
}

async function saveFigures(list) {
  if (store.isConfigured()) {
    await store.kv.set(FIGURES_KEY, list);
  }
}

function genFigureId(name) {
  var base = String(name || 'figure')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (!base) base = 'figure';
  return base + '-' + Date.now().toString(36);
}

module.exports = { getFigures: getFigures, saveFigures: saveFigures, genFigureId: genFigureId, FIGURES_KEY: FIGURES_KEY };
