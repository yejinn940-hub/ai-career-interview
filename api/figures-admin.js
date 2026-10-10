const store = require('./_store');
const { getFigures, saveFigures, genFigureId } = require('./_figures');

async function checkTeacherAuth(body) {
  const key = store.roomKey(body.school, body.grade, body.classNum);
  const room = await store.kv.get('room:' + key);
  return !!(room && String(room.pin) === String(body.pin || ''));
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
    if (action === 'teacher-list') {
      if (!(await checkTeacherAuth(body))) { res.status(403).json({ error: 'PIN이 일치하지 않아요.' }); return; }
      const figures = await getFigures();
      res.status(200).json({ ok: true, items: figures });
      return;
    }

    if (action === 'teacher-add') {
      if (!(await checkTeacherAuth(body))) { res.status(403).json({ error: 'PIN이 일치하지 않아요.' }); return; }
      const name = store.normalize(body.name);
      const job = store.normalize(body.job);
      const material = String(body.material || '').trim();
      if (!name || !job || !material) {
        res.status(400).json({ error: '이름/직업/참고 자료를 모두 입력해주세요.' });
        return;
      }
      const figures = await getFigures();
      const id = genFigureId(name);
      figures.push({ id: id, name: name, job: job, material: material });
      await saveFigures(figures);
      res.status(200).json({ ok: true, id: id });
      return;
    }

    if (action === 'teacher-delete') {
      if (!(await checkTeacherAuth(body))) { res.status(403).json({ error: 'PIN이 일치하지 않아요.' }); return; }
      const figures = (await getFigures()).filter(function (f) { return f.id !== body.id; });
      await saveFigures(figures);
      res.status(200).json({ ok: true });
      return;
    }

    res.status(400).json({ error: '알 수 없는 요청이에요.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '서버에서 문제가 생겼어요. 잠시 후 다시 시도해주세요.' });
  }
};
