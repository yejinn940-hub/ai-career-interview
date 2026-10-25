// AI로 보내기 전에 개인정보로 보이는 부분을 ○○ 로 바꾼다. (서버 쪽 마지막 안전장치)
// 학생 화면의 경고를 무시하고 "한 번 더 보내기"를 눌러도 여기서 한 번 더 가려진다.
const SURNAMES = '김이박최정강조윤장임한오서신권황안송류전홍고문양손배백허유남심노하곽성차주우구민나진지엄채원천방공현함변염여추도소석선설마길연위표명기반왕금옥육인맹제모탁국어은편용예경봉사부';
const NOT_NAMES = ['학생들', '학생', '모둠', '어린이', '친구들', '친구', '제자', '기자', '리포터', '기사', '진행자', '면담자', '인터뷰어', '선생님', '교사'];

function maskPersonalInfo(text) {
  let t = String(text || '');
  // 전화번호, 메일
  t = t.replace(/01[016789][\s.-]?\d{3,4}[\s.-]?\d{4}/g, '○○');
  t = t.replace(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g, '○○');
  // 학교 이름
  t = t.replace(/[가-힣]{2,8}(?:초등학교|중학교|고등학교)/g, '○○학교');
  t = t.replace(/([가-힣]{2,6})초(?=에|를|은|는|이|가|의|와|과|로|도|만|예|$|[^가-힣])/g, '○○초');
  // "이름은 ○○○" 처럼 이름을 직접 말하는 경우
  t = t.replace(/(이름(?:은|이|는)?\s*)([가-힣]{2,4})/g, function (m, a, b) {
    return NOT_NAMES.indexOf(b) === -1 ? a + '○○' : m;
  });
  // "저는 김예진입니다" "예진이에요" "김예진이라고 해요" 처럼 이름 + 서술어
  t = t.replace(/([가-힣]{2,4})(\s*)(입니다|이에요|예요|이라고|라고|이야|이고)/g, function (m, w, sp, end) {
    if (NOT_NAMES.indexOf(w) !== -1) return m;
    if (/(모둠|학년|학교|초|반|학생|들|님|분)$/.test(w)) return m;
    if (w.length >= 2 && w.length <= 4 && SURNAMES.indexOf(w.charAt(0)) !== -1) return '○○' + sp + end;
    return m;
  });
  return t;
}

module.exports = { maskPersonalInfo: maskPersonalInfo };
