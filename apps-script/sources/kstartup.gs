/** K-Startup 사업공고 (창업진흥원 OpenAPI, data.go.kr). 최근 공고를 받아 키워드 필터링한다. */
function fetchKstartup_() {
  const key = requireKey_('KSTARTUP_KEY');
  const url = 'https://apis.data.go.kr/B552735/kisedKstartupService01/getAnnouncementInformation01'
    + '?serviceKey=' + encodeURIComponent(key) + '&page=1&perPage=100&returnType=json';
  return (fetchJson_(url).data || []).map(function (it) {
    return { id: makeId_('KSTARTUP', it.pbanc_sn, it.detl_pg_url), title: it.biz_pbanc_nm, org: it.pbanc_ntrp_nm,
      url: it.detl_pg_url, deadline: ymd_(it.pbanc_rcpt_end_dt), channel: 'K-Startup', summary: it.pbanc_ctnt || '' };
  });
}
