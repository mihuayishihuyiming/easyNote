# 简易记账微信小程序

一个纯离线的计算器式记账小程序：像计算器一样输入 `12.5×2+30`，按「记一笔」保存；所有数据只存在手机本地（微信小程序 Storage），不上传任何服务器。

## 功能

- **计算器式输入**：支持 `+ - × ÷`、小数、负数，按数学优先级运算（先乘除后加减），结果实时预览
- **记一笔**：选择支出/收入、分类（餐饮、交通、购物、工资等）、选择记账日期、填写备注后保存
- **明细**：本月收入/支出/结余汇总，**今天/昨天花了多少**一目了然；按日期分组展示记录，支持按支出/收入筛选
- **长按编辑/删除**：长按任意记录弹出编辑/删除菜单
- **双击标红提醒**：双击任意记录将其标红，并在金额前随机加上「不该花！/ 请注意节约！/ 想想自己的兜子！」提醒，再次双击取消；**单日标红满 3 次后，下次进入小程序会弹出随机消费提醒（钱钱钱！！请节约 等），且需双击「确定」才能关闭**
- **统计**：按月查看**支出条形统计图**，可切换历史月份；支出/收入分类明细（金额 + 占比条）点击可下钻到该月该分类的逐笔记录（含时间与标红提醒）
- **离线可用**：数据保存在手机本机，断网也能正常记账
- **离线可用**：数据保存在手机本机，断网也能正常记账

## 项目结构

```text
WeChatProgram/
├── app.js                  # 小程序入口
├── app.json                # 全局配置
├── app.wxss                # 全局样式
├── project.config.json     # 项目配置（当前为游客 AppID）
├── sitemap.json
├── pages/
│   └── index/              # 主页面（记一笔 + 明细 + 统计三个视图）
│       ├── index.js
│       ├── index.wxml
│       ├── index.wxss
│       └── index.json
├── utils/
│   ├── calc.js             # 计算器表达式解析（+ - × ÷）
│   ├── categories.js       # 支出/收入分类字典
│   └── storage.js          # 本地存储读写
├── assets/
│   ├── icon.png            # 小程序图标（1024×1024 主图）
│   └── icon-144.png        # 上传微信用的 144×144 版本
├── tests/
│   ├── calc.test.js        # 计算器回归测试
│   └── page.logic.test.js  # 页面记账/统计逻辑测试
├── tools/
│   ├── ui_mock.py          # 界面示意图生成脚本
│   └── icon_make.py        # 图标生成脚本
└── docs/
    └── 上架微信小程序指南.md
```

## 快速开始

1. 下载并安装[微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)（稳定版即可）。
2. 打开开发者工具 → 「导入项目」→ 选择本项目目录 `D:\codeALL\WeChatProgram`。
   - 当前 `project.config.json` 使用游客 AppID（`touristappid`），可以直接预览体验；
   - 如需真机调试或上传发布，请替换为自己的 AppID（见下文）。
3. 点击「编译」，即可在小程序模拟器中体验。
4. 真机预览：工具栏「预览」→ 手机微信扫码（需要你的微信号是小程序项目成员）。

## 数据说明

- 所有记账数据保存在手机本地 `wx.setStorageSync`，对应 key 为 `simple_account_records_v1`。
- 数据随微信缓存保留在设备上；卸载小程序或清理微信缓存会丢失数据，请留意。
- 本程序不请求任何网络接口，无需配置服务器域名，完全离线可用。

## 替换为自己的 AppID

1. 在[微信公众平台](https://mp.weixin.qq.com)注册小程序账号后，进入「开发 → 开发管理 → 开发设置」复制 AppID。
2. 把 `project.config.json` 中的 `"appid": "touristappid"` 替换为你的 AppID。

## 运行测试

计算器逻辑的回归测试（无需微信环境）：

```bash
node tests/calc.test.js
```

## 自动上传与预览（miniprogram-ci）

项目配套的微信官方 CI 工具 [miniprogram-ci](https://www.npmjs.com/package/miniprogram-ci) 放在小程序项目**之外**的独立目录 `D:\codeALL\wechat-upload-tool`（避免被开发者工具误当作小程序 npm 依赖构建）。

一次性准备：

1. 安装 [Node.js LTS](https://nodejs.org/zh-cn)（安装完成后 npm 自动进入 PATH）；
2. 在 `D:\codeALL\wechat-upload-tool` 目录执行 `npm install`（依赖已预装，通常可跳过）；
3. 登录[微信公众平台](https://mp.weixin.qq.com) → 「开发 → 开发管理 → 开发设置 → 小程序代码上传」，生成并下载**代码上传密钥**，保存为 `D:\codeALL\wechat-upload-tool\private.key`；
4. 在「开发设置 → IP 白名单」加入当前公网 IP（否则上传会报错）；
5. 把 `D:\codeALL\wechat-upload-tool\scripts\ci-upload.js` 顶部的 `APPID` 改成你的小程序 AppID。

之后就可以：

```bash
cd D:\codeALL\wechat-upload-tool

# 上传代码（版本号、备注可选）
npm run upload -- --version 1.0.0 --desc "首版"

# 生成预览二维码（手机微信扫码真机预览）
npm run preview
```

## 上架发布

完整的注册、备案、审核、发布流程见 [docs/上架微信小程序指南.md](docs/上架微信小程序指南.md)。
