(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.inputUtils = api;
})(typeof window === 'undefined' ? globalThis : window, function () {
  const localeId = locale => locale === 'tr' || locale === 'tr-TR' ? 'tr-TR' : 'en-US';
  const rawValues = new WeakMap();
  const symbols = locale => {
    const parts = new Intl.NumberFormat(localeId(locale)).formatToParts(12345.6);
    return { group: parts.find(p => p.type === 'group').value, decimal: parts.find(p => p.type === 'decimal').value };
  };
  function normalize(text, locale, decimals = false) {
    const { group, decimal } = symbols(locale);
    let raw = String(text ?? '').replace(/[\s\u00a0\u202f₺]/g, '').replace(/[^\d.,-]/g, '');
    const negative = raw.startsWith('-') ? '-' : '';
    raw = raw.replace(/-/g, '');
    if (!decimals) return negative + raw.replace(/[.,]/g, '');
    const lastDot = raw.lastIndexOf('.'), lastComma = raw.lastIndexOf(',');
    let separator = '';
    if (lastDot >= 0 && lastComma >= 0) separator = lastDot > lastComma ? '.' : ',';
    else if (raw.includes(decimal)) separator = decimal;
    else if (raw.includes(group)) {
      const pieces = raw.split(group);
      // A single alternate separator with one or two trailing digits is a decimal.
      if (pieces.length === 2 && pieces[1].length < 3) separator = group;
    }
    if (!separator) return negative + raw.replace(/[.,]/g, '');
    const last = raw.lastIndexOf(separator);
    return negative + raw.slice(0, last).replace(/[.,]/g, '') + '.' + raw.slice(last + 1).replace(/[.,]/g, '');
  }
  function parse(text, locale, decimals = false) {
    const normalized = normalize(text, locale, decimals);
    if (!normalized || normalized === '-' || normalized === '.' || normalized === '-.') return 0;
    const value = Number(normalized);
    return Number.isFinite(value) ? value : NaN;
  }
  function display(text, locale, decimals = false) {
    const normalized = normalize(text, locale, decimals);
    if (!normalized || normalized === '-') return normalized;
    const negative = normalized.startsWith('-') ? '-' : '';
    const unsigned = negative ? normalized.slice(1) : normalized;
    const [integer, fraction] = unsigned.split('.');
    const grouped = integer ? new Intl.NumberFormat(localeId(locale), {maximumFractionDigits:0}).format(Number(integer)) : '0';
    const trailingDecimal = decimals && unsigned.endsWith('.');
    return negative + grouped + (fraction !== undefined ? symbols(locale).decimal + fraction : trailingDecimal ? symbols(locale).decimal : '');
  }
  function formatEdit(text, caret, locale, decimals = false) {
    const before = String(text).slice(0, caret);
    const rank = [...before].filter(char => /\d/.test(char)).length;
    const decimalBefore = decimals && /[.,]/.test(before) && /[.,]/.test(String(text).slice(caret));
    const value = display(text, locale, decimals);
    let nextCaret = 0, seen = 0;
    while (nextCaret < value.length && seen < rank) {
      if (/\d/.test(value[nextCaret])) seen++;
      nextCaret++;
    }
    if (rank && value[nextCaret] === symbols(locale).group) nextCaret++;
    if (decimals && !decimalBefore && /[.,]$/.test(before) && value[nextCaret] === symbols(locale).decimal) nextCaret++;
    return { value, caret: nextCaret };
  }
  function bind(input, getLocale, decimals = false, onValue) {
    const refresh = () => {
      const next = formatEdit(input.value, input.selectionStart ?? input.value.length, getLocale(), decimals);
      input.value = next.value;
      input.setSelectionRange(next.caret, next.caret);
      const raw=parse(input.value,getLocale(),decimals);
      rawValues.set(input,raw);
      onValue?.(raw);
    };
    input.addEventListener('input', refresh);
    input.addEventListener('keydown', event => {
      if (!['Backspace','Delete'].includes(event.key) || input.selectionStart !== input.selectionEnd) return;
      const group = symbols(getLocale()).group, pos = input.selectionStart;
      if (event.key === 'Backspace' && input.value[pos - 1] === group && pos > 1) {
        event.preventDefault(); input.value = input.value.slice(0,pos-2) + input.value.slice(pos); input.setSelectionRange(pos-2,pos-2); refresh();
      } else if (event.key === 'Delete' && input.value[pos] === group && pos < input.value.length-1) {
        event.preventDefault(); input.value = input.value.slice(0,pos) + input.value.slice(pos+2); input.setSelectionRange(pos,pos); refresh();
      }
    });
    return refresh;
  }
  function rawValue(input, locale, decimals = false) {
    return rawValues.has(input) ? rawValues.get(input) : parse(input.value,locale,decimals);
  }
  return { symbols, normalize, parse, display, formatEdit, bind, rawValue };
});
