// 计算器表达式解析：支持 + - × ÷、小数、负数（一元负号），按数学优先级计算
const PREC = { '+': 1, '-': 1, '×': 2, '÷': 2 };

// 修正浮点误差，如 0.1 + 0.2 -> 0.3
function fixFloat(n) {
  const r = Math.round(n * 1e10) / 1e10;
  return Object.is(r, -0) ? 0 : r;
}

function tokenize(expr) {
  const tokens = [];
  let num = '';
  for (let i = 0; i < expr.length; i++) {
    const ch = expr[i];
    if ((ch >= '0' && ch <= '9') || ch === '.') {
      num += ch;
    } else if (ch === '+' || ch === '-' || ch === '×' || ch === '÷') {
      if (num !== '') {
        tokens.push({ t: 'num', v: parseFloat(num) });
        num = '';
      }
      tokens.push({ t: 'op', v: ch });
    } else {
      return { error: '表达式包含不支持的字符' };
    }
  }
  if (num !== '') tokens.push({ t: 'num', v: parseFloat(num) });
  return { tokens };
}

function evaluate(expr) {
  if (!expr || !expr.trim()) return 0;

  const { tokens: raw, error } = tokenize(expr);
  if (error) throw new Error(error);
  if (!raw.length) return 0;

  // 处理一元负号：-5、3×-2 等
  const tokens = [];
  let neg = false;
  for (const tok of raw) {
    if (tok.t === 'op' && tok.v === '-') {
      const prev = tokens[tokens.length - 1];
      const isUnary = !prev || prev.t === 'op';
      if (isUnary) {
        neg = !neg;
        continue;
      }
      tokens.push(tok);
    } else if (tok.t === 'op') {
      neg = false;
      tokens.push(tok);
    } else {
      tokens.push({ t: 'num', v: neg ? -tok.v : tok.v });
      neg = false;
    }
  }

  // 末尾多余的运算符（如 "12+"）直接忽略
  while (tokens.length && tokens[tokens.length - 1].t === 'op') tokens.pop();
  if (!tokens.length) return 0;

  const nums = [];
  const ops = [];
  const apply = () => {
    const op = ops.pop();
    const b = nums.pop();
    const a = nums.pop();
    let r;
    if (op === '+') r = a + b;
    else if (op === '-') r = a - b;
    else if (op === '×') r = a * b;
    else if (op === '÷') {
      if (b === 0) throw new Error('不能除以 0');
      r = a / b;
    }
    nums.push(r);
  };

  for (const tok of tokens) {
    if (tok.t === 'num') {
      nums.push(tok.v);
    } else {
      while (ops.length && PREC[ops[ops.length - 1]] >= PREC[tok.v]) apply();
      ops.push(tok.v);
    }
  }
  while (ops.length) apply();
  return fixFloat(nums[0]);
}

function tryEvaluate(expr) {
  try {
    return { ok: true, value: evaluate(expr) };
  } catch (e) {
    return { ok: false, error: e.message || '表达式有误' };
  }
}

module.exports = { evaluate, tryEvaluate };
