// 页面记账/统计逻辑回归测试（模拟 wx 环境）：node tests/page.logic.test.js
const storage = require('../utils/storage');

function pad2(n) {
  return n < 10 ? '0' + n : '' + n;
}

const now = new Date();
const today =
  now.getFullYear() + '-' + pad2(now.getMonth() + 1) + '-' + pad2(now.getDate());
const yDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
const yesterday =
  yDate.getFullYear() + '-' + pad2(yDate.getMonth() + 1) + '-' + pad2(yDate.getDate());
const tDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
const tomorrow =
  tDate.getFullYear() + '-' + pad2(tDate.getMonth() + 1) + '-' + pad2(tDate.getDate());
const monthPrefix = today.slice(0, 7);
const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 25);
const lastMonth =
  lastMonthDate.getFullYear() +
  '-' +
  pad2(lastMonthDate.getMonth() + 1) +
  '-' +
  pad2(lastMonthDate.getDate());

const memStore = {};
global.wx = {
  getStorageSync: key => memStore[key],
  setStorageSync: (key, value) => {
    memStore[key] = value;
  },
  removeStorageSync: key => {
    delete memStore[key];
  },
  showToast: () => {},
  showActionSheet: () => {},
  showModal: () => {}
};

let pageInstance = null;
global.Page = def => {
  pageInstance = def;
};

require('../pages/index/index');

pageInstance.setData = function (patch) {
  Object.assign(this.data, patch);
};

storage.clear();
const ids = [];
[
  { type: 'expense', category: 'food', amount: 30, expression: '30', date: today },
  { type: 'expense', category: 'transport', amount: 10, expression: '10', date: today },
  { type: 'income', category: 'salary', amount: 100, expression: '100', date: today },
  { type: 'expense', category: 'food', amount: 20, expression: '20', date: yesterday },
  { type: 'expense', category: 'shopping', amount: 99, expression: '99', date: lastMonth }
].forEach(r => ids.push(storage.add(r).id));

const checks = [];
function assert(name, cond) {
  checks.push([name, !!cond]);
}

pageInstance.data = JSON.parse(JSON.stringify(pageInstance.data));
pageInstance.refreshRecords.call(pageInstance);

assert('今日支出 40.00', pageInstance.data.today.expense === '40.00');
assert('今日收入 +100.00', pageInstance.data.today.income === '+100.00');
assert('昨日支出 20.00', pageInstance.data.yesterday.expense === '20.00');
assert('本月支出 60.00', pageInstance.data.summary.expense === '60.00');
assert('本月结余 40.00', pageInstance.data.summary.balance === '40.00');

const s = pageInstance.data.stats;
assert('本月支出分类总计 60.00', s.expenseTotal === '60.00');
assert('本月图表总额 60.00', s.chartTotal === '60.00');
assert('餐饮分类 50.00 排第一', s.expenseCats[0].name === '餐饮' && s.expenseCats[0].amountText === '50.00');
assert('餐饮占比 83%', s.expenseCats[0].percent === 83);
assert('交通分类 10.00', s.expenseCats[1].amountText === '10.00');
assert('收入分类总计 100.00', s.incomeTotal === '100.00');
assert('本月不含上月记录', s.expenseCats.length === 2);
assert('条形图与分类一一对应', s.chart.length === 2 && s.chart[0].barH === 180);

// 切换到历史月份
pageInstance.data.statsMonth = lastMonth.slice(0, 7);
pageInstance.refreshStats.call(pageInstance);
assert('历史月支出总计 99.00', pageInstance.data.stats.expenseTotal === '99.00');
assert('历史月只有购物分类', pageInstance.data.stats.expenseCats.length === 1 && pageInstance.data.stats.expenseCats[0].name === '购物');

// 回到本月
pageInstance.onBackToCurrentMonth.call(pageInstance);
const ym = monthPrefix.split('-');
assert('回到本月月份正确', pageInstance.data.statsMonth === monthPrefix);
assert('回到本月标签正确', pageInstance.data.statsMonthLabel === +ym[0] + '年' + +ym[1] + '月');
assert('回到本月后详情关闭', pageInstance.data.statsDetail === null);

// 分类下钻
pageInstance.data.statsMonth = monthPrefix;
pageInstance.refreshStats.call(pageInstance);
pageInstance.openStatsDetail.call(pageInstance, 'expense', 'food');
const detail = pageInstance.data.statsDetail;
assert('下钻有 2 笔餐饮记录', detail && detail.records.length === 2);
assert('下钻记录带日期标签', detail && detail.records.every(r => r.dateLabel && r.amountText));

// 双击标红 / 取消
pageInstance.toggleMark.call(pageInstance, ids[0]);
const markedRec = storage.getById(ids[0]);
assert('双击后标记为红色', markedRec.marked === true);
assert('提醒语来自列表', ['不该花！', '请注意节约！', '想想自己的兜子！'].indexOf(markedRec.markText) >= 0);
pageInstance.toggleMark.call(pageInstance, ids[0]);
assert('再次双击取消标记', storage.getById(ids[0]).marked !== true);

// 日期标签
assert('今天标签', pageInstance.formatDateLabel(today) === '今天');
assert('明天标签', pageInstance.formatDateLabel(tomorrow) === '明天');
const yLabel =
  yDate.getFullYear() === now.getFullYear()
    ? yDate.getMonth() + 1 + '月' + yDate.getDate() + '日'
    : yDate.getFullYear() + '年' + (yDate.getMonth() + 1) + '月' + yDate.getDate() + '日';
assert('昨天显示具体日期', pageInstance.formatDateLabel(yesterday) === yLabel);

let pass = 0;
for (const [name, ok] of checks) {
  console.log((ok ? 'PASS' : 'FAIL'), name);
  if (ok) pass++;
}
console.log('TOTAL', pass + '/' + checks.length);
process.exit(pass === checks.length ? 0 : 1);
