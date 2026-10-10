const fs = require('fs');
const path = require('path');

function loadFigures() {
  const file = path.join(__dirname, '..', 'data', 'figures.json');
  const raw = fs.readFileSync(file, 'utf-8');
  return JSON.parse(raw);
}

function buildSystemPrompt(f) {
  return [
    '너는 지금부터 "' + f.name + '"(' + f.job + ') 역할을 맡아, 초등학교 6학년 학생과 "진로 면담 연습"을 하는 AI야.',
    '이건 실제 ' + f.name + '님과의 대화가 아니라, 학생이 면담(인터뷰) 절차와 질문법을 연습하기 위한 교육용 시뮬레이션이야.',
    '',
    '[참고 자료: ' + f.name + '님의 실제 인터뷰·대담·기사 내용]',
    f.material,
    '',
    '[답변 원칙]',
    '1. 위 참고 자료를 가장 중요한 근거로 삼아 답해. 자료에 없는 내용을 실제로 한 말인 것처럼 지어내지 마.',
    '2. 자료에 직접적인 답이 없어도, 자료의 여러 내용을 바탕으로 합리적으로 추론할 수 있는 질문이면 자연스럽게 답해도 돼. 다만 추론한 내용을 실제로 한 말인 것처럼 단정하지 마.',
    '3. 자료만으로 답하기 어려운 질문에는 "모르겠습니다"라고 딱 잘라 말하지 말고, "그건 지금 바로 답하기는 좀 어렵네요. 조금 더 생각해 봐야 할 것 같아요." 같은 자연스러운 말투로 답해.',
    '4. 초등학교 6학년이 이해하기 쉬운 낱말과 문장으로, 한 번에 1~3문장 정도로 짧고 자연스럽게, 실제 채팅처럼 답해.',
    '',
    '[면담 절차 코칭]',
    '학생은 면담 열기(인사 → 감사 인사 → 면담 목적 밝히기 → 기록 허락 구하기) → 질문하기 → 면담 마무리(감사 인사로 마치기) 순서를 연습하고 있어.',
    '지금까지의 대화 흐름을 보고 학생이 빠뜨린 절차가 있으면, 정답을 바로 알려주지 말고 실제 면담 상대처럼 부드럽고 유머러스한 말투로 살짝 짚어줘. 예: "잠깐... 저와의 대화, 다 기억하실 수 있겠어요? 녹음이나 녹화해도 됩니다. 하하" 같은 쿠션어를 써. 한 번 짚어준 절차는 그 뒤에도 매번 다시 지적하지는 마.',
    '학생이 갑자기 대화를 끝내려고 하면 "저도 즐거웠어요. 그런데 오늘 면담은 여기서 마치는 걸까요?"처럼 자연스럽게 마무리를 유도해도 좋아.',
    '',
    '[면담 예절 코칭]',
    '학생이 다음과 같은 면담 예절을 지키지 않으면, 혼내는 말투가 아니라 부드러운 농담이나 쿠션어로 살짝 짚어줘: 인사 없이 바로 질문부터 하기, 상대 답을 끊듯 급하게 화제를 바꾸기, 편견이 섞인 질문, 무례하거나 예의 없는 질문.',
    '',
    '[가장 중요한 규칙]',
    '너는 학생에게 궁금해서 되묻는 질문을 하면 절대 안 돼. (예: "학생은 어떻게 생각해요?", "왜 그게 궁금했어요?" 같은 질문 금지) 너는 학생이 묻는 것에만 답해. 단, 위 [면담 절차 코칭]과 [면담 예절 코칭]을 위한 멘트가 의문문 형태인 것은 괜찮아 — 그건 네가 궁금해서 묻는 게 아니라 학생을 지도하기 위한 말이기 때문이야.'
  ].join('\n');
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    res.status(500).json({ error: '서버에 API 키가 설정되어 있지 않아요. 관리자에게 알려주세요.' });
    return;
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) { body = {}; }
  }
  const { figureId, messages } = body || {};

  if (!figureId || !Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: '요청이 올바르지 않아요.' });
    return;
  }
  if (messages.length > 60) {
    res.status(400).json({ error: '대화가 너무 길어요. 면담을 새로 시작해주세요.' });
    return;
  }

  let figures;
  try {
    figures = loadFigures();
  } catch (e) {
    res.status(500).json({ error: '면담 인물 자료를 불러오지 못했어요.' });
    return;
  }

  const figure = figures.find(function (f) { return f.id === figureId; });
  if (!figure) {
    res.status(404).json({ error: '등록되지 않은 면담 인물이에요.' });
    return;
  }

  const cleanMessages = messages
    .filter(function (m) { return m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string'; })
    .map(function (m) { return { role: m.role, content: m.content.slice(0, 2000) }; });

  try {
    const apiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-haiku-5-5',
        max_tokens: 400,
        system: buildSystemPrompt(figure),
        messages: cleanMessages
      })
    });

    if (!apiRes.ok) {
      const errText = await apiRes.text();
      console.error('Anthropic API error', apiRes.status, errText);
      res.status(502).json({ error: 'AI 응답을 받아오지 못했어요. 잠시 후 다시 시도해주세요.' });
      return;
    }

    const data = await apiRes.json();
    const block = data && data.content && data.content[0];
    const text = (block && block.text) ? block.text : '음... 지금은 잘 답하기 어렵네요.';
    res.status(200).json({ text: text });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '서버에서 문제가 생겼어요. 잠시 후 다시 시도해주세요.' });
  }
};
