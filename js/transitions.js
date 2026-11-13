/* ==========================================================================
   transitions.js — scroll choreography after design.joinvoy.com

   1. Welcome     words sharpen from a blur as the statement scrolls past
   2. Our story   the beach photo pins full screen, settles into a rounded card,
                  zooms towards the couple and reveals four glass "stops"
   3. Chapters    the line nearest the middle of the screen is brightest
   4. Strip       running text, blurred towards the edges
   5. Weekend     (desktop) the section pins; scrolling steps through the three
                  moments while each photo wipes up over the last
   6. Details     tiles rise in row by row, left to right, tied to scroll
   7. Gallery     photos tilt up and sharpen into place, with inner parallax
   8. RSVP        round photos circle the heading after drifting in from a blur

   Everything is skipped with prefers-reduced-motion: the CSS defaults are the
   settled states. Needs GSAP + ScrollTrigger (+ SplitText for step 1).
   ========================================================================== */
(function () {
  var gsap = window.gsap, ST = window.ScrollTrigger, Split = window.SplitText;
  if (!gsap || !ST) return;
  gsap.registerPlugin(ST);
  if (Split) gsap.registerPlugin(Split);

  var html = document.documentElement;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var unit = function (v) { return Math.min(1, Math.max(0, v)); };
  var easeOutQuad = function (t) { return 1 - (1 - t) * (1 - t); };
  var easeInOut = function (t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; };
  var paused = function () { return html.classList.contains('motion-paused'); };
  var lenis = function () { return window.JasonMotion && window.JasonMotion.lenis; };

  var mm = gsap.matchMedia();
  mm.add({
    motion: '(prefers-reduced-motion: no-preference)',
    desktop: '(min-width: 900px)',
    wide: '(min-width: 701px)',
  }, function (ctx) {
    var c = ctx.conditions;
    if (!c.motion) return;
    var cleanups = [];

    /* ---- 1. Welcome: words sharpen from a blur ---- */
    var statement = $('[data-blur-words]');
    if (statement && Split) {
      var split = Split.create(statement, { type: 'words' });
      gsap.fromTo(split.words,
        { opacity: 0.12, filter: 'blur(10px)' },
        { opacity: 1, filter: 'blur(0px)', ease: 'none', stagger: 0.06,
          scrollTrigger: { trigger: statement, start: 'top 82%', end: 'bottom 45%', scrub: 0.6 } });
      cleanups.push(function () { split.revert(); });
    }

    /* ---- 2. Our story: full screen → card, with zoom and glass stops ---- */
    var stage = $('[data-story-stage]'), card = $('[data-story-card]');
    if (stage && card) {
      var photo = $('[data-story-img]', card), tag = $('.story__tag', card), stops = $$('.story__stops li', card);
      var end = c.wide ? { x: 6, xu: 'vw', y: 9, yu: 'svh', r: 32 }
        : { x: 12, xu: 'px', y: Math.max(innerHeight * 0.08, innerHeight / 2 - (innerWidth - 24) * 0.625), yu: 'px', r: 22 };   // 4:5 card on phones
      var render = function (p) {
        var m = easeInOut(unit((p - 0.04) / 0.6));           // card mask
        var z = easeInOut(unit(p / 0.92));                   // photo zoom
        card.style.setProperty('--cx', (end.x * m).toFixed(3) + end.xu);
        card.style.setProperty('--cy', (end.y * m).toFixed(3) + end.yu);
        card.style.setProperty('--cr', (end.r * m).toFixed(2) + 'px');
        photo.style.transform = 'scale(' + (1 + (c.wide ? 0.22 : 0.08) * z).toFixed(4) + ')';
        if (tag) tag.style.opacity = unit((p - 0.42) / 0.16).toFixed(3);
        stops.forEach(function (li, i) {
          var s = easeOutQuad(unit((p - 0.3 - i * 0.12) / 0.16));
          li.style.opacity = s.toFixed(3);
          li.style.transform = 'translate3d(0,' + (24 * (1 - s)).toFixed(1) + 'px,0)';
          li.style.filter = s > 0.99 ? 'none' : 'blur(' + (8 * (1 - s)).toFixed(2) + 'px)';
        });
      };
      var scene = { p: 0 };
      render(0);
      gsap.to(scene, {
        p: 1, ease: 'none', onUpdate: function () { render(scene.p); },
        scrollTrigger: { trigger: stage, start: 'top top', end: function () { return '+=' + Math.round(innerHeight * 1.3); }, pin: true, scrub: 0.6, invalidateOnRefresh: true },
      });
      cleanups.push(function () {
        ['--cx', '--cy', '--cr'].forEach(function (v) { card.style.removeProperty(v); });
        photo.style.transform = '';
        if (tag) tag.style.opacity = '';
        stops.forEach(function (li) { li.style.opacity = li.style.transform = li.style.filter = ''; });
      });
    }

    /* ---- 3. Chapters: the line nearest the centre is in focus ---- */
    var list = $('.chapters');
    if (list) {
      var rows = $$('li', list);
      var focus = function () {
        var centre = innerHeight / 2;
        var d = rows.map(function (r) { var b = r.getBoundingClientRect(); return Math.abs(b.top + b.height / 2 - centre); });
        var closest = d.indexOf(Math.min.apply(null, d));
        rows.forEach(function (r, i) {
          r.style.setProperty('--o', (1 - 0.62 * Math.min(1, d[i] / centre)).toFixed(3));
          r.classList.toggle('in-focus', i === closest);
        });
      };
      ST.create({ trigger: list, start: 'top bottom', end: 'bottom top', onUpdate: focus, onRefresh: focus });
      gsap.set(rows, { opacity: 0 });
      ST.batch(rows, {
        start: 'top 90%', once: true,
        onEnter: function (batch) {
          gsap.fromTo(batch, { y: 44, opacity: 0, filter: 'blur(8px)' },
            { y: 0, opacity: 1, filter: 'blur(0px)', duration: 1.1, ease: 'power3.out', stagger: 0.12, clearProps: 'filter,transform' });
        },
      });
      cleanups.push(function () { rows.forEach(function (r) { r.style.removeProperty('--o'); r.classList.remove('in-focus'); }); });
    }

    /* ---- 4. Running strip: blur towards the edges ---- */
    var track = $('[data-ribbon]');
    if (track) {
      var box = track.parentElement, words = $$('span', track), stripOn = false;
      ST.create({ trigger: box, start: 'top bottom', end: 'bottom top', onToggle: function (s) { stripOn = s.isActive; } });
      var edgeBlur = function () {
        if (!stripOn || paused()) return;
        var a = box.getBoundingClientRect(), band = Math.min(240, a.width * 0.2);
        words.forEach(function (el) {
          var r = el.getBoundingClientRect(), mid = (r.left + r.right) / 2;
          var dist = Math.min(mid - a.left, a.right - mid);
          var b = Math.max(0, Math.min(6, 6 * (1 - dist / band)));
          var v = b < 0.05 ? 'none' : 'blur(' + b.toFixed(2) + 'px)';
          if (el.style.filter !== v) el.style.filter = v;
        });
      };
      gsap.ticker.add(edgeBlur);
      cleanups.push(function () { gsap.ticker.remove(edgeBlur); words.forEach(function (el) { el.style.filter = ''; }); });
    }

    /* ---- 5. Weekend: pin and step through the three moments (desktop) ---- */
    var grid = $('.cases__grid'), NK = window.NKCases;
    if (c.desktop && grid && NK) {
      var n = NK.count, bar = $('[data-case-bar]');
      NK.scrubbing = true;
      var pinST = ST.create({
        trigger: grid, start: 'center center', end: function () { return '+=' + Math.round(innerHeight * 0.85 * (n - 1)); },
        pin: true, invalidateOnRefresh: true,
        onUpdate: function (s) {
          NK.show(Math.min(n - 1, Math.floor(s.progress * n)));
          if (bar) bar.style.setProperty('--bar', ((1 + s.progress * (n - 1)) / n).toFixed(4));
        },
      });
      NK.nav = function (i) {
        var y = pinST.start + ((i + 0.5) / n) * (pinST.end - pinST.start);
        var l = lenis();
        if (l) l.scrollTo(y, { duration: 1.1 }); else window.scrollTo({ top: y, behavior: 'smooth' });
      };
      cleanups.push(function () { NK.nav = null; NK.scrubbing = false; });
    }

    /* ---- 6. Details: tiles rise row by row, left to right ---- */
    var rowCols = {};
    $$('.bento .btile').forEach(function (tile) {
      var row = tile.offsetTop, col = rowCols[row] || 0;
      rowCols[row] = col + 1;
      gsap.fromTo(tile, { opacity: 0, y: 60 }, {
        opacity: 1, y: 0, ease: 'power1.out',
        scrollTrigger: { trigger: tile, start: 'top ' + (98 - col * 6) + '%', end: 'top ' + (64 - col * 6) + '%', scrub: 0.4 },
      });
    });

    /* ---- 7. Gallery: tilt up and sharpen, with inner parallax ---- */
    $$('.gtile').forEach(function (tile) {
      gsap.fromTo(tile,
        { opacity: 0, filter: 'blur(14px)', rotationX: 12, scale: 0.86, transformPerspective: 1000, transformOrigin: '50% 100%' },
        { opacity: 1, filter: 'blur(0px)', rotationX: 0, scale: 1, ease: 'power2.out',
          scrollTrigger: { trigger: tile, start: 'top 98%', end: 'top 60%', scrub: 0.5 } });
      var im = $('img', tile);
      if (im) gsap.fromTo(im, { yPercent: -6, scale: 1.14 }, {
        yPercent: 6, scale: 1.14, ease: 'none',
        scrollTrigger: { trigger: tile, start: 'top bottom', end: 'bottom top', scrub: true },
      });
    });

    /* ---- 8. RSVP: photos circle the heading after drifting in from a blur ---- */
    var rsvp = $('.rsvp-section'), orbit = rsvp && $('.orbits', rsvp), heading = rsvp && $('.mega', rsvp);
    if (rsvp && orbit && heading) {
      var pics = $$('img', orbit), count = pics.length;
      if (c.wide) {
        orbit.classList.add('is-orbit');
        var enter = 0, ringOn = false, angle = -Math.PI / 2, geo = null;
        var sizes = pics.map(function (p) { return p.getBoundingClientRect().width || 80; });
        var measure = function () {
          var sr = rsvp.getBoundingClientRect(), hr = heading.getBoundingClientRect();
          var form = $('[data-rsvp]', rsvp), done = $('[data-rsvp-done]', rsvp);
          var block = form && !form.hidden ? form : done;
          var br = block ? block.getBoundingClientRect() : { top: sr.bottom };
          geo = { cx: hr.left - sr.left + hr.width / 2, cy: hr.top - sr.top + hr.height / 2,
                  rx: Math.min(sr.width * 0.42, 620), ry: Math.max(180, hr.height * 0.92),
                  floor: br.top - sr.top };                     // the form card: photos dip behind it
        };
        ST.create({ trigger: rsvp, start: 'top bottom', end: 'top 20%', onUpdate: function (s) { enter = s.progress; }, onRefresh: function (s) { enter = s.progress; measure(); } });
        ST.create({ trigger: rsvp, start: 'top bottom', end: 'bottom top', onToggle: function (s) { ringOn = s.isActive; } });
        measure();
        var ring = function (time, dt) {
          if (!ringOn || !geo) return;
          if (!paused()) angle += (dt / 1000) * (Math.PI * 2 / 80);
          pics.forEach(function (p, i) {
            var a = angle + (i * Math.PI * 2) / count;
            var depth = (Math.sin(a) + 1) / 2;
            var rank = (1 - Math.cos((i * Math.PI * 2) / count)) / 2;      // top enters first, bottom last
            var e = easeOutQuad(unit(enter * 1.6 - rank * 0.6));
            var x = geo.cx + Math.cos(a) * geo.rx - sizes[i] / 2;
            var y = geo.cy + Math.sin(a) * geo.ry - sizes[i] / 2;
            var s = (0.8 + 0.25 * depth) * (0.8 + 0.2 * e);
            p.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0) perspective(700px) rotateX(' + (10 * (1 - e)).toFixed(2) + 'deg) scale(' + s.toFixed(4) + ')';
            var behind = 1 - unit((y + sizes[i] * s - geo.floor) / (sizes[i] * 0.8));
            p.style.opacity = (e * behind).toFixed(3);
            p.style.filter = e > 0.995 ? 'none' : 'blur(' + (24 * (1 - e)).toFixed(2) + 'px)';
          });
        };
        gsap.ticker.add(ring);
        cleanups.push(function () {
          gsap.ticker.remove(ring);
          orbit.classList.remove('is-orbit');
          pics.forEach(function (p) { p.style.transform = p.style.opacity = p.style.filter = ''; });
        });
      } else {
        gsap.fromTo(pics, { opacity: 0, scale: 0.7, filter: 'blur(12px)' }, {
          opacity: 1, scale: 1, filter: 'blur(0px)', duration: 1, ease: 'power3.out', stagger: 0.08, clearProps: 'filter,transform,opacity',
          scrollTrigger: { trigger: orbit, start: 'top 92%', once: true },
        });
      }
    }

    // Pins change the page height: measure everything again in page order.
    ST.sort();
    ST.refresh();
    return function () { cleanups.forEach(function (fn) { fn(); }); };
  });
})();
