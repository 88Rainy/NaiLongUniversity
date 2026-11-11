(() => {
  'use strict';

  const TARGET_URL = 'https://www.fjsmu.edu.cn';
  const TOTAL_DURATION_MS = 10_000;

  const digit = document.getElementById('countdownDigit');
  const countdownLabel = document.getElementById('countdownLabel');
  const progress = document.getElementById('countdownProgress');
  const manualLink = document.getElementById('manualLink');
  const soundButton = document.getElementById('soundButton');
  const replayButton = document.getElementById('replayButton');
  const laughAudio = document.getElementById('laughAudio');
  const mascotWrap = document.getElementById('mascotWrap');
  const mascotFrames = document.getElementById('mascotFrames');

  let experienceStarted = false;
  let redirected = false;
  let lastRenderedDigit = null;
  let countdownTimer = null;
  let redirectTimer = null;
  let audioPlayPromise = null;
  let redirectAt = 0;
  let startMascotPlayback = () => {};

  manualLink.href = TARGET_URL;
  laughAudio.loop = true;
  laughAudio.volume = 0.82;
  laughAudio.playsInline = true;
  if (countdownLabel) countdownLabel.textContent = '等待开始';

  function renderDigit(value) {
    if (value === lastRenderedDigit) return;
    lastRenderedDigit = value;
    digit.textContent = String(value);
    digit.classList.remove('pop');
    void digit.offsetWidth;
    digit.classList.add('pop');
  }

  function startAudio() {
    if (redirected) return Promise.resolve(false);

    if (!laughAudio.paused && !laughAudio.ended) {
      soundButton.hidden = true;
      return Promise.resolve(true);
    }

    if (audioPlayPromise) return audioPlayPromise;

    try {
      laughAudio.currentTime = 0;
    } catch (error) {
      // 某些浏览器在元数据加载前不允许设置 currentTime，直接播放即可。
    }

    let playResult;
    try {
      playResult = laughAudio.play();
    } catch (error) {
      soundButton.hidden = false;
      return Promise.resolve(false);
    }

    if (!playResult || typeof playResult.then !== 'function') {
      // 老版本 WebKit 的 play() 不返回 Promise，乐观处理即可。
      soundButton.hidden = true;
      return Promise.resolve(true);
    }

    audioPlayPromise = playResult
      .then(() => {
        soundButton.hidden = true;
        return true;
      })
      .catch(() => {
        // 如果微信仍然拦截声音，用户可再次点击按钮重试。
        soundButton.hidden = false;
        soundButton.textContent = '再次点击开启声音';
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
    if (!experienceStarted || redirected) return;
    window.clearTimeout(countdownTimer);

    const remainingMs = redirectAt - performance.now();
    if (remainingMs <= 0) {
      redirect();
      return;
    }

    const remainingSeconds = Math.ceil(remainingMs / 1000);
    renderDigit(remainingSeconds);
    progress.style.transform = `scaleX(${remainingMs / TOTAL_DURATION_MS})`;

    const nextBoundary = redirectAt - (remainingSeconds - 1) * 1000;
    countdownTimer = window.setTimeout(
      updateCountdown,
      Math.max(0, nextBoundary - performance.now())
    );
  }

  function beginCountdown() {
    if (redirected) return;

    redirectAt = performance.now() + TOTAL_DURATION_MS;
    updateCountdown();
    redirectTimer = window.setTimeout(
      redirect,
      Math.max(0, redirectAt - performance.now())
    );
  }

  function startExperience() {
    if (redirected) return;

    // 已开始但声音仍被拦截（常见于 iOS 微信）时，在下一次点击手势里再试一次。
    if (experienceStarted) {
      if (laughAudio.paused && !laughAudio.ended) void startAudio();
      return;
    }

    experienceStarted = true;
    document.body.classList.add('experience-started');
    mascotWrap.setAttribute('aria-disabled', 'true');
    mascotWrap.removeAttribute('tabindex');
    if (countdownLabel) countdownLabel.textContent = '倒计时';

    // 声音、动画和倒计时都从这一次明确的用户操作开始。
    void startAudio();
    beginCountdown();
    startMascotPlayback();
  }

  if (mascotWrap) {
    mascotWrap.addEventListener('pointerdown', startExperience, { passive: true });
    mascotWrap.addEventListener('touchstart', startExperience, { passive: true });
    mascotWrap.addEventListener('click', startExperience);
    mascotWrap.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      startExperience();
    });
  }

  soundButton.addEventListener('click', () => {
    void startAudio();
  });

  laughAudio.addEventListener('error', () => {
    soundButton.hidden = false;
    soundButton.textContent = '再次点击开启声音';
  });

  replayButton.addEventListener('click', () => window.location.reload());

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && experienceStarted && !redirected) updateCountdown();
  });

  window.addEventListener('pagehide', () => {
    clearCycleTimers();
    laughAudio.pause();
  }, { once: true });

  // 中间奶龙：点击后由 JavaScript 定时移动 PNG 精灵图的 background-position。
  // 不使用 GIF、动态 WebP、Canvas 或 CSS animation，避开微信只显示第一帧的问题。
  if (mascotWrap && mascotFrames) {
    const SPRITE_URL = 'assets/mascot-sprite.png?v=20261111e';
    // 精灵图 1952×1952：8 列 × 8 行，每格 244px；59 帧内容是每格左上角 240×240。
    const CONTENT_SIZE = 240;
    const FRAME_PITCH = 244;
    const SPRITE_COLUMNS = 8;
    const FRAME_COUNT = 59;
    const FRAME_DURATION_MS = 100;

    const sprite = new Image();
    let spriteReady = false;
    let playbackRequested = false;
    let framesStarted = false;
    let frameTimer = 0;
    let frameStartedAt = 0;
    let drawnFrame = -1;
    let surfaceWidth = 1;
    let surfaceHeight = 1;

    function sizeFrameSurface() {
      const rect = mascotWrap.getBoundingClientRect();
      surfaceWidth = Math.max(1, rect.width);
      surfaceHeight = Math.max(1, rect.height);

      // 把 244px 的格子缩放到奶龙显示尺寸，240px 的画面正好占满可见区域；
      // 每格右下 4px 的透明间隔落在可视区之外，不会露出来。
      const scaleX = surfaceWidth / CONTENT_SIZE;
      const scaleY = surfaceHeight / CONTENT_SIZE;
      mascotFrames.style.backgroundSize =
        `${sprite.naturalWidth * scaleX}px ${sprite.naturalHeight * scaleY}px`;

      if (framesStarted) {
        drawnFrame = -1;
        drawFrame(Math.floor((performance.now() - frameStartedAt) / FRAME_DURATION_MS) % FRAME_COUNT);
      }
    }

    function drawFrame(frameIndex) {
      if (frameIndex === drawnFrame) return;

      const column = frameIndex % SPRITE_COLUMNS;
      const row = Math.floor(frameIndex / SPRITE_COLUMNS);
      const scaleX = surfaceWidth / CONTENT_SIZE;
      const scaleY = surfaceHeight / CONTENT_SIZE;

      mascotFrames.style.backgroundPosition =
        `${-column * FRAME_PITCH * scaleX}px ${-row * FRAME_PITCH * scaleY}px`;
      drawnFrame = frameIndex;
    }

    function tickFrame() {
      if (!framesStarted) return;
      const frameIndex = Math.floor(
        (performance.now() - frameStartedAt) / FRAME_DURATION_MS
      ) % FRAME_COUNT;
      drawFrame(frameIndex);
    }

    function startSpriteFrames() {
      if (framesStarted) return;
      playbackRequested = true;
      if (!spriteReady) return;

      mascotFrames.style.backgroundImage = `url("${SPRITE_URL}")`;
      framesStarted = true;
      frameStartedAt = performance.now();
      drawnFrame = -1;
      sizeFrameSurface();
      drawFrame(0);
      mascotWrap.classList.add('is-frames-playing');
      frameTimer = window.setInterval(tickFrame, FRAME_DURATION_MS);
    }

    sprite.onload = () => {
      spriteReady = true;
      if (playbackRequested) startSpriteFrames();
    };
    sprite.onerror = () => {
      // 精灵图失败时保留静态奶龙，倒计时和声音仍然可用。
      mascotWrap.classList.remove('is-frames-playing');
    };
    sprite.src = SPRITE_URL;

    startMascotPlayback = startSpriteFrames;

    window.addEventListener('resize', () => {
      if (framesStarted) sizeFrameSurface();
    }, { passive: true });

    window.addEventListener('pagehide', () => {
      framesStarted = false;
      window.clearInterval(frameTimer);
    }, { once: true });
  }
})();
