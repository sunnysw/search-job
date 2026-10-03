/** 공통 HTTP 호출. 실패 시 예외를 던지고 호출부(collect)가 소스 단위로 잡는다. */
function fetchText_(url) {
  const res = UrlFetchApp.fetch(url, { muteHttpExceptions: true, followRedirects: true,
    headers: { 'User-Agent': 'Mozilla/5.0 (job-tracker)' } });
  if (res.getResponseCode() >= 400) throw new Error('HTTP ' + res.getResponseCode() + ' ' + url.split('?')[0]);
  return res.getContentText();
}

function fetchJson_(url) { return JSON.parse(fetchText_(url)); }

function ymd_(s) {            // 'YYYYMMDD' | 'YYYY-MM-DD' → Date
  const m = String(s || '').replace(/\D/g, '');
  return m.length >= 8 ? new Date(+m.slice(0, 4), +m.slice(4, 6) - 1, +m.slice(6, 8)) : null;
}

function requireKey_(name) {
  const k = prop_(name);
  if (!k) throw new Error('Script Properties 에 ' + name + ' 가 없음');
  return k;
}

function keywordList_() {
  const out = {};
  loadTracks_().forEach(function (t) { t.keywords.forEach(function (k) { out[k] = true; }); });
  return Object.keys(out);
}
