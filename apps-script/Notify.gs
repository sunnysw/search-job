/** Gmail 요약. onlyIfUrgent=true 면 마감 임박/일정이 없을 때 발송하지 않는다. */
function digest(onlyIfUrgent) {
  const s = getSettings_();
  const sh = sheet_(SHEET.JOBS);
  const n = sh.getLastRow() - 1;
  if (n < 1) return;
  const rows = sh.getRange(2, 1, n, COL.UPDATED).getValues();
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const days = function (d) { return Math.round((d - today) / 86400000); };
  const link = function (r) { return r[COL.ORG - 1] + ' - ' + r[COL.TITLE - 1]; };
  const url = ss_().getUrl();

  const fresh = [], due = [], next = [];
  rows.forEach(function (r) {
    const collected = r[COL.COLLECTED - 1];
    if (collected instanceof Date && days(new Date(collected.getFullYear(), collected.getMonth(), collected.getDate())) === 0
        && r[COL.APPLY - 1] === '미검토') fresh.push(r);
    const dl = r[COL.DEADLINE - 1];
    if (dl instanceof Date && PENDING.indexOf(r[COL.APPLY - 1]) >= 0 && s.dueDays.indexOf(days(dl)) >= 0) due.push(r);
    const nx = r[COL.NEXT - 1];
    if (nx instanceof Date && days(nx) >= 0 && days(nx) <= 3) next.push(r);
  });
  if (onlyIfUrgent && !due.length && !next.length) return;
  if (!fresh.length && !due.length && !next.length) return;

  const section = function (title, list, extra) {
    if (!list.length) return '';
    return '<h3>' + title + ' (' + list.length + ')</h3><ul>' + list.map(function (r) {
      return '<li>[' + r[COL.GRADE - 1] + '] ' + link(r) + (extra ? ' ' + extra(r) : '') + '</li>';
    }).join('') + '</ul>';
  };
  const fmt = function (d) { return Utilities.formatDate(d, 'Asia/Seoul', 'MM/dd'); };
  fresh.sort(function (a, b) { return String(a[COL.GRADE - 1]).localeCompare(String(b[COL.GRADE - 1])); });
  const html = section('신규 공고', fresh)
    + section('마감 임박 (지원 전)', due, function (r) { return '마감 ' + fmt(r[COL.DEADLINE - 1]); })
    + section('예정 일정', next, function (r) { return fmt(r[COL.NEXT - 1]); })
    + '<p><a href="' + url + '">시트 열기</a></p>';
  MailApp.sendEmail({ to: s.email, subject: '[구인트래커] 신규 ' + fresh.length + ' · 임박 ' + due.length + ' · 일정 ' + next.length, htmlBody: html });
}
