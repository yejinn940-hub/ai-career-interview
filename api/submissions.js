const store = require('./_store');

const MAX_RECORDS = 300;

function genId() {
  return 's' + Date.now() + Math.random().toString(36).slice(2, 8);
}

async function getRoom(school, grade, classNum) {
  const key = store.roomKey(school, grade, classNum);
  const room = await store.kv.get('room:' + key);
  return { key: key, room: room };
}

async function getList(key) {
  const list = await store.kv.get('submissions:' + key);
  return Array.isArray(list) ? list : [];
}

async function saveList(key, list) {
  if (list.length > MAX_RECORDS) {
    list.sort(function (a, b) { return new Date(b.updatedAt || b.startedAt) - new Date(a.updatedAt || a.startedAt); });
    list = list.slice(0, MAX_RECORDS);
  }
  await store.kv.set('submissions:' + key, list);
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
      const { room, key } = await getRoom(body.school, body.grade, body.classNum);
      if (!room) { res.status(404).json({ error: '반 정보를 찾을 수 없어요.' }); return; }

      const groupName = store.normalize(body.groupName) || '이름없음';
      const messages = Array.isArray(body.messages) ? body.messages.slice(0, 80).map(function (m) {
        return { role: m.role, content: String(m.content || '').slice(0, 2000) };
      }) : [];

      const list = await getList(key);
      let id = body.id;
      let rec = list.filter(function (x) { return x.id === id; })[0];
      const now = new Date().toISOString();

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
          shared: false,
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
      const { room, key } = await getRoom(body.school, body.grade, body.classNum);
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
      const { room, key } = await getRoom(body.school, body.grade, body.classNum);
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

    // ---- 공개: 학급에 공유된 면담 목록 (코드 불필요, 반 정보만 필요) ----
    if (action === 'shared-list') {
      const { room, key } = await getRoom(body.school, body.grade, body.classNum);
      if (!room) { res.status(404).json({ error: '반 정보를 찾을 수 없어요.' }); return; }
      const list = await getList(key);
      const shared = list.filter(function (x) { return x.shared; })
        .sort(function (a, b) { return new Date(b.updatedAt) - new Date(a.updatedAt); })
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
      const { room, key } = await getRoom(body.school, body.grade, body.classNum);
      if (!room) { res.status(404).json({ error: '반 정보를 찾을 수 없어요.' }); return; }
      if (!checkPin(room, body.pin)) { res.status(403).json({ error: 'PIN이 일치하지 않아요.' }); return; }
      const list = await getList(key);
      const meta = list
        .sort(function (a, b) { return new Date(b.updatedAt) - new Date(a.updatedAt); })
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
      const { room, key } = await getRoom(body.school, body.grade, body.classNum);
      if (!room) { res.status(404).json({ error: '반 정보를 찾을 수 없어요.' }); return; }
      if (!checkPin(room, body.pin)) { res.status(403).json({ error: 'PIN이 일치하지 않아요.' }); return; }
      const list = await getList(key);
      const rec = list.filter(function (x) { return x.id === body.id; })[0];
      if (!rec) { res.status(404).json({ error: '대화를 찾지 못했어요.' }); return; }
      res.status(200).json({ ok: true, item: rec });
      return;
    }

    if (action === 'teacher-rename') {
      const { room, key } = await getRoom(body.school, body.grade, body.classNum);
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
      const { room, key } = await getRoom(body.school, body.grade, body.classNum);
      if (!room) { res.status(404).json({ error: '반 정보를 찾을 수 없어요.' }); return; }
      if (!checkPin(room, body.pin)) { res.status(403).json({ error: 'PIN이 일치하지 않아요.' }); return; }
      const list = (await getList(key)).filter(function (x) { return x.id !== body.id; });
      await saveList(key, list);
      res.status(200).json({ ok: true });
      return;
    }

    if (action === 'teacher-share') {
      const { room, key } = await getRoom(body.school, body.grade, body.classNum);
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
    console.error(err);
    res.status(500).json({ error: '서버에서 문제가 생겼어요. 잠시 후 다시 시도해주세요.' });
  }
};
