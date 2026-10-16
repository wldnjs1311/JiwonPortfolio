/* web.js — 메인 웹 페이지(index.html) */
(function () {
  'use strict';
  var esc = PF.esc, line = PF.line, inline = PF.inline;

  function header(c) {
    var s = c.site || {};
    return '<header class="header" id="header"><div class="container header__inner">' +
      '<a class="logo" href="#hero"><span class="logo__name">' + esc(s.name) + '</span><span class="logo__role">' + esc(s.role) + '</span></a>' +
      '<nav class="nav" id="nav">' +
        '<a class="nav__link" href="#about">' + esc(c.about.title || 'About') + '</a>' +
        '<a class="nav__link" href="#skills">' + esc(c.skills.title || 'Skills') + '</a>' +
        '<a class="nav__link" href="#projects">' + esc(c.projectsSection.title || 'Projects') + '</a>' +
      '</nav>' +
      '<button class="nav-toggle" id="navToggle" type="button" aria-label="메뉴 열기" aria-expanded="false"><span></span><span></span><span></span></button>' +
      '</div></header>';
  }

  function hero(c) {
    var h = c.hero || {};
    var btns = (h.buttons || []).filter(function (b) { return b.enabled !== false && b.label && PF.safeUrl(b.url); });
    return '<section class="hero" id="hero"><div class="container hero__inner">' +
      '<div class="hero__text"><h1 class="hero__title">' + line(h.title) + '</h1>' +
      '<p class="hero__desc">' + line(h.desc) + '</p>' +
      (btns.length ? '<div class="hero__actions">' + btns.map(function (b, i) {
        return '<a class="btn ' + (i ? 'btn--secondary' : 'btn--primary') + '" href="' + esc(PF.safeUrl(b.url)) + '" target="_blank" rel="noopener">' + esc(b.label) + '</a>';
      }).join('') + '</div>' : '') + '</div>' +
      '<div class="hero__visual">' + PF.slider(h.images, { cls: 'slider-box--hero', interval: h.interval, label: '대표 이미지' }) + '</div>' +
      '</div></section>';
  }

  function about(c) {
    var a = c.about || {};
    var strengths = a.strengths || [];
    return '<section class="section" id="about"><div class="container">' +
      '<h2 class="section__title">' + esc(a.title || 'About') + '</h2>' +
      '<div class="about">' +
        (a.photo ? '<div class="about__photo">' + PF.img(a.photo, '프로필 사진') + '</div>' : '') +
        '<div class="about__body">' +
          '<p class="about__text">' + line(a.intro) + '</p>' +
          ((a.meta || []).length ? '<ul class="about__meta">' + a.meta.map(function (m) {
            return '<li><span class="about__meta-label">' + esc(m.label) + '</span> ' + inline(m.value) + '</li>';
          }).join('') + '</ul>' : '') +
          ((a.history || []).length ? '<h3 class="about__sub">' + esc(a.historyTitle || '이력') + '</h3><ul class="history">' + a.history.map(function (h) {
            return '<li class="history__item"><span class="history__date">' + esc(h.date) + '</span><span class="history__desc">' + inline(h.desc) + '</span></li>';
          }).join('') + '</ul>' : '') +
        '</div>' +
      '</div>' +
      (strengths.length ? '<div class="block-head" data-anchor="strengths"><h3 class="block-head__title">' + esc(a.strengthsTitle || '핵심 강점') + '</h3>' +
        (a.strengthsHint ? '<p class="block-head__hint block-head__hint--hover">' + esc(a.strengthsHint) + '</p>' : '') + '</div>' +
        '<ul class="strengths">' + strengths.map(function (s, i) {
          return '<li class="strength" tabindex="0"><div class="strength__front"><span class="strength__num">' + ('0' + (i + 1)).slice(-2) + '</span>' +
            '<span class="strength__key">' + esc(s.key) + '</span><span class="strength__lead">' + esc(s.lead) + '</span></div>' +
            '<div class="strength__back"><p>' + inline(s.desc) + '</p></div></li>';
        }).join('') + '</ul>' : '') +
      '</div></section>';
  }

  function skills(c) {
    var s = c.skills || {};
    return '<section class="section section--alt" id="skills"><div class="container">' +
      '<h2 class="section__title">' + esc(s.title || 'Skills') + '</h2>' +
      (s.subtitle ? '<p class="section__subtitle">' + inline(s.subtitle) + '</p>' : '') +
      '<div class="skills">' + (s.groups || []).map(function (g) {
        return '<div class="skill-group"><h3 class="skill-group__title">' + esc(g.title) + '</h3><ul class="skill-list">' +
          (g.items || []).map(function (it) {
            return '<li class="skill">' + (it.icon ? PF.img(it.icon, '', 'skill__icon') : '<span class="skill__icon skill__icon--blank"></span>') +
              '<div class="skill__body"><span class="skill__name">' + esc(it.name) + '</span><span class="skill__desc">' + inline(it.desc) + '</span></div></li>';
          }).join('') + '</ul></div>';
      }).join('') + '</div></div></section>';
  }

  function detailButton(c, p, small) {
    if (!PF.hasDetail(p)) return '';
    var label = (c.texts && c.texts.detailButton) || '세부 기술 및 문제 해결 과정';
    var url = esc(PF.href('detail.html', 'p=' + encodeURIComponent(p.id)));
    return small
      ? '<a class="link-arrow mini__detail" href="' + url + '" target="_blank" rel="noopener">' + esc(label) + ' <span>↗</span></a>'
      : '<a class="btn btn--primary project__detail-btn" href="' + url + '" target="_blank" rel="noopener">' + esc(label) + ' <span class="btn__arrow" aria-hidden="true">↗</span></a>';
  }

  function mainProject(c, p) {
    return '<article class="project" id="project-' + esc(p.id) + '" data-anchor="p-' + esc(p.id) + '">' +
      '<div class="project__body">' +
        '<div class="project__head"><h3 class="project__title">' + esc(p.title) + '</h3><span class="project__period">' + esc(p.period) + '</span></div>' +
        (p.role ? '<p class="project__role">' + esc(p.role) + '</p>' : '') +
        (p.desc ? '<p class="project__desc">' + line(p.desc) + '</p>' : '') +
        ((p.points || []).length ? '<ul class="project__points">' + p.points.map(function (t) { return '<li>' + PF.point(t) + '</li>'; }).join('') + '</ul>' : '') +
        PF.tags(p.tags) +
        PF.notice(c, p, 'project__notice') +
        PF.links(p.links, 'project__links') +
        detailButton(c, p) +
      '</div>' +
      ((p.images || []).length ? '<div class="project__media">' + PF.slider(p.images, { interval: p.interval || 5000, label: p.title + ' 이미지' }) + '</div>' : '') +
      '</article>';
  }

  function miniProject(c, p) {
    var thumb = p.thumb || (p.images || [])[0];
    var meta = [p.period, p.roleShort || p.role].filter(Boolean).map(esc).join(' · ');
    var head = '<h4 class="mini__title">' + esc(p.title) + '</h4>' + (meta ? '<p class="mini__meta">' + meta + '</p>' : '');
    return '<li class="mini" tabindex="0" data-anchor="p-' + esc(p.id) + '">' +
      '<div class="mini__front">' +
        '<div class="mini__thumb">' + (thumb ? PF.img(thumb, p.title + ' 썸네일') : '') + '</div>' +
        '<div class="mini__body">' + head + (p.desc ? '<p class="mini__desc">' + esc(PF.plain(p.desc)) + '</p>' : '') + PF.tags(p.tags) + PF.links(p.links, 'mini__links') + '</div>' +
      '</div>' +
      '<div class="mini__back"><div class="mini__back-inner">' + head +
        (p.desc ? '<p class="mini__desc mini__desc--full">' + line(p.desc) + '</p>' : '') +
        ((p.points || []).length ? '<ul class="mini__points">' + p.points.map(function (t) { return '<li>' + PF.point(t) + '</li>'; }).join('') + '</ul>' : '') +
        PF.notice(c, p, 'mini__notice') + PF.tags(p.tags) +
        '<div class="mini__links">' + (PF.links(p.links, 'mini__links-inner') || '') + detailButton(c, p, true) + '</div>' +
      '</div></div></li>';
  }

  function projects(c) {
    var s = c.projectsSection || {};
    var mains = PF.visibleProjects(c, 'main'), minis = PF.visibleProjects(c, 'mini');
    return '<section class="section" id="projects"><div class="container">' +
      '<h2 class="section__title">' + esc(s.title || 'Projects') + '</h2>' +
      (s.subtitle ? '<p class="section__subtitle">' + inline(s.subtitle) + '</p>' : '') +
      (mains.length ? '<div class="block-head block-head--first"><h3 class="block-head__title">' + esc(s.mainTitle || '대표 프로젝트') + '</h3></div>' +
        '<div class="projects">' + mains.map(function (p) { return mainProject(c, p); }).join('') + '</div>' : '') +
      (minis.length ? '<div class="block-head" data-anchor="minis"><h3 class="block-head__title">' + esc(s.miniTitle || '기타 프로젝트') + '</h3></div>' +
        '<ul class="minis">' + minis.map(function (p) { return miniProject(c, p); }).join('') + '</ul>' : '') +
      '</div></section>';
  }

  function footer(c) {
    var s = c.site || {};
    return '<footer class="footer"><div class="container footer__inner">' +
      '<div class="footer__brand"><a class="logo logo--light" href="#hero"><span class="logo__name">' + esc(s.name) + '</span><span class="logo__role">' + esc(s.role) + '</span></a>' +
      '<p class="footer__copy">' + inline(s.footer) + '</p></div>' +
      '<nav class="footer__nav"><a href="#about">' + esc(c.about.title || 'About') + '</a><a href="#skills">' + esc(c.skills.title || 'Skills') + '</a><a href="#projects">' + esc(c.projectsSection.title || 'Projects') + '</a></nav>' +
      '</div></footer>';
  }

  function render(c, live) {
    var y = window.scrollY;
    PF.applyTheme(c); PF.setMeta(c);
    var app = document.getElementById('app');
    app.innerHTML = header(c) + '<main>' + hero(c) + about(c) + skills(c) + projects(c) + '</main>' + footer(c);
    PF.hydrate(app); PF.initSliders(app);
    var toggle = document.getElementById('navToggle'), nav = document.getElementById('nav');
    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', String(open));
    });
    nav.addEventListener('click', function (e) { if (e.target.closest('.nav__link')) nav.classList.remove('is-open'); });
    if (live) window.scrollTo(0, y);
    document.body.classList.add('is-ready');
  }

  /* 페이지 안 이동(#about 등)이 주소창의 열람 키(#k=…)를 덮어쓰지 않도록 직접 스크롤 */
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a) return;
    var id = a.getAttribute('href').slice(1);
    var el = id && document.getElementById(id);
    if (!el) return;
    e.preventDefault();
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  PF.open().then(function (st) {
    render(st.content);
    if (location.hash && /^#[a-z]/i.test(location.hash) && !/^#k=/.test(location.hash)) {
      var el = document.querySelector(location.hash); if (el) el.scrollIntoView();
    }
    PF.onLiveUpdate(render);
  }).catch(PF.lockScreen);
})();
