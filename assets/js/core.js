/* ============================================================
   core.js — 웹 / 세부 페이지 / PDF 페이지가 함께 쓰는 공용 코드
   1) 글 표기 변환(md)   2) 데이터 열기(미리보기 · 암호화 배포)
   3) 이미지 연결          4) 슬라이더
   ============================================================ */
(function (global) {
  'use strict';

  /* ---------- 0. 작은 도구 ---------- */
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function safeUrl(u) {
    u = String(u || '').trim();
    if (!u || u === '#') return '';
    if (/^(https?:|mailto:|tel:)/i.test(u)) return u;
    if (/^[\w.-]+\.[a-z]{2,}(\/|$)/i.test(u)) return 'https://' + u;
    return '';
  }
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  /* ---------- 1. 글 표기 ----------
     **굵게**  *기울임*  [[강조색]]  `코드`  [글자](주소)
     줄 앞 "- " → 목록 (두 칸 들여쓰면 하위 목록)
     빈 줄 → 문단 구분,  ``` 로 감싸면 코드 블록               */
  function inline(text) {
    var codes = [];
    var s = esc(text).replace(/`([^`\n]+)`/g, function (_, c) {
      codes.push('<code>' + c + '</code>'); return '\u0000' + (codes.length - 1) + '\u0000';
    });
    s = s.replace(/\[([^\]\n]+)\]\(([^)\s]+)\)/g, function (m, label, url) {
      var u = safeUrl(url.replace(/&amp;/g, '&'));
      return u ? '<a href="' + esc(u) + '" target="_blank" rel="noopener">' + label + '</a>' : label;
    });
    s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
         .replace(/\[\[(.+?)\]\]/g, '<span class="text-primary">$1</span>')
         .replace(/(^|[^*])\*(?!\s)([^*\n]+?)(?<!\s)\*(?!\*)/g, '$1<em>$2</em>');
    return s.replace(/\u0000(\d+)\u0000/g, function (_, i) { return codes[+i]; });
  }
  /* 한 줄짜리 자리(제목, 이력 등) — 줄바꿈은 <br> */
  function line(text) { return inline(text).replace(/\n/g, '<br>'); }

  /* 여러 줄 본문 */
  function block(text) {
    var lines = String(text || '').replace(/\r/g, '').split('\n');
    var out = [], para = [], stack = [], i = 0;
    function flushPara() { if (para.length) { out.push('<p>' + para.map(inline).join('<br>') + '</p>'); para = []; } }
    function closeLists(depth) { while (stack.length > depth) { out.push('</li></ul>'); stack.pop(); } }
    for (; i < lines.length; i++) {
      var ln = lines[i];
      var fence = ln.match(/^\s*```\s*([\w+#-]*)\s*$/);
      if (fence) {
        flushPara(); closeLists(0);
        var code = [];
        for (i++; i < lines.length && !/^\s*```\s*$/.test(lines[i]); i++) code.push(lines[i]);
        out.push('<pre class="code"' + (fence[1] ? ' data-lang="' + esc(fence[1]) + '"' : '') + '><code>' + esc(code.join('\n')) + '</code></pre>');
        continue;
      }
      var li = ln.match(/^(\s*)[-•]\s+(.*)$/);
      if (li) {
        flushPara();
        var depth = Math.min(Math.floor(li[1].replace(/\t/g, '  ').length / 2), 2) + 1;
        if (depth > stack.length) { while (stack.length < depth) { out.push('<ul class="md-list"><li>'); stack.push(1); } }
        else { closeLists(depth); out.push('</li><li>'); }
        out.push(inline(li[2]));
        continue;
      }
      if (!ln.trim()) { flushPara(); closeLists(0); continue; }
      if (stack.length) { closeLists(0); }
      para.push(ln);
    }
    flushPara(); closeLists(0);
    return out.join('').replace(/<li><\/li>/g, '');
  }
  /* 첫 줄이 **제목** 이고 아래가 목록인 "핵심 기능" 항목을 보기 좋게 */
  function point(text) {
    var s = String(text || '');
    if (s.indexOf('\n') < 0) return inline(s);
    return block(s);
  }
  function plain(text) {
    return String(text || '').replace(/\*\*(.+?)\*\*/g, '$1').replace(/\[\[(.+?)\]\]/g, '$1')
      .replace(/`([^`]+)`/g, '$1').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/\*([^*\n]+)\*/g, '$1');
  }

  /* ---------- 2. 바이트 / base64url ---------- */
  function b64u(bytes) {
    var s = ''; bytes = new Uint8Array(bytes);
    for (var i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function unb64u(str) {
    str = String(str).replace(/-/g, '+').replace(/_/g, '/');
    while (str.length % 4) str += '=';
    var bin = atob(str), out = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  function hex(bytes) {
    return Array.prototype.map.call(new Uint8Array(bytes), function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
  }

  /* ---------- 3. 암호 ----------
     data/k.json : { v:1, keys: { kid: b64u(iv12 + AES-GCM(링크키, 데이터키)) } }
     data/c.bin  : iv12 + AES-GCM(데이터키, JSON)
     data/i/*.bin: iv12 + AES-GCM(데이터키, 이미지)                          */
  var subtle = global.crypto && global.crypto.subtle;
  function aesKey(raw, usages) { return subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, usages || ['decrypt']); }
  function decryptBuf(key, buf) {
    var u = new Uint8Array(buf);
    return subtle.decrypt({ name: 'AES-GCM', iv: u.subarray(0, 12) }, key, u.subarray(12));
  }
  async function keyId(rawLinkKey) {
    return hex(await subtle.digest('SHA-256', rawLinkKey)).slice(0, 16);
  }

  function linkKeyFromUrl() {
    var m = location.hash.match(/(?:^#|&)k=([A-Za-z0-9_-]{16,})/);
    if (m) { try { sessionStorage.setItem('pf:k', m[1]); } catch (e) {} return m[1]; }
    try { return sessionStorage.getItem('pf:k'); } catch (e) { return null; }
  }

  /* ---------- 4. 데이터 열기 ---------- */
  var state = { mode: null, content: null, images: {}, base: '', dataKey: null, cache: {}, pdf: null, k: null };

  function isLocal() { return /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname); }

  function PFError(code, msg) { var e = new Error(msg); e.code = code; return e; }

  async function open() {
    // (a) 편집기가 페이지에 직접 넣어준 데이터 (PDF 만들기용)
    if (global.__PF__) {
      state.mode = 'inline'; state.content = global.__PF__.content; state.base = global.__PF__.base || '/content/';
      state.map = global.__PF__.map || {};
      return state;
    }
    // (b) 편집기 미리보기 — 로컬에서만
    if (isLocal() && /[?&]preview\b/.test(location.search)) {
      var r = await fetch('/api/content', { cache: 'no-store' });
      if (!r.ok) throw PFError('preview', '편집기 서버에서 내용을 읽지 못했습니다.');
      var j = await r.json();
      state.mode = 'preview'; state.content = j.content; state.base = '/content/';
      return state;
    }
    // (c) 배포본 — 링크 속 키로 복호화
    if (!subtle) throw PFError('nocrypto', '이 브라우저는 보안 연결(https)에서만 열 수 있습니다.');
    var k = linkKeyFromUrl();
    if (!k) throw PFError('nokey', '열람 키가 없는 주소입니다.');
    var raw;
    try { raw = unb64u(k); } catch (e) { throw PFError('badkey', '주소의 열람 키가 올바르지 않습니다.'); }
    var kr = await fetch('data/k.json', { cache: 'no-store' });
    if (!kr.ok) throw PFError('nodata', '배포된 데이터를 찾지 못했습니다.');
    var keys = (await kr.json()).keys || {};
    var wrapped = keys[await keyId(raw)];
    if (!wrapped) { try { sessionStorage.removeItem('pf:k'); } catch (e) {} throw PFError('revoked', '만료되었거나 올바르지 않은 링크입니다.'); }
    var linkKey = await aesKey(raw);
    var dataRaw = await decryptBuf(linkKey, unb64u(wrapped));
    state.dataKey = await aesKey(dataRaw);
    var cr = await fetch('data/c.bin', { cache: 'no-store' });
    var bundle = JSON.parse(new TextDecoder().decode(await decryptBuf(state.dataKey, await cr.arrayBuffer())));
    state.mode = 'sealed'; state.content = bundle.content; state.images = bundle.images || {}; state.pdf = bundle.pdf || null;
    state.k = k;
    return state;
  }

  /* 다른 페이지로 갈 때 키를 이어 붙인다 */
  function href(page, query) {
    var q = query ? '?' + query : '';
    if (state.mode === 'preview') q = (q ? q + '&' : '?') + 'preview';
    return page + q + (state.k ? '#k=' + state.k : '');
  }

  /* ---------- 5. 이미지 ---------- */
  async function imageUrl(path) {
    if (!path) return '';
    if (state.map && state.map[path]) return state.map[path];
    if (state.mode !== 'sealed') return state.base + path.split('/').map(encodeURIComponent).join('/');
    if (state.cache[path]) return state.cache[path];
    var meta = state.images[path];
    if (!meta) return '';
    state.cache[path] = (async function () {
      var r = await fetch('data/i/' + meta.f + '.bin');
      var plainBuf = await decryptBuf(state.dataKey, await r.arrayBuffer());
      return URL.createObjectURL(new Blob([plainBuf], { type: meta.t || 'image/webp' }));
    })();
    return state.cache[path];
  }
  function imgMeta(path) { return state.images[path] || null; }

  /* <img data-pf="경로"> 를 실제 주소로 바꾼다. eager=true 면 전부 즉시(인쇄용) */
  function hydrate(root, eager) {
    var imgs = $all('img[data-pf]', root);
    function load(img) {
      var p = img.getAttribute('data-pf'); img.removeAttribute('data-pf');
      return imageUrl(p).then(function (u) {
        if (!u) { img.classList.add('is-missing'); return; }
        return new Promise(function (res) {
          img.onload = img.onerror = function () { img.classList.add('is-loaded'); res(); };
          img.src = u;
        });
      }).catch(function () { img.classList.add('is-missing'); });
    }
    if (eager || !('IntersectionObserver' in global)) return Promise.all(imgs.map(load));
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { io.unobserve(en.target); load(en.target); } });
    }, { rootMargin: '600px 0px' });
    imgs.forEach(function (img) { io.observe(img); });
    return Promise.resolve();
  }
  function img(path, alt, cls) {
    return '<img data-pf="' + esc(path) + '" alt="' + esc(alt || '') + '"' + (cls ? ' class="' + cls + '"' : '') + ' decoding="async">';
  }

  /* ---------- 6. 슬라이더 ---------- */
  var sliders = [];
  function slider(images, opts) {
    opts = opts || {};
    if (!images || !images.length) return '';
    var many = images.length > 1;
    return '<div class="slider-box' + (opts.cls ? ' ' + opts.cls : '') + '" data-slider data-interval="' + (+opts.interval || 4000) + '">' +
      '<div class="slider" aria-roledescription="carousel" aria-label="' + esc(opts.label || '이미지') + '">' +
      '<div class="slider__track">' + images.map(function (p, i) {
        return '<div class="slider__slide">' + img(p, (opts.label || '이미지') + ' ' + (i + 1)) + '</div>';
      }).join('') + '</div>' +
      (many ? '<button class="slider__arrow slider__arrow--prev" type="button" aria-label="이전 이미지"></button>' +
              '<button class="slider__arrow slider__arrow--next" type="button" aria-label="다음 이미지"></button>' : '') +
      '</div>' + (many ? '<div class="slider__dots"></div>' : '') + '</div>';
  }
  function initSliders(root) {
    sliders.forEach(function (s) { s.stop(); }); sliders = [];
    $all('[data-slider]', root).forEach(function (box) {
      var sl = $('.slider', box), track = $('.slider__track', box), dotsBox = $('.slider__dots', box);
      var total = track.children.length, interval = +box.getAttribute('data-interval') || 4000;
      if (total <= 1) return;
      var index = 0, timer = null, dots = [];
      for (var i = 0; i < total; i++) (function (n) {
        var d = document.createElement('button'); d.type = 'button'; d.className = 'slider__dot';
        d.setAttribute('aria-label', (n + 1) + '번 이미지 보기');
        d.addEventListener('click', function () { go(n); start(); });
        dotsBox.appendChild(d); dots.push(d);
      })(i);
      function go(n) {
        index = (n + total) % total;
        track.style.transform = 'translateX(' + (-index * 100) + '%)';
        dots.forEach(function (d, j) { d.classList.toggle('is-active', j === index); });
      }
      function start() { stop(); timer = setInterval(function () { go(index + 1); }, interval); }
      function stop() { if (timer) { clearInterval(timer); timer = null; } }
      $('.slider__arrow--prev', box).addEventListener('click', function () { go(index - 1); start(); });
      $('.slider__arrow--next', box).addEventListener('click', function () { go(index + 1); start(); });
      sl.addEventListener('mouseenter', stop); sl.addEventListener('mouseleave', start);
      var sx = 0, moved = false;
      sl.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; moved = false; stop(); }, { passive: true });
      sl.addEventListener('touchmove', function () { moved = true; }, { passive: true });
      sl.addEventListener('touchend', function (e) {
        var diff = e.changedTouches[0].clientX - sx;
        if (moved && Math.abs(diff) > 50) go(diff < 0 ? index + 1 : index - 1);
        start();
      });
      go(0); start();
      sliders.push({ start: start, stop: stop });
    });
  }
  document.addEventListener('visibilitychange', function () {
    sliders.forEach(function (s) { document.hidden ? s.stop() : s.start(); });
  });

  /* ---------- 7. 공용 조각 ---------- */
  function visibleProjects(c, tier) {
    return (c.projects || []).filter(function (p) { return !p.hidden && (!tier || p.tier === tier); });
  }
  function hasDetail(p) {
    var d = p.detail || {};
    return !!((d.sections && d.sections.length) || (d.insights && d.insights.length) || (d.intro && d.intro.trim()));
  }
  function tags(list) {
    list = (list || []).filter(Boolean);
    return list.length ? '<ul class="tags">' + list.map(function (t) { return '<li class="tag">' + esc(t) + '</li>'; }).join('') + '</ul>' : '';
  }
  function links(list, cls) {
    list = (list || []).filter(function (l) { return l && l.label && safeUrl(l.url); });
    if (!list.length) return '';
    return '<div class="' + (cls || 'project__links') + '">' + list.map(function (l) {
      return '<a class="link-arrow" href="' + esc(safeUrl(l.url)) + '" target="_blank" rel="noopener">' + esc(l.label) + ' <span>→</span></a>';
    }).join('') + '</div>';
  }
  function notice(c, p, cls) {
    if (!p.replica || !p.replica.is) return '';
    var t = (p.replica.text || '').trim() || (c.texts && c.texts.replicaNotice) || '';
    return t ? '<p class="' + cls + '">' + line(t) + '</p>' : '';
  }
  function applyTheme(c) {
    var a = c.site && c.site.accent;
    if (a && /^#[0-9a-f]{6}$/i.test(a)) document.documentElement.style.setProperty('--primary', a);
  }
  function setMeta(c, suffix) {
    var s = c.site || {};
    document.title = (suffix ? suffix + ' | ' : '') + (s.title || s.name || 'Portfolio');
    if (s.favicon) imageUrl(s.favicon).then(function (u) {
      if (!u) return;
      var l = $('link[rel="icon"]') || document.head.appendChild(Object.assign(document.createElement('link'), { rel: 'icon' }));
      l.href = u;
    });
  }

  /* 열람 실패 화면 */
  function lockScreen(err) {
    var msg = {
      nokey: '이 포트폴리오는 링크를 받은 분만 열람할 수 있습니다.',
      badkey: '링크가 손상되었습니다. 받은 링크 전체를 다시 복사해 열어 주세요.',
      revoked: '만료되었거나 올바르지 않은 링크입니다.',
      nocrypto: '보안 연결(https)에서만 열 수 있습니다.',
    }[err && err.code] || '내용을 불러오지 못했습니다.';
    document.body.innerHTML = '<main class="lock"><div class="lock__box"><div class="lock__icon" aria-hidden="true"></div>' +
      '<h1 class="lock__title">비공개 포트폴리오</h1><p class="lock__msg">' + esc(msg) + '</p>' +
      (err && err.code === 'preview' ? '<p class="lock__sub">' + esc(err.message) + '</p>' : '') + '</div></main>';
    document.body.className = 'is-locked';
  }

  /* 편집기 실시간 미리보기: 부모 창이 보내는 내용으로 다시 그림 */
  function onLiveUpdate(render) {
    if (state.mode !== 'preview') return;
    global.addEventListener('message', function (e) {
      if (e.origin !== location.origin || !e.data) return;
      if (e.data.type === 'pf:content') { state.content = e.data.content; render(state.content, true); }
      if (e.data.type === 'pf:focus' && e.data.target) {
        var el = document.getElementById(e.data.target) || $('[data-anchor="' + e.data.target + '"]');
        // scrollIntoView 는 편집기(부모 창)까지 스크롤하므로 이 창만 직접 이동
        if (el) global.scrollTo({ top: el.getBoundingClientRect().top + global.scrollY - 88, behavior: 'smooth' });
      }
    });
    try { global.parent.postMessage({ type: 'pf:ready', page: document.body.getAttribute('data-page') }, location.origin); } catch (e) {}
  }

  global.PF = {
    esc: esc, safeUrl: safeUrl, inline: inline, line: line, block: block, point: point, plain: plain,
    open: open, href: href, state: state, imageUrl: imageUrl, imgMeta: imgMeta, hydrate: hydrate, img: img,
    slider: slider, initSliders: initSliders, visibleProjects: visibleProjects, hasDetail: hasDetail,
    tags: tags, links: links, notice: notice, applyTheme: applyTheme, setMeta: setMeta, lockScreen: lockScreen,
    onLiveUpdate: onLiveUpdate, $: $, $all: $all, b64u: b64u, unb64u: unb64u, hex: hex
  };
})(window);
