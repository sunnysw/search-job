function onOpen() {
  SpreadsheetApp.getUi().createMenu('구인트래커')
    .addItem('지금 수집', 'collect')
    .addItem('요약 메일 발송', 'digest')
    .addItem('트리거 설치', 'installTriggers')
    .addToUi();
}

/** 활성 수집원 실행 → 필터/점수 → 중복 제거 → 01_공고관리 추가. 소스 하나가 실패해도 계속 진행. */
function collect() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) return;
  try {
    const rules = loadRules_();
    const tracks = loadTracks_();
    const settings = getSettings_();
    const orgRows = sheet_(SHEET.ORG).getRange(2, 1, 100, 3).getValues();
    const seen = existingIds_();
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const sourceSheet = sheet_(SHEET.SETTING);
    const found = {}; // trackId → 최근 발견 공고ID

    getSources_().filter(function (s) { return s.enabled && s.kind !== 'mail' && s.kind !== 'html'; }).forEach(function (src) {
      const rows = [];
      let skipped = 0, error = '';
      try {
        runSource_(src).forEach(function (it) {
          if (!it.title || seen[it.id]) { skipped++; return; }
          if (it.deadline && it.deadline < today) { skipped++; return; }   // 이미 마감
          const ev = evaluate_(it, rules);
          if (!ev.ok || ev.score < settings.minScore) { skipped++; return; }
          const track = matchTrack_(it, tracks);
          const type = (track && track.type) || inferType_(it.title);
          const g = grade_(ev.score, orgBoost_(it.org, orgRows));
          const title = '=HYPERLINK("' + String(it.url).replace(/"/g, '""') + '","' + String(it.title).replace(/"/g, '""') + '")';
          rows.push([it.id, new Date(), type, (track && track.field) || '', it.org || '', title, it.deadline || '', '',
            it.deadline ? STATUS.OPEN : STATUS.ALWAYS, g, '미검토', '', '', '', it.note || '',
            it.channel, ev.score, ev.matched.join(','), new Date()]);
          seen[it.id] = true;
          if (track) found[track.id] = it.id;
        });
        appendJobs_(rows);
      } catch (e) {
        error = String(e.message || e);
      }
      sourceSheet.getRange(src.row, 8).setValue(Utilities.formatDate(new Date(), 'Asia/Seoul', 'MM-dd HH:mm') + ' ' + (error ? '오류: ' + error : '신규 ' + rows.length));
      logRow_('수집', src.name, rows.length, skipped, !!error, error);
    });

    // 00_모니터링트랙 갱신
    const stamp = Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd');
    const trackSheet = sheet_(SHEET.TRACK);
    tracks.forEach(function (t) {
      trackSheet.getRange(t.row, 7).setValue(stamp);
      if (found[t.id]) trackSheet.getRange(t.row, 8).setValue(found[t.id]);
    });
    expireOld_();
  } finally {
    lock.releaseLock();
  }
  digest();
}

/** 설치형 편집 트리거: 지원 상태 변경 이력, 최종 수정 갱신, 패스/보류 사유 안내. */
function onJobEdit(e) {
  const sh = e.range.getSheet();
  if (sh.getName() !== SHEET.JOBS || e.range.getRow() < 2) return;
  const row = e.range.getRow(), col = e.range.getColumn();
  if ([COL.APPLY, COL.APPLIED_AT, COL.RESULT, COL.DEADLINE].indexOf(col) >= 0) {
    logRow_('변경', sh.getRange(row, COL.ID).getValue(), '', '', false,
      sh.getRange(1, col).getValue() + ': ' + e.oldValue + ' → ' + e.value);
  }
  sh.getRange(row, COL.UPDATED).setValue(new Date());
  if (col === COL.APPLY && (e.value === '패스' || e.value === '보류') && !sh.getRange(row, COL.NOTE).getValue()) {
    sh.getRange(row, COL.NOTE).setNote('사유를 비고에 입력하세요').activate();
  }
}

/** 주 2회 수집 + 매일 마감임박 메일 + 편집 트리거. 설정 시트의 요일/시각을 사용. */
function installTriggers() {
  ScriptApp.getProjectTriggers().forEach(function (t) { ScriptApp.deleteTrigger(t); });
  const s = getSettings_();
  s.days.forEach(function (d) {
    ScriptApp.newTrigger('collect').timeBased().onWeekDay(ScriptApp.WeekDay[d]).atHour(s.collectHour).create();
  });
  ScriptApp.newTrigger('digestDaily').timeBased().everyDays(1).atHour(s.digestHour).nearMinute(30).create();
  ScriptApp.newTrigger('onJobEdit').forSpreadsheet(ss_()).onEdit().create();
}

function digestDaily() { expireOld_(); digest(true); }
