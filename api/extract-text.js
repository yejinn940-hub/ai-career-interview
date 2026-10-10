// 참고 자료용 텍스트 추출: PDF / Word(.docx, .doc) 파일 또는 웹사이트 링크에서
// 본문 텍스트를 뽑아낸다. 선생님이 "면담 인물 관리" 화면에서 자료를 올리면
// 여기서 텍스트로 바꿔서 돌려주고, 선생님이 검토·수정한 뒤 등록한다.

const MAX_CHARS = 15000;

function clip(text) {
  const t = String(text || '').replace(/\r\n/g, '\n').replace(/[ \t]+\n/g, '\n').trim();
  if (t.length > MAX_CHARS) {
    return t.slice(0, MAX_CHARS) + '\n\n(※ 내용이 길어 일부만 가져왔어요. 필요하면 직접 이어서 붙여넣어 주세요.)';
  }
  return t;
}

function stripHtml(html) {
  let s = String(html || '');
  s = s.replace(/<script[\s\S]*?<\/script>/gi, ' ');
  s = s.replace(/<style[\s\S]*?<\/style>/gi, ' ');
  s = s.replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ');
  s = s.replace(/<(br|p|div|li|h[1-6]|tr)[^>]*>/gi, '\n');
  s = s.replace(/<[^>]+>/g, ' ');
  s = s
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
  s = s.split('\n').map(function (line) { return line.replace(/[ \t]+/g, ' ').trim(); }).filter(Boolean).join('\n');
  return s;
}

async function extractFromUrl(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch (e) {
    throw new Error('올바른 주소가 아니에요.');
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('http 또는 https 주소만 가져올 수 있어요.');
  }
  const resp = await fetch(parsed.toString(), {
    headers: { 'user-agent': 'Mozilla/5.0 (compatible; AI-career-interview-bot/1.0)' }
  });
  if (!resp.ok) {
    throw new Error('페이지를 불러오지 못했어요 (상태 코드 ' + resp.status + ').');
  }
  const contentType = resp.headers.get('content-type') || '';
  if (contentType.indexOf('text/html') === -1 && contentType.indexOf('text') === -1) {
    throw new Error('이 주소는 웹페이지 형식이 아니에요.');
  }
  const html = await resp.text();
  return clip(stripHtml(html));
}

async function extractFromFile(filename, mime, buffer) {
  const lower = String(filename || '').toLowerCase();

  if (lower.endsWith('.pdf') || mime === 'application/pdf') {
    const pdfParse = require('pdf-parse');
    const data = await pdfParse(buffer);
    return clip(data.text);
  }

  if (lower.endsWith('.docx') || mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    const mammoth = require('mammoth');
    const result = await mammoth.extractRawText({ buffer: buffer });
    return clip(result.value);
  }

  if (lower.endsWith('.doc') || mime === 'application/msword') {
    const WordExtractor = require('word-extractor');
    const extractor = new WordExtractor();
    const doc = await extractor.extract(buffer);
    return clip(doc.getBody());
  }

  if (lower.endsWith('.hwp')) {
    const err = new Error('아쉽지만 한글(.hwp) 파일은 아직 지원하지 않아요. 한글 프로그램에서 "다른 이름으로 저장" → Word(.docx) 또는 PDF로 바꿔서 다시 올려주시거나, 내용을 복사해서 직접 붙여넣어 주세요.');
    err.userFacing = true;
    throw err;
  }

  const err = new Error('지원하지 않는 파일 형식이에요. PDF, Word(.docx/.doc) 파일만 올릴 수 있어요.');
  err.userFacing = true;
  throw err;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) { body = {}; }
  }
  body = body || {};
  const action = body.action;

  try {
    if (action === 'url') {
      const url = String(body.url || '').trim();
      if (!url) { res.status(400).json({ error: '주소를 입력해주세요.' }); return; }
      const text = await extractFromUrl(url);
      if (!text) { res.status(200).json({ ok: true, text: '', warning: '본문을 찾지 못했어요. 직접 복사해서 붙여넣어 주세요.' }); return; }
      res.status(200).json({ ok: true, text: text });
      return;
    }

    if (action === 'file') {
      const filename = body.filename || '';
      const mime = body.mime || '';
      const dataBase64 = body.dataBase64 || '';
      if (!dataBase64) { res.status(400).json({ error: '파일을 선택해주세요.' }); return; }
      const buffer = Buffer.from(dataBase64, 'base64');
      if (buffer.length > 8 * 1024 * 1024) {
        res.status(400).json({ error: '파일 용량이 너무 커요 (8MB 이하로 올려주세요).' });
        return;
      }
      const text = await extractFromFile(filename, mime, buffer);
      res.status(200).json({ ok: true, text: text });
      return;
    }

    res.status(400).json({ error: '알 수 없는 요청이에요.' });
  } catch (err) {
    console.error(err);
    res.status(err.userFacing ? 400 : 500).json({ error: err.message || '자료를 가져오지 못했어요.' });
  }
};
