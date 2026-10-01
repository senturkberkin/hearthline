(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.salaryHistory = api;
})(typeof window === 'undefined' ? globalThis : window, function () {
  function summarize(entries) {
    const clean = entries.map(entry => ({year:Number(entry.year),amount:Number(entry.amount)})).filter(entry => Number.isInteger(entry.year) && entry.year >= 1900 && entry.year <= 2200 && Number.isFinite(entry.amount) && entry.amount > 0).sort((a,b) => a.year-b.year);
    const changes=[];
    for(let i=1;i<clean.length;i++) {
      const previous=clean[i-1], current=clean[i];
      if(current.year <= previous.year) continue;
      changes.push({from:previous.year,to:current.year,observed:(current.amount/previous.amount-1)*100,annualized:(Math.pow(current.amount/previous.amount,1/(current.year-previous.year))-1)*100});
    }
    const latest=changes.at(-1)?.annualized ?? null;
    const average=changes.length ? changes.reduce((total,change)=>total+change.annualized,0)/changes.length : null;
    return {entries:clean,changes,latest,average};
  }
  return {summarize};
});
