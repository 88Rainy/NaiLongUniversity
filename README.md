# 奶龙大笑倒计时网页

## 功能

- 页面打开后，屏幕中间的奶龙持续播放 59 帧大笑动画。
- 页面打开时立即尝试自动播放奶龙大笑音效，音效循环播放。
- 倒计时从 10 秒开始，页面运行满 10 秒后跳转到 `https://www.fjsmu.edu.cn`。
- 点击「↻ 重新播放」会刷新整个页面，重新加载后从 10 秒开始新一轮。
- 若浏览器拦截自动播放，首次点击/触摸页面任意位置即可开启声音，也可点击「开启声音」按钮；网页不能强制绕过浏览器的自动播放限制。
- 左右两侧各有 6 只弹簧式弹出的奶龙；手机端会自动缩小。
- 电脑访问使用 `index.html`，手机访问会自动进入独立适配页 `mobile.html`。
- 手机需要查看桌面版时，可访问 `index.html?desktop=1`。

## 中间奶龙为什么不用 GIF

中间奶龙最终采用 **PNG 精灵图 + Canvas 逐帧绘制**，不再依赖 GIF、动态 WebP 或 CSS animation：

- `assets/mascot-sprite.png`：1952×1952 的静态 PNG，8×8 网格，共 59 帧。
- 每帧画面 240×240，四周各有 2px 透明间隔，网格步距为 244px。
- `script.js` 用 `requestAnimationFrame` 每约 100ms 从精灵图截取下一帧，绘制到 240×240 的 Canvas 中，5.9 秒循环一次。
- 这种方式只依赖普通 PNG 解码和 JavaScript 主动绘图，能避开部分手机浏览器、微信内置浏览器“GIF/动态 WebP 只显示第一帧”以及“CSS 动画被冻结或降级”的问题。
- Canvas 的实际分辨率会根据屏幕尺寸和像素比放大到约 400～585px，避免手机上显示模糊。

若精灵图加载失败或 Canvas 不可用，页面会自动保留 `assets/mascot-laugh-poster.png` 静态兜底图，不会出现中间空白。

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
├── mobile.js           # 手机端逻辑
├── README.md
└── assets/
    ├── mascot-sprite.png              # 中间奶龙动画（当前实际使用）
    ├── mascot-laugh-poster.png        # 静态兜底图
    ├── mascot-laugh-transparent.webp  # 原始 59 帧素材，备用
    ├── mascot-laugh.gif               # 早期兼容方案，页面已不再引用
    ├── nailong-edge-transparent.png   # 两侧奶龙
    └── nailong-laugh.mp3              # 大笑音效
```

## 修改配置

打开 `script.js`（电脑端）或 `mobile.js`（手机端）：

- `TARGET_URL`：修改跳转目标网址。
- `TOTAL_DURATION_MS`：修改单轮时长，单位为毫秒；当前为 `10_000`，即 10 秒。

## 部署与缓存

页面给样式、脚本和 `mascot-sprite.png` 加了版本参数 `?v=20261111d`，用于绕过手机浏览器或 CDN 的旧缓存。

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

如果手机上仍显示旧页面，请强制刷新一次，或在部署平台清理缓存。以后替换精灵图时，也应同时修改版本参数，避免手机继续使用旧图。

## 左右双列循环弹簧弹射

- 使用 `assets/nailong-edge-transparent.png`，只在左、右两侧出现，每侧 6 只，共 12 只。
- 两列均从上往下依次弹出；右列相对左列错开 0.08 秒。
- 单只弹射约 0.62 秒，每行间隔 0.19 秒；整组以 1.65 秒为周期循环。
- 每次弹射包含惯性过冲、压缩和三次逐渐减弱的回弹。
- 左侧奶龙朝向页面右侧，右侧奶龙朝向页面左侧；手机端会自动缩小角色尺寸。
- 在 `styles.css` / `mobile.css` 中调整 `.edge-mascot` 的 `width` 修改尺寸，调整 `--cycle-duration: 1.65s` 修改周期，调整 `--row-delay` 中的 `.19s` 修改行间错峰。
- 启用 `prefers-reduced-motion: reduce` 时，两侧弹射动画会关闭并静态停留；中间奶龙作为页面主体仍会播放。



