/* The click handler, the sheet, and delete — driven through the app's own
   event delegation rather than by calling the helpers underneath it. */

const { boot, suite, nowKey, addMonths } = require('./harness.js');
const t = suite('interactions');

const NOW = nowKey();
const app = boot('cashrunway.v2', {
  displayCurrency:'AED', rates:{ INRperAED:26.07, AEDperUSD:3.67 }, haircut:0.9975, cycleDay:22,
  accounts:[{ id:'a1', name:'NBD', currency:'AED', balance:18000, floor:5000 }],
  cards:[], provision:{ AED:0, INR:0, USD:0 },
  lines:[{ id:'l1', name:'Rent',    group:'due', currency:'AED', amount:7000, status:'pending', repeats:true },
         { id:'l3', name:'Flights', group:'due', currency:'AED', amount:3000, status:'pending', repeats:false }],
  goals:[{ id:'g1', name:'Car', currency:'AED', target:60000, saved:0, by:addMonths(NOW, 4) }]
});
const S = app.getS();

const step   = n  => app.click({ 'data-mstep':String(n), dataset:{ mstep:String(n) } });
const home   = () => app.click({ 'data-mjump':'1', dataset:{} });
const tick   = id => app.click({ 'data-toggle':id, dataset:{ toggle:id } });
const moveGoal = id => app.click({ 'data-goal-toggle':id, dataset:{ goalToggle:id } });

t.section('the picker walks months and comes home');
app.setView('2026-11');
step(1);  t.eq(app.getViewYm(), '2026-12', 'forward a month');
step(1);  t.eq(app.getViewYm(), '2027-01', 'forward across the year boundary');
step(-1); step(-1);
t.eq(app.getViewYm(), '2026-11', 'and back again');
home();   t.eq(app.getViewYm(), NOW, 'the middle button returns to the current month');

t.section('ticking a line touches only the month on screen');
const OCT = addMonths(NOW, 1), NOV = addMonths(NOW, 2);
app.setView(OCT);
tick('l1');
t.ok(app.lineIsPaid(S.lines[0], OCT),  'ticked paid where you are');
t.ok(!app.lineIsPaid(S.lines[0], NOV), 'the next month is untouched');
t.ok(!app.lineIsPaid(S.lines[0], NOW), 'the current month is untouched');
tick('l1');
t.ok(!app.lineIsPaid(S.lines[0], OCT), 'ticking again reverses it');
t.eq(S.months[OCT], undefined, 'and leaves no empty record behind');

t.section('a goal transfer is recorded against the month on screen');
app.setView(OCT);
// 60000 with nothing saved, needed by NOW+4: viewed from NOW+1 that is four
// months inclusive, so 15000. Move it and 45000 re-levels over the three
// months that remain — 15000 again.
t.eq(app.goalMonthly(S.goals[0], OCT), 15000, 'the shortfall spreads over the months that remain');
moveGoal('g1');
t.eq(S.goals[0].saved, 15000, 'ticking moved adds it to what is set aside');
t.eq(app.goalMoved(S.goals[0], OCT), { amount:15000 }, 'and records it against that month');
t.ok(!app.goalMoved(S.goals[0], NOV), 'the next month is not marked moved');
t.eq(app.goalMonthly(S.goals[0], OCT), 0, 'nothing more is needed there');
t.eq(app.goalMonthly(S.goals[0], NOV), 15000, 'and the rest re-level over what is left');
moveGoal('g1');
t.eq(S.goals[0].saved, 0, 'unticking gives it back');
t.ok(!app.goalMoved(S.goals[0], OCT), 'and clears the record');

t.section('saving an account writes the month on screen and no other');
const MAY = addMonths(NOW, 20);
app.setView(MAY);
app.setSheet({ type:'account', id:'a1', isNew:false,
               draft:{ name:'NBD', currency:'AED', floor:5000, mode:'manual', balance:'31000' } });
app.commit();
t.eq(app.accountValue(S.accounts[0], MAY), 31000, 'that month took the figure');
t.eq(app.accountValue(S.accounts[0], addMonths(MAY, 1)), 5000, 'the next still assumes the minimum');
t.eq(app.accountValue(S.accounts[0], NOW), 18000, 'the current month is untouched');
t.ok(!('balance' in S.accounts[0]), 'and nothing leaked back onto the record');

t.section('switching back to "minimum balance" clears that month');
app.setSheet({ type:'account', id:'a1', isNew:false,
               draft:{ name:'NBD', currency:'AED', floor:5000, mode:'auto', balance:'31000' } });
app.commit();
t.eq(app.accountValue(S.accounts[0], MAY), 5000, 'back to the assumption');
t.ok(!app.monthTouched(MAY), 'and the month is untouched again');

t.section('moving a one-off to another month takes its status with it');
const FEB = addMonths(NOW, 17);
app.setView(NOW);
app.setHeld('lines', NOW, 'l3', 'paid');
app.setSheet({ type:'line', id:'l3', isNew:false,
               draft:{ name:'Flights', group:'due', currency:'AED', amount:'3000',
                       repeats:'no', month:FEB, status:'paid' } });
app.commit();
t.eq(S.lines[1].month, FEB, 'the one-off moved');
t.ok(app.lineIsPaid(S.lines[1], FEB), 'its paid status went with it');
t.ok(!app.lineIsPaid(S.lines[1], NOW), 'nothing was stranded in the month it left');
t.ok(app.linesIn(FEB).some(l => l.id === 'l3'),  'it shows in its new month');
t.ok(!app.linesIn(NOW).some(l => l.id === 'l3'), 'and not in the old one');

t.section('deleting something takes its month entries with it');
app.setHeld('accounts', addMonths(NOW, 30), 'a1', 999);
app.setHeld('accounts', addMonths(NOW, 31), 'a1', 888);
app.setSheet({ type:'account', id:'a1', isNew:false, draft:{} });
app.click({ 'data-delete':'1', dataset:{} });
t.eq(S.accounts.length, 0, 'the account is gone');
const orphans = Object.keys(S.months).filter(k => (S.months[k].accounts || {}).a1 !== undefined);
t.eq(orphans, [], 'and no month still holds a figure for it');

t.section('a fresh install has nothing to show and does not fall over');
const blank = boot();
t.eq(blank.getS().months, {}, 'no months yet');
t.eq(blank.getViewYm(), NOW, 'and it opens on the current month');
for (const name of ['monthView', 'moneyView', 'accountsView']){
  let err = null;
  try { blank[name](); } catch (e) { err = e; }
  t.ok(!err, name + ' threw on a fresh install: ' + (err && err.message));
}

t.done();
