const { CATEGORIES, getCategory } = require('../../utils/categories');
const { tryEvaluate } = require('../../utils/calc');
const storage = require('../../utils/storage');

const OPS = ['+', '-', '×', '÷'];
const MAX_EXPR_LEN = 30;
const MARK_TEXTS = ['不该花！', '请注意节约！', '想想自己的兜子！'];
const MARK_WARN_TEXTS = ['钱钱钱！！请节约', '请注意立即停止非正常消费！！', '想想自己在干什么！你的钱呢！'];
const MARK_WARN_THRESHOLD = 3;

function pad2(n) {
  return n < 10 ? '0' + n : '' + n;
}

function todayStr() {
  const d = new Date();
  return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
}

function formatMoney(n) {
  const neg = n < 0;
  const fixed = Math.abs(n).toFixed(2);
  const parts = fixed.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return (neg ? '-' : '') + parts.join('.');
}

function formatTime(d) {
  return pad2(d.getHours()) + ':' + pad2(d.getMinutes());
}

function formatDateCN(dateStr) {
  const p = dateStr.split('-');
  return +p[0] + '年' + +p[1] + '月' + +p[2] + '日';
}

Page({
  data: {
    activeTab: 'calc', // calc | records

    // 计算器状态
    type: 'expense',
    categories: CATEGORIES.expense,
    category: 'food',
    note: '',
    recordDate: todayStr(),
    recordDateLabel: '今天',
    expr: '0',
    displayExpr: '',
    preview: '0.00',
    calcError: '',
    justEvaluated: false,
    editId: null,

    // 明细状态
    filter: 'all',
    summary: { income: '0.00', expense: '0.00', balance: '0.00' },
    groups: [],
    today: { expense: '0.00', income: '' },
    yesterday: { expense: '0.00', income: '' },
    recordDays: 0,

    // 统计状态
    currentMonth: todayStr().slice(0, 7),
    statsMonth: todayStr().slice(0, 7),
    statsMonthLabel: '',
    todayDateText: formatDateCN(todayStr()),
    stats: {
      expenseTotal: '0.00',
      incomeTotal: '0.00',
      chartTotal: '0.00',
      chart: [],
      expenseCats: [],
      incomeCats: []
    },
    statsDetail: null,
    diary: null,
    posterPreview: '',
    feedbackOpen: false
  },

  onLoad() {
    this.setData({ statsMonthLabel: this.formatMonthLabel(this.data.statsMonth) });
    this.refreshRecords();
  },

  onShow() {
    // 进入小程序时：若当天双击标红次数达到阈值，弹出随机消费提醒
    this.checkMarkWarn();
  },

  checkMarkWarn() {
    if (storage.getMarkCount(todayStr()) >= MARK_WARN_THRESHOLD) {
      this.showMarkWarnDialog();
    }
  },

  showMarkWarnDialog() {
    const text = MARK_WARN_TEXTS[Math.floor(Math.random() * MARK_WARN_TEXTS.length)];
    this._warnStep = 0;
    const open = () => {
      wx.showModal({
        title: '消费提醒',
        content: text,
        showCancel: false,
        confirmText: '确定',
        confirmColor: '#e64340',
        success: res => {
          if (!res.confirm) return;
          if (this._warnStep === 0) {
            // 第一次点击确认：立即重新弹出，必须再点一次才能真正关闭
            this._warnStep = 1;
            open();
          } else {
            this._warnStep = 0;
          }
        }
      });
    };
    open();
  },

  // 分享给好友/朋友圈（个人主体小程序同样支持转发）
  onShareAppMessage() {
    if (this.data.diary && this._diaryPoster) {
      return {
        title: '我的记账日记',
        path: 'pages/index/index',
        imageUrl: this._diaryPoster
      };
    }
    return {
      title: '随随随记：计算器式离线记账',
      path: 'pages/index/index'
    };
  },

  onShareTimeline() {
    return {
      title: '随随随记：计算器式离线记账'
    };
  },

  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    if (tab === this.data.activeTab) return;
    if (tab === 'records') this.refreshRecords();
    if (tab === 'stats') this.refreshStats();
    this.setData({ activeTab: tab });
  },

  // ---------- 日期 ----------

  setRecordDate(date) {
    this.setData({ recordDate: date, recordDateLabel: this.formatDateLabel(date) });
  },

  onDateChange(e) {
    this.setRecordDate(e.detail.value);
  },

  // ---------- 计算器输入 ----------

  onKeyTap(e) {
    const key = e.currentTarget.dataset.key;
    if (key === 'C') return this.clearAll();
    if (key === '⌫') return this.backspace();
    if (key === '=') return this.calculate();
    if (OPS.indexOf(key) >= 0) return this.pushOperator(key);
    this.pushDigit(key);
  },

  pushDigit(key) {
    let expr = this.data.expr;
    if (this.data.justEvaluated) {
      this.setData({ justEvaluated: false });
      expr = '';
    }
    const seg = expr.split(/[+\-×÷]/).pop();
    if (key === '.') {
      if (seg.indexOf('.') >= 0) return;
      if (seg === '' || seg === '-') expr += '0';
      expr += '.';
    } else {
      // 金额最多保留两位小数
      if (seg.indexOf('.') >= 0 && seg.split('.')[1].length >= 2) return;
      if (expr === '0') expr = '';
      expr += key;
    }
    if (expr.length > MAX_EXPR_LEN) return;
    if (expr === '' || expr === '-') expr = '0';
    this.applyExpr(expr);
  },

  pushOperator(key) {
    let expr = this.data.expr;
    if (this.data.justEvaluated) {
      // 从计算结果继续运算，例如 28 + 5
      this.setData({ justEvaluated: false });
    }
    const last = expr.slice(-1);
    if (OPS.indexOf(last) >= 0) {
      if (last === key) return;
      expr = expr.slice(0, -1) + key;
    } else if (expr !== '' && expr !== '0') {
      expr += key;
    } else if (key === '-') {
      expr = '0-';
    } else {
      return; // 空输入或 0 时忽略 +、×、÷
    }
    if (expr.length > MAX_EXPR_LEN) return;
    this.applyExpr(expr);
  },

  calculate() {
    const { ok, value, error } = tryEvaluate(this.data.expr);
    if (!ok) {
      wx.showToast({ title: error || '表达式有误', icon: 'none' });
      return;
    }
    this.setData({ justEvaluated: true });
    this.applyExpr(String(value));
  },

  backspace() {
    if (this.data.justEvaluated) {
      this.setData({ justEvaluated: false });
      return this.applyExpr('0');
    }
    let expr = this.data.expr;
    if (expr === '0' || expr === '') return;
    expr = expr.slice(0, -1);
    if (expr === '' || expr === '-' || expr === '0-') expr = '0';
    this.applyExpr(expr);
  },

  clearAll() {
    this.setData({ justEvaluated: false });
    this.applyExpr('0');
  },

  applyExpr(expr) {
    const hasOperator = OPS.some(op => expr.indexOf(op) >= 0);
    const displayExpr = expr === '0' ? '' : expr.replace(/([+\-×÷])/g, ' $1 ').trim();
    let preview = '0.00';
    let calcError = '';

    if (expr === '' || expr === '-' || expr === '0-') {
      preview = '0.00';
    } else {
      const { ok, value, error } = tryEvaluate(expr);
      if (!ok) {
        calcError = error || '表达式有误';
        preview = '--';
      } else {
        preview = formatMoney(value);
      }
    }
    this.setData({ expr, displayExpr, preview, calcError, hasOperator });
  },

  // ---------- 分类 / 备注 ----------

  onTypeChange(e) {
    const type = e.currentTarget.dataset.type;
    if (type === this.data.type) return;
    const categories = CATEGORIES[type];
    this.setData({ type, categories, category: categories[0].key });
  },

  onCategoryTap(e) {
    this.setData({ category: e.currentTarget.dataset.key });
  },

  onNoteInput(e) {
    this.setData({ note: e.detail.value });
  },

  // ---------- 保存 ----------

  onSave() {
    const { ok, value, error } = tryEvaluate(this.data.expr);
    if (!ok || !isFinite(value)) {
      wx.showToast({ title: error || '请输入有效金额', icon: 'none' });
      return;
    }
    const amount = Math.round(value * 100) / 100;
    if (amount <= 0) {
      wx.showToast({ title: '金额需大于 0', icon: 'none' });
      return;
    }

    const record = {
      type: this.data.type,
      category: this.data.category,
      amount,
      expression: this.data.expr,
      note: (this.data.note || '').trim(),
      date: this.data.recordDate
    };
    if (!this.data.editId) {
      record.time = formatTime(new Date());
    }

    if (this.data.editId) {
      storage.update(this.data.editId, record);
      wx.showToast({ title: '已保存修改', icon: 'success' });
      this.resetCalculator();
      this.refreshRecords();
      this.setData({ activeTab: 'records' });
    } else {
      storage.add(record);
      wx.showToast({ title: '记账成功', icon: 'success' });
      this.resetCalculator();
      this.refreshRecords();
    }
  },

  resetCalculator() {
    this.setData({ note: '', editId: null, justEvaluated: false });
    this.setRecordDate(todayStr());
    this.applyExpr('0');
  },

  onCancelEdit() {
    this.resetCalculator();
    this.refreshRecords();
    this.setData({ activeTab: 'records' });
  },

  // ---------- 明细 ----------

  refreshRecords() {
    const all = storage.readAll();
    const recordDays = new Set(all.map(r => r.date).filter(Boolean)).size;
    const now = new Date();
    const monthPrefix = now.getFullYear() + '-' + pad2(now.getMonth() + 1);
    const today = todayStr();
    const y = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    const yesterday = y.getFullYear() + '-' + pad2(y.getMonth() + 1) + '-' + pad2(y.getDate());
    let income = 0;
    let expense = 0;
    let todayExp = 0;
    let todayInc = 0;
    let yExp = 0;
    let yInc = 0;
    all.forEach(r => {
      if (r.date && r.date.indexOf(monthPrefix) === 0) {
        if (r.type === 'income') income += r.amount;
        else expense += r.amount;
      }
      if (r.date === today) {
        if (r.type === 'income') todayInc += r.amount;
        else todayExp += r.amount;
      } else if (r.date === yesterday) {
        if (r.type === 'income') yInc += r.amount;
        else yExp += r.amount;
      }
    });

    const filter = this.data.filter;
    const filtered = filter === 'all' ? all : all.filter(r => r.type === filter);
    const groups = this.groupByDate(filtered);

    this.setData({
      recordDays,
      groups,
      summary: {
        income: formatMoney(income),
        expense: formatMoney(expense),
        balance: formatMoney(income - expense)
      },
      today: {
        expense: formatMoney(todayExp),
        income: todayInc > 0 ? '+' + formatMoney(todayInc) : ''
      },
      yesterday: {
        expense: formatMoney(yExp),
        income: yInc > 0 ? '+' + formatMoney(yInc) : ''
      }
    });
    this.refreshStats();
  },

  // ---------- 统计 ----------

  onOpenDiary() {
    // 已在日记界面时，再次点击「已记账」回到统计
    if (this.data.diary) {
      this.onCloseDiary();
      return;
    }
    const records = storage.readAll();
    const days = new Set(records.map(r => r.date).filter(Boolean)).size;
    const markMap = storage.getMarkCountMap();
    let totalMarks = 0;
    let bigSpendDays = 0;
    Object.keys(markMap).forEach(key => {
      totalMarks += markMap[key];
      if (markMap[key] >= MARK_WARN_THRESHOLD) bigSpendDays += 1;
    });
    this.setData(
      {
        diary: {
          days,
          records: records.length,
          bigSpendDays,
          totalMarks
        }
      },
      () => {
        // 日记渲染完成后生成分享海报
        wx.nextTick(() => {
          this.generateDiaryPoster()
            .then(path => {
              this._diaryPoster = path;
            })
            .catch(() => {
              // 生成失败不阻塞日记查看，保存/分享时会重试
            });
        });
      }
    );
  },

  onCloseDiary() {
    this._diaryPoster = null;
    this.setData({ diary: null });
  },

  generateDiaryPoster() {
    return new Promise((resolve, reject) => {
      if (!wx.createSelectorQuery) {
        reject(new Error('当前环境不支持生成海报'));
        return;
      }
      wx.createSelectorQuery()
        .in(this)
        .select('#diaryCanvas')
        .fields({ node: true, size: true })
        .exec(res => {
          if (!res || !res[0] || !res[0].node) {
            reject(new Error('海报画布未就绪'));
            return;
          }
          const canvas = res[0].node;
          const ctx = canvas.getContext('2d');
          const dpr = (wx.getWindowInfo ? wx.getWindowInfo().pixelRatio : wx.getSystemInfoSync().pixelRatio) || 2;
          const W = 600;
          const H = 800;
          canvas.width = W * dpr;
          canvas.height = H * dpr;
          ctx.scale(dpr, dpr);
          ctx.textBaseline = 'middle';

          // 背景渐变
          const grad = ctx.createLinearGradient(0, 0, 0, H);
          grad.addColorStop(0, '#FFF3E7');
          grad.addColorStop(1, '#FFFFFF');
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, W, H);

          // 装饰圆
          ctx.fillStyle = 'rgba(255, 177, 77, 0.18)';
          ctx.beginPath();
          ctx.arc(540, 60, 70, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(60, 760, 60, 0, Math.PI * 2);
          ctx.fill();

          // 标题
          ctx.fillStyle = '#1F2329';
          ctx.font = 'bold 38px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('我的记账日记', 300, 96);

          // 时间
          const now = new Date();
          const timeStr =
            now.getFullYear() +
            '年' +
            (now.getMonth() + 1) +
            '月' +
            now.getDate() +
            '日 ' +
            pad2(now.getHours()) +
            ':' +
            pad2(now.getMinutes());
          ctx.fillStyle = '#9AA0A6';
          ctx.font = '22px sans-serif';
          ctx.fillText(timeStr, 300, 142);

          // 分隔线
          ctx.strokeStyle = '#F0E3D6';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(60, 175);
          ctx.lineTo(540, 175);
          ctx.stroke();

          // 数据行
          const diary = this.data.diary || {};
          const rows = [
            { icon: '📅', label: '已记账天数', value: (diary.days || 0) + ' 天', bg: '#FFF1E6' },
            { icon: '🧾', label: '已记账笔数', value: (diary.records || 0) + ' 笔', bg: '#E7F8EE' },
            { icon: '😜', label: '大手大脚次数', value: (diary.bigSpendDays || 0) + ' 次', bg: '#FFE3E3' },
            { icon: '😭', label: '后悔过', value: (diary.totalMarks || 0) + ' 次', bg: '#E8F1FF' }
          ];
          let y = 250;
          rows.forEach(row => {
            ctx.fillStyle = row.bg;
            ctx.beginPath();
            ctx.arc(100, y, 34, 0, Math.PI * 2);
            ctx.fill();
            ctx.font = '30px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(row.icon, 100, y + 2);
            ctx.fillStyle = '#4B5563';
            ctx.font = '28px sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(row.label, 160, y + 2);
            ctx.fillStyle = '#FF7A1A';
            ctx.font = 'bold 32px sans-serif';
            ctx.textAlign = 'right';
            ctx.fillText(row.value, 540, y + 2);
            y += 112;
          });

          // 底部标语 + 右下角水印
          ctx.fillStyle = '#9AA0A6';
          ctx.font = '22px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('记录每一笔，珍惜每一分～', 300, 738);
          ctx.fillStyle = '#C0C4CC';
          ctx.font = '20px sans-serif';
          ctx.textAlign = 'right';
          ctx.fillText('随随随记', 558, 774);

          wx.canvasToTempFilePath(
            {
              canvas,
              fileType: 'png',
              success: r => resolve(r.tempFilePath),
              fail: err => reject(err)
            },
            this
          );
        });
    });
  },

  onSaveDiaryImage() {
    const finish = path => {
      wx.saveImageToPhotosAlbum({
        filePath: path,
        success: () => wx.showToast({ title: '已保存到相册', icon: 'success' }),
        fail: err => {
          const msg = (err && err.errMsg) || '';
          if (msg.indexOf('auth') >= 0 || msg.indexOf('deny') >= 0) {
            wx.showModal({
              title: '需要相册权限',
              content: '请在设置中允许「保存图片到相册」，才能保存海报',
              confirmText: '去设置',
              success: res => {
                if (res.confirm) wx.openSetting();
              }
            });
          } else {
            wx.showToast({ title: '保存失败', icon: 'none' });
          }
        }
      });
    };
    if (this._diaryPoster) {
      finish(this._diaryPoster);
    } else {
      wx.showLoading({ title: '生成中...' });
      this.generateDiaryPoster()
        .then(path => {
          wx.hideLoading();
          this._diaryPoster = path;
          finish(path);
        })
        .catch(() => {
          wx.hideLoading();
          wx.showToast({ title: '海报生成失败', icon: 'none' });
        });
    }
  },

  onPreviewDiaryPoster() {
    const show = path => this.setData({ posterPreview: path });
    if (this._diaryPoster) {
      show(this._diaryPoster);
      return;
    }
    wx.showLoading({ title: '生成中...' });
    this.generateDiaryPoster()
      .then(path => {
        wx.hideLoading();
        this._diaryPoster = path;
        show(path);
      })
      .catch(() => {
        wx.hideLoading();
        wx.showToast({ title: '海报生成失败', icon: 'none' });
      });
  },

  onClosePosterPreview() {
    this.setData({ posterPreview: '' });
  },

  onOpenFeedback() {
    this.setData({ feedbackOpen: true });
  },

  onCloseFeedback() {
    this.setData({ feedbackOpen: false });
  },

  onCopyContact(e) {
    const text = e.currentTarget.dataset.text;
    wx.setClipboardData({
      data: text,
      success: () => wx.showToast({ title: '已复制', icon: 'success' })
    });
  },

  noop() {},

  formatMonthLabel(month) {
    const parts = month.split('-');
    return +parts[0] + '年' + +parts[1] + '月';
  },

  onStatsMonthChange(e) {
    const month = e.detail.value;
    this.setData({
      statsMonth: month,
      statsMonthLabel: this.formatMonthLabel(month),
      statsDetail: null
    });
    this.refreshStats();
  },

  onBackToCurrentMonth() {
    const month = todayStr().slice(0, 7);
    this.setData({
      statsMonth: month,
      statsMonthLabel: this.formatMonthLabel(month),
      statsDetail: null
    });
    this.refreshStats();
  },

  refreshStats() {
    const all = storage.readAll();
    const month = this.data.statsMonth;
    const list = all.filter(r => r.date && r.date.indexOf(month) === 0);

    const expMap = {};
    const incMap = {};
    let expTotal = 0;
    let incTotal = 0;
    list.forEach(r => {
      const map = r.type === 'income' ? incMap : expMap;
      map[r.category] = (map[r.category] || 0) + r.amount;
      if (r.type === 'income') incTotal += r.amount;
      else expTotal += r.amount;
    });

    const build = (map, total, type) =>
      Object.keys(map)
        .map(key => {
          const cat = getCategory(type, key);
          return {
            key,
            name: cat.name,
            icon: cat.icon,
            amount: map[key],
            amountText: formatMoney(map[key]),
            percent: total > 0 ? Math.round((map[key] / total) * 100) : 0
          };
        })
        .sort((a, b) => b.amount - a.amount);

    const expenseCats = build(expMap, expTotal, 'expense');
    const max = expenseCats.length ? Math.max.apply(null, expenseCats.map(c => c.amount)) : 0;
    const chart = expenseCats.map(c =>
      Object.assign({}, c, {
        barH: max > 0 ? Math.max(10, Math.round((c.amount / max) * 180)) : 0
      })
    );

    this.setData({
      stats: {
        expenseTotal: formatMoney(expTotal),
        incomeTotal: formatMoney(incTotal),
        chartTotal: formatMoney(expTotal),
        chart,
        expenseCats,
        incomeCats: build(incMap, incTotal, 'income')
      }
    });
  },

  onStatsCategoryTap(e) {
    const key = e.currentTarget.dataset.key;
    const type = e.currentTarget.dataset.type || 'expense';
    this.openStatsDetail(type, key);
  },

  openStatsDetail(type, key, month) {
    month = month || this.data.statsMonth;
    const cat = getCategory(type, key);
    const records = storage
      .readAll()
      .filter(r => r.type === type && r.category === key && r.date && r.date.indexOf(month) === 0)
      .map(r =>
        Object.assign({}, r, getCategory(type, key), {
          dateLabel: this.formatDateLabel(r.date),
          time: r.time || (r.createdAt ? formatTime(new Date(r.createdAt)) : ''),
          amountText: formatMoney(r.amount)
        })
      )
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : (b.createdAt || 0) - (a.createdAt || 0)));

    this.setData({
      statsDetail: {
        type,
        key,
        title: cat.name,
        month,
        monthLabel: this.formatMonthLabel(month),
        records
      }
    });
  },

  refreshStatsDetail() {
    const d = this.data.statsDetail;
    if (d) this.openStatsDetail(d.type, d.key, d.month);
  },

  onStatsDetailBack() {
    this.setData({ statsDetail: null });
  },

  groupByDate(list) {
    const map = {};
    list.forEach(r => {
      (map[r.date] = map[r.date] || []).push(
        Object.assign({}, r, getCategory(r.type, r.category), {
          amountText: formatMoney(r.amount)
        })
      );
    });
    return Object.keys(map)
      .sort((a, b) => (a < b ? 1 : -1))
      .map(date => ({
        date,
        label: this.formatDateLabel(date),
        items: map[date]
      }));
  },

  formatDateLabel(date) {
    const now = new Date();
    const today = todayStr();
    const t = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const tomorrow =
      t.getFullYear() + '-' + pad2(t.getMonth() + 1) + '-' + pad2(t.getDate());
    if (date === today) return '今天';
    if (date === tomorrow) return '明天';
    const parts = date.split('-');
    const d = new Date(+parts[0], +parts[1] - 1, +parts[2]);
    if (d.getFullYear() === now.getFullYear()) {
      return +parts[1] + '月' + +parts[2] + '日';
    }
    return +parts[0] + '年' + +parts[1] + '月' + +parts[2] + '日';
  },

  onFilterTap(e) {
    const filter = e.currentTarget.dataset.filter;
    this.setData({ filter });
    this.refreshRecords();
  },

  onRecordTap(e) {
    // 双击：给这笔消费加上/取消“不该花”红色提醒
    const id = e.currentTarget.dataset.id;
    const now = Date.now();
    if (this._lastTapId === id && now - (this._lastTapTime || 0) < 300) {
      this._lastTapId = null;
      this._lastTapTime = 0;
      this.toggleMark(id);
    } else {
      this._lastTapId = id;
      this._lastTapTime = now;
    }
  },

  onRecordLongPress(e) {
    // 长按：弹出编辑 / 删除
    this._lastTapId = null;
    this._lastTapTime = 0;
    const id = e.currentTarget.dataset.id;
    const record = storage.getById(id);
    if (!record) return;
    wx.showActionSheet({
      itemList: ['编辑', '删除'],
      success: res => {
        if (res.tapIndex === 0) this.startEdit(record);
        else if (res.tapIndex === 1) this.confirmDelete(record);
      }
    });
  },

  toggleMark(id) {
    const record = storage.getById(id);
    if (!record) return;
    if (record.marked) {
      storage.update(id, { marked: false, markText: '' });
    } else {
      const text = MARK_TEXTS[Math.floor(Math.random() * MARK_TEXTS.length)];
      storage.update(id, { marked: true, markText: text });
      storage.incrMarkCount(todayStr());
    }
    this.refreshRecords();
    if (this.data.statsDetail) this.refreshStatsDetail();
  },

  startEdit(record) {
    const categories = CATEGORIES[record.type] || CATEGORIES.expense;
    const category = categories.some(c => c.key === record.category)
      ? record.category
      : categories[0].key;
    this.setData({
      activeTab: 'calc',
      editId: record.id,
      type: record.type,
      categories,
      category,
      note: record.note || ''
    });
    this.setRecordDate(record.date || todayStr());
    this.applyExpr(record.expression || String(record.amount));
  },

  confirmDelete(record) {
    wx.showModal({
      title: '删除这笔记录？',
      content:
        (record.type === 'income' ? '+' : '-') +
        formatMoney(record.amount) +
        ' ' +
        getCategory(record.type, record.category).name,
      confirmText: '删除',
      confirmColor: '#e64340',
      success: res => {
        if (res.confirm) {
          storage.remove(record.id);
          wx.showToast({ title: '已删除', icon: 'success' });
          this.refreshRecords();
        }
      }
    });
  },

  onClearAll() {
    wx.showModal({
      title: '清空全部数据？',
      content: '将删除本机所有记账记录，且无法恢复',
      confirmText: '清空',
      confirmColor: '#e64340',
      success: res => {
        if (res.confirm) {
          storage.clear();
          wx.showToast({ title: '已清空', icon: 'success' });
          this.refreshRecords();
        }
      }
    });
  }
});
