/* Runs the real app headlessly.

   There is no build step and no module system to hook into: the app is one
   <script> inside index.html. So the harness lifts that script out, evaluates
   it against a stubbed DOM and localStorage, and hands back its internals by
   name. What gets tested is therefore the shipped code, not a copy of it — if
   index.html changes, these tests change with it or they fail.

   Date helpers here are written out longhand rather than borrowed from the
   app, so that a bug in the app's own month arithmetic cannot quietly agree
   with itself and pass. */

const fs = require('fs');
const path = require('path');

const APP = path.join(__dirname, '..', 'index.html');

/* ---------- dates, independent of the app ---------- */

const ymKey = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
const nowKey = () => ymKey(new Date());
const addMonths = (key, n) => {
  const [y, m] = key.split('-').map(Number);
  return ymKey(new Date(y, m - 1 + n, 1));
};

/* ---------- the fake device ---------- */

const store = {};
global.localStorage = {
  getItem: k => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: k => { delete store[k]; }
};

const stub = () => ({ innerHTML:'', className:'', dataset:{}, appendChild(){}, remove(){},
                      querySelectorAll: () => [], classList:{ contains: () => false } });
let clickHandlers = [];
global.document = {
  getElementById: stub, querySelector: () => null, querySelectorAll: () => [],
  addEventListener(type, fn){ if (type === 'click') clickHandlers.push(fn); },
  body: stub(), createElement: stub, hidden: false
};
global.alert = m => { throw new Error('unexpected alert: ' + m); };
global.fetch = () => Promise.reject(new Error('the harness has no network'));
global.structuredClone = global.structuredClone || (o => JSON.parse(JSON.stringify(o)));

/* Everything the tests reach for. A name the app no longer defines comes back
   undefined rather than throwing, so a rename shows up as a failing assertion
   naming the thing, instead of an unreadable ReferenceError at boot. */
const EXPOSED = [
  'S', 'viewYm', 'ymAdd', 'ymDiff', 'monthTitle', 'isThisMonth', 'thisMonthKey',
  'held', 'isSet', 'setHeld', 'monthTouched', 'accountValue', 'cardValue', 'lineIsPaid',
  'goalMoved', 'goalMonthly', 'monthFor', 'linesIn', 'computeAll', 'monthView',
  'moneyView', 'accountsView', 'render', 'upgrade', 'payload', 'adopt', 'commit'
];

/* Boot a fresh copy of the app, optionally over state already on the device. */
function boot(seedKey, seedValue){
  for (const k of Object.keys(store)) delete store[k];
  if (seedKey) store[seedKey] = JSON.stringify(seedValue);
  clickHandlers = [];

  const src = fs.readFileSync(APP, 'utf8');
  const js = src.slice(src.indexOf('<script>') + 8, src.lastIndexOf('</script>'));
  const grab = EXPOSED.map(n => n + ':(typeof ' + n + '!=="undefined"?' + n + ':undefined)').join(',');

  const app = new Function(js + '\n;return {' + grab + ',' +
    ' setView:v=>{viewYm=v}, getViewYm:()=>viewYm,' +
    ' getS:()=>S, setSheet:v=>{sheetState=v}, getSheet:()=>sheetState};')();

  /* Fire the app's own click handler, so the tests exercise the real
     delegation rather than a paraphrase of it. `attrs` maps the selector the
     handler asks for to what it should find. */
  app.click = attrs => {
    const data = attrs.dataset || {};
    const target = {
      closest: sel => (sel.replace(/[[\]]/g, '') in attrs)
        ? { dataset: data, getAttribute: () => attrs[sel.replace(/[[\]]/g, '')] }
        : null,
      classList: { contains: () => false }
    };
    clickHandlers.forEach(fn => fn({ target }));
  };
  app.storedKeys = () => Object.keys(store);
  return app;
}

/* ---------- assertions ---------- */

function suite(title){
  let pass = 0; const failures = [];
  console.log('\n' + title);
  return {
    section: s => console.log('  · ' + s),
    ok(cond, msg){ cond ? pass++ : failures.push(msg); },
    eq(actual, expected, msg){
      const a = JSON.stringify(actual), e = JSON.stringify(expected);
      a === e ? pass++ : failures.push(msg + '  (expected ' + e + ', got ' + a + ')');
    },
    near(actual, expected, msg){
      Math.abs(actual - expected) < 0.01 ? pass++
        : failures.push(msg + '  (expected ~' + expected + ', got ' + actual + ')');
    },
    done(){
      failures.forEach(f => console.log('  FAIL  ' + f));
      console.log('  ' + pass + ' passed, ' + failures.length + ' failed');
      if (failures.length) process.exitCode = 1;
      return failures.length === 0;
    }
  };
}

module.exports = { boot, suite, ymKey, nowKey, addMonths, APP };
