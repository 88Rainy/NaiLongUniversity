(() => {
  'use strict';

  const TARGET_URL = 'https://www.fjsmu.edu.cn';
  const TOTAL_DURATION_MS = 10_000;
  const ASSET_VERSION = '20261111g';

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
  let remainingMsOnHide = null;

  // 由下方“中间奶龙逐帧动画”模块替换为真实实现。
  let startMascotPlayback = () => {};
  let resumeMascotPlayback = () => {};
  let pauseMascotPlayback = () => {};
  let restartMascotPlayback = () => {};

  if (manualLink) manualLink.href = TARGET_URL;
  if (laughAudio) {
    laughAudio.loop = true;
    laughAudio.volume = 0.82;
    laughAudio.playsInline = true;
  }
  if (countdownLabel) countdownLabel.textContent = '等待开始';

  function renderDigit(value) {
    if (!digit || value === lastRenderedDigit) return;
    lastRenderedDigit = value;
    digit.textContent = String(value);
    digit.classList.remove('pop');
    void digit.offsetWidth;
    digit.classList.add('pop');
  }

  function startAudio() {
    if (redirected || !laughAudio) return Promise.resolve(false);

    if (!laughAudio.paused && !laughAudio.ended) {
      if (soundButton) soundButton.hidden = true;
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
      if (soundButton) soundButton.hidden = false;
      return Promise.resolve(false);
    }

    if (!playResult || typeof playResult.then !== 'function') {
      // 老版本 WebKit 的 play() 不返回 Promise，乐观处理即可。
      if (soundButton) soundButton.hidden = true;
      return Promise.resolve(true);
    }

    audioPlayPromise = playResult
      .then(() => {
        if (soundButton) soundButton.hidden = true;
        return true;
      })
      .catch(() => {
        // 如果微信仍然拦截声音，用户可再次点击按钮重试。
        if (soundButton) {
          soundButton.hidden = false;
          soundButton.textContent = '再次点击开启声音';
        }
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
    if (laughAudio) laughAudio.pause();
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
    if (progress) {
      progress.style.transform = `scaleX(${Math.min(1, remainingMs / TOTAL_DURATION_MS)})`;
    }

    const nextBoundary = redirectAt - (remainingSeconds - 1) * 1000;
    countdownTimer = window.setTimeout(
      updateCountdown,
      Math.max(0, nextBoundary - performance.now())
    );
  }

  function startCountdown(durationMs) {
    if (redirected) return;
    clearCycleTimers();
    redirectAt = performance.now() + durationMs;
    updateCountdown();
    redirectTimer = window.setTimeout(redirect, Math.max(0, durationMs));
  }

  function pauseCountdown() {
    if (!experienceStarted || redirected) return;
    remainingMsOnHide = Math.max(0, redirectAt - performance.now());
    clearCycleTimers();
  }

  function resumeCountdown() {
    if (!experienceStarted || redirected) return;
    const remaining = remainingMsOnHide == null ? TOTAL_DURATION_MS : remainingMsOnHide;
    remainingMsOnHide = null;
    startCountdown(remaining);
  }

  function startExperience() {
    if (redirected) return;

    // 已开始但声音仍被拦截（常见于 iOS 微信）时，在下一次点击手势里再试一次。
    if (experienceStarted) {
      if (laughAudio && laughAudio.paused && !laughAudio.ended) void startAudio();
      resumeMascotPlayback();
      return;
    }

    experienceStarted = true;
    document.body.classList.add('experience-started');
    if (mascotWrap) {
      mascotWrap.setAttribute('aria-disabled', 'true');
      mascotWrap.removeAttribute('tabindex');
    }
    if (countdownLabel) countdownLabel.textContent = '倒计时';

    // 声音、动画和倒计时都从这一次明确的用户操作开始。
    void startAudio();
    startCountdown(TOTAL_DURATION_MS);
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

  if (soundButton) {
    soundButton.addEventListener('click', () => {
      void startAudio();
    });
  }

  if (laughAudio) {
    laughAudio.addEventListener('error', () => {
      if (!soundButton) return;
      soundButton.hidden = false;
      soundButton.textContent = '再次点击开启声音';
    });
  }

  if (replayButton) {
    replayButton.addEventListener('click', () => window.location.reload());
  }

  // 切到后台时暂停倒计时和动画，回到前台后从原进度继续，
  // 避免微信里切出去一次就“再也动不了”或一回来就直接跳转。
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      pauseCountdown();
      pauseMascotPlayback();
      return;
    }
    resumeCountdown();
    resumeMascotPlayback();
    if (experienceStarted && !redirected && laughAudio && laughAudio.paused && !laughAudio.ended) {
      void startAudio();
    }
  }, { passive: true });

  // 微信/浏览器用“返回”恢复页面时（bfcache），定时器会被冻结甚至清空，
  // 这里把倒计时和奶龙动画重新启动一遍。
  window.addEventListener('pageshow', (event) => {
    if (!experienceStarted || redirected || document.hidden) return;
    if (event.persisted) {
      remainingMsOnHide = null;
      lastRenderedDigit = null;
      startCountdown(TOTAL_DURATION_MS);
      restartMascotPlayback();
      if (laughAudio && laughAudio.paused && !laughAudio.ended) void startAudio();
      return;
    }
    resumeCountdown();
    resumeMascotPlayback();
  });

  window.addEventListener('pagehide', () => {
    pauseCountdown();
    pauseMascotPlayback();
    if (laughAudio) laughAudio.pause();
  });

  // ===== 中间奶龙：点击后逐帧播放 PNG 精灵图 =====
  // 精灵图 1952×1952：8 列 × 8 行，每格 244px；59 帧内容位于每格左上角 240×240。
  // 不使用 GIF、动态 WebP、Canvas 或 CSS animation，避开微信只显示第一帧的问题。
  if (mascotWrap && mascotFrames) {
    const FRAME_DURATION_MS = 100;
    const MIN_SURFACE_PX = 20;
    const MAX_SPRITE_ATTEMPTS = 3;
    const MAX_SIZE_RETRIES = 40;

    // 优先使用体积很小的 WebP 精灵图（约 93KB，30 帧），失败时回退原 PNG。
    const SPRITE_CANDIDATES = [
      { url: 'assets/mascot-sprite-30.webp?v=' + ASSET_VERSION, frameCount: 30, columns: 8, pitch: 244, content: 240 },
      { url: 'assets/mascot-sprite.png?v=' + ASSET_VERSION, frameCount: 59, columns: 8, pitch: 244, content: 240 }
    ];

    let sprite = null;
    let spriteReady = false;
    let spriteUrl = '';
    let spriteCandidateIndex = 0;
    let spriteAttempts = 0;
    let frameCount = SPRITE_CANDIDATES[0].frameCount;
    let spriteColumns = SPRITE_CANDIDATES[0].columns;
    let framePitch = SPRITE_CANDIDATES[0].pitch;
    let contentSize = SPRITE_CANDIDATES[0].content;

    let playbackRequested = false;
    let framesStarted = false;
    let frameStartedAt = 0;
    let frameElapsedMs = 0;
    let drawnFrame = -1;
    let lastDrawAt = 0;
    let surfaceWidth = 0;
    let surfaceHeight = 0;
    let frameTimer = 0;
    let rafId = 0;
    let sizeRetryTimer = 0;
    let sizeRetries = 0;

    function measureSurface() {
      const rect = mascotWrap.getBoundingClientRect();
      surfaceWidth = rect.width;
      surfaceHeight = rect.height;
      return surfaceWidth >= MIN_SURFACE_PX && surfaceHeight >= MIN_SURFACE_PX;
    }

    function applySurfaceSize() {
      if (!sprite || !sprite.naturalWidth) return false;
      // 布局可能还没完成（图片未加载、字体未就绪），此时先不画，交给重试逻辑。
      if (!measureSurface()) return false;

      const scaleX = surfaceWidth / contentSize;
      const scaleY = surfaceHeight / contentSize;
      mascotFrames.style.backgroundSize =
        `${sprite.naturalWidth * scaleX}px ${sprite.naturalHeight * scaleY}px`;
      mascotFrames.style.backgroundImage = `url("${spriteUrl}")`;
      drawnFrame = -1;
      sizeRetries = 0;
      return true;
    }

    function drawFrame(frameIndex) {
      if (frameIndex === drawnFrame) return;
      if (surfaceWidth < MIN_SURFACE_PX || surfaceHeight < MIN_SURFACE_PX) return;

      const column = frameIndex % spriteColumns;
      const row = Math.floor(frameIndex / spriteColumns);
      const scaleX = surfaceWidth / contentSize;
      const scaleY = surfaceHeight / contentSize;

      mascotFrames.style.backgroundPosition =
        `${-column * framePitch * scaleX}px ${-row * framePitch * scaleY}px`;
      drawnFrame = frameIndex;
      lastDrawAt = performance.now();
    }

    function tickFrame() {
      if (!framesStarted) return;
      const elapsed = performance.now() - frameStartedAt;
      drawFrame(Math.floor(elapsed / FRAME_DURATION_MS) % frameCount);
    }

    function rafLoop() {
      if (!framesStarted) {
        rafId = 0;
        return;
      }
      tickFrame();
      rafId = window.requestAnimationFrame(rafLoop);
    }

    function startTickers() {
      if (!frameTimer) frameTimer = window.setInterval(tickFrame, FRAME_DURATION_MS);
      if (!rafId) rafId = window.requestAnimationFrame(rafLoop);
    }

    function stopTickers() {
      if (frameTimer) {
        window.clearInterval(frameTimer);
        frameTimer = 0;
      }
      if (rafId) {
        window.cancelAnimationFrame(rafId);
        rafId = 0;
      }
    }

    function scheduleSizeRetry() {
      if (sizeRetryTimer) return;
      if (sizeRetries >= MAX_SIZE_RETRIES) return;
      sizeRetries += 1;
      sizeRetryTimer = window.setTimeout(() => {
        sizeRetryTimer = 0;
        if (!framesStarted && playbackRequested) startSpriteFrames();
      }, 120);
    }

    function paintRunningFrame() {
      frameStartedAt = performance.now() - frameElapsedMs;
      drawnFrame = -1;
      tickFrame();
      mascotWrap.classList.remove('is-waiting');
      mascotWrap.classList.add('is-frames-playing');
      startTickers();
    }

    function startSpriteFrames() {
      playbackRequested = true;

      if (!spriteReady) {
        mascotWrap.classList.add('is-waiting');
        if (!sprite) loadSprite();
        return;
      }
      if (framesStarted) return;
      if (!applySurfaceSize()) {
        scheduleSizeRetry();
        return;
      }

      framesStarted = true;
      frameElapsedMs = 0;
      paintRunningFrame();
    }

    function resumeSpriteFrames() {
      if (!playbackRequested || framesStarted) return;
      if (!spriteReady) {
        mascotWrap.classList.add('is-waiting');
        if (!sprite) loadSprite();
        return;
      }
      if (!applySurfaceSize()) {
        scheduleSizeRetry();
        return;
      }

      framesStarted = true;
      paintRunningFrame();
    }

    function pauseSpriteFrames() {
      if (!framesStarted) return;
      frameElapsedMs = Math.max(0, performance.now() - frameStartedAt);
      framesStarted = false;
      stopTickers();
    }

    function restartSpriteFrames() {
      stopTickers();
      framesStarted = false;
      frameElapsedMs = 0;
      startSpriteFrames();
    }

    function loadSprite() {
      if (spriteCandidateIndex >= SPRITE_CANDIDATES.length) return;

      const candidate = SPRITE_CANDIDATES[spriteCandidateIndex];
      spriteAttempts += 1;
      const attempt = spriteAttempts;
      const url = candidate.url + (attempt > 1 ? '&r=' + attempt : '');

      const image = new Image();
      image.decoding = 'async';

      image.onload = () => {
        sprite = image;
        spriteUrl = url;
        spriteReady = true;
        frameCount = candidate.frameCount;
        spriteColumns = candidate.columns;
        framePitch = candidate.pitch;
        contentSize = candidate.content;
        mascotWrap.classList.remove('is-waiting');
        if (playbackRequested) startSpriteFrames();
      };
      image.onerror = () => {
        sprite = null;
        // 弱网下首次下载失败很常见，换一个 URL 参数重试，绕开失败缓存。
        if (attempt < MAX_SPRITE_ATTEMPTS) {
          window.setTimeout(() => {
            if (!spriteReady) loadSprite();
          }, 400 * attempt);
          return;
        }
        // 多格式兜底：不支持 WebP 的旧内核自动改用 PNG。
        spriteCandidateIndex += 1;
        spriteAttempts = 0;
        if (spriteCandidateIndex < SPRITE_CANDIDATES.length) loadSprite();
      };

      image.src = url;
    }

    // 页面一打开就开始下载并解码精灵图，点击时才能立刻出画面。
    loadSprite();

    startMascotPlayback = startSpriteFrames;
    resumeMascotPlayback = resumeSpriteFrames;
    pauseMascotPlayback = pauseSpriteFrames;
    restartMascotPlayback = restartSpriteFrames;

    window.addEventListener('resize', () => {
      if (!playbackRequested) return;
      if (applySurfaceSize() && framesStarted) tickFrame();
    }, { passive: true });

    // 看门狗：个别微信内核会限制定时器，发现画面停滞后自动重启。
    window.setInterval(() => {
      if (!framesStarted || document.hidden) return;
      if (performance.now() - lastDrawAt > 900) {
        stopTickers();
        startTickers();
        tickFrame();
      }
    }, 1200);
  }
})();