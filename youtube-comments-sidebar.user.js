// ==UserScript==
// @name         YouTube 评论栏移到侧边栏
// @namespace    grokbot.daniel
// @version      1.2.0
// @description  把 YouTube 评论区移到右侧边栏，可一键切回视频下方（复刻 Move Youtube comments to sidebar）
// @author       Daniel / Grok Bot（参考 yakisova41 MIT）
// @match        https://www.youtube.com/*
// @run-at       document-idle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @license      MIT
// @downloadURL  https://raw.githubusercontent.com/bluenight91/Userscripts/main/youtube-comments-sidebar.user.js
// @updateURL    https://raw.githubusercontent.com/bluenight91/Userscripts/main/youtube-comments-sidebar.user.js
// ==/UserScript==

(function () {
  'use strict';

  // GM_* 防御：不支持的管理器降级到 localStorage
  function gmGet(key, def) {
    try {
      if (typeof GM_getValue === 'function') return GM_getValue(key, def);
      const raw = localStorage.getItem('ycs:' + key);
      return raw === null ? def : JSON.parse(raw);
    } catch (_) {
      return def;
    }
  }
  function gmSet(key, val) {
    try {
      if (typeof GM_setValue === 'function') GM_setValue(key, val);
    } catch (_) {}
    try {
      localStorage.setItem('ycs:' + key, JSON.stringify(val));
    } catch (_) {}
  }

  // true = 侧边栏；false = 视频下方
  let sidebarOn = gmGet('sidebarOn', true);

  const STYLE_ID = 'ycs-style';
  const WRAP_ID = 'ycs-wrap';
  const INNER_ID = 'ycs-inner';
  const BTN_ID = 'ycs-toggle-btn';
  const FAB_ID = 'ycs-fab';

  // 缓存节点，避免 Polymer 重绘后选错
  let commentsEl = null;

  function injectStyle() {
    let s = document.getElementById(STYLE_ID);
    if (!s) {
      s = document.createElement('style');
      s.id = STYLE_ID;
      (document.head || document.documentElement).appendChild(s);
    }
    // 不要用 --ytd-watch-flexy-chat-max-height：没开直播时常为 0，侧栏会“看起来没反应”
    s.textContent = `
      #${WRAP_ID} {
        width: 100%;
        margin-bottom: 16px;
        box-sizing: border-box;
        display: block;
      }
      #${WRAP_ID}.ycs-in-sidebar {
        height: calc(100vh - 120px);
        max-height: calc(100vh - 120px);
        min-height: 320px;
      }
      #${WRAP_ID}.ycs-in-below {
        height: min(70vh, calc(100vh - 280px));
        margin: 16px 0;
      }
      #${WRAP_ID}.ycs-hidden { display: none !important; }
      #${INNER_ID} {
        width: 100%;
        height: 100%;
        border-radius: 12px;
        border: 1px solid var(--ytd-searchbox-legacy-button-border-color, rgba(255,255,255,.12));
        overflow-y: auto;
        overflow-x: hidden;
        overscroll-behavior: contain;
        padding: 0 8px;
        box-sizing: border-box;
        background: var(--yt-spec-base-background, transparent);
      }
      #${INNER_ID}::-webkit-scrollbar { width: 16px; background: transparent; }
      #${INNER_ID}::-webkit-scrollbar-thumb {
        height: 56px; border-radius: 8px;
        border: 4px solid transparent; background-clip: content-box;
        background-color: var(--yt-spec-icon-disabled, #717171);
      }
      #${INNER_ID} ytd-comments#comments,
      #${INNER_ID} #comments {
        width: 100% !important;
        max-width: 100% !important;
        display: block !important;
      }
      #${INNER_ID} #contents { max-width: 100% !important; }

      #${BTN_ID} {
        background: var(--yt-spec-badge-chip-background, rgba(255,255,255,.1));
        border: none;
        color: var(--yt-spec-text-primary, #f1f1f1);
        font-size: 13px;
        font-weight: 500;
        line-height: 36px;
        height: 36px;
        min-width: 36px;
        padding: 0 12px;
        margin-left: 8px;
        border-radius: 18px;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        flex-shrink: 0;
        font-family: "Roboto", "Arial", sans-serif;
        vertical-align: middle;
      }
      #${BTN_ID} svg { fill: currentColor; width: 20px; height: 20px; }
      #${BTN_ID}:hover {
        background: var(--yt-spec-mono-tonal-hover, rgba(255,255,255,.2));
      }
      #${BTN_ID}.ycs-active {
        background: var(--yt-spec-brand-button-background, #3ea6ff);
        color: #0f0f0f;
      }

      #${FAB_ID} {
        position: fixed;
        right: 18px;
        bottom: 88px;
        z-index: 2147483646;
        height: 40px;
        padding: 0 14px;
        border-radius: 20px;
        border: 1px solid rgba(255,255,255,.18);
        background: rgba(15,15,15,.92);
        color: #fff;
        font: 600 13px/40px "Roboto", "PingFang SC", sans-serif;
        cursor: pointer;
        box-shadow: 0 4px 16px rgba(0,0,0,.35);
      }
      #${FAB_ID}.ycs-active { background: #3ea6ff; color: #0f0f0f; border-color: transparent; }
      html.ycs-fullscreen-active #${WRAP_ID},
      html.ycs-fullscreen-active #${FAB_ID} { display: none !important; }
    `;
  }

  const isWatch = () =>
    location.pathname === '/watch' || /[?&]v=/.test(location.search);

  const qs = (sel, root = document) => {
    try {
      return root.querySelector(sel);
    } catch (_) {
      return null;
    }
  };

  function findComments() {
    // 优先取仍挂在文档里的缓存
    if (commentsEl && document.contains(commentsEl)) return commentsEl;
    const el =
      qs('ytd-watch-flexy ytd-comments#comments') ||
      qs('ytd-comments#comments') ||
      qs('#primary-inner #below ytd-comments') ||
      qs('#below #comments') ||
      qs('ytd-comments');
    if (el) commentsEl = el;
    return el;
  }

  function getBelow() {
    return (
      qs('#primary-inner > #below') ||
      qs('#primary-inner #below') ||
      qs('ytd-watch-flexy #below') ||
      qs('#below')
    );
  }

  function getSecondaryInner() {
    return (
      qs('#columns #secondary-inner') ||
      qs('#secondary-inner') ||
      qs('ytd-watch-flexy #secondary-inner')
    );
  }

  function wideLayout() {
    return window.innerWidth > 1015;
  }

  function isFullscreen() {
    return !!(
      document.fullscreenElement ||
      qs('ytd-watch-flexy[fullscreen]') ||
      qs('.ytp-fullscreen')
    );
  }

  function ensureWrap() {
    let wrap = document.getElementById(WRAP_ID);
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.id = WRAP_ID;
      const inner = document.createElement('div');
      inner.id = INNER_ID;
      wrap.appendChild(inner);
    }
    return wrap;
  }

  function placeWrap(wrap) {
    const secondary = getSecondaryInner();
    if (wideLayout() && secondary) {
      // 插到可见的 #related 前面；#panels 常为 height:0，只作次选
      const related =
        qs(':scope > #related', secondary) || qs('#related', secondary);
      const anchor =
        related ||
        qs(':scope > #panels', secondary) ||
        qs(':scope > #chat-container', secondary) ||
        secondary.firstElementChild;

      wrap.classList.add('ycs-in-sidebar');
      wrap.classList.remove('ycs-in-below', 'ycs-hidden');

      if (anchor && anchor.parentNode === secondary) {
        if (wrap.nextSibling !== anchor || wrap.parentNode !== secondary) {
          secondary.insertBefore(wrap, anchor);
        }
      } else if (wrap.parentNode !== secondary) {
        secondary.insertBefore(wrap, secondary.firstChild);
      }
      return true;
    }

    const below = getBelow();
    if (!below) return false;
    wrap.classList.add('ycs-in-below');
    wrap.classList.remove('ycs-in-sidebar');
    if (wrap.parentNode !== below) {
      const meta = qs('#below ytd-watch-metadata') || qs('#above-the-fold');
      if (meta && below.contains(meta)) meta.after(wrap);
      else below.prepend(wrap);
    }
    return true;
  }

  function ensurePageButton() {
    let btn = document.getElementById(BTN_ID);
    if (btn && document.contains(btn)) {
      updateButton(btn);
      return btn;
    }
    const host =
      qs('ytd-menu-renderer.ytd-watch-metadata') ||
      qs('#actions-inner ytd-menu-renderer') ||
      qs('#menu.ytd-watch-metadata ytd-menu-renderer') ||
      qs('#actions ytd-menu-renderer') ||
      qs('#top-level-buttons-computed')?.parentElement;

    if (!host) return null;

    btn = document.createElement('button');
    btn.id = BTN_ID;
    btn.type = 'button';
    // 不能用 innerHTML：YouTube 强制 Trusted Types，会直接抛异常
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('width', '20');
    svg.setAttribute('height', '20');
    svg.setAttribute('aria-hidden', 'true');
    const path = document.createElementNS(svgNS, 'path');
    path.setAttribute(
      'd',
      'M8,7h8v2H8V7z M8,13h5v-2H8V13z M5,3v13h10h0.41l0.29,0.29L19,19.59V3H5 M4,2h16v20l-5-5H4V2L4,2z'
    );
    svg.appendChild(path);
    const label = document.createElement('span');
    label.className = 'ycs-btn-label';
    btn.appendChild(svg);
    btn.appendChild(label);
    btn.addEventListener(
      'click',
      (e) => {
        e.preventDefault();
        e.stopPropagation();
        setSidebarOn(!sidebarOn);
      },
      true
    );
    host.appendChild(btn);
    updateButton(btn);
    return btn;
  }

  function ensureFab() {
    if (!isWatch()) {
      document.getElementById(FAB_ID)?.remove();
      return;
    }
    let fab = document.getElementById(FAB_ID);
    if (!fab) {
      fab = document.createElement('button');
      fab.id = FAB_ID;
      fab.type = 'button';
      fab.addEventListener('click', (e) => {
        e.preventDefault();
        setSidebarOn(!sidebarOn);
      });
      document.documentElement.appendChild(fab);
    }
    fab.classList.toggle('ycs-active', sidebarOn);
    fab.textContent = sidebarOn ? '评论：侧栏' : '评论：下方';
    fab.title = '切换 YouTube 评论位置';
  }

  function updateButton(btn) {
    btn = btn || document.getElementById(BTN_ID);
    if (!btn) return;
    btn.classList.toggle('ycs-active', sidebarOn);
    const label = btn.querySelector('.ycs-btn-label');
    if (label) label.textContent = sidebarOn ? '侧栏评论' : '下方评论';
    btn.title = sidebarOn
      ? '当前：评论在侧边栏（点击切回视频下方）'
      : '当前：评论在视频下方（点击移到侧边栏）';
  }

  function moveToSidebar() {
    const comments = findComments();
    const wrap = ensureWrap();
    if (!placeWrap(wrap)) {
      console.warn('[YCS] placeWrap failed');
      return false;
    }
    const inner = document.getElementById(INNER_ID);
    if (!comments || !inner) {
      console.warn('[YCS] comments or inner missing', !!comments, !!inner);
      return false;
    }
    if (comments.parentElement !== inner) {
      inner.appendChild(comments);
    }
    wrap.classList.remove('ycs-hidden');
    // 触发一下滚动，方便评论继续懒加载
    try {
      inner.dispatchEvent(new Event('scroll'));
    } catch (_) {}
    return true;
  }

  function moveToDefault() {
    const comments = findComments();
    const below = getBelow();
    const wrap = document.getElementById(WRAP_ID);

    if (comments && below) {
      // 放回 metadata 盒子后面（现网 #below 里评论原本在第二个 div.box）
      const metaBox =
        qs('#below ytd-watch-metadata')?.closest('div.box') ||
        qs('#below #above-the-fold')?.closest('div.box') ||
        qs('#below ytd-watch-metadata') ||
        qs('#above-the-fold');
      if (metaBox && below.contains(metaBox)) {
        if (comments.previousElementSibling !== metaBox) metaBox.after(comments);
      } else if (comments.parentElement !== below) {
        below.appendChild(comments);
      }
    }
    if (wrap) wrap.classList.add('ycs-hidden');
    return true;
  }

  function apply() {
    injectStyle();
    if (!isWatch()) {
      document.getElementById(FAB_ID)?.remove();
      document.getElementById(BTN_ID)?.remove();
      return;
    }

    try {
      ensurePageButton();
    } catch (err) {
      console.warn('[YCS] ensurePageButton error', err);
    }
    try {
      ensureFab();
    } catch (err) {
      console.warn('[YCS] ensureFab error', err);
    }

    if (isFullscreen()) {
      document.documentElement.classList.add('ycs-fullscreen-active');
      return;
    }
    document.documentElement.classList.remove('ycs-fullscreen-active');

    if (sidebarOn && wideLayout()) {
      moveToSidebar();
    } else {
      moveToDefault();
    }
    updateButton();
  }

  function setSidebarOn(on) {
    sidebarOn = !!on;
    gmSet('sidebarOn', sidebarOn);
    apply();
  }

  let scheduled = null;
  function scheduleApply(delay = 200) {
    if (scheduled) clearTimeout(scheduled);
    scheduled = setTimeout(() => {
      scheduled = null;
      try {
        apply();
      } catch (err) {
        console.warn('[YCS] apply error', err);
      }
    }, delay);
  }

  // SPA
  window.addEventListener('yt-navigate-finish', () => {
    commentsEl = null;
    scheduleApply(350);
  });
  document.addEventListener('yt-navigate-finish', () => {
    commentsEl = null;
    scheduleApply(350);
  });
  window.addEventListener('yt-page-data-updated', () => scheduleApply(350));

  let lastHref = location.href;
  setInterval(() => {
    if (location.href !== lastHref) {
      lastHref = location.href;
      commentsEl = null;
      scheduleApply(400);
    }
  }, 800);

  // Polymer 重绘时把评论抢回去 → 再挪回来
  const domObs = new MutationObserver(() => {
    if (!isWatch() || !sidebarOn || !wideLayout() || isFullscreen()) return;
    const comments = findComments();
    const inner = document.getElementById(INNER_ID);
    if (comments && inner && comments.parentElement !== inner) {
      scheduleApply(120);
    } else if (!document.getElementById(BTN_ID) || !document.getElementById(FAB_ID)) {
      scheduleApply(200);
    }
  });

  function startDomObs() {
    const root = qs('ytd-page-manager') || document.body;
    if (root) domObs.observe(root, { childList: true, subtree: true });
  }

  window.addEventListener('resize', () => scheduleApply(150));
  document.addEventListener('fullscreenchange', () => scheduleApply(80));
  document.addEventListener('webkitfullscreenchange', () => scheduleApply(80));

  if (typeof GM_registerMenuCommand === 'function') {
    try {
      GM_registerMenuCommand('切换：评论侧边栏 ↔ 视频下方', () =>
        setSidebarOn(!sidebarOn)
      );
      GM_registerMenuCommand('评论放到侧边栏', () => setSidebarOn(true));
      GM_registerMenuCommand('评论放回视频下方', () => setSidebarOn(false));
    } catch (_) {}
  }

  injectStyle();
  if (document.body) startDomObs();
  else document.addEventListener('DOMContentLoaded', startDomObs, { once: true });

  // 首屏多轮重试（评论/侧栏晚于脚本加载）
  scheduleApply(300);
  [600, 1200, 2000, 3500, 6000, 10000].forEach((t) =>
    setTimeout(() => {
      if (!isWatch()) return;
      try {
        apply();
      } catch (err) {
        console.warn('[YCS] apply error', err);
      }
    }, t)
  );
})();
