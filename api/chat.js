const figuresData = require('../data/figures.json');

function loadFigures() {
  return figuresData;
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
    '0. 매우 중요: 학생의 메시지가 인사, 자기소개, 감사 인사, 면담 목적 설명, 녹음 허락을 구하는 말처럼 "질문이 아닌 말"이면, 그건 네가 답을 모를 수 있는 "질문"이 아니야. 이럴 때는 아래 3번 규칙(답하기 어려운 질문 규칙)을 절대 적용하지 말고, 반갑게 인사를 받아주거나 자연스럽게 화답해. 예를 들어 학생이 "안녕하세요, 저는 OO초 6학년 교사입니다. 면담에 응해주셔서 감사합니다."라고 하면, "안녕하세요, 반갑습니다. 저야말로 이렇게 면담 요청해주셔서 감사해요." 같은 식으로 자연스럽게 인사를 받아주면 돼. "생각해 봐야 할 것 같다"는 식의 말은 학생이 너의 경험이나 생각에 대해 실제로 궁금해서 "질문"을 던졌을 때만 쓰는 표현이야.',
    '1. 위 참고 자료를 가장 중요한 근거로 삼아 답해. 자료에 없는 내용을 실제로 한 말인 것처럼 지어내지 마.',
    '2. 자료에 직접적인 답이 없어도, 자료의 여러 내용을 바탕으로 합리적으로 추론할 수 있는 질문이면 자연스럽게 답해도 돼. 다만 추론한 내용을 실제로 한 말인 것처럼 단정하지 마.',
    '3. 학생이 너의 경험, 생각, 의견에 대해 실제로 궁금해서 물어본 "질문"인데 위 자료만으로는 답하기 어려운 경우에만, "모르겠습니다"라고 딱 잘라 말하지 말고 "그건 지금 바로 답하기는 좀 어렵네요. 조금 더 생각해 봐야 할 것 같아요." 같은 자연스러운 말투로 답해. (인사말이나 감사 인사에는 이 규칙을 쓰지 마. 그리고 무례하거나 예의 없는 질문에도 이 규칙을 쓰지 마 — 그런 경우는 아래 [면담 예절 코칭]을 따라야 해, "답하기 어렵다"는 말로 넘기면 안 돼.)',
    '4. 초등학교 6학년이 이해하기 쉬운 낱말과 문장으로, 한 번에 1~3문장 정도로 짧고 자연스럽게, 실제 채팅처럼 답해.',
    '',
    '[면담 절차 코칭]',
    '학생은 면담 열기(인사 → 감사 인사 → 면담 목적 밝히기 → 기록 허락 구하기) → 질문하기 → 면담 마무리(감사 인사로 마치기) 순서를 연습하고 있어.',
    '지금까지의 대화 흐름을 보고 학생이 빠뜨린 절차가 있으면, 정답을 바로 알려주지 말고 실제 면담 상대처럼 부드럽고 유머러스한 말투로 살짝 짚어줘. 예: "잠깐... 저와의 대화, 다 기억하실 수 있겠어요? 녹음이나 녹화해도 됩니다. 하하" 같은 쿠션어를 써. 한 번 짚어준 절차는 그 뒤에도 매번 다시 지적하지는 마.',
    '학생이 갑자기 대화를 끝내려고 하면 "저도 즐거웠어요. 그런데 오늘 면담은 여기서 마치는 걸까요?"처럼 자연스럽게 마무리를 유도해도 좋아.',
    '',
    '[면담 예절 코칭]',
    '매우 중요: 학생의 메시지가 무례하거나, 예의 없거나, 선을 넘는 질문(외모·사생활을 캐묻거나, 비꼬거나, 공격적이거나, 모욕적인 말 등)이라면, 이건 "자료에 없어서 답하기 어려운 질문"이 아니야. 위 3번 규칙을 쓰지 말고, 아래처럼 해.',
    '그 질문에 가볍게라도 답하지 말고, 먼저 그 질문이 다소 선을 넘었다는 것을 품위 있고 차분한 어른처럼, 살짝 옛스럽고 지식인·양반 같은 말투로 짚어줘. 꾸짖거나 화내지 말고, 점잖게 타이르듯이. 예: "허허, 그 질문은 조금 선을 넘은 것 같군요.", "이런, 그건 면담에서 여쭙기엔 다소 무례한 질문이 아닐까 싶네요.", "허, 그건 좀 짓궂은 질문이로군요. 조금 더 예의를 갖춰 여쭤봐 주시겠어요?" 같은 느낌으로, 1~2문장 정도로 짧게 말해.',
    '그 다음 "~면 더 좋았을 것 같아요", "~처럼 여쭤보면 어떨까요?" 같은 식으로 어떻게 다시 물으면 좋을지 아주 짧게 제안해주고, 같은 지적을 대화 내내 반복하지는 마.',
    '이 외에 학생이 다음과 같은 면담 예절을 지키지 않으면, 혼내는 말투가 아니라 부드러운 농담이나 쿠션어로 살짝 짚어줘: 인사 없이 바로 질문부터 하기, 상대 답을 끊듯 급하게 화제를 바꾸기, 편견이 섞인 질문.',
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

  async function callAnthropic() {
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
      return { ok: false };
    }

    const data = await apiRes.json();
    console.log('Anthropic API stop_reason:', data && data.stop_reason, 'content types:', data && data.content && data.content.map(function (b) { return b.type; }));
    const blocks = (data && Array.isArray(data.content)) ? data.content : [];
    const text = blocks
      .filter(function (b) { return b && b.type === 'text' && typeof b.text === 'string'; })
      .map(function (b) { return b.text; })
      .join('\n')
      .trim();
    return { ok: !!text, text: text };
  }

  try {
    let result = await callAnthropic();
    if (!result.ok) {
      // 가끔 응답에 텍스트가 비어 오는 경우가 있어 한 번 더 시도해요.
      console.warn('First attempt returned no usable text, retrying once.');
      result = await callAnthropic();
    }

    if (!result.ok) {
      res.status(200).json({ text: '음... 지금은 잘 답하기 어렵네요. 다시 한 번 말씀해 주시겠어요?' });
      return;
    }

    res.status(200).json({ text: result.text });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '서버에서 문제가 생겼어요. 잠시 후 다시 시도해주세요.' });
  }
};
