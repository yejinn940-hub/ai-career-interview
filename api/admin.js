// 운영자 전용: 만들어진 반 목록과 개수를 본다. 비밀번호는 서버 환경변수 ADMIN_PIN.
const crypto = require('crypto');
const store = require('./_store');

function same(a, b) {
  const ha = crypto.createHash('sha256').update(String(a)).digest();
  const hb = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }
  if (!process.env.ADMIN_PIN) {
    res.status(503).json({ error: '관리자 비밀번호(ADMIN_PIN)가 서버에 설정되어 있지 않아요.' });
    return;
  }
  if (!store.isConfigured()) { res.status(500).json({ error: '서버 저장소가 연결되지 않았어요.' }); return; }

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  body = body || {};
  if (!same(body.adminPin || '', process.env.ADMIN_PIN)) {
    res.status(403).json({ error: '관리자 비밀번호가 일치하지 않아요.' });
    return;
  }

  try {
    if (body.action === 'list') {
      const keys = await store.kv.scan('room:*');
      const rooms = keys.length ? await store.kv.mget(keys) : [];
      const subKeys = keys.map(function (k) { return 'submissions:' + k.slice('room:'.length); });
      const subs = keys.length ? await store.kv.mget(subKeys) : [];
      const items = keys.map(function (k, i) {
        const r = rooms[i];
        if (!r) return null;
        return { teacherName: r.teacherName, grade: r.grade, classNum: r.classNum, createdAt: r.createdAt || '',
          submissions: Array.isArray(subs[i]) ? subs[i].length : 0 };
      }).filter(Boolean).sort(function (a, b) { return String(b.createdAt).localeCompare(String(a.createdAt)); });
      res.status(200).json({ ok: true, count: items.length, items: items });
      return;
    }
    res.status(400).json({ error: '알 수 없는 요청이에요.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '서버에서 문제가 생겼어요.' });
  }
};
