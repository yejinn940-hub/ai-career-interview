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

// 일회성 교체: 저장소에 남아있는 '김연경'을 '안세영'(data/figures.json 기준)으로 바꾼다.
// 이미 바뀐 뒤에는 아무 일도 하지 않는다.
async function migrateKimToAn(list) {
  const hasKim = list.some(function (f) { return f.id === 'kim-yeonkoung'; });
  if (!hasKim) return list;
  const seed = loadLocalFigures().filter(function (f) { return f.id === 'an-seyoung'; })[0];
  const alreadyHasAn = list.some(function (f) { return f.id === 'an-seyoung' || f.name === '안세영'; });
  const next = [];
  list.forEach(function (f) {
    if (f.id === 'kim-yeonkoung') {
      if (seed && !alreadyHasAn) next.push(seed);
    } else {
      next.push(f);
    }
  });
  await store.kv.set(FIGURES_KEY, next);
  return next;
}

async function getFigures() {
  if (store.isConfigured()) {
    const existing = await store.kv.get(FIGURES_KEY);
    if (Array.isArray(existing) && existing.length) {
      return await migrateKimToAn(existing);
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
