const store = require('./_store');
const { getFigures, saveFigures, genFigureId } = require('./_figures');

async function checkTeacherAuth(body) {
  const key = store.roomKey(body.teacherName, body.grade, body.classNum);
  const room = (await store.getRoomRecord(key)).room;
  if (!room || store.roomBlock(room)) return false;
  return await store.verifyTeacher(key, room, body);
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
      if (!(await checkTeacherAuth(body))) { store.sendAuthError(res, body); return; }
      const figures = await getFigures();
      res.status(200).json({ ok: true, items: figures });
      return;
    }

    if (action === 'teacher-add') {
      if (!(await checkTeacherAuth(body))) { store.sendAuthError(res, body); return; }
      const name = store.normalize(body.name);
      const job = store.normalize(body.job);
      const material = String(body.material || '').trim();
      if (!name || !job || !material) {
        res.status(400).json({ error: '이름/직업/참고 자료를 모두 입력해주세요.' });
        return;
      }
      let photo = typeof body.photo === 'string' ? body.photo.trim() : '';
      if (photo && !/^data:image\//.test(photo)) {
        photo = '';
      }
      if (photo && photo.length > 700000) {
        res.status(400).json({ error: '사진 용량이 너무 커요. 더 작은 사진으로 다시 올려주세요.' });
        return;
      }
      const figures = await getFigures();
      const id = genFigureId(name);
      const record = { id: id, name: name, job: job, material: material };
      if (photo) record.photo = photo;
      figures.push(record);
      await saveFigures(figures);
      res.status(200).json({ ok: true, id: id });
      return;
    }

    if (action === 'teacher-delete') {
      if (!(await checkTeacherAuth(body))) { store.sendAuthError(res, body); return; }
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
