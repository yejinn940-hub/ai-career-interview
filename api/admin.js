// 관리자(앱 운영자) 전용: 새로 만든 반을 승인·중지한다. 비밀번호는 서버 환경변수 ADMIN_PIN.
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
      const subs = keys.length ? await store.kv.mget(keys.map(function (k) { return 'submissions:' + k.slice('room:'.length); })) : [];
      const items = keys.map(function (k, i) {
        const r = rooms[i];
        if (!r) return null;
        return { key: k.slice('room:'.length), teacherName: r.teacherName, grade: r.grade, classNum: r.classNum,
          status: r.status || 'approved', createdAt: r.createdAt || '', submissions: Array.isArray(subs[i]) ? subs[i].length : 0 };
      }).filter(Boolean).sort(function (a, b) {
        const order = { pending: 0, approved: 1, blocked: 2 };
        const d = order[a.status] - order[b.status];
        if (d) return d;
        return String(b.createdAt).localeCompare(String(a.createdAt));
      });
      res.status(200).json({ ok: true, items: items });
      return;
    }

    if (body.action === 'set-status') {
      const status = body.status;
      if (['approved', 'blocked', 'pending'].indexOf(status) === -1) { res.status(400).json({ error: '상태 값이 올바르지 않아요.' }); return; }
      const key = String(body.key || '');
      const room = await store.kv.get('room:' + key);
      if (!room) { res.status(404).json({ error: '반을 찾을 수 없어요.' }); return; }
      room.status = status;
      await store.kv.set('room:' + key, room, 60 * 60 * 24 * 400);
      res.status(200).json({ ok: true });
      return;
    }

    if (body.action === 'rename') {
      // 반 암호 바꾸기: 반 정보, 면담 기록, 댓글을 새 암호 키로 옮긴다.
      const oldKey = String(body.key || '');
      const newName = store.normalize(body.newName);
      if (!newName || newName.length > 20) { res.status(400).json({ error: '새 암호는 1~20자로 입력해 주세요.' }); return; }
      const room = await store.kv.get('room:' + oldKey);
      if (!room) { res.status(404).json({ error: '반을 찾을 수 없어요.' }); return; }
      const newKey = store.roomKey(newName, room.grade, room.classNum);
      if (newKey === oldKey) { res.status(400).json({ error: '지금 암호와 같아요.' }); return; }
      if (await store.kv.get('room:' + newKey)) { res.status(409).json({ error: '같은 암호의 반이 이미 있어요.' }); return; }
      const DAY = 24 * 60 * 60;
      const moved = { submissions: 0, comments: 0 };
      const list = await store.kv.get('submissions:' + oldKey);
      if (Array.isArray(list) && list.length) { await store.kv.set('submissions:' + newKey, list, 30 * DAY); moved.submissions = list.length; }
      const prefix = 'comments:' + oldKey + ':';
      const ckeys = await store.kv.scan(prefix + '*');
      for (let i = 0; i < ckeys.length; i++) {
        const val = await store.kv.get(ckeys[i]);
        if (Array.isArray(val) && val.length) { await store.kv.set('comments:' + newKey + ':' + ckeys[i].slice(prefix.length), val, 30 * DAY); moved.comments++; }
      }
      await store.kv.set('room:' + newKey, Object.assign({}, room, { teacherName: newName }), 400 * DAY);
      for (let i = 0; i < ckeys.length; i++) await store.kv.del(ckeys[i]);
      await store.kv.del('submissions:' + oldKey);
      await store.kv.del('room:' + oldKey);
      res.status(200).json({ ok: true, moved: moved });
      return;
    }

    res.status(400).json({ error: '알 수 없는 요청이에요.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '서버에서 문제가 생겼어요.' });
  }
};
