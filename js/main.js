/* Naa & Kojo — page interactions
   loader → hero intro, menu, scroll-spy, guest cursors, story reveal, weekend slider,
   countdown, QR tile, RSVP form, chapter hover image, pause motion, motion.js init. */
(function () {
  var html = document.documentElement;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var paused = function () { return reduce || html.classList.contains('motion-paused'); };
  var lenis = function () { return window.JasonMotion && window.JasonMotion.lenis; };

  /* ---- Loader: wait for the 3D hero (or give up after a few seconds), then start the intro ---- */
  var started = false;
  var start = function () {
    if (started) return;
    started = true;
    var pct = $('[data-loader-pct]');
    if (pct) pct.textContent = '100%';
    setTimeout(function () {
      html.classList.add('is-loaded');
      document.dispatchEvent(new CustomEvent('kr:start'));
      if (window.ScrollTrigger) window.ScrollTrigger.refresh();
    }, reduce ? 0 : 350);
  };
  document.addEventListener('kr:ready', function () {
    if (window.ScrollTrigger) window.ScrollTrigger.refresh(); // hero height may have changed
    start();
  });
  if (reduce || !html.classList.contains('want-3d')) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
  }
  setTimeout(start, 4500);

  /* ---- Hamburger menu: a full-screen panel that grows out of the button ---- */
  var burger = $('.burger'), menu = $('#menu');
  if (burger && menu) {
    var isOpen = false, hideTimer = 0;
    var behind = $$('main, footer');
    var setMenu = function (open) {
      if (open === isOpen) return;
      isOpen = open;
      clearTimeout(hideTimer);
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      html.classList.toggle('menu-open', open);
      behind.forEach(function (el) { el.inert = open; });
      var l = lenis();
      if (open) {
        menu.hidden = false;
        menu.inert = false;
        void menu.offsetWidth; // let the closed state paint so the circle can grow
        menu.classList.add('is-open');
        if (l) l.stop();
        var first = $('.menu__nav a', menu);
        if (first) first.focus({ preventScroll: true });
      } else {
        menu.classList.remove('is-open');
        menu.inert = true;
        if (l) l.start();
        hideTimer = setTimeout(function () { menu.hidden = true; }, reduce ? 0 : 750);
      }
    };
    burger.addEventListener('click', function () { setMenu(!isOpen); });
    // Any link (in the menu or the top bar) closes it before the smooth scroll starts
    $$('#menu a, .topbar a').forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && isOpen) { setMenu(false); burger.focus(); }
    });
  }

  /* ---- Scroll-spy: orange dot beside the section in view (inside the menu) ---- */
  var spyLinks = $$('[data-spy]');
  if (spyLinks.length && 'IntersectionObserver' in window) {
    var setActive = function (id) {
      spyLinks.forEach(function (a) {
        var on = a.getAttribute('data-spy') === id;
        a.classList.toggle('is-active', on);
        if (on) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
      });
    };
    var spyIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) setActive(e.target.id); });
    }, { rootMargin: '-45% 0px -50% 0px' });
    spyLinks.forEach(function (a) { var s = document.getElementById(a.getAttribute('data-spy')); if (s) spyIO.observe(s); });
    setActive('top');
  }

  /* ---- Top-bar brand appears once the hero is behind you ---- */
  var hero = $('[data-hero]');
  if (hero) {
    var ticking = false;
    var checkHero = function () {
      ticking = false;
      html.classList.toggle('past-hero', hero.getBoundingClientRect().bottom < innerHeight * 0.35);
    };
    addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(checkHero); } }, { passive: true });
    checkHero();
  }

  /* ---- Guest cursors wander around the welcome statement ---- */
  var cursors = $$('.cursor');
  var about = $('#welcome');
  if (cursors.length && about) {
    var aboutVisible = false, raf = 0, t0 = performance.now();
    var seeds = cursors.map(function (_, i) { return { a: 0.13 + i * 0.037, b: 0.21 + i * 0.029, p: i * 1.7, r: 26 + (i % 3) * 10 }; });
    var wander = function (now) {
      raf = 0;
      if (!aboutVisible) return;
      if (!paused()) {
        var t = (now - t0) / 1000;
        cursors.forEach(function (c, i) {
          var s = seeds[i];
          var x = Math.sin(t * s.a + s.p) * s.r * 1.6 + Math.sin(t * s.b * 1.9 + s.p * 2) * s.r * 0.6;
          var y = Math.cos(t * s.b + s.p) * s.r + Math.sin(t * s.a * 2.3 + s.p) * s.r * 0.4;
          c.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0)';
        });
      }
      raf = requestAnimationFrame(wander);
    };
    if (!reduce && 'IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        aboutVisible = entries[0].isIntersecting;
        if (aboutVisible && !raf) raf = requestAnimationFrame(wander);
      }).observe(about);
    }
  }

  /* ---- Live countdown tile ---- */
  $$('[data-countdown]').forEach(function (el) {
    var target = new Date(el.getAttribute('data-countdown')).getTime();
    var cells = {};
    $$('[data-unit]', el).forEach(function (b) { cells[b.getAttribute('data-unit')] = b; });
    var pad = function (n) { return String(n).padStart(2, '0'); };
    var tick = function () {
      var ms = Math.max(0, target - Date.now());
      cells.d.textContent = Math.floor(ms / 864e5);
      cells.h.textContent = pad(Math.floor(ms / 36e5) % 24);
      cells.m.textContent = pad(Math.floor(ms / 6e4) % 60);
      cells.s.textContent = pad(Math.floor(ms / 1e3) % 60);
    };
    tick();
    setInterval(tick, 1000);
  });

  /* ---- Decorative QR code (deterministic pattern with finder squares) ---- */
  var qr = $('.qr');
  if (qr) {
    var N = 25, seed = 20270417, cells = '';
    var rnd = function () { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
    var inFinder = function (x, y) {
      return [[0, 0], [N - 7, 0], [0, N - 7]].some(function (o) { return x >= o[0] - 1 && x < o[0] + 8 && y >= o[1] - 1 && y < o[1] + 8; });
    };
    for (var y = 0; y < N; y++) for (var x = 0; x < N; x++) {
      if (inFinder(x, y)) continue;
      if (rnd() > 0.52) cells += '<rect x="' + x + '" y="' + y + '" width="1" height="1"/>';
    }
    var finder = function (fx, fy) {
      return '<rect x="' + fx + '" y="' + fy + '" width="7" height="7"/><rect x="' + (fx + 1) + '" y="' + (fy + 1) + '" width="5" height="5" fill="#f0e8d6"/><rect x="' + (fx + 2) + '" y="' + (fy + 2) + '" width="3" height="3"/>';
    };
    qr.innerHTML = '<svg viewBox="0 0 ' + N + ' ' + N + '" shape-rendering="crispEdges" fill="currentColor">' + cells + finder(0, 0) + finder(N - 7, 0) + finder(0, N - 7) + '</svg>';
  }

  /* ---- Weekend slider ----
     The new photo wipes up over the previous one. transitions.js can take over
     navigation (window.NKCases.nav) so the buttons scroll the pinned section. */
  var cases = $$('[data-case]'), caseImgs = $$('[data-case-img]'), caseNum = $('[data-case-num]'), caseBar = $('[data-case-bar]');
  if (cases.length) {
    var current = 0;
    var show = function (i) {
      i = (i + cases.length) % cases.length;
      if (i === current && cases[i].classList.contains('is-active')) return;
      var old = current;
      current = i;
      cases.forEach(function (c, k) { var on = k === current; c.hidden = !on; c.classList.toggle('is-active', on); });
      caseImgs.forEach(function (im, k) {
        im.classList.toggle('is-prev', k === old && k !== current);
        im.classList.toggle('is-active', k === current);
      });
      if (caseNum) caseNum.textContent = current + 1;
      if (caseBar && !window.NKCases.scrubbing) caseBar.style.setProperty('--bar', ((current + 1) / cases.length).toFixed(4));
    };
    window.NKCases = { show: show, count: cases.length, current: function () { return current; }, nav: null, scrubbing: false };
    var go = function (i) { if (window.NKCases.nav) window.NKCases.nav((i + cases.length) % cases.length); else show(i); };
    var prev = $('[data-case-prev]'), next = $('[data-case-next]');
    if (prev) prev.addEventListener('click', function () { go(current - 1); });
    if (next) next.addEventListener('click', function () { go(current + 1); });
  }

  /* ---- RSVP form (front end only: shows a thank-you, nothing is sent yet) ---- */
  var form = $('[data-rsvp]'), done = $('[data-rsvp-done]');
  if (form && done) {
    var err = $('[data-rsvp-error]', form);
    var nameField = $('#rsvp-name', form);
    var ifYes = $$('[data-if-yes]', form);
    var momentNames = { Traditional: 'Friday’s traditional', Church: 'Saturday’s church service', Reception: 'the reception' };
    var attending = function () { var r = $('input[name="attending"]:checked', form); return r ? r.value : ''; };
    var listJoin = function (a) { return a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1]; };
    var refresh = function () { if (window.ScrollTrigger) window.ScrollTrigger.refresh(); };

    $$('input[name="attending"]', form).forEach(function (r) {
      r.addEventListener('change', function () {
        var no = attending() === 'no';
        ifYes.forEach(function (el) { el.classList.toggle('is-off', no); });
        refresh();
      });
    });

    var fail = function (msg, field) {
      err.textContent = msg;
      err.hidden = false;
      if (field) { field.setAttribute('aria-invalid', 'true'); field.focus(); }
    };

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      err.hidden = true;
      $$('[aria-invalid]', form).forEach(function (f) { f.removeAttribute('aria-invalid'); });

      var name = nameField.value.trim(), a = attending();
      var events = $$('input[name="events"]:checked', form).map(function (c) { return momentNames[c.value] || c.value; });
      if (!name) return fail('Please add your name so we know who’s replying.', nameField);
      if (!a) return fail('Let us know whether you can make it.', $('#rsvp-yes', form));
      if (a === 'yes' && !events.length) return fail('Pick at least one of the three moments.', $('#rsvp-ev-trad', form));

      var first = name.split(/\s+/)[0];
      var title = $('[data-rsvp-done-title]', done), text = $('[data-rsvp-done-text]', done);
      if (a === 'yes') {
        var seats = $('#rsvp-guests', form).value === '2' ? ' with two seats' : '';
        title.textContent = 'Medaase, ' + first + '! See you in Accra.';
        text.textContent = 'We’ve got you down for ' + listJoin(events) + seats + '. We’ll send a reminder a week before.';
      } else {
        title.textContent = 'We’ll miss you, ' + first + '.';
        text.textContent = 'Thank you for letting us know. We’ll share the photos after the weekend.';
      }
      form.hidden = true;
      done.hidden = false;
      done.focus();
      refresh();
    });

    var again = $('[data-rsvp-again]', done);
    if (again) again.addEventListener('click', function () {
      done.hidden = true;
      form.hidden = false;
      nameField.focus();
      refresh();
    });
  }

  /* ---- Pause motion ---- */
  var pauseBtn = $('[data-pause-motion]');
  if (pauseBtn) {
    if (reduce) { pauseBtn.hidden = true; }
    pauseBtn.addEventListener('click', function () {
      var on = html.classList.toggle('motion-paused');
      pauseBtn.setAttribute('aria-pressed', String(on));
      pauseBtn.textContent = on ? 'Play motion' : 'Pause motion';
    });
  }

  /* ---- Footer year ---- */
  $$('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });

  /* ---- Motion (GSAP + ScrollTrigger + SplitText + Lenis) ---- */
  if (window.JasonMotion) window.JasonMotion.init({ smooth: true, heroDelay: 0.1 });

  var gsap = window.gsap;
  if (gsap && window.ScrollTrigger && !reduce) {
    gsap.registerPlugin(window.ScrollTrigger);

    /* Scroll transitions (story stage, strip, weekend pin, tiles, gallery, orbit) live in transitions.js. */

    /* Principles: a photo follows the cursor over the list (fine pointers only). */
    var list = $('[data-hover-list]'), img = $('[data-hover-img]');
    if (list && img && matchMedia('(hover: hover) and (pointer: fine)').matches) {
      gsap.set(img, { xPercent: -50, yPercent: -50, scale: 0.85, autoAlpha: 0 });
      var qx = gsap.quickTo(img, 'x', { duration: 0.5, ease: 'power3' });
      var qy = gsap.quickTo(img, 'y', { duration: 0.5, ease: 'power3' });
      var placed = false;
      list.addEventListener('pointermove', function (e) {
        if (!placed) { gsap.set(img, { x: e.clientX, y: e.clientY }); placed = true; }
        qx(e.clientX); qy(e.clientY);
      });
      $$('li', list).forEach(function (li) {
        li.addEventListener('pointerenter', function () {
          var src = li.getAttribute('data-img');
          if (src && img.getAttribute('src') !== src) img.setAttribute('src', src);
          gsap.to(img, { autoAlpha: 1, scale: 1, rotation: (Math.random() - 0.5) * 8, duration: 0.45, ease: 'power3.out' });
        });
      });
      var hideImg = function () {
        placed = false;
        gsap.to(img, { autoAlpha: 0, scale: 0.85, duration: 0.35, ease: 'power2.out' });
      };
      list.addEventListener('pointerleave', hideImg);
      // Scrolling the list away under a still mouse never fires pointerleave.
      var lastX = -1, lastY = -1;
      addEventListener('pointermove', function (e) { lastX = e.clientX; lastY = e.clientY; }, { passive: true });
      addEventListener('scroll', function () {
        if (!placed) return;
        var r = list.getBoundingClientRect();
        if (lastX < r.left || lastX > r.right || lastY < r.top || lastY > r.bottom) hideImg();
      }, { passive: true });
    }
  }
})();
