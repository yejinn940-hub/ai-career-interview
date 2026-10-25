// 교실 안에서만 쓰는 로컬 서버 (인터넷 서비스·해외 서버·클라우드 저장소 없음)
// 사용: node server.js   →  화면에 나온 주소로 학생들이 접속
// 설치할 패키지 없음(Node.js만 있으면 됨). 기록은 local/data/store.json 파일에만 저장됨.
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const Module = require('module');

const PORT = Number(process.env.PORT || 3000);
const ROOT = path.join(__dirname, '..');
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'store.json');

// ---------- Upstash Redis 대신 파일에 저장하는 가짜 Redis ----------
let db = {};
try { db = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8')); } catch (e) { db = {}; }
let saveTimer = null;
function flush() {
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(DATA_FILE + '.tmp', JSON.stringify(db));
    fs.renameSync(DATA_FILE + '.tmp', DATA_FILE);
  } catch (e) { console.error('저장 실패:', e.message); }
}
function persist() {
  if (saveTimer) return;
  saveTimer = setTimeout(flush, 100); // 거의 바로 파일에 저장
}
['SIGINT', 'SIGTERM', 'SIGHUP'].forEach(function (sig) { process.on(sig, function () { flush(); process.exit(0); }); });
process.on('exit', function () { if (saveTimer) flush(); });
function alive(rec) { return rec && (!rec.exp || rec.exp > Date.now()); }
function clone(v) { return v === undefined ? null : JSON.parse(JSON.stringify(v)); }

class FakeRedis {
  async get(key) { const r = db[key]; if (!alive(r)) { if (r) { delete db[key]; persist(); } return null; } return clone(r.v); }
  async set(key, value, opts) {
    db[key] = { v: clone(value), exp: opts && opts.ex ? Date.now() + opts.ex * 1000 : 0 };
    persist(); return 'OK';
  }
  async del(key) { const had = key in db; delete db[key]; persist(); return had ? 1 : 0; }
  async mget(...keys) { return Promise.all(keys.map((k) => this.get(k))); }
  async scan(cursor, opts) {
    const pat = new RegExp('^' + String((opts && opts.match) || '*').replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$');
    const keys = Object.keys(db).filter((k) => alive(db[k]) && pat.test(k));
    return ['0', keys];
  }
}
const origLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === '@upstash/redis') return { Redis: FakeRedis };
  return origLoad.apply(this, arguments);
};
process.env.ALLOW_NEW_ROOMS = process.env.ALLOW_NEW_ROOMS || '1'; // 선생님 본인이 쓰는 서버라서 반 만들기 허용
process.env.KV_REST_API_URL = process.env.KV_REST_API_URL || 'local';
process.env.KV_REST_API_TOKEN = process.env.KV_REST_API_TOKEN || 'local';
// API 키가 없으면 AI를 부르지 않고 자료에서 답을 찾아 보여 준다(무료·해외 전송 없음).
if (!process.env.ANTHROPIC_API_KEY) process.env.FREE_MODE = '1';

// ---------- HTTP 서버 ----------
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };

function sendJson(res, code, obj) {
  res.writeHead(code, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(JSON.stringify(obj));
}

function wrapRes(res) {
  res.status = function (c) { res.statusCode = c; return res; };
  res.json = function (obj) { sendJson(res, res.statusCode || 200, obj); return res; };
  return res;
}

const server = http.createServer(function (req, res) {
  const url = new URL(req.url, 'http://x');
  const p = decodeURIComponent(url.pathname);

  if (p.indexOf('/api/') === 0) {
    const name = p.slice(5).replace(/[^a-z0-9-]/gi, '');
    let handler;
    try { handler = require(path.join(ROOT, 'api', name + '.js')); } catch (e) { sendJson(res, 404, { error: 'not found' }); return; }
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', function () {
      const raw = Buffer.concat(chunks).toString('utf-8');
      try { req.body = raw ? JSON.parse(raw) : {}; } catch (e) { req.body = {}; }
      req.query = Object.fromEntries(url.searchParams);
      Promise.resolve(handler(req, wrapRes(res))).catch(function (e) {
        console.error(e); if (!res.headersSent) sendJson(res, 500, { error: '서버에서 문제가 생겼어요.' });
      });
    });
    return;
  }

  let file = path.join(ROOT, 'public', p === '/' ? 'index.html' : p);
  if (file.indexOf(path.join(ROOT, 'public')) !== 0) { res.writeHead(403); res.end(); return; }
  fs.readFile(file, function (err, buf) {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' });
    res.end(buf);
  });
});

server.listen(PORT, '0.0.0.0', function () {
  const ips = [];
  Object.values(os.networkInterfaces()).forEach(function (list) {
    (list || []).forEach(function (i) { if (i.family === 'IPv4' && !i.internal) ips.push(i.address); });
  });
  console.log('\n==============================================');
  console.log('  AI가상면담 - 교실 서버가 켜졌어요');
  console.log('==============================================');
  (ips.length ? ips : ['localhost']).forEach(function (ip) {
    console.log('  학생용 주소 : http://' + ip + ':' + PORT + '/');
    console.log('  선생님 주소 : http://' + ip + ':' + PORT + '/teacher.html');
  });
  console.log('\n  끄려면 이 창에서 Ctrl + C (또는 창 닫기)');
  console.log('  기록 파일    : ' + DATA_FILE);
  console.log('  답변 방식    : ' + (process.env.FREE_MODE === '1' ? '자료에서 찾아 보여 주기 (AI·인터넷 사용 안 함)' : 'AI 사용 (인터넷 필요)'));
  console.log('==============================================\n');
});
