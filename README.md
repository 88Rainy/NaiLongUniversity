# 奶龙大笑倒计时网页

## 功能

- 页面打开后，屏幕中间先显示一张静止的奶龙大笑图，并提示「点击奶龙开始」。
- **点击中间的奶龙后**，才会同时开始：播放奶龙大笑音效、播放 59 帧大笑动画、启动 10 秒倒计时。
- 点击前倒计时一直停在 10 秒，声音不会自动播放，动画也不会提前运行。
- 倒计时结束后自动跳转到 `https://www.fjsmu.edu.cn`。
- 点击「↻ 重新播放」会刷新整个页面，回到等待点击的初始状态。
- 如果微信仍然拦截声音，页面会显示「再次点击开启声音」按钮，可再点一次。
- 左右两侧各有 6 只弹簧式弹出的奶龙；手机端会自动缩小。
- 电脑访问使用 `index.html`，手机访问会自动进入独立适配页 `mobile.html`。
- 手机需要查看桌面版时，可访问 `index.html?desktop=1`。

## 中间奶龙的动画方案

微信内置浏览器对 GIF、动态 WebP 和 Canvas 动画的兼容性不稳定，常见问题是只显示第一帧或直接不动。
因此中间奶龙改为 **PNG 精灵图 + JavaScript 修改 `background-position`**：

- `assets/mascot-sprite.png`：1952×1952 的静态 PNG，8×8 网格，共 59 帧。
- 每格 244×244，画面内容为每格左上角 240×240，59 帧约 5.9 秒循环一次。
- 用户点击奶龙后，`script.js` / `mobile.js` 每 100ms 修改一次 `background-position` 切到下一帧。
- 只依赖最基础的 PNG 解码和 DOM 样式修改，不依赖 GIF/动态 WebP 解码、Canvas 或 CSS animation，微信内置浏览器也能稳定播放。
- 动画开始前显示 `assets/mascot-laugh-poster.png` 静态首图；精灵图加载成功并画到第一帧后才隐藏静态图，避免闪白。
- 若精灵图加载失败，页面会保留静态图；声音和倒计时仍然可用。

## 本地运行

在项目根目录运行：

```bash
python -m http.server 8000
```

浏览器打开 `http://localhost:8000`。也可以直接打开 `index.html`，但推荐使用本地服务器预览。

## 文件结构

```text
nailong-countdown-four-edges/
├── index.html          # 电脑端页面
├── styles.css          # 电脑端样式
├── script.js           # 电脑端逻辑
├── mobile.html         # 手机端独立页面
├── mobile.css          # 手机端样式与安全区适配
├── mobile.js           # 手机端逻辑（与 script.js 相同）
├── README.md
├── make_sprite.py      # 由原始 WebP 生成 PNG 精灵图的脚本
├── photos/             # 制作精灵图时的中间产物
└── assets/
    ├── mascot-sprite.png              # 中间奶龙动画（当前实际使用）
    ├── mascot-laugh-poster.png        # 点击前的静态首图 / 兜底图
    ├── mascot-laugh-transparent.webp  # 原始 59 帧素材，备用
    ├── mascot-laugh.gif               # 早期兼容方案，页面已不再引用
    ├── nailong-edge-transparent.png   # 两侧奶龙
    └── nailong-laugh.mp3              # 大笑音效
```

## 修改配置

打开 `script.js`（电脑端）或 `mobile.js`（手机端）：

- `TARGET_URL`：修改跳转目标网址。
- `TOTAL_DURATION_MS`：修改单轮时长，单位为毫秒；当前为 `10_000`，即 10 秒。
- `FRAME_DURATION_MS`：修改动画每帧时长，当前为 `100` 毫秒。

## 部署与缓存

页面给样式、脚本和 `mascot-sprite.png` 加了版本参数 `?v=20261111e`，用于绕过手机浏览器或 CDN 的旧缓存。

更新部署时请确认以下文件一起上传：

- `index.html`
- `styles.css`
- `script.js`
- `mobile.html`
- `mobile.css`
- `mobile.js`
- `assets/mascot-sprite.png`
- `assets/mascot-laugh-poster.png`
- `assets/nailong-edge-transparent.png`
- `assets/nailong-laugh.mp3`

### 电脑/手机分流规则

- `index.html` 的头部会识别手机 UA、iPad 桌面 UA 以及窄屏粗指针设备。
- 识别为手机后，会自动跳转到 `mobile.html`，并保留原 URL 的查询参数和锚点。
- 电脑访问 `index.html` 时保持原桌面布局，不会跳转。
- `index.html?desktop=1` 会强制使用桌面版，便于在手机上对比或排查问题。
- `mobile.html` 使用 `mobile.css` 和 `mobile.js`，包含刘海屏安全区、窄屏字号、展示区高度和按钮换行等专用适配。

如果手机上仍显示旧页面，请强制刷新一次，或在微信中右上角菜单选择「刷新」。以后替换精灵图时，也应同时修改版本参数，避免手机继续使用旧图。

## 左右双列循环弹簧弹射

- 使用 `assets/nailong-edge-transparent.png`，只在左、右两侧出现，每侧 6 只，共 12 只。
- 两列均从上往下依次弹出；右列相对左列错开 0.08 秒。
- 单只弹射约 0.62 秒，每行间隔 0.19 秒；整组以 1.65 秒为周期循环。
- 每次弹射包含惯性过冲、压缩和三次逐渐减弱的回弹。
- 左侧奶龙朝向页面右侧，右侧奶龙朝向页面左侧；手机端会自动缩小角色尺寸。
- 在 `styles.css` / `mobile.css` 中调整 `.edge-mascot` 的 `width` 修改尺寸，调整 `--cycle-duration: 1.65s` 修改周期，调整 `--row-delay` 中的 `.19s` 修改行间错峰。
- 启用 `prefers-reduced-motion: reduce` 时，两侧弹射动画会关闭并静态停留；中间奶龙仍会在点击后逐帧播放。
