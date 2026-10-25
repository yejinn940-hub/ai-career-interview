/*
 * 이용약관 (팝업)
 *
 * ▶ 고쳐 쓰는 방법
 *   - 아래 글에서 괄호 ( ) 안의 내용이 선생님이 직접 고쳐 쓰는 부분이에요.
 *   - 글자만 바꾸면 되고, 따옴표(' ')와 쉼표(,)는 지우지 마세요.
 *   - 학생 화면과 선생님 화면 맨 아래 링크가 모두 이 파일의 내용을 보여줘요.
 */
(function () {
  'use strict';

  var TERMS = {
    title: '이용약관',
    sections: [
      {
        h: '제1조 (목적)',
        p: ['이 약관은 (OO초등학교 6학년 O반) 수업에서 사용하는 "AI가상면담" 웹앱(이하 "서비스")의 이용 조건과 이용자의 지켜야 할 일을 정하는 것을 목적으로 합니다.']
      },
      {
        h: '제2조 (서비스 내용)',
        p: [
          '이 서비스는 6학년 국어 "궁금한 점을 해결해요" 단원에서 진로 인물과의 면담(인터뷰)을 연습하기 위한 수업용 웹앱입니다.',
          '인물은 실제 사람이 아니라, 공개된 인터뷰·기사 자료를 바탕으로 AI가 답하는 연습용 상대입니다. 화면에 나오는 답변은 실제 인물이 한 말과 다를 수 있습니다.'
        ]
      },
      {
        h: '제3조 (이용 대상)',
        p: ['서비스는 (선생님)이 만든 반의 학생과 선생님이 수업 목적으로 이용할 수 있습니다. 회원가입과 로그인은 없습니다.']
      },
      {
        h: '제4조 (이용자가 지켜야 할 일)',
        items: [
          '이름, 전화번호, 주소, 사진 등 나 또는 다른 사람의 개인정보를 입력하지 않습니다. 자기소개는 "OO초 O학년 O반 O모둠 학생들입니다"처럼 합니다.',
          '인물이나 친구, 다른 모둠에게 욕설·비방·놀리는 말을 쓰지 않고, 면담 예절을 지킵니다.',
          '선생님은 PIN을 다른 사람에게 알려 주지 않습니다.',
          '서비스를 수업 목적 외로 쓰거나 서비스 운영을 방해하는 행동을 하지 않습니다.'
        ]
      },
      {
        h: '제5조 (서비스의 제공과 변경)',
        p: ['서비스는 수업을 위해 무료로 제공되며, 수업 상황이나 운영 사정에 따라 예고 없이 내용이 바뀌거나 중단될 수 있습니다.']
      },
      {
        h: '제6조 (책임의 한계)',
        p: [
          'AI의 답변은 정확하지 않거나 최신 내용이 아닐 수 있습니다. 중요한 내용은 출처를 확인해 보세요.',
          '이용자의 기기 문제나 인터넷 환경 때문에 생기는 불편에 대해서는 책임지기 어렵습니다.'
        ]
      },
      {
        h: '제7조 (저작권)',
        p: [
          '서비스의 화면과 프로그램의 저작권은 (제작자: 선생님 이름)에게 있습니다.',
          '인물 자료와 사진의 저작권은 각 출처의 권리자에게 있습니다. 학생이 작성한 면담 내용은 수업 활동 결과물로, 선생님이 수업 확인과 평가를 위해 볼 수 있습니다.'
        ]
      },
      {
        h: '제8조 (문의)',
        p: ['서비스에 대한 문의는 (선생님 이름 / 학교 연락처)로 해 주세요.']
      },
      {
        h: '부칙',
        p: ['이 약관은 (2026년 10월 25일)부터 시행합니다.']
      }
    ]
  };

  var DOCS = { terms: TERMS };

  var CSS = [
    '.legal-footer{margin-top:auto;padding:18px 20px 16px;text-align:center;font-size:.72rem;color:#8A8F99}',
    '.legal-footer button{background:none;border:none;color:inherit;font:inherit;cursor:pointer;text-decoration:underline;padding:2px 6px}',
    '.legal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;padding:16px;z-index:9999}',
    '.legal-overlay[hidden]{display:none}',
    '.legal-dialog{background:var(--surface,#fff);color:var(--ink,#1C2430);width:100%;max-width:640px;max-height:85vh;border-radius:16px;display:flex;flex-direction:column;box-shadow:0 10px 40px rgba(0,0,0,.3)}',
    '.legal-head{display:flex;justify-content:space-between;align-items:center;padding:14px 18px;border-bottom:1px solid var(--ai-bubble-border,#E1E5EC)}',
    '.legal-head h2{margin:0;font-size:1.05rem}',
    '.legal-close{background:none;border:none;font-size:1.2rem;cursor:pointer;color:inherit;padding:4px 8px}',
    '.legal-body{padding:6px 18px 18px;overflow-y:auto;font-size:.84rem;line-height:1.65}',
    '.legal-body h3{font-size:.92rem;margin:16px 0 4px}',
    '.legal-body p{margin:4px 0}',
    '.legal-body ul{margin:4px 0;padding-left:20px}',
    '.legal-note{color:var(--muted,#667085);font-size:.76rem}'
  ].join('\n');

  function el(tag, text, cls) {
    var e = document.createElement(tag);
    if (text != null) e.textContent = text;
    if (cls) e.className = cls;
    return e;
  }

  var overlay = null;
  var lastFocus = null;

  function ensureOverlay() {
    if (overlay) return overlay;
    overlay = el('div', null, 'legal-overlay');
    overlay.hidden = true;
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closeLegal();
    });
    document.body.appendChild(overlay);
    return overlay;
  }

  function openLegal(kind) {
    var doc = DOCS[kind];
    if (!doc) return;
    var ov = ensureOverlay();
    lastFocus = document.activeElement;
    ov.innerHTML = '';

    var dialog = el('div', null, 'legal-dialog');
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-label', doc.title);

    var head = el('div', null, 'legal-head');
    head.appendChild(el('h2', doc.title));
    var close = el('button', '✕', 'legal-close');
    close.type = 'button';
    close.setAttribute('aria-label', '닫기');
    close.addEventListener('click', closeLegal);
    head.appendChild(close);

    var body = el('div', null, 'legal-body');
    doc.sections.forEach(function (s) {
      if (s.h) body.appendChild(el('h3', s.h));
      (s.p || []).forEach(function (t) { body.appendChild(el('p', t)); });
      if (s.items) {
        var ul = document.createElement('ul');
        s.items.forEach(function (t) { ul.appendChild(el('li', t)); });
        body.appendChild(ul);
      }
      if (s.note) body.appendChild(el('p', s.note, 'legal-note'));
    });

    dialog.appendChild(head);
    dialog.appendChild(body);
    ov.appendChild(dialog);
    ov.hidden = false;
    close.focus();
  }

  function closeLegal() {
    if (!overlay) return;
    overlay.hidden = true;
    overlay.innerHTML = '';
    if (lastFocus && lastFocus.focus) { try { lastFocus.focus(); } catch (e) { /* noop */ } }
  }

  // 화면 맨 아래 링크(data-legal="terms" / "privacy")를 누르면 팝업을 연다
  document.addEventListener('click', function (e) {
    var t = e.target.closest ? e.target.closest('[data-legal]') : null;
    if (t) { e.preventDefault(); openLegal(t.getAttribute('data-legal')); }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && overlay && !overlay.hidden) closeLegal();
  });

  // 링크 한 줄(HTML)을 만들어 주는 도우미. 두 화면 모두 같은 모양으로 쓴다.
  window.LEGAL_FOOTER_HTML = '<footer class="legal-footer"><button type="button" data-legal="terms">이용약관</button></footer>';
  window.openLegal = openLegal;

  // legal.js가 로드되기 전에 만든 푸터 스타일을 위해 CSS를 미리 넣어 둔다
  var pre = document.createElement('style');
  pre.textContent = CSS;
  document.head.appendChild(pre);
})();
