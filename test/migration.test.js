/* Upgrading a v2 device: per-record figures become per-month ones. */

const { boot, suite, nowKey, addMonths } = require('./harness.js');
const t = suite('migration from v2');

const NOW  = nowKey();
const FC   = addMonths(NOW, 1);    // the month the old forecast slot was stamped for
const LATE = addMonths(NOW, 7);
const PAST = addMonths(NOW, -14);

// Exactly the shape the old code persisted, including a stamped forecast.
const v2 = {
  displayCurrency:'AED', rates:{ INRperAED:26.0679, AEDperUSD:3.6726 }, haircut:0.9975, cycleDay:22,
  accounts:[
    { id:'a1', name:'Emirates NBD', currency:'AED', balance:18000,  floor:5000,   fcMonth:FC,   fcBalance:9000 },
    { id:'a2', name:'HDFC',         currency:'INR', balance:250000, floor:100000, fcMonth:null, fcBalance:0 }
  ],
  cards:[{ id:'c1', name:'ADCB Visa', currency:'AED', outstanding:4200, fcMonth:null, fcOutstanding:0 }],
  lines:[
    { id:'l1', name:'Salary',  group:'income', currency:'AED', amount:25000, status:'paid',    repeats:true  },
    { id:'l2', name:'Rent',    group:'due',    currency:'AED', amount:7000,  status:'pending', repeats:true  },
    { id:'l3', name:'Flights', group:'due',    currency:'AED', amount:3000,  status:'pending', repeats:false }
  ],
  goals:[{ id:'g1', name:'Car', currency:'AED', target:60000, saved:12000, by:addMonths(NOW, 4),
           movedOn:NOW, movedAmount:4000 }],
  provision:{ AED:3000, INR:0, USD:0 }, updatedAt:'2026-08-20T00:00:00.000Z'
};

const app = boot('cashrunway.v2', v2);
const S = app.getS();

t.section('typed figures land in the month they were about');
t.eq(S.months[NOW].accounts.a1, 18000, 'the account balance lands in the current month');
t.eq(S.months[NOW].accounts.a2, 250000, 'and so does the second account');
t.eq(S.months[NOW].cards.c1, 4200, 'the card outstanding lands in the current month');
t.eq(S.months[FC].accounts.a1, 9000, 'the forecast lands in the month it was stamped for');
t.eq(S.months[NOW].lines.l1, 'paid', 'a paid line is recorded paid in the current month');
t.ok(!(S.months[NOW].lines || {}).l2, 'a pending line stores nothing — pending is the default');
t.eq(S.months[NOW].goals.g1, { amount:4000 }, 'the goal transfer lands in the month it was moved');

t.section('the per-record fields are gone');
t.ok(!('balance'  in S.accounts[0]), 'balance stripped off the account');
t.ok(!('fcMonth'  in S.accounts[0]), 'fcMonth stripped off the account');
t.ok(!('fcBalance' in S.accounts[0]), 'fcBalance stripped off the account');
t.ok(!('outstanding' in S.cards[0]), 'outstanding stripped off the card');
t.ok(!('status'   in S.lines[0]),   'status stripped off the line');
t.ok(!('movedOn'  in S.goals[0]),   'movedOn stripped off the goal');
t.eq(S.lines[2].month, NOW, 'the one-off is stamped to the month it was entered in');
// Migration leaves the key off; commit writes null. Both mean "no month", and
// linesIn only ever asks whether it matches, so the invariant is the absence.
t.ok(S.lines[0].month == null, 'a repeating line carries no month');

t.section('an untouched month assumes the conservative case');
const a1 = S.accounts[0], c1 = S.cards[0];
t.eq(app.accountValue(a1, LATE), 5000, 'a future month opens at the minimum balance');
t.eq(app.accountValue(a1, PAST), 5000, 'so does a month before any of this was recorded');
t.eq(app.accountValue(a1, NOW),  18000, 'the migrated month keeps its typed figure');
t.eq(app.accountValue(a1, FC),   9000,  'the forecast month keeps its forecast');
t.eq(app.cardValue(c1, LATE), 0, 'a card is assumed paid off');
t.ok(app.lineIsPaid(S.lines[0], NOW),         'salary reads paid in the current month');
t.ok(!app.lineIsPaid(S.lines[0], LATE),       'and outstanding again later');
t.ok(app.monthTouched(NOW) && !app.monthTouched(LATE), 'touched months are distinguishable');

t.section('a one-off belongs to exactly one month');
const names = k => app.linesIn(k).map(l => l.name).sort().join(',');
t.eq(names(NOW),  'Flights,Rent,Salary', 'the one-off shows in its own month');
t.eq(names(LATE), 'Rent,Salary',          'and in no other');

t.section('migrating is idempotent');
const before = JSON.stringify(S.months);
app.upgrade(S); app.upgrade(S);
t.eq(JSON.stringify(S.months), before, 'upgrading again changes nothing');

t.section('the new shape survives a sync round trip');
const p = app.payload();
t.ok(!!p.months, 'months travels in the payload');
app.adopt(JSON.parse(JSON.stringify(p)));
t.eq(app.getS().months[NOW].accounts.a1, 18000, 'adopt keeps the month figures');

t.section('a v2 payload arriving over sync is upgraded on the way in');
const fresh = boot();
fresh.adopt(JSON.parse(JSON.stringify(v2)));
t.eq(fresh.getS().months[NOW].accounts.a1, 18000, 'an old-shaped remote file is migrated, not dropped');
t.ok(!('balance' in fresh.getS().accounts[0]), 'and normalised on arrival');

t.done();
