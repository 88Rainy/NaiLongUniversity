# 奶龙大笑倒计时网页

## 功能

- 页面打开后，奶龙透明背景动图持续循环。
- 页面打开时立即尝试自动播放奶龙大笑音效，音效循环播放。
- 右侧倒计时从 10 秒开始，页面运行满 10 秒后跳转到 `https://www.fjsmu.edu.cn`。
- 点击「↻ 重新播放」会刷新整个页面，重新加载后从 10 秒开始新一轮。
- 页面加载时会立即尝试带声音自动播放。若 Chrome 等浏览器拦截，首次点击/触摸页面任意位置即可开启声音，也可点击「开启声音」按钮；网页不能强制绕过浏览器的自动播放限制。
- 支持 `prefers-reduced-motion`，减少不必要的界面动画。

## 本地运行

解压后，在项目根目录运行：

```bash
python -m http.server 8000
```

浏览器打开 `http://localhost:8000`。

也可以直接打开 `index.html`，但推荐使用本地服务器预览。

## 文件结构

```text
nailong-countdown/
├── index.html
├── styles.css
├── script.js
├── README.md
└── assets/
    ├── mascot-laugh-transparent.webp
    ├── nailong-edge-transparent.png
    └── nailong-laugh.mp3
```

## 修改配置

打开 `script.js`：

- `TARGET_URL`：修改跳转目标网址。
- `TOTAL_DURATION_MS`：修改单轮时长，单位为毫秒；当前为 `10_000`，即 10 秒。

音效文件位于 `assets/nailong-laugh.mp3`，奶龙动图位于 `assets/mascot-laugh-transparent.webp`。


## 左右双列循环弹簧弹射

- 使用 `assets/nailong-edge-transparent.png`，由用户上传的原始奶龙图片去除白色背景得到；不重绘角色。
- 只在左、右两侧出现，每侧 6 只，共 12 只。
- 两列均从上往下依次弹出；右列相对左列错开 0.08 秒，形成连续但不完全同步的节奏。
- 单只弹射约 0.62 秒，每行间隔 0.19 秒；一轮从首只开始到最后一只弹射完成约 1.65 秒。
- **整组弹射持续循环**：每只奶龙以 1.65 秒为周期重复从视口外弹入，保留行间错峰；弹射完成后在边缘停留，直到下一轮自身重新弹出。循环随页面 10 秒倒计时结束而停止并跳转。
- 每次弹射都包含惯性过冲、压缩和三次逐渐减弱的回弹。
- 左侧奶龙朝向页面右侧，右侧奶龙朝向页面左侧；手机端会自动缩小角色尺寸。
- 在 `styles.css` 中调整 `.edge-mascot` 的 `width` 修改尺寸；调整 `--cycle-duration: 1.65s` 修改重复周期；调整 `--row-delay` 中的 `.19s` 修改每行的错峰间隔；右列额外的 `.08s` 用于左右列错位。
- 启用 `prefers-reduced-motion: reduce` 时，弹射动画关闭，12 只奶龙直接静态停留在两侧。

原始 GIF 文件只有一帧，因此这里使用处理后的透明 PNG，并由 CSS 实现弹簧式运动。
