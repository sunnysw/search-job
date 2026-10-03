/** 02_분류·키워드 의 포함/필수/제외/개인불가 규칙. */
function loadRules_() {
  const rows = sheet_(SHEET.KEYWORD).getRange(2, 5, 200, 4).getValues();
  const r = { include: [], must: [], exclude: [], noPersonal: [] };
  rows.forEach(function (x) {
    if (!x[1] || x[3] === false) return;
    const k = String(x[1]).toLowerCase();
    if (x[0] === '포함') r.include.push({ k: k, w: Number(x[2]) || 1 });
    else if (x[0] === '필수') r.must.push(k);
    else if (x[0] === '제외') r.exclude.push(k);
    else if (x[0] === '개인불가') r.noPersonal.push(k);
  });
  return r;
}

/** @return {{ok:boolean, reason:string, score:number, matched:string[]}} */
function evaluate_(item, rules) {
  const title = String(item.title).toLowerCase();
  const text = (title + ' ' + String(item.org || '') + ' ' + String(item.summary || '')).toLowerCase();
  const hit = function (list) { return list.filter(function (k) { return text.indexOf(k) >= 0; }); };

  if (hit(rules.exclude).length) return { ok: false, reason: '제외어: ' + hit(rules.exclude)[0] };
  if (hit(rules.noPersonal).length) return { ok: false, reason: '개인지원 불가: ' + hit(rules.noPersonal)[0] };
  if (rules.must.length && !hit(rules.must).length) return { ok: false, reason: '필수어 없음' };

  let score = 0;
  const matched = [];
  rules.include.forEach(function (i) {
    if (text.indexOf(i.k) >= 0) {
      score += i.w * (title.indexOf(i.k) >= 0 ? 2 : 1);
      matched.push(i.k);
    }
  });
  return { ok: true, score: score, matched: matched };
}

/** 00_모니터링트랙 목록과 제목 매칭으로 트랙/세부분야/유형 결정. */
function loadTracks_() {
  const rows = sheet_(SHEET.TRACK).getRange(2, 1, 50, 9).getValues();
  const out = [];
  rows.forEach(function (r, i) {
    if (!r[0]) return;
    out.push({ row: i + 2, id: r[0], type: String(r[1]).split('/')[0], field: r[2], org: r[3],
      keywords: String(r[4]).split(',').map(function (s) { return s.trim(); }).filter(String) });
  });
  return out;
}

function matchTrack_(item, tracks) {
  const t = (item.title + ' ' + (item.summary || '')).toLowerCase();
  for (let i = 0; i < tracks.length; i++) {
    for (let j = 0; j < tracks[i].keywords.length; j++) {
      if (t.indexOf(tracks[i].keywords[j].toLowerCase()) >= 0) return tracks[i];
    }
  }
  return null;
}

function inferType_(title) {
  if (/컨설턴트|컨설팅/.test(title)) return '컨설턴트';
  if (/강사|강의|코치|튜터|멘토/.test(title)) return '강사';
  if (/교육과정|양성|자격/.test(title)) return '교육·자격';
  return '';
}

function orgBoost_(org, orgRows) {
  for (let i = 0; i < orgRows.length; i++) {
    const name = String(orgRows[i][0]);
    if (name && String(org).indexOf(name.replace(/\(.*\)/, '')) >= 0) return (String(orgRows[i][2]).match(/★/g) || []).length;
  }
  return 0;
}

function grade_(score, boost) {
  const v = score + boost;
  return v >= 6 ? 'A' : v >= 3 ? 'B' : 'C';
}
