// 计算器解析器回归测试：node tests/calc.test.js
const { tryEvaluate } = require('../utils/calc');

const cases = [
  ['12+3', 15],
  ['12+3×4', 24],
  ['10÷4', 2.5],
  ['0.1+0.2', 0.3],
  ['5×0', 0],
  ['-5+3', -2],
  ['3×-2', -6],
  ['12+', 12],
  ['5÷0', 'ERR'],
  ['7-2×3', 1],
  ['100÷10÷2', 5],
  ['9.99+0.01', 10],
  ['0', 0],
  ['3×4÷2+1', 7],
  ['2.5×2-1.5', 3.5]
];

let pass = 0;
for (const [expr, expected] of cases) {
  const r = tryEvaluate(expr);
  if (expected === 'ERR') {
    if (!r.ok) {
      console.log('PASS', expr, '-> error:', r.error);
      pass++;
    } else {
      console.log('FAIL', expr, '->', r.value, 'expected error');
    }
  } else if (r.ok && Math.abs(r.value - expected) < 1e-9) {
    console.log('PASS', expr, '->', r.value);
    pass++;
  } else {
    console.log('FAIL', expr, '->', r.ok ? r.value : r.error, 'expected', expected);
  }
}

console.log('TOTAL', pass + '/' + cases.length);
process.exit(pass === cases.length ? 0 : 1);
