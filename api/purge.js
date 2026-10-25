// 매일 한 번(Vercel Cron) 보관 기간(7일)이 지난 면담과 댓글을 저장소에서 지운다.
// 아무도 면담 화면을 열지 않아도 오래된 기록이 남지 않게 하기 위한 정리 작업이다.
const crypto = require('crypto');
const store = require('./_store');
const { RETENTION_MS, RETENTION_SEC } = require('./_retention');

function same(a, b) {
  const ha = crypto.createHash('sha256').update(String(a)).digest();
  const hb = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

// CRON_SECRET이 설정돼 있으면 Vercel이 보내는 Authorization 값으로 확인하고,
// 없으면 Vercel Cron이 보내는 user-agent로 확인한다. (지우는 대상은 기간이 지난 기록뿐이라 해가 없다)
function authorized(req) {
  const h = (req && req.headers) || {};
  const secret = process.env.CRON_SECRET;
  if (secret) return same(h.authorization || '', 'Bearer ' + secret);
  return /^vercel-cron\//.test(String(h['user-agent'] || ''));
}

function isFresh(rec) {
  const t = new Date((rec && (rec.updatedAt || rec.startedAt)) || 0).getTime();
  return !!t && (Date.now() - t) < RETENTION_MS;
}

function isFreshComment(c) {
  const t = new Date((c && c.createdAt) || 0).getTime();
  return !!t && (Date.now() - t) < RETENTION_MS;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }
  if (!store.isConfigured()) { res.status(500).json({ error: '서버 저장소가 연결되지 않았어요.' }); return; }
  if (!authorized(req)) { res.status(401).json({ error: '권한이 없어요.' }); return; }

  const result = { submissionsRemoved: 0, commentsRemoved: 0 };
  try {
    // 1) 기간이 지난 면담 지우기
    const alive = {}; // 반 키 → { 면담 id: true } (남은 면담)
    const subKeys = await store.kv.scan('submissions:*');
    for (const k of subKeys) {
      const list = await store.kv.get(k);
      if (!Array.isArray(list)) continue;
      const keep = list.filter(isFresh);
      if (keep.length < list.length) {
        result.submissionsRemoved += list.length - keep.length;
        if (keep.length) await store.kv.set(k, keep, RETENTION_SEC); else await store.kv.del(k);
      }
      const ids = {};
      keep.forEach(function (x) { ids[x.id] = true; });
      alive[k.slice('submissions:'.length)] = ids;
    }

    // 2) 지워진 면담의 댓글, 그리고 기간이 지난 댓글 지우기 (키 모양: comments:<반 키>:<면담 id>)
    const cKeys = await store.kv.scan('comments:*');
    for (const k of cKeys) {
      const rest = k.slice('comments:'.length);
      const i = rest.lastIndexOf(':');
      if (i < 0) continue;
      const roomKey = rest.slice(0, i);
      const id = rest.slice(i + 1);
      if (!(alive[roomKey] && alive[roomKey][id])) {
        await store.kv.del(k);
        result.commentsRemoved += 1;
        continue;
      }
      const list = await store.kv.get(k);
      if (!Array.isArray(list)) continue;
      const keep = list.filter(isFreshComment);
      if (keep.length < list.length) {
        result.commentsRemoved += list.length - keep.length;
        if (keep.length) await store.kv.set(k, keep, RETENTION_SEC); else await store.kv.del(k);
      }
    }

    res.status(200).json({ ok: true, submissionsRemoved: result.submissionsRemoved, commentsRemoved: result.commentsRemoved });
  } catch (e) {
    res.status(500).json({ error: '정리 중 문제가 생겼어요.' });
  }
};
