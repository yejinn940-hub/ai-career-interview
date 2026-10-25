/*
 * 이용약관 · 개인정보처리방침 (팝업)
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

  var PRIVACY = {
    title: '개인정보처리방침',
    sections: [
      {
        p: ['(OO초등학교 6학년 O반 선생님)은 "AI가상면담"(이하 "서비스")을 운영하면서 「개인정보 보호법」 제30조에 따라 이용자의 개인정보를 어떻게 처리하는지 아래와 같이 알려 드립니다.']
      },
      {
        h: '1. 처리하는 개인정보 항목',
        items: [
          '학생: (학교, 학년, 반, 모둠). 그 밖에 이름·연락처 등은 받지 않습니다.',
          '학생이 면담 중에 입력한 대화 내용과, 학급에 공유된 면담에 모둠이 남긴 피드백(모둠 이름 포함). 이름 등 개인정보는 입력하지 않도록 안내합니다.',
          '선생님: 반을 만들 때 입력하는 선생님 성함과 PIN.',
          '서비스를 이용하는 동안 접속 기록(IP 주소, 접속 시각 등)이 호스팅 사업자의 시스템에 자동으로 생길 수 있습니다. 서비스 운영자는 이를 따로 열람하거나 이용하지 않습니다.'
        ]
      },
      {
        h: '2. 처리 목적',
        items: [
          '(모둠 구분)',
          '면담 대화 기록의 저장, 선생님의 수업 확인, 학급에 공유된 면담 보기와 피드백 남기기'
        ],
        note: '근거: 「개인정보 보호법」 제15조(개인정보의 수집·이용)'
      },
      {
        h: '3. 보유 및 이용 기간',
        items: [
          '(학기가 끝나면) 지체 없이 삭제합니다.',
          '면담 대화 기록과 피드백은 마지막으로 수정한 날부터 30일이 지나면 자동으로 삭제됩니다.',
          '선생님은 언제든지 대화 기록 전체 또는 일부 줄, 피드백을 직접 삭제할 수 있습니다.'
        ]
      },
      {
        h: '4. 파기 방법',
        p: ['보유 기간이 끝나거나 처리 목적이 달성된 개인정보는 저장소에서 삭제하여 다시 볼 수 없도록 합니다. 학생 기기(브라우저)에 저장된 면담 기록은 "저장된 면담 기록"에서 지울 수 있습니다.'],
        note: '근거: 「개인정보 보호법」 제21조(개인정보의 파기)'
      },
      {
        h: '5. 제3자 제공',
        p: ['개인정보를 제3자에게 제공하지 않습니다.']
      },
      {
        h: '6. 처리 위탁 및 국외 이전',
        p: ['서비스 운영을 위해 아래 업체의 시스템을 이용합니다.'],
        items: [
          'Anthropic PBC (미국): AI 답변을 만들기 위해 면담 대화 내용이 전송됩니다. 학교·반·모둠 정보는 전송하지 않습니다.',
          'Upstash (데이터 저장소, 서버 위치: (서버 위치 확인 후 기재)): 모둠 정보와 면담 기록 저장',
          'Vercel Inc. (미국, 웹 호스팅): 서비스 화면 제공'
        ],
        note: '근거: 「개인정보 보호법」 제26조(업무위탁), 제28조의8(국외 이전)'
      },
      {
        h: '7. 정보주체와 법정대리인의 권리',
        p: [
          '이용자와 법정대리인은 언제든지 자신의 정보에 대해 열람, 정정, 삭제, 처리정지를 요구할 수 있습니다. 아래 보호책임자에게 요청하면 지체 없이 조치합니다.',
          '학생 기기에 저장된 면담 기록은 학생이 직접 삭제할 수 있습니다.'
        ],
        note: '근거: 「개인정보 보호법」 제35조~제37조'
      },
      {
        h: '8. 만 14세 미만 아동의 개인정보',
        p: ['이 서비스는 학생의 이름 등 개인을 직접 알아볼 수 있는 정보를 받지 않습니다. 만 14세 미만 아동의 개인정보 처리에 법정대리인의 동의가 필요한 경우에는 학교가 안내하는 절차(가정통신문 등)에 따라 동의를 받습니다.'],
        note: '근거: 「개인정보 보호법」 제22조의2(아동의 개인정보 보호)'
      },
      {
        h: '9. 안전성 확보 조치',
        items: [
          '선생님 기능은 PIN을 알아야만 사용할 수 있습니다.',
          '서비스와 이용자 기기 사이의 통신은 HTTPS로 암호화됩니다.',
          '받는 정보를 (학교, 학년, 반, 모둠)으로 최소화하고, 이름 등 개인정보를 입력하지 않도록 안내합니다.'
        ],
        note: '근거: 「개인정보 보호법」 제29조(안전조치의무)'
      },
      {
        h: '10. 쿠키와 브라우저 저장소',
        p: [
          '쿠키는 사용하지 않습니다. 이용자 기기의 브라우저 저장소(localStorage)에 모둠 정보와 면담 기록이 저장되며, 그 기기에만 남습니다.',
          '화면 글꼴을 불러오기 위해 Google Fonts에 접속할 수 있습니다.'
        ]
      },
      {
        h: '11. 개인정보 보호책임자',
        items: [
          '성명: (보호책임자 성명)',
          '직위: (직위)',
          '연락처: (학교 대표 전화 또는 이메일)'
        ],
        note: '근거: 「개인정보 보호법」 제31조(개인정보 보호책임자의 지정)'
      },
      {
        h: '12. 방침의 변경',
        p: ['이 방침이 바뀌면 서비스 화면에서 알려 드립니다. 이 방침은 (2026년 10월 25일)부터 시행합니다.']
      }
    ]
  };

  var DOCS = { terms: TERMS, privacy: PRIVACY };

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
  window.LEGAL_FOOTER_HTML = '<footer class="legal-footer"><button type="button" data-legal="terms">이용약관</button> · <button type="button" data-legal="privacy">개인정보처리방침</button></footer>';
  window.openLegal = openLegal;

  // legal.js가 로드되기 전에 만든 푸터 스타일을 위해 CSS를 미리 넣어 둔다
  var pre = document.createElement('style');
  pre.textContent = CSS;
  document.head.appendChild(pre);
})();
