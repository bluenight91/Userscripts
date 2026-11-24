// ==UserScript==
// @name         X 界面美化（边栏自动隐藏 + 加宽 + 自定义中文字体）
// @namespace    grokbot.daniel
// @version      2.0
// @description  左右边栏靠边隐藏、鼠标移到边上自动滑出；时间线加宽；推文字体/字号可自定义
// @match        https://x.com/*
// @match        https://twitter.com/*
// @run-at       document-start
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_addStyle
// @grant        GM_registerMenuCommand
// @license      MIT
// @downloadURL  https://raw.githubusercontent.com/bluenight91/Userscripts/main/x-ui-beautify.user.js
// @updateURL    https://raw.githubusercontent.com/bluenight91/Userscripts/main/x-ui-beautify.user.js
// ==/UserScript==

(function () {
  'use strict';

  const cfg = {
    left: GM_getValue('left', 'auto'),   // auto | show | hide
    right: GM_getValue('right', 'auto'),
    latin: GM_getValue('latin', ''),
    font: GM_getValue('font', 'PingFang SC'),
    size: GM_getValue('size', 17),
    lineHeight: GM_getValue('lineHeight', 1.7),
    width: GM_getValue('width', 860),
    wholePage: GM_getValue('wholePage', false),
  };

  const LEFT_SEL = 'div:has(> div > [data-rail-overflow])';
  const RIGHT_SEL = 'div:has(> main) > aside';
  const TWEET_TEXT_SEL = 'article div[dir="auto"].whitespace-pre-wrap';

  const side = (k, autoCss, sel) =>
    cfg[k] === 'hide' ? `${sel} { display: none !important; }`
    : cfg[k] === 'show' ? autoCss + `${sel} { transform: none !important; opacity: 1 !important; visibility: visible !important; pointer-events: auto !important; box-shadow: none !important; border-${k === 'left' ? 'right' : 'left'}: 1px solid var(--x-border-normal, rgba(128,128,128,.2)); }`
    : autoCss;

  const css = () => {
    const fam = `${cfg.latin ? `"${cfg.latin}", ` : ''}"${cfg.font}", -apple-system, "PingFang SC", "Hiragino Sans GB", sans-serif`;
    const textSel = cfg.wholePage
      ? 'body, body *:not(svg):not(svg *)'
      : `${TWEET_TEXT_SEL}, ${TWEET_TEXT_SEL} *`;
    const colWidth = `min(${cfg.width}px, 96vw)`;
    return `
${side('left', `      /* ---- 左边栏：固定在左侧，默认藏起 ---- */
      ${LEFT_SEL} {
        position: fixed !important; top: 0; left: 0; bottom: 0;
        z-index: 9999 !important; background: var(--x-bg-primary, Canvas);
        box-shadow: 2px 0 16px rgba(0,0,0,.12);
        transform: translateX(-100%);
        overflow-y: auto; opacity: 0; visibility: hidden; pointer-events: none;
      }
      @media (prefers-reduced-motion: no-preference) {
        ${LEFT_SEL} {
          transition: transform .22s ease, opacity .22s ease, visibility .22s ease;
          transition-behavior: allow-discrete;
        }
      }
      html.gbx-left ${LEFT_SEL} { transform: translateX(0); opacity: 1; visibility: visible; pointer-events: auto; }
      ${LEFT_SEL} > div { position: static !important; height: 100% !important; }

`, LEFT_SEL)}
${side('right', `      /* ---- 右边栏：固定在右侧，默认藏起 ---- */
      ${RIGHT_SEL} {
        display: flex !important;
        position: fixed !important; top: 0; right: 0; bottom: 0;
        width: 380px !important; z-index: 9999 !important;
        background: var(--x-bg-primary, Canvas);
        box-shadow: -2px 0 16px rgba(0,0,0,.12);
        transform: translateX(100%);
        overflow-y: auto; opacity: 0; visibility: hidden; pointer-events: none;
      }
      @media (prefers-reduced-motion: no-preference) {
        ${RIGHT_SEL} {
          transition: transform .22s ease, opacity .22s ease, visibility .22s ease;
          transition-behavior: allow-discrete;
        }
      }
      html.gbx-right ${RIGHT_SEL} { transform: translateX(0); opacity: 1; visibility: visible; pointer-events: auto; }
      ${RIGHT_SEL} > div > div { position: static !important; width: auto !important; }

`, RIGHT_SEL)}
      /* ---- 中间时间线居中加宽 ---- */
      body > div:has(main) {
        max-width: none !important;
        --x-main-column-width: ${colWidth} !important;
        --x-timeline-max-width: ${colWidth} !important;
      }
      div:has(> main) {
        grid-template-columns: minmax(0, 1fr) !important;
        max-width: none !important;
      }
      main {
        width: ${colWidth} !important; max-width: 96vw !important;
        margin-inline: auto !important;
      }

      /* ---- 字体 ---- */
      ${textSel} { font-family: ${fam} !important; }
      ${TWEET_TEXT_SEL} {
        font-size: ${cfg.size}px !important; line-height: ${cfg.lineHeight} !important;
      }

      /* 边缘提示条 */
      .gbx-edge { position: fixed; top: 0; bottom: 0; width: 6px; z-index: 9998; }
      .gbx-edge.l { left: 0; ${cfg.left === 'auto' ? '' : 'display: none;'} }
      .gbx-edge.r { right: 0; ${cfg.right === 'auto' ? '' : 'display: none;'} }
      .gbx-edge:hover { background: rgba(29,155,240,.25); }
    `;
  };

  let styleEl;
  const apply = () => {
    if (styleEl) styleEl.remove();
    styleEl = GM_addStyle(css());
  };
  apply();

  // 鼠标靠边显示，离开隐藏
  const EDGE = 8;
  const H = document.documentElement;
  document.addEventListener('mousemove', (e) => {
    const x = e.clientX, w = H.clientWidth;
    const left = document.querySelector(LEFT_SEL);
    const right = document.querySelector(RIGHT_SEL);
    const lw = left ? left.getBoundingClientRect().width : 0;
    const rw = right ? right.getBoundingClientRect().width : 0;
    if (cfg.left === 'auto' && x <= EDGE) H.classList.add('gbx-left');
    else if (H.classList.contains('gbx-left') && x > lw + 20) H.classList.remove('gbx-left');
    if (cfg.right === 'auto' && x >= w - EDGE) H.classList.add('gbx-right');
    else if (H.classList.contains('gbx-right') && x < w - rw - 20) H.classList.remove('gbx-right');
  }, { passive: true });

  const addEdges = () => {
    ['l', 'r'].forEach((s) => {
      if (document.querySelector('.gbx-edge.' + s)) return;
      const d = document.createElement('div');
      d.className = 'gbx-edge ' + s;
      document.body.appendChild(d);
    });
  };
  if (document.body) addEdges();
  else window.addEventListener('DOMContentLoaded', addEdges, { once: true });

  // ---- Tampermonkey 菜单设置 ----
  const ask = (key, label, parse) => {
    const v = prompt(label, cfg[key]);
    if (v === null || v.trim() === '') return;
    const parsed = parse ? parse(v) : v.trim();
    if (parse === Number && (!Number.isFinite(parsed) || parsed <= 0)) return;
    cfg[key] = parsed;
    GM_setValue(key, cfg[key]);
    apply();
  };
  const NAMES = { auto: '自动（鼠标靠边显示）', show: '始终显示', hide: '始终隐藏' };
  const ORDER = ['auto', 'show', 'hide'];
  const cycle = (k, label) => {
    cfg[k] = ORDER[(ORDER.indexOf(cfg[k]) + 1) % 3];
    GM_setValue(k, cfg[k]); H.classList.remove('gbx-left', 'gbx-right'); apply();
    alert(label + '：' + NAMES[cfg[k]]);
  };
  GM_registerMenuCommand('左边栏：切换 自动/显示/隐藏', () => cycle('left', '左边栏'));
  GM_registerMenuCommand('右边栏：切换 自动/显示/隐藏', () => cycle('right', '右边栏'));
  GM_registerMenuCommand('设置中文字体', () => ask('font', '中文字体名称，例如：PingFang SC、LXGW WenKai、Songti SC、Hiragino Sans GB'));
  GM_registerMenuCommand('设置拉丁字体（英文/数字）', () => {
    const v = prompt('拉丁字体名称，例如：Inter、SF Pro Text、Helvetica Neue、Georgia。留空 = 跟随中文字体', cfg.latin);
    if (v === null) return;
    cfg.latin = v.trim(); GM_setValue('latin', cfg.latin); apply();
  });
  GM_registerMenuCommand('设置推文字号', () => ask('size', '推文字号（px），默认 17', Number));
  GM_registerMenuCommand('设置行距', () => ask('lineHeight', '行距倍数，默认 1.7', Number));
  GM_registerMenuCommand('设置时间线宽度', () => ask('width', '时间线宽度（px），默认 860，原版 600', Number));
  GM_registerMenuCommand('切换：字体应用到整个页面', () => {
    cfg.wholePage = !cfg.wholePage; GM_setValue('wholePage', cfg.wholePage); apply();
    alert(cfg.wholePage ? '已应用到整个页面' : '只应用到推文正文');
  });
})();
