/** 사람인 채용공고 API (oapi.saramin.co.kr, 공식 API 키 필요). 키워드별 조회. */
function fetchSaramin_() {
  const key = requireKey_('SARAMIN_KEY');
  const items = [];
  keywordList_().forEach(function (kw) {
    const url = 'https://oapi.saramin.co.kr/job-search?access-key=' + encodeURIComponent(key)
      + '&keywords=' + encodeURIComponent(kw) + '&count=50&sort=pd';
    const jobs = ((fetchJson_(url).jobs || {}).job) || [];
    jobs.forEach(function (j) {
      const exp = Number(j['expiration-timestamp']);
      items.push({ id: makeId_('SARAMIN', j.id, j.url), title: (j.position || {}).title,
        org: ((j.company || {}).detail || {}).name, url: j.url, deadline: exp ? new Date(exp * 1000) : null,
        channel: '사람인' });
    });
  });
  return items;
}
