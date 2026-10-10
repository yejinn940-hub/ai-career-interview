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
      const school = store.normalize(body.school);
      const grade = store.normalize(body.grade);
      const classNum = store.normalize(body.classNum);
      const teacherName = store.normalize(body.teacherName);
      const pin = String(body.pin || '').trim();

      if (!school || !grade || !classNum || !teacherName || !pin) {
        res.status(400).json({ error: '학교/학년/반/선생님 성함/PIN을 모두 입력해주세요.' });
        return;
      }
      if (pin.length < 4) {
        res.status(400).json({ error: 'PIN은 4자리 이상으로 만들어주세요.' });
        return;
      }

      const key = store.roomKey(school, grade, classNum);
      const existing = await store.kv.get('room:' + key);

      if (!existing) {
        const room = { school: school, grade: grade, classNum: classNum, teacherName: teacherName, pin: pin, createdAt: new Date().toISOString() };
        await store.kv.set('room:' + key, room);
        res.status(200).json({ ok: true, created: true, room: { school: school, grade: grade, classNum: classNum, teacherName: teacherName } });
        return;
      }

      if (existing.pin !== pin) {
        res.status(403).json({ error: 'PIN이 일치하지 않아요. 처음 반을 만들 때 설정한 PIN을 입력해주세요.' });
        return;
      }

      // 성함은 최신 입력으로 갱신(오타 수정 등 허용)
      if (existing.teacherName !== teacherName) {
        existing.teacherName = teacherName;
        await store.kv.set('room:' + key, existing);
      }

      res.status(200).json({ ok: true, created: false, room: { school: school, grade: grade, classNum: classNum, teacherName: existing.teacherName } });
      return;
    }

    if (action === 'student-join') {
      const school = store.normalize(body.school);
      const grade = store.normalize(body.grade);
      const classNum = store.normalize(body.classNum);
      const groupName = store.normalize(body.groupName);

      if (!school || !grade || !classNum || !groupName) {
        res.status(400).json({ error: '학교/학년/반/모둠 이름을 모두 입력해주세요.' });
        return;
      }

      const key = store.roomKey(school, grade, classNum);
      const room = await store.kv.get('room:' + key);
      if (!room) {
        res.status(404).json({ error: '아직 선생님이 이 반을 만들지 않았어요. 선생님께 먼저 "선생님 페이지"에서 반을 만들어달라고 요청해주세요.' });
        return;
      }

      res.status(200).json({ ok: true, room: { school: school, grade: grade, classNum: classNum, teacherName: room.teacherName } });
      return;
    }

    res.status(400).json({ error: '알 수 없는 요청이에요.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '서버에서 문제가 생겼어요. 잠시 후 다시 시도해주세요.' });
  }
};
