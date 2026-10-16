/* detail.js — 세부 기술 및 문제 해결 과정 (detail.html?p=프로젝트ID) */
(function () {
  'use strict';
  var esc = PF.esc, line = PF.line, block = PF.block;

  function pid() { var m = location.search.match(/[?&]p=([^&]+)/); return m ? decodeURIComponent(m[1]) : ''; }

  function figures(list) {
    list = (list || []).filter(function (f) { return f && f.src; });
    if (!list.length) return '';
    return '<div class="dt-figs dt-figs--' + Math.min(list.length, 2) + '">' + list.map(function (f) {
      return '<figure class="dt-fig"><button type="button" class="dt-fig__btn" data-zoom aria-label="이미지 크게 보기">' + PF.img(f.src, f.caption || '') + '</button>' +
        (f.caption ? '<figcaption>' + PF.inline(f.caption) + '</figcaption>' : '') + '</figure>';
    }).join('') + '</div>';
  }

  var PCS = [
    ['problem', 'Problem', '문제'], ['cause', 'Cause', '원인'], ['solution', 'Solution', '해결'], ['result', 'Result', '결과'],
  ];

  function section(c, s, i) {
    var t = c.texts || {};
    var isTrouble = s.type === 'trouble';
    var head = '<div class="dt-sec__head"><span class="dt-sec__num">' + ('0' + (i + 1)).slice(-2) + '</span>' +
      '<span class="dt-badge dt-badge--' + (isTrouble ? 'trouble' : 'tech') + '">' + esc(isTrouble ? (t.troubleLabel || '문제 해결') : (t.techLabel || '구현 기술')) + '</span>' +
      '<h2 class="dt-sec__title">' + PF.inline(s.title) + '</h2></div>';
    var body = '';
    if (isTrouble) {
      var rows = PCS.filter(function (k) { return (s[k[0]] || '').trim(); });
      body += rows.length ? '<dl class="dt-pcs">' + rows.map(function (k) {
        return '<div class="dt-pcs__row dt-pcs__row--' + k[0] + '"><dt>' + k[1] + '<small>' + k[2] + '</small></dt><dd class="md">' + block(s[k[0]]) + '</dd></div>';
      }).join('') + '</dl>' : '';
    }
    if ((s.body || '').trim()) body += '<div class="md dt-sec__body">' + block(s.body) + '</div>';
    body += figures(s.images);
    return '<section class="dt-sec" id="s-' + (i + 1) + '" data-anchor="sec-' + i + '">' + head + body + '</section>';
  }

  function render(c, live) {
    var t = c.texts || {};
    var all = PF.visibleProjects(c).filter(PF.hasDetail);
    var id = pid();
    var p = (c.projects || []).filter(function (x) { return x.id === id; })[0];
    PF.applyTheme(c);
    var app = document.getElementById('app');
    var s = c.site || {};
    var top = '<header class="header"><div class="container header__inner">' +
      '<a class="logo" href="' + esc(PF.href('index.html')) + '"><span class="logo__name">' + esc(s.name) + '</span><span class="logo__role">' + esc(s.role) + '</span></a>' +
      '<nav class="nav nav--always"><a class="nav__link" href="' + esc(PF.href('index.html')) + '">← 포트폴리오</a></nav></div></header>';
    if (!p) {
      app.innerHTML = top + '<main class="dt-empty container"><p>해당 프로젝트를 찾을 수 없습니다.</p></main>';
      return;
    }
    PF.setMeta(c, p.title + ' · ' + (t.detailTitle || '세부 기술 및 문제 해결 과정'));
    var d = p.detail || {}, secs = d.sections || [], ins = (d.insights || []).filter(function (x) { return x.keyword || x.text; });
    var toc = secs.map(function (x, i) {
      return '<li><a href="#s-' + (i + 1) + '" class="dt-toc__link"><span class="dt-toc__dot dt-toc__dot--' + (x.type === 'trouble' ? 'trouble' : 'tech') + '"></span>' + esc(PF.plain(x.title) || ('항목 ' + (i + 1))) + '</a></li>';
    }).join('') + (ins.length ? '<li><a href="#insights" class="dt-toc__link"><span class="dt-toc__dot"></span>' + esc(t.insightsTitle || '배운 점') + '</a></li>' : '');

    var idx = all.indexOf(p);
    var prev = idx > 0 ? all[idx - 1] : null, next = idx >= 0 && idx < all.length - 1 ? all[idx + 1] : null;
    function navCard(x, dir) {
      if (!x) return '<span></span>';
      return '<a class="dt-pager__item dt-pager__item--' + dir + '" href="' + esc(PF.href('detail.html', 'p=' + encodeURIComponent(x.id))) + '">' +
        '<small>' + (dir === 'prev' ? '← 이전 프로젝트' : '다음 프로젝트 →') + '</small><strong>' + esc(x.title) + '</strong></a>';
    }

    app.innerHTML = top +
      '<main class="dt">' +
        '<section class="dt-hero"><div class="container">' +
          '<p class="dt-hero__eyebrow">' + esc(t.detailTitle || '세부 기술 및 문제 해결 과정') + '</p>' +
          '<h1 class="dt-hero__title">' + esc(p.title) + '</h1>' +
          '<p class="dt-hero__meta">' + [p.period, p.role].filter(Boolean).map(esc).join('<span>·</span>') + '</p>' +
          PF.tags(p.tags) + PF.links(p.links, 'project__links') +
        '</div></section>' +
        '<div class="container dt-layout">' +
          (toc ? '<aside class="dt-toc"><p class="dt-toc__title">목차</p><ol>' + toc + '</ol></aside>' : '') +
          '<article class="dt-body">' +
            ((d.intro || '').trim() ? '<div class="md dt-intro">' + block(d.intro) + '</div>' : '') +
            secs.map(function (x, i) { return section(c, x, i); }).join('') +
            (ins.length ? '<section class="dt-sec dt-insights" id="insights" data-anchor="insights"><div class="dt-sec__head"><h2 class="dt-sec__title">' + esc(t.insightsTitle || '배운 점') + '</h2></div>' +
              '<ul class="dt-insights__list">' + ins.map(function (x) {
                return '<li>' + (x.keyword ? '<strong>' + esc(x.keyword) + '</strong>' : '') + '<div class="md">' + block(x.text) + '</div></li>';
              }).join('') + '</ul></section>' : '') +
            ((prev || next) ? '<nav class="dt-pager">' + navCard(prev, 'prev') + navCard(next, 'next') + '</nav>' : '') +
          '</article>' +
        '</div>' +
      '</main>' +
      '<footer class="footer footer--slim"><div class="container"><p class="footer__copy">' + PF.inline(s.footer) + '</p></div></footer>' +
      '<div class="lightbox" hidden><button type="button" class="lightbox__close" aria-label="닫기">×</button><img alt=""></div>';
    PF.hydrate(app);
    spy();
    if (!live) window.scrollTo(0, 0);
    document.body.classList.add('is-ready');
  }

  /* 목차: 현재 읽는 위치 표시 */
  var io;
  function spy() {
    if (io) io.disconnect();
    var links = PF.$all('.dt-toc__link');
    if (!links.length || !('IntersectionObserver' in window)) return;
    io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        links.forEach(function (l) { l.classList.toggle('is-active', l.getAttribute('href') === '#' + en.target.id); });
      });
    }, { rootMargin: '-30% 0px -60% 0px' });
    PF.$all('.dt-sec').forEach(function (s) { io.observe(s); });
  }

  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (a) {
      var el = document.getElementById(a.getAttribute('href').slice(1));
      if (el) { e.preventDefault(); el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
      return;
    }
    var z = e.target.closest && e.target.closest('[data-zoom]');
    var lb = document.querySelector('.lightbox');
    if (z && lb) {
      var im = z.querySelector('img');
      if (!im || !im.src) return;
      lb.querySelector('img').src = im.src; lb.querySelector('img').alt = im.alt; lb.hidden = false;
      return;
    }
    if (lb && !lb.hidden && (e.target === lb || e.target.closest('.lightbox__close'))) lb.hidden = true;
  });
  document.addEventListener('keydown', function (e) {
    var lb = document.querySelector('.lightbox');
    if (e.key === 'Escape' && lb) lb.hidden = true;
  });

  PF.open().then(function (st) { render(st.content); PF.onLiveUpdate(render); }).catch(PF.lockScreen);
})();
