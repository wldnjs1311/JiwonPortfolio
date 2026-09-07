/* ============================================================
   1. 모바일 네비게이션 토글
   ============================================================ */
(function () {
  var toggle = document.getElementById('navToggle');
  var nav = document.getElementById('nav');
  if (!toggle || !nav) return;

  toggle.addEventListener('click', function () {
    var isOpen = nav.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', String(isOpen));
    toggle.setAttribute('aria-label', isOpen ? '메뉴 닫기' : '메뉴 열기');
  });

  // 메뉴 항목 클릭 시 닫기
  nav.addEventListener('click', function (e) {
    if (e.target.closest('.nav__link')) {
      nav.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', '메뉴 열기');
    }
  });
})();


/* ============================================================
   2. 프로젝트 상세 토글 (트러블 슈팅 / 배운 점)
   ============================================================ */
(function () {
  var toggles = document.querySelectorAll('.project__toggle');
  if (!toggles.length) return;

  Array.prototype.forEach.call(toggles, function (btn) {
    var panel = document.getElementById(btn.getAttribute('aria-controls'));
    if (!panel) return;

    var label = btn.querySelector('.project__toggle-text');
    // 펼치기 문구는 HTML에 적힌 값을 그대로 사용 (문구를 바꿔도 JS 수정 불필요)
    var openText = label ? label.textContent.trim() : '';
    var closeText = '접기';

    btn.addEventListener('click', function () {
      var willOpen = btn.getAttribute('aria-expanded') !== 'true';

      if (willOpen) {
        panel.hidden = false;
        // hidden 해제 직후 트랜지션이 걸리도록 다음 프레임에 클래스 추가
        requestAnimationFrame(function () {
          requestAnimationFrame(function () { panel.classList.add('is-open'); });
        });
      } else {
        panel.classList.remove('is-open');
        // 접히는 애니메이션이 끝난 뒤 hidden 처리
        setTimeout(function () {
          if (!panel.classList.contains('is-open')) panel.hidden = true;
        }, 350);
      }

      btn.setAttribute('aria-expanded', String(willOpen));
      if (label) label.textContent = willOpen ? closeText : openText;
    });
  });
})();


/* ============================================================
   3. 이미지 슬라이더 (히어로 / 프로젝트 공용)
   - data-slider 가 붙은 요소를 자동으로 슬라이더로 만듦
   - data-interval="4000" 으로 전환 간격(ms) 지정 (기본 4000)
   - 마우스를 올리면 일시정지, 점·화살표로 직접 이동, 터치 스와이프 지원
   슬라이드를 추가하려면 HTML의 .slider__slide 한 줄을 복사하면 됩니다.
   점과 화살표는 슬라이드 개수에 맞춰 자동으로 생성·표시됩니다.
   ============================================================ */
(function () {

  function initSlider(box) {
    var slider  = box.querySelector('.slider');
    var track   = box.querySelector('.slider__track');
    var dotsBox = box.querySelector('.slider__dots');
    var prevBtn = box.querySelector('.slider__arrow--prev');
    var nextBtn = box.querySelector('.slider__arrow--next');
    if (!slider || !track) return;

    var total = track.children.length;
    var interval = parseInt(box.getAttribute('data-interval'), 10) || 4000;

    // 슬라이드가 1장뿐이면 조작 UI를 숨기고 종료
    if (total <= 1) {
      if (dotsBox) dotsBox.style.display = 'none';
      if (prevBtn) prevBtn.style.display = 'none';
      if (nextBtn) nextBtn.style.display = 'none';
      return;
    }

    if (prevBtn) prevBtn.style.display = 'block';
    if (nextBtn) nextBtn.style.display = 'block';

    var index = 0;
    var timer = null;
    var dots = [];

    // --- 점(dot) 생성 ---
    if (dotsBox) {
      for (var i = 0; i < total; i++) {
        var dot = document.createElement('button');
        dot.className = 'slider__dot';
        dot.type = 'button';
        dot.setAttribute('aria-label', (i + 1) + '번 이미지 보기');
        (function (n) {
          dot.addEventListener('click', function () { go(n); start(); });
        })(i);
        dotsBox.appendChild(dot);
        dots.push(dot);
      }
    }

    function go(n) {
      index = (n + total) % total;
      track.style.transform = 'translateX(' + (-index * 100) + '%)';
      for (var i = 0; i < dots.length; i++) {
        dots[i].classList.toggle('is-active', i === index);
      }
    }

    function next() { go(index + 1); }
    function start() { stop(); timer = setInterval(next, interval); }
    function stop()  { if (timer) { clearInterval(timer); timer = null; } }

    // --- 화살표 ---
    if (prevBtn) prevBtn.addEventListener('click', function () { go(index - 1); start(); });
    if (nextBtn) nextBtn.addEventListener('click', function () { go(index + 1); start(); });

    // --- 마우스를 올리면 멈춤 ---
    slider.addEventListener('mouseenter', stop);
    slider.addEventListener('mouseleave', start);

    // --- 터치 스와이프 ---
    var startX = 0, moved = false;
    slider.addEventListener('touchstart', function (e) {
      startX = e.touches[0].clientX; moved = false; stop();
    }, { passive: true });
    slider.addEventListener('touchmove', function () { moved = true; }, { passive: true });
    slider.addEventListener('touchend', function (e) {
      var diff = e.changedTouches[0].clientX - startX;
      if (moved && Math.abs(diff) > 50) go(diff < 0 ? index + 1 : index - 1);
      start();
    });

    go(0);
    start();

    return { stop: stop, start: start };
  }

  var boxes = document.querySelectorAll('[data-slider]');
  var instances = [];
  Array.prototype.forEach.call(boxes, function (box) {
    var inst = initSlider(box);
    if (inst) instances.push(inst);
  });

  // 다른 탭으로 이동하면 전부 멈춤 (불필요한 동작 방지)
  document.addEventListener('visibilitychange', function () {
    instances.forEach(function (s) { document.hidden ? s.stop() : s.start(); });
  });
})();
