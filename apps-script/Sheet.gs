function existingIds_() {
  const sh = sheet_(SHEET.JOBS);
  const n = sh.getLastRow() - 1;
  const set = {};
  if (n > 0) sh.getRange(2, COL.ID, n, 1).getValues().forEach(function (r) { if (r[0]) set[r[0]] = true; });
  return set;
}

/** H열(D-Day)은 ARRAYFORMULA 이므로 건드리지 않고 A:G, I:S 만 쓴다. */
function appendJobs_(rows) {
  if (!rows.length) return;
  const sh = sheet_(SHEET.JOBS);
  const start = Math.max(sh.getLastRow(), 1) + 1;
  const left = rows.map(function (r) { return r.slice(0, 7); });
  const right = rows.map(function (r) { return r.slice(8, 19); });
  sh.getRange(start, 1, rows.length, 7).setValues(left);
  sh.getRange(start, 9, rows.length, 11).setValues(right);
}

function logRow_(kind, src, added, skipped, err, msg) {
  sheet_(SHEET.LOG).appendRow([new Date(), kind, src, added, skipped, err ? 'Y' : '', msg || '']);
}

/** 마감일이 지난 🟢 건을 🔴 로 전환 (지원 열은 건드리지 않음). */
function expireOld_() {
  const sh = sheet_(SHEET.JOBS);
  const n = sh.getLastRow() - 1;
  if (n < 1) return;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const vals = sh.getRange(2, COL.DEADLINE, n, 3).getValues(); // G,H,I
  const out = vals.map(function (r) {
    const d = r[0];
    return [(d instanceof Date && d < today && r[2] !== STATUS.CLOSED) ? STATUS.CLOSED : r[2]];
  });
  sh.getRange(2, COL.STATUS, n, 1).setValues(out);
}
