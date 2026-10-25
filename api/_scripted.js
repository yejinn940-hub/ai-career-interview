// API 없이(무료) 답하는 방식: 면담 인물 자료(material)에서 학생 질문과 가장 가까운 내용을 찾아 보여 준다.
// 화면(UI)은 AI 대화 방식과 똑같고, 답변 내용만 자료에서 가져온다. 자료에 없으면 없다고 솔직하게 말한다.

const STOP = ['어떻게', '어떤', '무엇', '뭐', '인가요', '이었나요', '였나요', '했나요', '하셨나요', '나요', '가요', '까요', '세요', '해요', '주세요', '있나요', '있어요', '알려', '말해', '궁금', '생각', '선수', '님', '그때', '정말', '혹시', '그리고', '그런데', '그럼'];

const SYN = [['망할 뻔', '파산 위기'], ['망할뻔', '파산 위기'], ['마음가짐', '마인드'], ['마음 가짐', '마인드'], ['기분', '느낌'], ['조언', '해주고 싶은 말'], ['망할', '파산'], ['망했', '파산'], ['망하', '파산'], ['돈 벌', '수입'], ['꿈', '꿈'], ['힘들', '어려'], ['그만두', '그만']];

function norm(s) {
  let t = String(s || '').toLowerCase().replace(/[?？!！.,~…"'“”‘’()\[\]]/g, ' ');
  STOP.forEach(function (w) { t = t.split(w).join(' '); });
  SYN.forEach(function (p) { t = t.split(p[0]).join(p[1]); });
  // 조사·어미 떼기 (남는 글자가 2자 이상일 때만)
  t = t.split(/\s+/).map(function (w) {
    const m = w.replace(/(이에요|예요|에요|이야|으로|에서|에게|은|는|이|가|을|를|에|의|도|과|와|야|요)$/, '');
    return m.length >= 2 ? m : w;
  }).join(' ');
  return t.replace(/\s+/g, ' ').trim();
}

function bigrams(s) {
  const out = new Set();
  norm(s).split(' ').forEach(function (w) {
    for (let i = 0; i < w.length - 1; i++) out.add(w.slice(i, i + 2));
  });
  return out;
}

function overlap(a, b) {
  let n = 0;
  a.forEach(function (x) { if (b.has(x)) n++; });
  return n;
}

function cleanSource(line) {
  return line.replace(/[^.。]*(?:근거로 답한다|답한다|지어내지)[^.。]*[.。]?\s*/g, '').replace(/\[출처:\s*([^\]]*)\]/g, '(출처: $1)').replace(/^- /, '').trim();
}

// material을 (1) 예상 질문-답 묶음, (2) 출처별 문단으로 나눈다.
function parse(material) {
  const lines = String(material || '').split('\n');
  const qas = [];
  const sections = [];
  let cur = null;
  let inQA = false;
  lines.forEach(function (raw) {
    const line = raw.trim();
    if (!line) { return; }
    if (line.indexOf('[예상 질문과 답') === 0) { inQA = true; cur = null; return; }
    if (inQA) {
      if (line.indexOf('Q.') === 0) { cur = { q: line.slice(2).trim(), lines: [] }; qas.push(cur); return; }
      if (cur) cur.lines.push(line);
      return;
    }
    if (line.charAt(0) === '[' && line.indexOf('[출처:') === 0) {
      cur = { source: cleanSource(line).replace(/^\(출처:\s*/, '').replace(/\)$/, ''), sentences: [] };
      sections.push(cur);
      return;
    }
    if (cur && cur.sentences) {
      line.split(/(?<=[.다요])\s+/).forEach(function (s) { if (s.trim()) cur.sentences.push(s.trim()); });
    }
  });
  return { qas: qas, sections: sections };
}

function bestQA(question, qas) {
  const qb = bigrams(question);
  if (!qb.size) return null;
  let best = null, bestScore = 0;
  qas.forEach(function (qa) {
    const tb = bigrams(qa.q + ' ' + qa.lines.join(' '));
    const hit = overlap(qb, bigrams(qa.q));
    const hitAll = overlap(qb, tb);
    const score = (hit * 2 + hitAll) / (qb.size * 1.6);
    if (hit >= 2 || (hit >= 1 && qb.size <= 2)) {
      if (score > bestScore) { bestScore = score; best = qa; }
    }
  });
  return bestScore >= 0.5 ? best : null;
}

function bestSentences(question, sections) {
  const qb = bigrams(question);
  if (qb.size < 2) return null;
  const cand = [];
  sections.forEach(function (sec) {
    sec.sentences.forEach(function (s, i) {
      const hit = overlap(qb, bigrams(s));
      if (hit >= 2) cand.push({ hit: hit, s: s, sec: sec, i: i });
    });
  });
  if (!cand.length) return null;
  cand.sort(function (a, b) { return b.hit - a.hit; });
  const top = cand[0];
  if (top.hit / qb.size < 0.5) return null;
  const pick = [top];
  const next = top.sec.sentences[top.i + 1];
  const text = [top.s].concat(next && (top.s + next).length < 260 ? [next] : []).join(' ');
  return { text: text, source: top.sec.source };
}

const RUDE = /(바보|멍청|못생|꺼져|죽어|죽을|쓰레기|미친|ㅅㅂ|씨발|병신|돈\s*많|뚱뚱|애인|여자친구|남자친구|결혼.*언제)/;

function isGreeting(t) { return /^(안녕|반갑|처음 뵙|만나서|하이|안뇽)/.test(t) || (/(안녕하세요|반갑습니다|만나서)/.test(t) && !/[?？]/.test(t) && t.length < 40); }
function isThanks(t) { return /(감사|고맙|고마워)/.test(t) && !/[?？]/.test(t); }
function isClosing(t) { return /(마치겠|마칠게|끝내|이만|다음에|수고하세요|안녕히)/.test(t); }
function isPermission(t) { return /(녹음|녹화|메모|기록|사진)/.test(t) && /(해도|될까|괜찮|허락|가능)/.test(t); }

function answer(figure, question) {
  const t = String(question || '').trim();
  if (RUDE.test(t)) return '허허, 그 질문은 조금 선을 넘은 것 같군요. "~가 궁금해요"처럼 조금 더 예의를 갖춰 여쭤봐 주시겠어요?';
  if (isPermission(t)) return '네, 편하게 기록하셔도 좋습니다.';
  if (isClosing(t)) return '저도 즐거웠어요. 그런데 오늘 면담은 여기서 마치는 걸까요?';
  if (isThanks(t)) return '도움이 되었다니 저도 기쁘네요.';
  if (isGreeting(t)) return '반갑습니다, 만나서 기쁘네요.';

  const parsed = parse(figure.material);
  const qa = bestQA(t, parsed.qas);
  if (qa) {
    const body = qa.lines
      .filter(function (l) { return l.indexOf('찾지 못함') === -1 || qa.lines.length === 1; })
      .map(cleanSource)
      .join('\n');
    return '공개된 인터뷰 자료에 이런 내용이 있어요.\n' + body;
  }
  const hit = bestSentences(t, parsed.sections);
  if (hit) return '공개된 인터뷰 자료에 이런 내용이 있어요.\n' + hit.text + '\n(출처: ' + hit.source + ')';

  const sample = parsed.qas.slice(0, 3).map(function (x) { return '"' + x.q.split(' / ')[0] + '"'; }).join(', ');
  return '그건 공개된 인터뷰 자료에서는 찾지 못했어요.' + (sample ? ' 예를 들면 ' + sample + ' 같은 질문은 자료가 있어요.' : '');
}

module.exports = { answer: answer, parse: parse };
