// 학급에 공유된 면담에 모둠끼리 메시지별로 피드백(메모)을 남기는 기능.
const store = require('./_store');

const MAX_COMMENTS_PER_SUBMISSION = 200;

function commentsKey(roomKey, submissionId) {
  return 'comments:' + roomKey + ':' + submissionId;
}

function genId() {
  return 'c' + Date.now() + Math.random().toString(36).slice(2, 8);
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
    const key = store.roomKey(body.teacherName, body.grade, body.classNum);
    const room = (await store.getRoomRecord(key)).room;
    if (!room) { res.status(404).json({ error: '반 정보를 찾을 수 없어요.' }); return; }

    const submissionId = String(body.submissionId || '');
    if (!submissionId) { res.status(400).json({ error: '면담 정보를 찾을 수 없어요.' }); return; }
    const storeKey = commentsKey(key, submissionId);

    if (action === 'list') {
      const list = await store.kv.get(storeKey);
      res.status(200).json({ ok: true, items: Array.isArray(list) ? list : [] });
      return;
    }

    if (action === 'add') {
      const groupName = store.normalize(body.groupName);
      const text = String(body.text || '').trim().slice(0, 300);
      const messageIndex = Number(body.messageIndex);
      if (!groupName || !text || isNaN(messageIndex)) {
        res.status(400).json({ error: '모둠 이름과 피드백 내용을 입력해주세요.' });
        return;
      }
      const list = (await store.kv.get(storeKey)) || [];
      const comment = { id: genId(), messageIndex: messageIndex, groupName: groupName, text: text, createdAt: new Date().toISOString() };
      list.push(comment);
      if (list.length > MAX_COMMENTS_PER_SUBMISSION) list.splice(0, list.length - MAX_COMMENTS_PER_SUBMISSION);
      await store.kv.set(storeKey, list, 60 * 60 * 24 * 30);
      res.status(200).json({ ok: true, comment: comment });
      return;
    }

    // 선생님 전용: 다른 학생이 남긴 피드백(댓글) 삭제 (PIN 필요)
    if (action === 'teacher-delete') {
      if (String(room.pin) !== String(body.pin || '')) { res.status(403).json({ error: 'PIN이 일치하지 않아요.' }); return; }
      const commentId = String(body.commentId || '');
      const list = (await store.kv.get(storeKey)) || [];
      const next = list.filter(function (c) { return c.id !== commentId; });
      if (next.length === list.length) { res.status(404).json({ error: '피드백을 찾지 못했어요.' }); return; }
      await store.kv.set(storeKey, next, 60 * 60 * 24 * 30);
      res.status(200).json({ ok: true, items: next });
      return;
    }

    res.status(400).json({ error: '알 수 없는 요청이에요.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '서버에서 문제가 생겼어요. 잠시 후 다시 시도해주세요.' });
  }
};
