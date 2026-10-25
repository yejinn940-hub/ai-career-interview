const crypto = require('crypto');
const store = require('./_store');

const MAX_RECORDS = 300;
// 개인정보 보유기간: 마지막 수정으로부터 30일이 지난 면담 기록은 자동으로 삭제됨
const RETENTION_DAYS = 30;
const RETENTION_MS = RETENTION_DAYS * 24 * 60 * 60 * 1000;
const RETENTION_SEC = RETENTION_DAYS * 24 * 60 * 60;

function isFresh(rec) {
  const t = new Date(rec.updatedAt || rec.startedAt || 0).getTime();
  return t && (Date.now() - t) < RETENTION_MS;
}

// 선생님이 지운 대화 줄을 학생 기기의 옛 기록이 다시 올리지 못하게 막기 위한 지문(해시)
function msgHash(m) {
  return crypto.createHash('sha1').update(String(m.role) + '\n' + String(m.content)).digest('hex').slice(0, 16);
}

function genId() {
  return 's' + Date.now() + Math.random().toString(36).slice(2, 8);
}

async function getRoom(teacherName, grade, classNum) {
  const key = store.roomKey(teacherName, grade, classNum);
  const room = (await store.getRoomRecord(key)).room;
  const blocked = store.roomBlock(room);
  if (blocked) { const e = new Error(blocked); e.blocked = true; throw e; }
  return { key: key, room: room };
}

async function getList(key) {
  const list = await store.kv.get('submissions:' + key);
  return Array.isArray(list) ? list.filter(isFresh) : [];
}

async function saveList(key, list) {
  if (list.length > MAX_RECORDS) {
    list.sort(function (a, b) { return new Date(b.updatedAt || b.startedAt) - new Date(a.updatedAt || a.startedAt); });
    list = list.slice(0, MAX_RECORDS);
  }
  list = list.filter(isFresh);
  await store.kv.set('submissions:' + key, list, RETENTION_SEC);
}

// 모둠 번호 오름차순(1모둠, 2모둠, … 10모둠), 같은 모둠이면 최근 수정 순
function groupNum(x) { var m = String(x.groupName || '').match(/\d+/); return m ? parseInt(m[0], 10) : 9999; }
function compareByGroup(a, b) {
  var d = groupNum(a) - groupNum(b);
  if (d) return d;
  var n = String(a.groupName || '').localeCompare(String(b.groupName || ''), 'ko');
  if (n) return n;
  return new Date(b.updatedAt) - new Date(a.updatedAt);
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  if (!store.isConfigured()) {
    res.status(500).json({ error: '서버 저장소가 아직 연결되지 않았어요. 관리자(선생님)에게 알려주세요.' });
    return;
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) { body = {}; }
  }
  body = body || {};
  const action = body.action;

  try {
    // ---- 학생 쪽: 자동 동기화 (진행 중 대화 포함 전체 기록) ----
    if (action === 'sync') {
      const { room, key } = await getRoom(body.teacherName, body.grade, body.classNum);
      if (!room) { res.status(404).json({ error: '반 정보를 찾을 수 없어요.' }); return; }

      const groupName = store.normalize(body.groupName) || '이름없음';
      let messages = Array.isArray(body.messages) ? body.messages.slice(0, 80).map(function (m) {
        return { role: m.role, content: String(m.content || '').slice(0, 2000) };
      }) : [];

      const list = await getList(key);
      let id = body.id;
      let rec = list.filter(function (x) { return x.id === id; })[0];
      const now = new Date().toISOString();
      // 선생님이 삭제한 줄은 다시 올라오지 않게 걸러냄
      if (rec && Array.isArray(rec.deletedHashes) && rec.deletedHashes.length) {
        const blocked = rec.deletedHashes;
        messages = messages.filter(function (m) { return blocked.indexOf(msgHash(m)) === -1; });
      }

      if (rec) {
        rec.groupName = groupName;
        rec.figureId = body.figureId;
        rec.figureName = body.figureName;
        rec.figureJob = body.figureJob;
        rec.messages = messages;
        rec.updatedAt = now;
      } else {
        id = id || genId();
        rec = {
          id: id,
          groupName: groupName,
          figureId: body.figureId,
          figureName: body.figureName,
          figureJob: body.figureJob,
          messages: messages,
          status: 'in_progress',
          shared: true,
          startedAt: now,
          updatedAt: now,
          submittedAt: null
        };
        list.push(rec);
      }

      await saveList(key, list);
      res.status(200).json({ ok: true, id: id });
      return;
    }

    // ---- 학생 쪽: "제출" 표시만 (데이터는 이미 자동 저장되어 있음) ----
    if (action === 'submit') {
      const { room, key } = await getRoom(body.teacherName, body.grade, body.classNum);
      if (!room) { res.status(404).json({ error: '반 정보를 찾을 수 없어요.' }); return; }

      const list = await getList(key);
      const rec = list.filter(function (x) { return x.id === body.id; })[0];
      if (!rec) { res.status(404).json({ error: '제출할 대화를 찾지 못했어요.' }); return; }
      rec.status = 'submitted';
      rec.submittedAt = new Date().toISOString();
      await saveList(key, list);
      res.status(200).json({ ok: true });
      return;
    }

    // ---- 학생 쪽: 제출 취소 (자기 모둠 것만 가능) ----
    if (action === 'unsubmit') {
      const { room, key } = await getRoom(body.teacherName, body.grade, body.classNum);
      if (!room) { res.status(404).json({ error: '반 정보를 찾을 수 없어요.' }); return; }

      const list = await getList(key);
      const rec = list.filter(function (x) { return x.id === body.id; })[0];
      if (!rec) { res.status(404).json({ error: '취소할 제출을 찾지 못했어요.' }); return; }

      const groupName = store.normalize(body.groupName);
      if (!groupName || rec.groupName !== groupName) {
        res.status(403).json({ error: '본인 모둠이 제출한 기록만 취소할 수 있어요.' });
        return;
      }

      rec.status = 'in_progress';
      rec.submittedAt = null;
      await saveList(key, list);
      res.status(200).json({ ok: true });
      return;
    }

    // ---- 공개: 공유된 면담을 보는 동안 주기적으로 부르는 가벼운 조회 (메시지 + 피드백, Redis 1회 요청) ----
    if (action === 'live') {
      const key = store.roomKey(body.teacherName, body.grade, body.classNum);
      const id = String(body.id || '');
      if (!id) { res.status(400).json({ error: '면담 정보를 찾을 수 없어요.' }); return; }
      const got = await store.kv.mget(['submissions:' + key, 'comments:' + key + ':' + id]);
      const list = Array.isArray(got[0]) ? got[0] : [];
      const rec = list.filter(function (x) { return x.id === id && x.shared; })[0];
      if (!rec) { res.status(200).json({ ok: true, gone: true }); return; }
      res.status(200).json({ ok: true, messages: rec.messages || [], updatedAt: rec.updatedAt, comments: Array.isArray(got[1]) ? got[1] : [] });
      return;
    }

    // ---- 공개: 학생이 기기 내 보관함을 정리할 때 쓰는, 서버에 남아있는 id 목록 ----
    // (선생님이 삭제한 기록을 학생 화면에서도 영구 삭제하기 위해 사용)
    if (action === 'student-ids') {
      const { room, key } = await getRoom(body.teacherName, body.grade, body.classNum);
      if (!room) { res.status(404).json({ error: '반 정보를 찾을 수 없어요.' }); return; }
      const list = await getList(key);
      const revs = {};
      list.forEach(function (x) { if (x.rev) revs[x.id] = x.rev; });
      res.status(200).json({ ok: true, ids: list.map(function (x) { return x.id; }), revs: revs });
      return;
    }

    // ---- 학생 쪽: 선생님이 줄을 지운 기록의 최신 내용을 받아 기기 내 기록도 함께 정리 (자기 모둠 것만) ----
    if (action === 'student-get') {
      const { room, key } = await getRoom(body.teacherName, body.grade, body.classNum);
      if (!room) { res.status(404).json({ error: '반 정보를 찾을 수 없어요.' }); return; }
      const list = await getList(key);
      const rec = list.filter(function (x) { return x.id === body.id; })[0];
      if (!rec || rec.groupName !== store.normalize(body.groupName)) { res.status(404).json({ error: '기록을 찾지 못했어요.' }); return; }
      res.status(200).json({ ok: true, messages: rec.messages || [], rev: rec.rev || 0 });
      return;
    }

    // ---- 공개: 학급에 공유된 면담 목록 (코드 불필요, 반 정보만 필요) ----
    if (action === 'shared-list') {
      const { room, key } = await getRoom(body.teacherName, body.grade, body.classNum);
      if (!room) { res.status(404).json({ error: '반 정보를 찾을 수 없어요.' }); return; }
      const list = await getList(key);
      const shared = list.filter(function (x) { return x.shared; })
        .sort(compareByGroup)
        .map(function (x) {
          return { id: x.id, groupName: x.groupName, figureName: x.figureName, figureJob: x.figureJob, messages: x.messages, updatedAt: x.updatedAt };
        });
      res.status(200).json({ ok: true, items: shared });
      return;
    }

    // ---- 아래부터는 선생님 전용 (PIN 필요) ----
    function checkPin(room, pin) {
      return room && String(room.pin) === String(pin || '');
    }

    if (action === 'teacher-list') {
      const { room, key } = await getRoom(body.teacherName, body.grade, body.classNum);
      if (!room) { res.status(404).json({ error: '반 정보를 찾을 수 없어요.' }); return; }
      if (!checkPin(room, body.pin)) { res.status(403).json({ error: 'PIN이 일치하지 않아요.' }); return; }
      const list = await getList(key);
      const meta = list
        .sort(compareByGroup)
        .map(function (x) {
          return {
            id: x.id, groupName: x.groupName, figureName: x.figureName, figureJob: x.figureJob,
            status: x.status, shared: x.shared, startedAt: x.startedAt, updatedAt: x.updatedAt,
            submittedAt: x.submittedAt, messageCount: (x.messages || []).length
          };
        });
      res.status(200).json({ ok: true, items: meta, teacherName: room.teacherName });
      return;
    }

    if (action === 'teacher-get') {
      const { room, key } = await getRoom(body.teacherName, body.grade, body.classNum);
      if (!room) { res.status(404).json({ error: '반 정보를 찾을 수 없어요.' }); return; }
      if (!checkPin(room, body.pin)) { res.status(403).json({ error: 'PIN이 일치하지 않아요.' }); return; }
      const list = await getList(key);
      const rec = list.filter(function (x) { return x.id === body.id; })[0];
      if (!rec) { res.status(404).json({ error: '대화를 찾지 못했어요.' }); return; }
      const comments = await store.kv.get('comments:' + key + ':' + rec.id);
      res.status(200).json({ ok: true, item: rec, comments: Array.isArray(comments) ? comments : [] });
      return;
    }

    // 선생님이 대화 기록에서 원하는 줄만 골라 삭제 (이름 등 개인정보가 들어간 줄 정리용)
    if (action === 'teacher-delete-messages') {
      const { room, key } = await getRoom(body.teacherName, body.grade, body.classNum);
      if (!room) { res.status(404).json({ error: '반 정보를 찾을 수 없어요.' }); return; }
      if (!checkPin(room, body.pin)) { res.status(403).json({ error: 'PIN이 일치하지 않아요.' }); return; }
      const list = await getList(key);
      const rec = list.filter(function (x) { return x.id === body.id; })[0];
      if (!rec) { res.status(404).json({ error: '대화를 찾지 못했어요.' }); return; }

      const msgs = rec.messages || [];
      const idxs = (Array.isArray(body.indexes) ? body.indexes : [body.index])
        .map(Number)
        .filter(function (n, i, a) { return Number.isInteger(n) && n >= 0 && n < msgs.length && a.indexOf(n) === i; })
        .sort(function (a, b) { return a - b; });
      if (!idxs.length) { res.status(400).json({ error: '삭제할 줄을 찾지 못했어요.' }); return; }

      rec.deletedHashes = (rec.deletedHashes || []).concat(idxs.map(function (i) { return msgHash(msgs[i]); })).slice(-500);
      rec.messages = msgs.filter(function (m, i) { return idxs.indexOf(i) === -1; });
      rec.rev = (rec.rev || 0) + 1;
      await saveList(key, list);

      // 줄이 줄어들면 피드백(메모)이 붙은 줄 번호도 함께 맞춰줌
      const cKey = 'comments:' + key + ':' + rec.id;
      const comments = await store.kv.get(cKey);
      if (Array.isArray(comments) && comments.length) {
        const nextComments = comments.filter(function (c) { return idxs.indexOf(Number(c.messageIndex)) === -1; })
          .map(function (c) {
            const shift = idxs.filter(function (d) { return d < Number(c.messageIndex); }).length;
            c.messageIndex = Number(c.messageIndex) - shift;
            return c;
          });
        await store.kv.set(cKey, nextComments, RETENTION_SEC);
      }
      res.status(200).json({ ok: true, messages: rec.messages });
      return;
    }

    if (action === 'teacher-rename') {
      const { room, key } = await getRoom(body.teacherName, body.grade, body.classNum);
      if (!room) { res.status(404).json({ error: '반 정보를 찾을 수 없어요.' }); return; }
      if (!checkPin(room, body.pin)) { res.status(403).json({ error: 'PIN이 일치하지 않아요.' }); return; }
      const list = await getList(key);
      const rec = list.filter(function (x) { return x.id === body.id; })[0];
      if (!rec) { res.status(404).json({ error: '대화를 찾지 못했어요.' }); return; }
      rec.groupName = store.normalize(body.groupName) || rec.groupName;
      await saveList(key, list);
      res.status(200).json({ ok: true });
      return;
    }

    if (action === 'teacher-delete') {
      const { room, key } = await getRoom(body.teacherName, body.grade, body.classNum);
      if (!room) { res.status(404).json({ error: '반 정보를 찾을 수 없어요.' }); return; }
      if (!checkPin(room, body.pin)) { res.status(403).json({ error: 'PIN이 일치하지 않아요.' }); return; }
      const list = (await getList(key)).filter(function (x) { return x.id !== body.id; });
      await saveList(key, list);
      await store.kv.del('comments:' + key + ':' + String(body.id || ''));
      res.status(200).json({ ok: true });
      return;
    }

    if (action === 'teacher-share') {
      const { room, key } = await getRoom(body.teacherName, body.grade, body.classNum);
      if (!room) { res.status(404).json({ error: '반 정보를 찾을 수 없어요.' }); return; }
      if (!checkPin(room, body.pin)) { res.status(403).json({ error: 'PIN이 일치하지 않아요.' }); return; }
      const list = await getList(key);
      const rec = list.filter(function (x) { return x.id === body.id; })[0];
      if (!rec) { res.status(404).json({ error: '대화를 찾지 못했어요.' }); return; }
      rec.shared = !!body.shared;
      await saveList(key, list);
      res.status(200).json({ ok: true });
      return;
    }

    res.status(400).json({ error: '알 수 없는 요청이에요.' });
  } catch (err) {
    if (err && err.blocked) { res.status(403).json({ error: err.message, blocked: true }); return; }
    console.error(err);
    res.status(500).json({ error: '서버에서 문제가 생겼어요. 잠시 후 다시 시도해주세요.' });
  }
};
