/* Month arithmetic, the defaulting rule, and every view surviving any month. */

const { boot, suite, nowKey, addMonths } = require('./harness.js');
const t = suite('months');

const NOW = nowKey();
const app = boot('cashrunway.v2', {
  displayCurrency:'AED', rates:{ INRperAED:26.0679, AEDperUSD:3.6726 }, haircut:0.9975, cycleDay:22,
  accounts:[{ id:'a1', name:'NBD', currency:'AED', balance:18000, floor:5000 }],
  cards:[{ id:'c1', name:'Visa', currency:'AED', outstanding:4200 }],
  lines:[{ id:'l1', name:'Salary',  group:'income', currency:'AED', amount:25000, status:'pending', repeats:true },
         { id:'l3', name:'Flights', group:'due',    currency:'AED', amount:3000,  status:'pending', repeats:false }],
  goals:[], provision:{ AED:3000, INR:0, USD:0 }
});
const S = app.getS();

t.section('month keys roll the year over');
t.eq(app.ymAdd('2026-12',  1), '2027-01', 'December steps into January');
t.eq(app.ymAdd('2026-01', -1), '2025-12', 'January steps back into December');
t.eq(app.ymAdd('2026-08', 17), '2028-01', 'seventeen months on');
t.eq(app.ymAdd('2026-08',  0), '2026-08', 'nowhere is still somewhere');
t.eq(app.ymDiff('2026-11', '2027-02'),  3, 'a span across the year boundary');
t.eq(app.ymDiff('2027-02', '2026-11'), -3, 'and the same span backwards');
t.ok(/Jan/.test(app.monthTitle('2027-01')), 'a title names its month');
t.ok(/2027/.test(app.monthTitle('2027-01')), 'and its year');

t.section('setting a figure, then clearing it back to the assumption');
const FAR = addMonths(NOW, 7);
app.setHeld('accounts', FAR, 'a1', 12345);
t.eq(app.accountValue(S.accounts[0], FAR), 12345, 'a figure that is set is used');
t.ok(app.monthTouched(FAR), 'the month now counts as touched');
app.setHeld('accounts', FAR, 'a1', undefined);
t.eq(app.accountValue(S.accounts[0], FAR), 5000, 'cleared, it falls back to the minimum balance');
t.ok(!app.monthTouched(FAR), 'and the emptied month record is swept away, not left behind');
t.eq(S.months[FAR], undefined, 'nothing lingers under the key');

t.section('statuses belong to one month each');
const A = addMonths(NOW, 2), B = addMonths(NOW, 3);
app.setHeld('lines', A, 'l1', 'paid');
t.ok(app.lineIsPaid(S.lines[0], A),  'ticked paid in one month');
t.ok(!app.lineIsPaid(S.lines[0], B), 'still outstanding in the next');
t.eq(app.monthFor('AED', A).income, 0,     'the paid month drops the income');
t.eq(app.monthFor('AED', B).income, 25000, 'the other month still counts it');

t.section('the waterfall runs on an untouched month');
const m = app.monthFor('AED', B);
t.eq(m.opening, 5000, 'opening is the minimum balance');
t.eq(m.dues, 0, 'the one-off from another month does not appear');
t.eq(m.cards, 0, 'the card is assumed paid off');
t.eq(m.days, 30, 'a month that is not running budgets a full thirty days');
t.near(m.provision, 3000, 'so it budgets the whole provision');
t.ok(app.monthFor('AED', NOW).days <= 30, 'the running month is pro-rated to the cycle');

t.section('every view renders for any month, past or future');
for (const k of [addMonths(NOW, -80), addMonths(NOW, -1), NOW, addMonths(NOW, 1), addMonths(NOW, 60)]){
  app.setView(k);
  for (const name of ['monthView', 'moneyView', 'accountsView']){
    let html = null, err = null;
    try { html = app[name](); } catch (e) { err = e; }
    t.ok(!err, name + ' threw for ' + k + ': ' + (err && err.message));
    t.ok(html && html.length > 0, name + ' produced nothing for ' + k);
    t.ok(!/undefined|NaN|\[object /.test(html || ''), name + ' leaked a placeholder for ' + k);
  }
}

t.section('a month explains itself only while untouched');
app.setView(addMonths(NOW, 9));
t.ok(app.monthView().includes('Nothing typed against'), 'an untouched month says so');
app.setView(NOW);
t.ok(!app.monthView().includes('Nothing typed against'), 'a month with figures does not');

t.section('the AUTO tag tracks what is still assumed');
app.setView(addMonths(NOW, 9));
t.ok(app.accountsView().includes('AUTO'), 'an assumed account is tagged');
app.setView(NOW);
t.ok(!app.accountsView().includes('AUTO'), 'a typed one is not');

t.done();
