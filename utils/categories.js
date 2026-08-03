// 记账分类：支出与收入使用不同的分类集合
const CATEGORIES = {
  expense: [
    { key: 'food', name: '餐饮', icon: '🍜' },
    { key: 'transport', name: '交通', icon: '🚌' },
    { key: 'shopping', name: '购物', icon: '🛍️' },
    { key: 'fun', name: '娱乐', icon: '🎮' },
    { key: 'home', name: '居住', icon: '🏠' },
    { key: 'medical', name: '医疗', icon: '💊' },
    { key: 'edu', name: '教育', icon: '📚' },
    { key: 'gift', name: '人情', icon: '🎁' },
    { key: 'other', name: '其他', icon: '📦' }
  ],
  income: [
    { key: 'salary', name: '工资', icon: '💰' },
    { key: 'bonus', name: '奖金', icon: '🎉' },
    { key: 'invest', name: '理财', icon: '📈' },
    { key: 'parttime', name: '兼职', icon: '💼' },
    { key: 'redpacket', name: '红包', icon: '🧧' },
    { key: 'other', name: '其他', icon: '📦' }
  ]
};

function getCategory(type, key) {
  const list = CATEGORIES[type] || [];
  return list.find(c => c.key === key) || list[0];
}

module.exports = { CATEGORIES, getCategory };
