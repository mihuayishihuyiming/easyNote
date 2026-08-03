// 本地存储：所有记账数据保存在手机本机（wx Storage），完全离线可用
const STORAGE_KEY = 'simple_account_records_v1';
const MARK_COUNT_KEY = 'mark_daily_counts_v1';

function readAll() {
  try {
    const data = wx.getStorageSync(STORAGE_KEY);
    if (data && Array.isArray(data.list)) return data.list;
  } catch (e) {
    // 读取失败按空数据处理
  }
  return [];
}

function writeAll(list) {
  wx.setStorageSync(STORAGE_KEY, { version: 1, list });
}

function createId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function add(record) {
  const list = readAll();
  const item = Object.assign({ id: createId(), createdAt: Date.now() }, record);
  list.unshift(item);
  writeAll(list);
  return item;
}

function update(id, patch) {
  const list = readAll();
  const idx = list.findIndex(r => r.id === id);
  if (idx < 0) return null;
  list[idx] = Object.assign({}, list[idx], patch, { id });
  writeAll(list);
  return list[idx];
}

function remove(id) {
  const list = readAll().filter(r => r.id !== id);
  writeAll(list);
}

function getById(id) {
  return readAll().find(r => r.id === id) || null;
}

function clear() {
  try {
    wx.removeStorageSync(STORAGE_KEY);
  } catch (e) {
    // 忽略清理失败
  }
}

function getMarkCount(date) {
  try {
    const map = wx.getStorageSync(MARK_COUNT_KEY);
    if (map && Object.prototype.toString.call(map) === '[object Object]') {
      return map[date] || 0;
    }
  } catch (e) {
    // 忽略读取失败
  }
  return 0;
}

function incrMarkCount(date) {
  const map = wx.getStorageSync(MARK_COUNT_KEY) || {};
  map[date] = (map[date] || 0) + 1;
  wx.setStorageSync(MARK_COUNT_KEY, map);
}

module.exports = { add, update, remove, getById, readAll, clear, getMarkCount, incrMarkCount };
