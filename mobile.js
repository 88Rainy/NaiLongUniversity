(() => {
  'use strict';

  const TARGET_URL = 'https://www.fjsmu.edu.cn';
  const TOTAL_DURATION_MS = 10_000;

  const digit = document.getElementById('countdownDigit');
  const progress = document.getElementById('countdownProgress');
  const manualLink = document.getElementById('manualLink');
  const soundButton = document.getElementById('soundButton');
  const replayButton = document.getElementById('replayButton');
  const laughAudio = document.getElementById('laughAudio');

  // HTML 在 head 中记录页面打开时刻，首轮倒计时从这个时刻开始。
  const pageOpenedAt = Number.isFinite(window.__nailongPageOpenedAt)
    ? window.__nailongPageOpenedAt
    : performance.now();

  const redirectAt = pageOpenedAt + TOTAL_DURATION_MS;
  let redirected = false;
  let lastRenderedDigit = null;
  let countdownTimer = null;
  let redirectTimer = null;
  let audioPlayPromise = null;

  manualLink.href = TARGET_URL;
  laughAudio.loop = true;
  laughAudio.volume = 0.82;

  function renderDigit(value) {
    if (value === lastRenderedDigit) return;
    lastRenderedDigit = value;
    digit.textContent = String(value);
    digit.classList.remove('pop');
    void digit.offsetWidth;
    digit.classList.add('pop');
  }

  function startLaughing() {
    if (redirected) return Promise.resolve(false);

    // 已经在播放时不重复调用 play()，避免重置音频或产生竞争。
    if (!laughAudio.paused && !laughAudio.ended) {
      soundButton.hidden = true;
      return Promise.resolve(true);
    }

    if (audioPlayPromise) return audioPlayPromise;

    audioPlayPromise = laughAudio.play()
      .then(() => {
        soundButton.hidden = true;
        return true;
      })
      .catch(() => {
        // Chrome 等浏览器可能要求先有用户手势；网页无法绕过该策略。
        // 提示用户点击页面任意位置即可触发一次合法的播放请求。
        soundButton.hidden = false;
        soundButton.textContent = '开启声音（点击页面也可开启）';
        return false;
      })
      .finally(() => {
        audioPlayPromise = null;
      });

    return audioPlayPromise;
  }

  function clearCycleTimers() {
    window.clearTimeout(countdownTimer);
    window.clearTimeout(redirectTimer);
    countdownTimer = null;
    redirectTimer = null;
  }

  function redirect() {
    if (redirected) return;
    redirected = true;
    clearCycleTimers();
    laughAudio.pause();
    window.location.assign(TARGET_URL);
  }

  function updateCountdown() {
    if (redirected) return;
    window.clearTimeout(countdownTimer);

    const remainingMs = redirectAt - performance.now();
    if (remainingMs <= 0) {
      redirect();
      return;
    }

    const remainingSeconds = Math.ceil(remainingMs / 1000);
    renderDigit(remainingSeconds);
    progress.style.transform = `scaleX(${remainingMs / TOTAL_DURATION_MS})`;

    // 对齐每一秒的边界，显示 10、9、8……1。
    const nextBoundary = redirectAt - (remainingSeconds - 1) * 1000;
    countdownTimer = window.setTimeout(
      updateCountdown,
      Math.max(0, nextBoundary - performance.now())
    );
  }


  soundButton.addEventListener('click', () => {
    void startLaughing();
  });
  // 按钮执行真正的页面刷新；首屏脚本重新运行后倒计时从 10 秒开始。
  replayButton.addEventListener('click', () => window.location.reload());

  // 自动播放被拦截时，首次点击/触摸页面任意位置即尝试解锁音频。
  // 该操作必须来自用户手势，不能在代码中强制模拟。
  document.addEventListener('pointerdown', () => {
    void startLaughing();
  }, { once: true, capture: true });
  document.addEventListener('keydown', () => {
    void startLaughing();
  }, { once: true, capture: true });

  // 页面打开时立即尝试自动播放声音，同时启动固定的 10 秒倒计时。
  void startLaughing();
  updateCountdown();
  redirectTimer = window.setTimeout(
    redirect,
    Math.max(0, redirectAt - performance.now())
  );

  // 页面从后台恢复时，重新按绝对时间校准数字，避免显示滞后。
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && !redirected) updateCountdown();
  });

  window.addEventListener('pagehide', () => {
    clearCycleTimers();
    laughAudio.pause();
  }, { once: true });

  // 中间奶龙动画：用 Canvas 主动逐帧绘制 PNG 精灵图。
  // 这样不依赖 GIF/动态 WebP 解码，也不依赖手机浏览器是否执行 CSS animation。
  const mascotWrap = document.getElementById('mascotWrap');
  const mascotCanvas = document.getElementById('mascotCanvas');
  const mascotContext = mascotCanvas
    ? mascotCanvas.getContext('2d', { alpha: true })
    : null;

  if (mascotWrap && mascotCanvas && mascotContext) {
    const SPRITE_URL = 'assets/mascot-sprite.png?v=20261111d';
    const FRAME_SIZE = 240;
    const FRAME_PITCH = 244; // 240px 画面 + 左右各 2px 透明间隔
    const SPRITE_GUTTER = 2;
    const SPRITE_COLUMNS = 8;
    const FRAME_COUNT = 59;
    const FRAME_DURATION_MS = 100;

    const mascotSprite = new Image();
    let mascotStarted = false;
    let mascotFrame = 0;
    let mascotDrawnFrame = -1;
    let mascotStartedAt = 0;
    let mascotRafId = 0;

    function resizeMascotCanvas() {
      const rect = mascotWrap.getBoundingClientRect();
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      const size = Math.max(1, Math.round(rect.width * pixelRatio));

      if (mascotCanvas.width === size && mascotCanvas.height === size) return;

      mascotCanvas.width = size;
      mascotCanvas.height = size;
      mascotContext.imageSmoothingEnabled = true;
      mascotDrawnFrame = -1;

      if (mascotStarted) drawMascotFrame(mascotFrame);
    }

    function drawMascotFrame(frameIndex) {
      const column = frameIndex % SPRITE_COLUMNS;
      const row = Math.floor(frameIndex / SPRITE_COLUMNS);
      const sourceX = SPRITE_GUTTER + column * FRAME_PITCH;
      const sourceY = SPRITE_GUTTER + row * FRAME_PITCH;

      mascotContext.clearRect(0, 0, mascotCanvas.width, mascotCanvas.height);
      mascotContext.drawImage(
        mascotSprite,
        sourceX,
        sourceY,
        FRAME_SIZE,
        FRAME_SIZE,
        0,
        0,
        mascotCanvas.width,
        mascotCanvas.height
      );
      mascotDrawnFrame = frameIndex;
    }

    function animateMascot(timestamp) {
      if (!mascotStarted) return;

      if (!mascotStartedAt) mascotStartedAt = timestamp;
      mascotFrame = Math.floor((timestamp - mascotStartedAt) / FRAME_DURATION_MS) % FRAME_COUNT;

      if (mascotFrame !== mascotDrawnFrame) drawMascotFrame(mascotFrame);
      mascotRafId = window.requestAnimationFrame(animateMascot);
    }

    function startMascotAnimation() {
      if (mascotStarted) return;

      resizeMascotCanvas();
      drawMascotFrame(0);
      mascotStarted = true;
      mascotWrap.classList.add('is-animated');
      mascotRafId = window.requestAnimationFrame(animateMascot);
    }

    mascotSprite.onload = startMascotAnimation;
    mascotSprite.onerror = () => {
      // 精灵图加载失败时保留静态兜底图。
      mascotWrap.classList.remove('is-animated');
    };
    mascotSprite.src = SPRITE_URL;

    window.addEventListener('resize', () => {
      if (mascotStarted) resizeMascotCanvas();
    }, { passive: true });

    window.addEventListener('pagehide', () => {
      mascotStarted = false;
      window.cancelAnimationFrame(mascotRafId);
    }, { once: true });
  }
})();
