const store = require('./_store');

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
    if (action === 'teacher-login') {
      const grade = store.normalize(body.grade);
      const classNum = store.normalize(body.classNum);
      const teacherName = store.normalize(body.teacherName);
      const pin = String(body.pin || '').trim();

      if (!grade || !classNum || !teacherName || !pin) {
        res.status(400).json({ error: '학년/반/우리반 암호/PIN을 모두 입력해주세요.' });
        return;
      }
      if (pin.length < 4) {
        res.status(400).json({ error: 'PIN은 4자리 이상으로 만들어주세요.' });
        return;
      }

      const key = store.roomKey(teacherName, grade, classNum);
      const found = await store.getRoomRecord(key);
      const existing = found.room;
      const migrated = found.migrated;

      if (!existing) {
        // 새 반은 '승인 대기'로 만들어지고, 관리자가 승인해야 학생이 들어오고 면담을 쓸 수 있다.
        const autoOk = process.env.AUTO_APPROVE === '1';
        const room = { grade: grade, classNum: classNum, teacherName: teacherName, pin: store.hashPin(pin), status: autoOk ? 'approved' : 'pending', createdAt: new Date().toISOString() };
        await store.kv.set('room:' + key, room, 60 * 60 * 24 * 400);
        res.status(200).json({ ok: true, created: true, status: autoOk ? 'approved' : 'pending', message: autoOk ? '' : '반을 만들었어요. 관리자가 승인하면 사용할 수 있어요.', room: { grade: grade, classNum: classNum, teacherName: teacherName }, migrated: migrated });
        return;
      }

      if (!store.verifyPin(existing, pin)) {
        res.status(403).json({ error: 'PIN이 일치하지 않아요. 처음 반을 만들 때 설정한 PIN을 입력해주세요.' });
        return;
      }

      // 예전 평문 PIN은 로그인에 성공하면 해시로 바꿔 저장
      if (String(existing.pin).indexOf('h1$') !== 0) {
        existing.pin = store.hashPin(pin);
        await store.kv.set('room:' + key, existing, 60 * 60 * 24 * 400);
      }

      // 성함은 최신 입력으로 갱신(오타 수정 등 허용)
      if (existing.teacherName !== teacherName) {
        existing.teacherName = teacherName;
        await store.kv.set('room:' + key, existing, 60 * 60 * 24 * 400);
      }

      res.status(200).json({ ok: true, created: false, status: existing.status || 'approved', message: store.roomBlock(existing), room: { grade: grade, classNum: classNum, teacherName: existing.teacherName }, migrated: migrated });
      return;
    }

    if (action === 'student-join') {
      const teacherName = store.normalize(body.teacherName);
      const grade = store.normalize(body.grade);
      const classNum = store.normalize(body.classNum);
      const groupName = store.normalize(body.groupName);

      if (!teacherName || !grade || !classNum || !groupName) {
        res.status(400).json({ error: '우리반 암호/학년/반/모둠 이름을 모두 입력해주세요.' });
        return;
      }

      const key = store.roomKey(teacherName, grade, classNum);
      const room = (await store.getRoomRecord(key)).room;
      if (!room) {
        res.status(404).json({ error: '아직 선생님이 이 반을 만들지 않았어요. 선생님께 먼저 "선생님 페이지"에서 반을 만들어달라고 요청해주세요.' });
        return;
      }

      const blocked = store.roomBlock(room);
      if (blocked) { res.status(403).json({ error: blocked, blocked: true }); return; }
      res.status(200).json({ ok: true, room: { grade: grade, classNum: classNum, teacherName: room.teacherName } });
      return;
    }

    res.status(400).json({ error: '알 수 없는 요청이에요.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '서버에서 문제가 생겼어요. 잠시 후 다시 시도해주세요.' });
  }
};
