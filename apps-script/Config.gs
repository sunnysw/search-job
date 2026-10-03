/** 시트/열 상수와 설정 로더. 시트 ID·API 키는 Script Properties에 둔다. */
const SHEET = {
  TRACK: '00_모니터링트랙',
  JOBS: '01_공고관리',
  KEYWORD: '02_분류·키워드',
  ORG: '03_기관목록',
  SETTING: '04_설정',
  LOG: '99_로그',
};

// 01_공고관리 열 (1-based)
const COL = {
  ID: 1, COLLECTED: 2, TYPE: 3, FIELD: 4, ORG: 5, TITLE: 6, DEADLINE: 7, DDAY: 8,
  STATUS: 9, GRADE: 10, APPLY: 11, APPLIED_AT: 12, RESULT: 13, NEXT: 14, NOTE: 15,
  CHANNEL: 16, SCORE: 17, MATCHED: 18, UPDATED: 19,
};

const STATUS = { OPEN: '🟢 진행중', ALWAYS: '🟡 상시', CLOSED: '🔴 마감' };
const PENDING = ['미검토', '지원검토', '준비중']; // 마감 임박 알림 대상

function ss_() {
  const id = PropertiesService.getScriptProperties().getProperty('SHEET_ID');
  return id ? SpreadsheetApp.openById(id) : SpreadsheetApp.getActiveSpreadsheet();
}

function sheet_(name) {
  const sh = ss_().getSheetByName(name);
  if (!sh) throw new Error('시트를 찾을 수 없음: ' + name);
  return sh;
}

function prop_(key) {
  return PropertiesService.getScriptProperties().getProperty(key);
}

/** 04_설정 A:B 의 '설정 → 값' 을 객체로 읽는다. */
function getSettings_() {
  const rows = sheet_(SHEET.SETTING).getRange(2, 1, 20, 2).getValues();
  const map = {};
  rows.forEach(function (r) { if (r[0]) map[String(r[0]).trim()] = r[1]; });
  return {
    email: String(map['알림 이메일'] || Session.getEffectiveUser().getEmail()),
    days: String(map['수집 요일'] || 'MONDAY,THURSDAY').split(',').map(function (s) { return s.trim(); }),
    collectHour: Number(map['수집 시각'] || 8),
    digestHour: Number(map['메일 발송 시각'] || 8),
    minScore: Number(map['최소 점수'] || 2),
    dueDays: String(map['임박 기준일'] || '3,1').split(',').map(Number),
    keepDays: Number(map['마감 후 보관일'] || 30),
  };
}

/** 04_설정 D:H 수집원 표. */
function getSources_() {
  const rows = sheet_(SHEET.SETTING).getRange(2, 4, 40, 5).getValues();
  const out = [];
  rows.forEach(function (r, i) {
    if (r[0] && r[2] !== undefined) out.push({ row: i + 2, name: r[0], kind: r[1], url: String(r[2]), enabled: r[3] === true });
  });
  return out;
}
