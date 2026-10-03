function normalizeUrl_(url) {
  return String(url || '').replace(/#.*$/, '')
    .replace(/([?&])(utm_[^=&]+|fbclid|gclid)=[^&]*/g, '$1')
    .replace(/[?&]+$/, '').replace(/\?&/, '?');
}

/** 공식 게시글 ID가 있으면 'PREFIX-번호', 없으면 URL MD5 앞 8자리. */
function makeId_(prefix, nativeId, url) {
  if (nativeId) return prefix + '-' + nativeId;
  const d = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, normalizeUrl_(url));
  const hex = d.map(function (b) { return ('0' + (b & 0xff).toString(16)).slice(-2); }).join('');
  return prefix + '-' + hex.slice(0, 8);
}
