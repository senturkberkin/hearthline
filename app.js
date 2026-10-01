const $ = selector => document.querySelector(selector);
const t = (key, vars) => window.appI18n.t(key, vars);
const locale = () => window.appI18n.getLocale() === 'tr' ? 'tr-TR' : 'en-US';
const money = value => new Intl.NumberFormat(locale(), {style:'currency',currency:'TRY',currencyDisplay:'narrowSymbol',maximumFractionDigits:0}).format(value);
const number = value => new Intl.NumberFormat(locale(), {maximumFractionDigits:0}).format(value);
const decimal = value => new Intl.NumberFormat(locale(), {maximumFractionDigits:3,useGrouping:false}).format(value);
const percent = value => new Intl.NumberFormat(locale(), {maximumFractionDigits:1}).format(value) + '%';
const referencePercent = value => locale()==='tr-TR' ? `%${new Intl.NumberFormat(locale(),{maximumFractionDigits:2}).format(value)}` : `${new Intl.NumberFormat(locale(),{maximumFractionDigits:2}).format(value)}%`;
const moneyKeys = new Set(['income','livingCosts','debt','savings','reserve','rent','propertyPrice','downPayment','upfrontSupport','closingCosts','renovation','ownerCosts','monthlySupport']);
const percentKeys = new Set(['incomeGrowth','rentGrowth','expenseGrowth','rate']);
const quickKeys = ['income','rent','propertyPrice','downPayment','rate','incomeGrowth','rentGrowth'];
const extraKeys = ['termYears','rateMode','livingCosts','savings','reserve','debt','expenseGrowth','closingCosts','renovation','ownerCosts','horizon'];
const supportKeys = ['upfrontSupport','monthlySupport','supportMonths'];
let initialScenario=null, activeScenario=null, activeProjection=null, chartMode='cash', resultTab='overview', recalcTimer=null, supportEnabled=false, rateIsIllustrative=true, initialRateIsIllustrative=true;
let salaryEntries=[{year:new Date().getFullYear()-1,amount:''},{year:new Date().getFullYear(),amount:''}];
let rentReferenceState={data:null,stale:true,fromCache:true};
let activeSources={income:'custom',rent:'custom'}, initialSources=null;
if ('IntersectionObserver' in window) new IntersectionObserver(([entry]) => document.body.classList.toggle('results-in-view',entry.isIntersecting),{threshold:0}).observe($('#results'));

const toNumber=(value,isMoney=false)=>window.inputUtils.parse(value,locale(),!isMoney);
function validate(d) {
  if (Object.entries(d).some(([key,value]) => key !== 'rateMode' && !Number.isFinite(Number(value)))) return 'error.generic';
  if (d.income <= 0) return 'error.income';
  if (d.rent <= 0) return 'error.rent';
  if (d.propertyPrice <= 0) return 'error.price';
  if (Object.entries(d).some(([key,value]) => !['rateMode','incomeGrowth','rentGrowth','expenseGrowth'].includes(key) && Number(value) < 0)) return 'error.negative';
  if (d.downPayment + d.upfrontSupport > d.propertyPrice) return 'error.contribution';
  if (d.termYears <= 0 || d.horizon <= 0 || !Number.isFinite(Number(d.rate))) return 'error.generic';
  if (d.downPayment+d.closingCosts+d.renovation>d.savings) return 'error.savings';
  return '';
}
function scenarioFromFacts(f,rate=2.25) {
  const reserve=Math.min(f.savings,3*(f.rent+f.livingCosts));
  const downPayment=Math.min(f.propertyPrice,Math.max(0,f.savings-reserve));
  return {...f,reserve,downPayment,incomeGrowth:0,rentGrowth:0,expenseGrowth:0,debt:0,raiseMonth:'0',rentRenewal:'0',upfrontSupport:0,closingCosts:0,renovation:0,principal:Math.max(0,f.propertyPrice-downPayment),termYears:'10',rate,rateMode:'monthly',ownerCosts:0,monthlySupport:0,supportMonths:0,horizon:'10'};
}

// The monthly projection and amortization model is unchanged.
function monthlyPayment(principal, monthlyRate, months) {
  if (principal <= 0) return 0;
  if (monthlyRate === 0) return principal / months;
  const factor = Math.pow(1 + monthlyRate, months);
  return principal * (monthlyRate * factor) / (factor - 1);
}
function calculate(d) {
  const months = Number(d.horizon) * 12, loanMonths = Number(d.termYears) * 12;
  const monthlyRate = (d.rateMode === 'monthly' ? d.rate / 100 : d.rate / 1200);
  const payment = monthlyPayment(d.principal, monthlyRate, loanMonths);
  let balance = d.principal, rent = d.rent, income = d.income, costs = d.livingCosts;
  let rentLiquid = d.savings, buyLiquid = d.savings - d.downPayment - d.closingCosts - d.renovation;
  let cumulativeRent = 0, cumulativeInterest = 0, principalRepaid = 0;
  const rows = [];
  for (let m = 0; m < months; m++) {
    const month = m % 12;
    if (m > 0 && month === Number(d.raiseMonth)) income *= 1 + d.incomeGrowth / 100;
    if (m > 0 && month === Number(d.rentRenewal)) rent *= 1 + d.rentGrowth / 100;
    if (m > 0 && month === 0) costs *= 1 + d.expenseGrowth / 100;
    const interest = m < loanMonths ? balance * monthlyRate : 0;
    const paid = m < loanMonths ? Math.min(payment, balance + interest) : 0;
    const principalPart = Math.max(0, paid - interest);
    balance = Math.max(0, balance - principalPart);
    const support = m < d.supportMonths ? d.monthlySupport : 0;
    const ownerCost = d.ownerCosts / 12;
    const rentSurplus = income - rent - costs - d.debt;
    const buySurplus = income + support - paid - ownerCost - costs - d.debt;
    rentLiquid += rentSurplus; buyLiquid += buySurplus;
    cumulativeRent += rent; cumulativeInterest += interest; principalRepaid += principalPart;
    rows.push({m, income, rent, payment: paid, userHousing: Math.max(0, paid - support) + ownerCost, support, balance, interest, principalPart, rentSurplus, buySurplus, rentLiquid, buyLiquid, cumulativeRent, cumulativeInterest, principalRepaid});
  }
  return { rows, payment, monthlyRate, initialBuyCash: d.downPayment + d.closingCosts + d.renovation, rentLiquid, buyLiquid, cumulativeRent, cumulativeInterest, principalRepaid, balance };
}
function annualize(rows) {
  return Array.from({ length: Math.ceil(rows.length / 12) }, (_, i) => {
    const group = rows.slice(i * 12, i * 12 + 12), last = group.at(-1);
    return { year: i + 1, income: last.income, rent: sum(group, 'rent'), buyHousing: sum(group, 'userHousing'), balance: last.balance, rentSurplus: sum(group, 'rentSurplus'), buySurplus: sum(group, 'buySurplus') };
  });
}
function sum(rows, key) { return rows.reduce((total, row) => total + row[key], 0); }
function firstMonth(rows, test) { const row = rows.find(test); return row ? row.m + 1 : null; }
function independentMonth(d, r) { return firstMonth(r.rows, row => row.m >= d.supportMonths && row.buySurplus >= 0 && r.rows.slice(row.m).every(later => later.buySurplus >= 0)); }

function formatInput(input) {
  if (!input.value.trim()) return;
  const key=input.dataset.key || input.dataset.adjustKey;
  if (moneyKeys.has(key) || percentKeys.has(key)) input.value=window.inputUtils.display(input.value,locale(),percentKeys.has(key));
}
function formatPeriod(period) {
  const [year,month]=period.split('-').map(Number);
  return new Intl.DateTimeFormat(locale(),{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(Date.UTC(year,month-1,1)));
}
function renderMonthSelectors() {
  document.querySelectorAll('[data-month-selector]').forEach(container=>{
    const key=container.dataset.monthSelector;
    window.monthSelector.render(container,{selected:Number(activeScenario?.[key]||0),locale:locale(),label:t(`field.${key}`),onChange:month=>{activeScenario[key]=String(month);applyScenario();renderMonthSelectors();}});
  });
}
function renderSalaryHistory() {
  $('#salaryHistoryEntries').innerHTML=salaryEntries.map((entry,index) => `<div class="salary-entry"><label>${t('salary.year')}<input data-salary-year="${index}" inputmode="numeric" type="number" min="1900" max="2200" value="${entry.year}" /></label><label>${t('salary.monthly')}<span class="input-wrap"><input data-salary-amount="${index}" inputmode="decimal" value="${entry.amount === '' ? '' : number(entry.amount)}" /><span>TRY</span></span></label><button type="button" class="salary-remove" data-salary-remove="${index}" aria-label="${t('salary.remove')}">×</button></div>`).join('');
  document.querySelectorAll('[data-salary-year]').forEach(input => input.addEventListener('input',event => { salaryEntries[Number(event.target.dataset.salaryYear)].year=Number(event.target.value); updateSalaryHistory(); }));
  document.querySelectorAll('[data-salary-amount]').forEach(input => { window.inputUtils.bind(input,locale,false); input.addEventListener('input',event => { salaryEntries[Number(event.target.dataset.salaryAmount)].amount=toNumber(event.target.value,true); updateSalaryHistory(); }); });
  document.querySelectorAll('[data-salary-remove]').forEach(button => button.addEventListener('click',() => { salaryEntries.splice(Number(button.dataset.salaryRemove),1); renderSalaryHistory(); }));
  updateSalaryHistory();
}
function updateSalaryHistory() {
  const summary=window.salaryHistory.summarize(salaryEntries);
  if(summary.changes.length===0) { $('#salaryHistorySummary').textContent=t('salary.needTwo'); $('#salaryUse').disabled=true; return; }
  const rows=summary.changes.map(change => `<span>${change.from} → ${change.to}: ${change.annualized>=0?'+':''}${percent(change.annualized)}</span>`).join('');
  $('#salaryHistorySummary').innerHTML=`<div class="salary-changes">${rows}</div><p>${t('salary.latest')}: <strong>${percent(summary.latest)}</strong> · ${t('salary.average')}: <strong>${percent(summary.average)}</strong></p>`;
  $('#salaryUse').disabled=false;
}
function updateSimpleRaise() {
  if(!activeScenario) return;
  const raw=$('#previousPay').value.trim(), previous=toNumber(raw,true), current=activeScenario.income;
  if(!raw||!Number.isFinite(previous)||previous<=0) {
    $('#simpleRaise').textContent=t('salary.currentPay',{amount:money(current)});
    $('#simpleRaiseUse').hidden=true;
    return;
  }
  const rate=Math.round((current/previous-1)*1000)/10;
  $('#simpleRaise').textContent=t('salary.latestSimple',{current:money(current),rate:percent(rate)});
  $('#simpleRaiseUse').textContent=t('salary.useSimple',{rate:percent(rate)});
  $('#simpleRaiseUse').hidden=false;
}
function renderRentReference() {
  const {data,stale,fromCache}=rentReferenceState;
  $('#rentReference .eyebrow').textContent=t(stale?'rent.lastReferenceTitle':'rent.referenceTitle');
  $('#rentReferenceValue').textContent=data ? referencePercent(data.percentage) : t('rent.unavailable');
  $('#rentReferenceStatus').textContent=data ? t(stale?'rent.stale':'rent.current',{period:formatPeriod(data.period)}) + (fromCache ? ` ${t('rent.cached')}` : '') : t('rent.manual');
  $('#rentReferenceUse').disabled=!data;
  $('#rentReferenceUse').textContent=t(stale?'rent.useDated':'rent.useReference');
  if(data) $('#rentReferenceLink').href=data.sourceUrl;
  $('#rentReferenceLink').hidden=!data;
  renderSources();
}
function sourceText(kind, origin) {
  if (origin==='official' && kind==='rent' && rentReferenceState.data) return t('rent.assumptionSource',{period:formatPeriod(rentReferenceState.data.period)});
  if (origin==='latest') return t('salary.sourceLatest');
  if (origin==='average') return t('salary.sourceAverage');
  return t('assumption.custom');
}
function renderSources() {
  document.querySelectorAll('.adjust-source').forEach(el => el.textContent=sourceText(el.dataset.source,activeSources[el.dataset.source]));
}

function chartSeries(series, formatter, detailFormatter, referenceLines = []) {
  const svg = $('#mainChart'), values = series.flatMap(item => item.values);
  if (!values.length || values.some(value => !Number.isFinite(value))) { svg.textContent = t('chart.unavailable'); return; }
  const low = Math.min(0,...values), high = Math.max(...values,...referenceLines,1), range = high-low || 1;
  const top = high+range*.08, bottom = low-range*.08, plot = {left:80,right:735,top:28,bottom:245};
  const x = i => plot.left+i*(plot.right-plot.left)/Math.max(1,series[0].values.length-1);
  const y = value => plot.bottom-(value-bottom)/(top-bottom)*(plot.bottom-plot.top);
  const ticks = [low,(low+high)/2,high];
  const grid = ticks.map(value => `<line class="grid-line" x1="80" x2="735" y1="${y(value)}" y2="${y(value)}"/><text class="axis-label" x="71" y="${y(value)+4}" text-anchor="end">${formatter(value)}</text>`).join('');
  const refs = referenceLines.map(value => `<line class="reference-line" x1="80" x2="735" y1="${y(value)}" y2="${y(value)}"/><text class="reference-label" x="84" y="${y(value)-5}" text-anchor="start">${value===0?t('chart.breakEven'):t('chart.reference',{value:formatter(value)})}</text>`).join('');
  const labels = series[0].values.map((_,i) => i===0 || i===series[0].values.length-1 || i%2===0 ? `<text class="axis-label" x="${x(i)}" y="274" text-anchor="middle">${t('chart.year',{year:i+1})}</text>` : '').join('');
  const lines = series.map((item,j) => {
    const path = item.values.map((value,i) => `${i?'L':'M'}${x(i).toFixed(1)},${y(value).toFixed(1)}`).join(' ');
    const points = item.values.map((value,i) => `<circle class="chart-point series-${j}" cx="${x(i)}" cy="${y(value)}" r="6" tabindex="0" data-year="${i+1}" data-series="${j}"><title>${t('chart.point',{year:i+1,series:item.name,value:detailFormatter(value)})}</title></circle>`).join('');
    return `<path class="chart-line series-${j}" d="${path}"/>${points}`;
  }).join('');
  svg.innerHTML = grid+refs+labels+lines;
  $('#chartReadout').textContent = '';
  svg.querySelectorAll('.chart-point').forEach(point => {
    const show = () => { const i=Number(point.dataset.year)-1, item=series[Number(point.dataset.series)]; $('#chartReadout').textContent=t('chart.point',{year:i+1,series:item.name,value:detailFormatter(item.values[i])}); };
    point.addEventListener('mouseenter',show); point.addEventListener('focus',show); point.addEventListener('click',show);
  });
}
function renderChart() {
  if (!activeProjection) return;
  const rows = activeProjection.rows, years = annualize(rows);
  const annualAverage = key => years.map((_,i) => sum(rows.slice(i*12,i*12+12),key)/12);
  const annualRatio = key => years.map((_,i) => { const group=rows.slice(i*12,i*12+12); return group.reduce((total,row)=>total+row[key]/row.income,0)/group.length*100; });
  let series, formatter, detail, references = [];
  if (chartMode === 'burden') {
    series = [{name:t('scenario.renting'),values:annualRatio('rent')},{name:t('scenario.buying'),values:annualRatio('userHousing')}];
    formatter = value => percent(value); detail = value => percent(value); references = [30,50];
  } else if (chartMode === 'cost') {
    series = [{name:t('scenario.renting'),values:annualAverage('rent')},{name:t('scenario.buying'),values:annualAverage('userHousing')}];
    formatter = value => number(value/1000)+'k'; detail = money;
  } else {
    series = [{name:t('scenario.renting'),values:annualAverage('rentSurplus')},{name:t('scenario.buying'),values:annualAverage('buySurplus')}];
    formatter = value => number(value/1000)+'k'; detail = money; references = [0];
  }
  $('#chartTitle').textContent = t(`chart.${chartMode}Title`);
  $('#mainChart').setAttribute('aria-label',$('#chartTitle').textContent);
  $('#chartContext').textContent=t(activeScenario.monthlySupport>0?'chart.supportNote':activeScenario.incomeGrowth===0&&activeScenario.rentGrowth===0&&activeScenario.expenseGrowth===0?'chart.flatNote':'chart.noSupportNote');
  document.querySelectorAll('[data-chart-mode]').forEach(button => { const selected=button.dataset.chartMode===chartMode; button.classList.toggle('selected',selected); button.setAttribute('aria-pressed',String(selected)); });
  chartSeries(series,formatter,detail,references);
}
function renderResults(scroll=false) {
  const d=activeScenario, r=activeProjection, first=r.rows[0], negative=r.rows.filter(row=>row.buySurplus<0).length;
  const independent=independentMonth(d,r), below40=firstMonth(r.rows,row=>row.payment>0 && row.payment/row.income<=.4);
  const reserveShortfall=r.initialBuyCash>d.savings-d.reserve;
  const gap=first.buySurplus-first.rentSurplus;
  $('#resultsTitle').textContent=t('results.compareTitle');
  $('#assumptionSummary').textContent=t(rateIsIllustrative?'quick.assumptions':'quick.assumptionsQuoted',{rate:referencePercent(d.rate),rateType:t(`rate.${d.rateMode}`).toLowerCase(),term:d.termYears,reserve:money(d.reserve),income:percent(d.incomeGrowth),rent:percent(d.rentGrowth)});
  $('#takeawayTitle').textContent=gap<0?t('results.buyLess',{amount:money(-gap)}):t('results.buyMore',{amount:money(gap)});
  $('#takeawayBody').textContent=t('results.housingShare',{share:percent(first.userHousing/first.income*100),payment:money(first.userHousing)});
  const columns=[
    {name:t('scenario.renting'),housing:first.rent,cash:first.rentSurplus,share:first.rent/first.income*100,cls:'rent'},
    {name:t('scenario.buying'),housing:first.userHousing,cash:first.buySurplus,share:first.userHousing/first.income*100,cls:'buy'}
  ];
  $('#comparison').innerHTML=`<div class="comparison-heading"><h3>${t('compare.title')}</h3><span>${t('compare.firstMonth')}</span></div><div class="comparison-columns">${columns.map(c=>`<div class="comparison-column ${c.cls}"><h4>${c.name}</h4><div class="comparison-main"><span>${t('compare.cash')}</span><strong class="${c.cash<0?'negative-value':''}">${money(c.cash)}</strong></div><div class="comparison-row"><span>${t('compare.housing')}</span><strong>${money(c.housing)}</strong></div><div class="comparison-row"><span>${t('compare.share')}</span><strong>${percent(c.share)}</strong></div></div>`).join('')}</div><details class="comparison-details"><summary>${t('action.details')}</summary><p>${t('compare.loanSummary',{loan:money(d.principal),payment:money(r.payment),down:money(d.downPayment)})}</p></details>`;
  const findings=[];
  findings.push([t('results.whenAffordable'),independent?t('results.monthValue',{month:independent}):t('results.notInHorizon')]);
  findings.push([t('results.whenBelow40'),below40?t('results.monthValue',{month:below40}):t('results.notInLoan')]);
  if (d.monthlySupport>0) findings.push([t('results.supportLabel'),t('results.monthValue',{month:d.supportMonths})]);
  $('#findings').innerHTML=findings.map(([label,value])=>`<div class="finding"><span>${label}</span><strong>${value}</strong></div>`).join('');
  $('#levers').innerHTML=[
    t('lever.principal',{amount:money(100000),saving:money(monthlyPayment(100000,r.monthlyRate,d.termYears*12))}),
    t('lever.cost',{amount:money(d.livingCosts*.1)}),
    d.monthlySupport>0?t('lever.support',{months:d.supportMonths}):''
  ].filter(Boolean).map(value=>`<div class="insight">${value}</div>`).join('');
  $('#annualRows').innerHTML=annualize(r.rows).map(year=>`<tr><td data-label="${t('timeline.year')}">${t('timeline.yearValue',{year:year.year})}</td><td data-label="${t('timeline.income')}">${money(year.income)}</td><td data-label="${t('timeline.rent')}">${money(year.rent)}</td><td data-label="${t('timeline.buyHousing')}">${money(year.buyHousing)}</td><td data-label="${t('timeline.balance')}">${money(year.balance)}</td><td data-label="${t('timeline.rentCash')}">${money(year.rentSurplus)}</td><td data-label="${t('timeline.buyCash')}">${money(year.buySurplus)}</td></tr>`).join('');
  $('#mortgageStats').innerHTML=[['mortgage.interest',money(r.cumulativeInterest)],['mortgage.principal',money(r.principalRepaid)],['mortgage.balance',money(r.balance)],['mortgage.liquid',money(r.buyLiquid)]].map(([label,value])=>`<div><span>${t(label)}</span><strong>${value}</strong></div>`).join('')+`<p>${t('mortgage.equityNote')}</p>`;
  $('#stressVariant option[value="support"]').hidden=d.monthlySupport<=0;
  if(d.monthlySupport<=0&&$('#stressVariant').value==='support') $('#stressVariant').value='salary';
  $('[data-preset="support"]').hidden=!supportEnabled||d.monthlySupport<=0;
  renderChart(); renderAdjustDelta();
  $('.intro').hidden=true;
  $('.workspace').hidden=true;
  $('.brand').href='#results';
  $('footer a[href="#top"],footer a[href="#results"]').href='#results';
  $('#results').hidden=false;
  if(scroll) $('#results').scrollIntoView({behavior:'smooth',block:'start'});
}
function adjustField(key) {
  const options={termYears:[5,10,15,20],horizon:[5,10,15],rateMode:['monthly','annual'],raiseMonth:Array.from({length:12},(_,i)=>i),rentRenewal:Array.from({length:12},(_,i)=>i)};
  let control;
  if(options[key]) control=`<select data-adjust-key="${key}">${options[key].map(value=>`<option value="${value}">${key==='rateMode'?t(`rate.${value}`):key==='raiseMonth'||key==='rentRenewal'?new Intl.DateTimeFormat(locale(),{month:'long'}).format(new Date(2026,value,1)):t(`term.${value}`)}</option>`).join('')}</select>`;
  else control=`<span class="input-wrap"><input data-adjust-key="${key}" inputmode="decimal" /><span>${moneyKeys.has(key)?'TRY':key==='supportMonths'?t('unit.months'):'%'}</span></span>`;
  return `<label>${t(`field.${key}`)}${control}</label>`;
}
function renderAdjustFields() {
  const groups=[['income',['income','incomeGrowth']],['rent',['rent','rentGrowth']],['home',['propertyPrice','downPayment']],['loan',['rate']]];
  $('#adjustFields').innerHTML=groups.map(([name,keys])=>`<div class="adjust-group"><h4>${t(`adjust.group.${name}`)}</h4>${keys.map(adjustField).join('')}</div>`).join('');
  $('#adjustMore').innerHTML=extraKeys.map(adjustField).join('');
  $('#supportFields').innerHTML=supportKeys.map(adjustField).join('');
  document.querySelectorAll('[data-adjust-key]').forEach(el=>{
    const key=el.dataset.adjustKey,value=activeScenario[key];
    el.value=moneyKeys.has(key)?number(value):percentKeys.has(key)?decimal(value):String(value);
    if(moneyKeys.has(key)||percentKeys.has(key)) window.inputUtils.bind(el,locale,percentKeys.has(key));
    el.addEventListener('input',onAdjustInput); el.addEventListener('change',onAdjustInput);
  });
  $('#supportToggle').checked=supportEnabled;
  $('#supportFields').hidden=!$('#supportToggle').checked;
  $('[data-preset="support"]').hidden=!supportEnabled||activeScenario.monthlySupport<=0;
  renderSources();
}
function onAdjustInput(event) {
  const key=event.target.dataset.adjustKey;
  activeScenario[key]=event.target.tagName==='SELECT'?event.target.value:window.inputUtils.rawValue(event.target,locale(),percentKeys.has(key));
  if(key==='rate'||key==='rateMode') rateIsIllustrative=false;
  if(key==='incomeGrowth') activeSources.income='custom';
  if(key==='rentGrowth') activeSources.rent='custom';
  if(['propertyPrice','downPayment','upfrontSupport'].includes(key)) activeScenario.principal=Math.max(0,activeScenario.propertyPrice-activeScenario.downPayment-activeScenario.upfrontSupport);
  renderSources();
  clearTimeout(recalcTimer);
  recalcTimer=setTimeout(()=>applyScenario(),280);
}
function renderAdjustDelta() {
  if(!initialScenario||!activeScenario) return;
  const before=calculate(initialScenario),after=activeProjection;
  $('#adjustDelta').textContent=JSON.stringify(initialScenario)===JSON.stringify(activeScenario)?t('adjust.initial'):t('adjust.impact',{paymentBefore:money(before.payment),paymentAfter:money(after.payment),cashBefore:money(before.rows[0].buySurplus),cashAfter:money(after.rows[0].buySurplus)});
}
function applyScenario(refreshFields=false) {
  if(!activeScenario) return;
  const error=validate(activeScenario);
  if(error) { $('#adjustError').textContent=t(error); return; }
  $('#adjustError').textContent='';
  activeProjection=calculate(activeScenario);
  syncQuickForm(activeScenario);
  updateSimpleRaise();
  if(refreshFields) renderAdjustFields();
  renderResults();
  $('#thresholdResult').textContent=''; $('#stressResult').textContent='';
}
function setScenario(d,scroll=false) {
  activeScenario={...d};
  activeProjection=calculate(activeScenario);
  renderAdjustFields(); renderMonthSelectors(); updateSimpleRaise(); renderResults(scroll);
  $('#adjustError').textContent='';
}
function showTab(tab) {
  resultTab=tab;
  document.querySelectorAll('[data-result-tab]').forEach(button=>{const selected=button.dataset.resultTab===tab;button.classList.toggle('selected',selected);button.setAttribute('aria-selected',String(selected));});
  document.querySelectorAll('[data-panel]').forEach(panel=>panel.hidden=panel.dataset.panel!==tab);
}
function openAdjust() { document.body.classList.add('adjust-open'); $('#adjustBackdrop').hidden=false; $('#adjustClose').focus(); }
function closeAdjust() { document.body.classList.remove('adjust-open'); $('#adjustBackdrop').hidden=true; $('#adjustOpen').focus(); }
function syncQuickForm(d) {
  document.querySelectorAll('input[data-key]').forEach(el=>el.value=number(d[el.dataset.key]));
}

document.querySelectorAll('input[data-key]').forEach(input=>{
  window.inputUtils.bind(input,locale,false);
  input.addEventListener('input',()=>input.removeAttribute('aria-invalid'));
});
window.inputUtils.bind($('#quoteRate'),locale,true);
window.inputUtils.bind($('#previousPay'),locale,false);
$('#previousPay').addEventListener('input',updateSimpleRaise);
$('#simpleRaiseUse').addEventListener('click',()=>{
  const previous=toNumber($('#previousPay').value,true);
  if(!activeScenario||previous<=0) return;
  activeScenario.incomeGrowth=Math.round((activeScenario.income/previous-1)*1000)/10;
  activeSources.income='latest'; applyScenario(true);
});
renderSalaryHistory(); renderRentReference();
window.rentReference.load().then(state=>{rentReferenceState=state;renderRentReference();});
$('#scenarioForm').addEventListener('submit',event=>{
  event.preventDefault();
  const facts={};
  document.querySelectorAll('input[data-key]').forEach(input=>facts[input.dataset.key]=toNumber(input.value,true));
  const checks=[['income','error.income'],['rent','error.rent'],['livingCosts','error.generic'],['savings','error.generic'],['propertyPrice','error.price']];
  const invalid=checks.find(([key])=>!document.querySelector(`[data-key="${key}"]`).value.trim()||!Number.isFinite(facts[key])||facts[key]<0||(['income','rent','propertyPrice'].includes(key)&&facts[key]===0));
  if(invalid) { $('#formError').textContent=t(invalid[1]); document.querySelector(`[data-key="${invalid[0]}"]`).setAttribute('aria-invalid','true'); document.querySelector(`[data-key="${invalid[0]}"]`).focus(); return; }
  $('#formError').textContent='';
  const quoted=$('#quoteRate').value.trim();
  const quote=quoted?toNumber(quoted,false):2.25;
  if(!Number.isFinite(quote)||quote<0) { $('#formError').textContent=t('error.rate'); $('#quoteRate').focus(); return; }
  const scenario=scenarioFromFacts(facts,quote);
  rateIsIllustrative=!quoted; initialRateIsIllustrative=rateIsIllustrative;
  initialScenario={...scenario}; initialSources={income:'custom',rent:'custom'}; activeSources={...initialSources}; supportEnabled=false;
  setScenario(scenario,true);
});
$('#clearBtn').addEventListener('click',()=>{
  document.querySelectorAll('input[data-key]').forEach(el=>{el.value='';el.removeAttribute('aria-invalid');});
  $('#quoteRate').value=''; $('#previousPay').value=''; $('#quoteDetails').open=false;
  salaryEntries=[{year:new Date().getFullYear()-1,amount:''},{year:new Date().getFullYear(),amount:''}]; renderSalaryHistory();
  activeSources={income:'custom',rent:'custom'}; initialSources=null; initialScenario=activeScenario=activeProjection=null; supportEnabled=false; rateIsIllustrative=true; initialRateIsIllustrative=true;
  $('#results').hidden=true; window.scrollTo({top:0,behavior:'smooth'});
  $('.intro').hidden=false; $('.workspace').hidden=false;
  $('.brand').href='#top';
  $('footer a[href="#top"],footer a[href="#results"]').href='#top';
});
$('#exampleBtn').addEventListener('click',()=>{
  const example=scenarioFromFacts({income:75000,rent:28000,livingCosts:22000,savings:500000,propertyPrice:4500000});
  syncQuickForm(example); $('#quoteRate').value=''; $('#previousPay').value=''; $('#quoteDetails').open=false; rateIsIllustrative=true; initialRateIsIllustrative=true; initialScenario={...example}; activeSources={income:'custom',rent:'custom'}; initialSources={...activeSources}; supportEnabled=false; setScenario(example,true);
});
$('#salaryAdd').addEventListener('click',()=>{salaryEntries.unshift({year:Math.min(...salaryEntries.map(entry=>Number(entry.year)||new Date().getFullYear()))-1,amount:''});renderSalaryHistory();$('#salaryHistoryEntries .salary-entry:first-child [data-salary-amount]')?.focus();});
$('#salaryUse').addEventListener('click',()=>{
  if(!activeScenario) return;
  const summary=window.salaryHistory.summarize(salaryEntries),choice=$('#salaryChoice').value,rate=summary[choice];
  if(!Number.isFinite(rate)) return;
  activeScenario.incomeGrowth=Math.round(rate*10)/10;activeSources.income=choice;applyScenario(true);
});
$('#rentReferenceUse').addEventListener('click',()=>{
  if(!activeScenario) return;
  const selected=window.rentReference.toAssumption(rentReferenceState.data);
  if(!selected) return;
  activeScenario.rentGrowth=selected.rate;activeSources.rent='official';applyScenario(true);
});
$('#supportToggle').addEventListener('change',event=>{
  supportEnabled=event.target.checked;
  $('#supportFields').hidden=!event.target.checked;
  if(!event.target.checked){activeScenario.upfrontSupport=0;activeScenario.monthlySupport=0;activeScenario.supportMonths=0;activeScenario.principal=Math.max(0,activeScenario.propertyPrice-activeScenario.downPayment);applyScenario(true);}
  else {activeScenario.supportMonths=24;applyScenario(true);}
});
$('#adjustOpen').addEventListener('click',openAdjust);
$('#adjustClose').addEventListener('click',closeAdjust);
$('#adjustBackdrop').addEventListener('click',closeAdjust);
document.addEventListener('keydown',event=>{
  if(!document.body.classList.contains('adjust-open')) return;
  if(event.key==='Escape') return closeAdjust();
  if(event.key!=='Tab') return;
  const focusable=[...$('#adjustPanel').querySelectorAll('button:not([disabled]),input,select,summary')].filter(el=>el.getClientRects().length);
  const first=focusable[0],last=focusable.at(-1);
  if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
  else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
});
$('#adjustReset').addEventListener('click',()=>{if(initialScenario){activeSources={...initialSources};supportEnabled=false;rateIsIllustrative=initialRateIsIllustrative;setScenario(initialScenario);}});
document.querySelectorAll('[data-preset]').forEach(button=>button.addEventListener('click',()=>{
  if(!activeScenario) return;
  const type=button.dataset.preset;
  if(type==='cheaper') activeScenario.propertyPrice=Math.round(activeScenario.propertyPrice*.9);
  if(type==='down') activeScenario.downPayment=Math.min(activeScenario.propertyPrice,Math.max(0,activeScenario.savings-activeScenario.closingCosts-activeScenario.renovation),Math.round(activeScenario.downPayment*1.1));
  if(type==='salary'){activeScenario.incomeGrowth=Math.max(0,activeScenario.incomeGrowth-2);activeSources.income='custom';}
  if(type==='support') activeScenario.supportMonths=Math.max(0,activeScenario.supportMonths-12);
  activeScenario.principal=Math.max(0,activeScenario.propertyPrice-activeScenario.downPayment-activeScenario.upfrontSupport);
  applyScenario(true);
}));
document.querySelectorAll('[data-chart-mode]').forEach(button=>button.addEventListener('click',()=>{chartMode=button.dataset.chartMode;renderChart();}));
document.querySelectorAll('[data-result-tab]').forEach(button=>button.addEventListener('click',()=>showTab(button.dataset.resultTab)));
$('#thresholdBtn').addEventListener('click',()=>{
  const d=activeScenario,r=activeProjection,target=d.income*.5;
  if(r.payment<=target){$('#thresholdResult').textContent=t('mortgage.thresholdAlready');return;}
  const paymentPerUnit=monthlyPayment(1,r.monthlyRate,d.termYears*12);
  const extra=Math.max(0,d.principal-target/paymentPerUnit);
  $('#thresholdResult').textContent=t('mortgage.threshold',{amount:money(extra)});
});
$('#stressRun').addEventListener('click',()=>{
  const variant=$('#stressVariant').value,d={...activeScenario};
  if(variant==='salary') d.incomeGrowth=Math.max(0,d.incomeGrowth-5);
  if(variant==='support') d.supportMonths=Math.max(0,d.supportMonths-12);
  if(variant==='expenses') d.expenseGrowth+=5;
  const before=activeProjection.rows.filter(row=>row.buySurplus<0).length,after=calculate(d).rows.filter(row=>row.buySurplus<0).length;
  $('#stressResult').textContent=t('stress.result',{months:after,delta:(after-before>0?'+':'')+number(after-before)});
});
document.addEventListener('hearthline:languagechange',()=>{
  document.querySelectorAll('input[data-key]').forEach(formatInput);
  if($('#quoteRate').value) $('#quoteRate').value=window.inputUtils.display($('#quoteRate').value,locale(),true);
  if($('#previousPay').value) $('#previousPay').value=window.inputUtils.display($('#previousPay').value,locale(),false);
  renderSalaryHistory();renderRentReference();
  if(activeScenario){renderAdjustFields();renderMonthSelectors();updateSimpleRaise();renderResults();showTab(resultTab);}
});
