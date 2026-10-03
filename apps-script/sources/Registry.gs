/** 04_설정 수집원 이름 → 어댑터. 새 소스는 여기에 한 줄 추가. */
const ADAPTERS = {
  '나라장터 입찰공고': function () { return fetchNara_(); },
  'K-Startup 사업공고': function () { return fetchKstartup_(); },
  '기업마당 지원사업공고': function () { return fetchBizinfo_(); },
  '사람인 채용공고': function () { return fetchSaramin_(); },
};

function runSource_(src) {
  if (src.kind === 'rss') return fetchRss_(src.url);
  const fn = ADAPTERS[src.name];
  if (!fn) throw new Error('등록되지 않은 수집원: ' + src.name);
  return fn();
}
