/** 나라장터 용역 입찰공고 (조달청 OpenAPI, data.go.kr). 키워드별 조회. 법인 입찰이 대부분이라 개인불가 필터와 함께 쓴다. */
function fetchNara_() {
  const key = requireKey_('NARA_KEY');
  const end = new Date(), bgn = new Date(end.getTime() - 7 * 86400000);
  const fmt = function (d) { return Utilities.formatDate(d, 'Asia/Seoul', 'yyyyMMddHHmm'); };
  const items = [];
  keywordList_().forEach(function (kw) {
    const url = 'https://apis.data.go.kr/1230000/ad/BidPublicInfoService/getBidPblancListInfoServc'
      + '?serviceKey=' + encodeURIComponent(key) + '&type=json&numOfRows=50&pageNo=1&inqryDiv=1'
      + '&inqryBgnDt=' + fmt(bgn) + '&inqryEndDt=' + fmt(end) + '&bidNtceNm=' + encodeURIComponent(kw);
    const body = (fetchJson_(url).response || {}).body || {};
    [].concat(body.items || []).forEach(function (it) {
      items.push({ id: makeId_('NARA', it.bidNtceNo, it.bidNtceDtlUrl), title: it.bidNtceNm, org: it.ntceInsttNm,
        url: it.bidNtceDtlUrl, deadline: ymd_(it.bidClseDt), channel: '나라장터', note: '입찰공고: 개인지원 확인필요' });
    });
  });
  return items;
}
