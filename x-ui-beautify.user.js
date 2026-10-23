// ==UserScript==
// @name         X 界面美化（边栏自动隐藏 + 加宽 + 自定义中文字体）
// @namespace    grokbot.daniel
// @version      1.5
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

  const side = (k, autoCss, sel) =>
    cfg[k] === 'hide' ? `${sel} { display: none !important; }`
    : cfg[k] === 'show' ? autoCss + `${sel} { transform: none !important; opacity: 1 !important; visibility: visible !important; pointer-events: auto !important; box-shadow: none !important; border-${k === 'left' ? 'right' : 'left'}: 1px solid rgba(128,128,128,.2); }`
    : autoCss;
  const css = () => {
    const fam = `${cfg.latin ? `"${cfg.latin}", ` : ''}"${cfg.font}", -apple-system, "PingFang SC", "Hiragino Sans GB", sans-serif`;
    const textSel = cfg.wholePage
      ? 'body, body *:not([data-testid="icon"]):not(svg):not(path)'
      : '[data-testid="tweetText"], [data-testid="tweetText"] *';
    return `
${side('left', `      /* ---- 左边栏：固定在左侧，默认藏起 ---- */
      header[role="banner"] {
        position: fixed !important; top: 0; left: 0; bottom: 0;
        z-index: 9999 !important; background: rgb(var(--gbx-bg, 255,255,255));
        box-shadow: 2px 0 16px rgba(0,0,0,.12);
        transform: translateX(-100%); transition: transform .22s ease;
        overflow-y: auto; opacity: 0; visibility: hidden; pointer-events: none;
      }
      html.gbx-left header[role="banner"] { transform: translateX(0); opacity: 1; visibility: visible; pointer-events: auto; }
      header[role="banner"] > div { position: static !important; }

`, 'header[role="banner"]')}
${side('right', `      /* ---- 右边栏：固定在右侧，默认藏起 ---- */
      [data-testid="sidebarColumn"] {
        position: fixed !important; top: 0; right: 0; bottom: 0;
        width: 380px !important; z-index: 9999 !important;
        background: rgb(var(--gbx-bg, 255,255,255)); padding: 0 12px;
        box-shadow: -2px 0 16px rgba(0,0,0,.12);
        transform: translateX(100%); transition: transform .22s ease;
        overflow-y: auto; opacity: 0; visibility: hidden; pointer-events: none;
      }
      html.gbx-right [data-testid="sidebarColumn"] { transform: translateX(0); opacity: 1; visibility: visible; pointer-events: auto; }
      [data-testid="sidebarColumn"] > div > div { position: static !important; width: auto !important; }

`, '[data-testid="sidebarColumn"]')}
      /* ---- 中间时间线居中加宽 ---- */
      main[role="main"] { align-items: center !important; }
      main[role="main"] > div { width: 100% !important; max-width: none !important; justify-content: center !important; }
      main[role="main"] > div > div { width: auto !important; max-width: none !important; justify-content: center !important; }
      [data-testid="primaryColumn"] {
        width: ${cfg.width}px !important; max-width: 96vw !important;
        margin: 0 auto !important; flex: 0 0 auto !important;
      }
      [data-testid="primaryColumn"] > div,
      [data-testid="primaryColumn"] section,
      [data-testid="primaryColumn"] section > div,
      [data-testid="primaryColumn"] section > div > div,
      [data-testid="cellInnerDiv"],
      [data-testid="cellInnerDiv"] > div,
      [data-testid="tweet"] { width: 100% !important; max-width: none !important; }

      /* ---- 字体 ---- */
      ${textSel} { font-family: ${fam} !important; }
      [data-testid="tweetText"] {
        font-size: ${cfg.size}px !important; line-height: ${cfg.lineHeight} !important;
      }

      /* 边缘提示条 */
      .gbx-edge { position: fixed; top: 0; bottom: 0; width: 6px; z-index: 9998; }
      .gbx-edge.l { left: 0; } .gbx-edge.r { right: 0; }
      .gbx-edge:hover { background: rgba(29,155,240,.25); }
    `;
  };

  let styleEl;
  const apply = () => {
    if (styleEl) styleEl.remove();
    styleEl = GM_addStyle(css());
  };
  apply();

  // 跟随 X 的背景色（浅色/暗色）
  const syncBg = () => {
    const bg = getComputedStyle(document.body).backgroundColor.match(/\d+/g);
    if (bg) document.documentElement.style.setProperty('--gbx-bg', bg.slice(0, 3).join(','));
  };

  // 鼠标靠边显示，离开隐藏
  const EDGE = 8;
  const H = document.documentElement;
  document.addEventListener('mousemove', (e) => {
    const x = e.clientX, w = window.innerWidth;
    const left = document.querySelector('header[role="banner"]');
    const right = document.querySelector('[data-testid="sidebarColumn"]');
    const lw = left ? left.getBoundingClientRect().width : 0;
    const rw = right ? right.getBoundingClientRect().width : 0;
    if (cfg.left === 'auto' && x <= EDGE) H.classList.add('gbx-left');
    else if (H.classList.contains('gbx-left') && x > lw + 20) H.classList.remove('gbx-left');
    if (cfg.right === 'auto' && x >= w - EDGE) H.classList.add('gbx-right');
    else if (H.classList.contains('gbx-right') && x < w - rw - 20) H.classList.remove('gbx-right');
  }, { passive: true });

  window.addEventListener('DOMContentLoaded', () => {
    ['l', 'r'].forEach((s) => {
      const d = document.createElement('div');
      d.className = 'gbx-edge ' + s;
      document.body.appendChild(d);
    });
    syncBg();
    new MutationObserver(syncBg).observe(document.body, { attributes: true, attributeFilter: ['style'] });
  });


  // 推文正文加宽：从每条推文往上到 primaryColumn，解除所有宽度限制
  const widen = () => {
    const col = document.querySelector('[data-testid="primaryColumn"]');
    if (!col) return;
    col.querySelectorAll('article:not([data-gbx]), [data-testid="cellInnerDiv"]:not([data-gbx])').forEach((a) => {
      a.dataset.gbx = '1';
      let e = a;
      while (e && e !== col) {
        e.style.setProperty('max-width', 'none', 'important');
        e.style.setProperty('width', '100%', 'important');
        e.style.setProperty('margin-left', '0', 'important');
        e.style.setProperty('margin-right', '0', 'important');
        e = e.parentElement;
      }
    });
  };
  new MutationObserver(widen).observe(document, { childList: true, subtree: true });

  // ---- Tampermonkey 菜单设置 ----
  const ask = (key, label, parse) => {
    const v = prompt(label, cfg[key]);
    if (v === null || v.trim() === '') return;
    cfg[key] = parse ? parse(v) : v.trim();
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
