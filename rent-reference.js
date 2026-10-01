(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.rentReference = api;
})(typeof window === 'undefined' ? globalThis : window, function () {
  const storageKey = 'hearthline.rentReference';
  function validate(data) {
    if (!data || !Number.isFinite(Number(data.percentage)) || Number(data.percentage) < 0 || Number(data.percentage) > 1000) return null;
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(data.period) || !Number.isFinite(Date.parse(data.publishedAt)) || !Number.isFinite(Date.parse(data.updatedAt))) return null;
    if (!/^https:\/\/veriportali\.tuik\.gov\.tr\//.test(data.sourceUrl || '')) return null;
    return {percentage:Number(data.percentage),period:data.period,publishedAt:data.publishedAt,publicationDateBasis:data.publicationDateBasis || 'verifiedBulletin',nextPublicationAt:data.nextPublicationAt || null,sourceName:String(data.sourceName || 'TÜİK'),sourceUrl:data.sourceUrl,updatedAt:data.updatedAt};
  }
  function isStale(data, now = new Date()) {
    if (!data) return true;
    const next = data.nextPublicationAt && Date.parse(data.nextPublicationAt);
    return next ? now.getTime() >= next : now.getTime() - Date.parse(data.publishedAt) > 45 * 86400000;
  }
  function toAssumption(data) {
    const reference=validate(data);
    return reference ? {rate:reference.percentage,period:reference.period} : null;
  }
  async function load({fetcher = fetch, storage = localStorage, url = 'rent-reference.json', now = new Date()} = {}) {
    let cached = null;
    try { cached = validate(JSON.parse(storage.getItem(storageKey))); } catch (_) {}
    try {
      const response = await fetcher(url,{cache:'no-store'});
      if (!response.ok) throw new Error('Reference unavailable');
      const data = validate(await response.json());
      if (!data) throw new Error('Invalid reference data');
      const useCached=Boolean(cached && data.period < cached.period);
      if (!useCached) { cached=data; try { storage.setItem(storageKey,JSON.stringify(data)); } catch (_) {} }
      return {data:cached,stale:isStale(cached,now),fromCache:useCached};
    } catch (_) { return {data:cached,stale:isStale(cached,now),fromCache:true}; }
  }
  return {validate,isStale,load,toAssumption};
});
