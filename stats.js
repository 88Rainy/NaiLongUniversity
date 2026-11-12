/*
  奶龙倒计时 · 访问统计
  ---------------------------------------------------------------
  服务：Vercount（https://vercount.one）
        免费、开源、国内可访问，是不蒜子的替代方案，无需注册即可计数。

  计数规则：
    电脑端 index.html 与手机端 mobile.html 共用同一个站点（site）计数，
    每打开一次页面 +1；手机访问 index.html 时会立刻跳到 mobile.html，
    所以 index 上不重复计数。

  想在后台看数据：登录 https://vercount.one（GitHub 账号）→ 添加站点，
  具体说明见 README.md 的「访问统计」一节。
*/
(function () {
  'use strict';

  // 手机访问 index.html 会立刻跳到 mobile.html，这里直接跳过，
  // 让一次访问只在 mobile.html 上计 1 次。
  if (window.__nailongRedirecting) return;

  var bar = document.getElementById('visitStats');
  var pvEl = document.getElementById('vercount_value_site_pv');
  var uvEl = document.getElementById('vercount_value_site_uv');

  if (!bar || !pvEl) return;

  // 主线路 + 备用线路：任一脚本下载失败就换另一条。
  var SOURCES = [
    'https://events.vercount.one/js',
    'https://cn.vercount.one/js'
  ];
  var PENDING = '--';
  var loaded = false;

  function formatNumber(text) {
    var n = Number(String(text).replace(/[^\d]/g, ''));
    if (!n) return text;
    try {
      return n.toLocaleString('zh-CN');
    } catch (e) {
      return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }
  }

  function reveal() {
    bar.hidden = false;
  }

  function paint() {
    var raw = (pvEl.textContent || '').trim();
    if (!raw || raw === PENDING) return false;
    pvEl.textContent = formatNumber(raw);
    if (uvEl && uvEl.textContent) {
      uvEl.textContent = formatNumber(uvEl.textContent.trim());
    }
    bar.removeAttribute('hidden');
    return true;
  }

  function loadSource(i) {
    if (i >= SOURCES.length || loaded) return;
    var s = document.createElement('script');
    s.async = true;
    s.src = SOURCES[i];
    s.onload = function () { loaded = true; };
    s.onerror = function () {
      if (s.parentNode) s.parentNode.removeChild(s);
      loadSource(i + 1);
    };
    document.head.appendChild(s);
  }

  // 计数脚本会自己把数字写进 span，这里轮询等它写好并做千分位格式化。
  var waited = 0;
  var timer = setInterval(function () {
    waited += 300;
    if (paint()) {
      clearInterval(timer);
      return;
    }
    if (waited >= 9000) {
      clearInterval(timer);
      // 9 秒还没拿到数据（多半是网络拦截），保留统计条并显示占位符。
      bar.classList.add('visit-stats--offline');
      bar.title = '统计服务暂时连不上，刷新页面可重试';
      if (!pvEl.textContent || pvEl.textContent === PENDING) pvEl.textContent = '—';
      if (uvEl && (!uvEl.textContent || uvEl.textContent === PENDING)) uvEl.textContent = '—';
      reveal();
    }
  }, 300);

  loadSource(0);
})();
