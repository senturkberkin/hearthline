(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.monthSelector = api;
})(typeof window === 'undefined' ? globalThis : window, function () {
  function monthNames(locale) {
    const language = locale === 'tr' || locale === 'tr-TR' ? 'tr-TR' : 'en-US';
    return Array.from({length:12}, (_,month) => {
      const date = new Date(Date.UTC(2024,month,1));
      return { full:new Intl.DateTimeFormat(language,{month:'long',timeZone:'UTC'}).format(date), short:new Intl.DateTimeFormat(language,{month:'short',timeZone:'UTC'}).format(date).replace(/\.$/,'').slice(0,3) };
    });
  }
  function render(container, {selected = 0, locale = 'en', disabled = false, label = '', onChange = () => {}} = {}) {
    const names = monthNames(locale), current = Number(selected);
    container.setAttribute('role','radiogroup'); container.setAttribute('aria-label',label);
    container.innerHTML = names.map((name,index) => `<button type="button" role="radio" class="month-option${index===current?' selected':''}" aria-checked="${index===current}" aria-label="${name.full}" title="${name.full}" tabindex="${index===current?'0':'-1'}" data-month="${index}"${disabled?' disabled':''}><span>${name.short}</span>${index===current?'<span class="month-check" aria-hidden="true">✓</span>':''}</button>`).join('');
    container.querySelectorAll('button').forEach(button => {
      button.addEventListener('click',() => onChange(Number(button.dataset.month)));
      button.addEventListener('keydown',event => {
        const direction = ['ArrowRight','ArrowDown'].includes(event.key) ? 1 : ['ArrowLeft','ArrowUp'].includes(event.key) ? -1 : 0;
        if (!direction) return;
        event.preventDefault(); const next=(Number(button.dataset.month)+direction+12)%12;
        onChange(next); container.querySelector(`[data-month="${next}"]`)?.focus();
      });
    });
  }
  return {monthNames,render};
});
