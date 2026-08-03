// 本地存储：所有记账数据保存在手机本机（wx Storage），完全离线可用
const STORAGE_KEY = 'simple_account_records_v1';

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

module.exports = { add, update, remove, getById, readAll, clear };
