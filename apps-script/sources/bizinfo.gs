/** 기업마당 지원사업 공고 (bizinfo.go.kr OpenAPI). 최근 공고를 받아 키워드 필터링한다. */
function fetchBizinfo_() {
  const key = requireKey_('BIZINFO_KEY');
  const url = 'https://www.bizinfo.go.kr/uss/rss/bizinfoApi.do?crtfcKey=' + encodeURIComponent(key)
    + '&dataType=json&searchCnt=100';
  return (fetchJson_(url).jsonArray || []).map(function (it) {
    const period = String(it.reqstBeginEndDe || '').split('~');
    return { id: makeId_('BIZINFO', it.pblancId, it.pblancUrl), title: it.pblancNm, org: it.jrsdInsttNm,
      url: it.pblancUrl && it.pblancUrl.indexOf('http') === 0 ? it.pblancUrl : 'https://www.bizinfo.go.kr' + (it.pblancUrl || ''),
      deadline: ymd_(period[1]), channel: '기업마당', summary: it.bsnsSumryCn || '' };
  });
}
