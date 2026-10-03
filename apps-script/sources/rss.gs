/** Google 알리미 등 RSS/Atom 피드. 04_설정 수집원 표에서 종류=rss 인 URL(쉼표 구분)을 읽는다. */
function fetchRss_(urlCell) {
  const items = [];
  String(urlCell).split(/[,\s]+/).filter(function (u) { return /^https?:/.test(u); }).forEach(function (feed) {
    const root = XmlService.parse(fetchText_(feed)).getRootElement();
    const ns = root.getNamespace();
    const entries = root.getChildren('entry', ns);
    entries.forEach(function (e) {
      const link = e.getChild('link', ns).getAttribute('href').getValue();
      const real = (link.match(/[?&]url=([^&]+)/) || [])[1];      // 알리미 리다이렉트 해제
      const url = real ? decodeURIComponent(real) : link;
      const title = e.getChild('title', ns).getText().replace(/<[^>]+>/g, '');
      const content = e.getChild('content', ns);
      items.push({ id: makeId_('RSS', '', url), title: title, org: '', url: url, deadline: null,
        channel: '알리미', summary: content ? content.getText().replace(/<[^>]+>/g, '') : '' });
    });
  });
  return items;
}
