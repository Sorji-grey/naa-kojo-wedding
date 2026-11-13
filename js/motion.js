/* ==========================================================================
   motion.js — GSAP + ScrollTrigger + SplitText (+ optional Lenis) presets
   for jason-web-design. Everything is opt-in through data attributes, so the
   page still works (fully visible, static) if a script fails to load.

   Load order (end of <body>):
     gsap.min.js → ScrollTrigger.min.js → SplitText.min.js → lenis.min.js (opt)
     → motion.js → then call JasonMotion.init({ smooth: true }) in an inline script.
   In <head>, add the 'js' class to <html> (see references/motion.md, section 1).
   Safe to inline: this file contains no script-tag text, so it won't close an inline script early.

   Attributes:
     data-split="lines|words|chars"  headline line/word/char reveal (masked)
     .reveal                          fade-and-rise, batched + staggered
     data-reveal="clip"               image/frame unmasks from an inset
     data-speed="0.2"                 parallax (− moves against scroll)
     data-count="200" [data-decimals="1" data-prefix="$" data-suffix="K+"]
     data-magnetic                    button/icon drifts toward the cursor
     data-horizontal                  section pins; its first child scrolls sideways
     .product-tilt > .product-frame   tilted UI flattens as it scrolls into view
     .marquee__track                  speeds up with scroll velocity
   Options: init({ smooth, cursor, heroDelay })
   ========================================================================== */
(function (global) {
  const JasonMotion = {};
  const $$ = (s, root = document) => Array.from(root.querySelectorAll(s));

  JasonMotion.init = function (opts = {}) {
    const o = Object.assign({ smooth: true, cursor: false, heroDelay: 0.15 }, opts);
    const gsap = global.gsap;
    const html = document.documentElement;

    // No GSAP → show everything, keep CSS-only reveals working.
    if (!gsap || !global.ScrollTrigger) {
      html.classList.remove('js');
      $$('.reveal').forEach((el) => el.classList.add('is-in'));
      return null;
    }
    const { ScrollTrigger, SplitText } = global;
    gsap.registerPlugin(...[ScrollTrigger, SplitText].filter(Boolean));
    html.classList.add('gsap');

    const mm = gsap.matchMedia();
    mm.add(
      {
        motion: '(prefers-reduced-motion: no-preference)',
        reduce: '(prefers-reduced-motion: reduce)',
        desktop: '(min-width: 900px)',
        hover: '(hover: hover) and (pointer: fine)',
      },
      (ctx) => {
        const { reduce, desktop, hover } = ctx.conditions;
        if (reduce) {
          gsap.set('[data-split], .reveal', { autoAlpha: 1, clearProps: 'transform' });
          return;
        }
        const cleanups = [];

        /* ---- Smooth scroll (Lenis) ---- */
        if (o.smooth && global.Lenis) {
          const lenis = new global.Lenis({ lerp: 0.1, wheelMultiplier: 1 });
          lenis.on('scroll', ScrollTrigger.update);
          const raf = (t) => lenis.raf(t * 1000);
          gsap.ticker.add(raf);
          gsap.ticker.lagSmoothing(0);
          const onAnchor = (e) => {
            const a = e.target.closest('a[href^="#"]');
            if (!a || a.getAttribute('href').length < 2) return;
            const target = document.querySelector(a.getAttribute('href'));
            if (!target) return;
            e.preventDefault();
            lenis.scrollTo(target, { offset: -80 });
          };
          document.addEventListener('click', onAnchor);
          JasonMotion.lenis = lenis;
          cleanups.push(() => { gsap.ticker.remove(raf); document.removeEventListener('click', onAnchor); lenis.destroy(); });
        }

        const inFirstView = (el) => el.getBoundingClientRect().top < innerHeight * 0.9;

        /* ---- Split headlines ---- */
        $$('[data-split]').forEach((el) => {
          const type = el.dataset.split || 'lines';
          const hero = inFirstView(el);
          const st = hero ? undefined : { trigger: el, start: 'top 85%', once: true };
          gsap.set(el, { autoAlpha: 1 });
          if (!SplitText) {
            gsap.from(el, { y: 40, autoAlpha: 0, duration: 1.1, ease: 'expo.out', delay: hero ? o.heroDelay : 0, scrollTrigger: st });
            return;
          }
          SplitText.create(el, {
            type: type === 'chars' ? 'words,chars' : type === 'words' ? 'lines,words' : 'lines',
            mask: type === 'chars' ? 'words' : 'lines',
            autoSplit: true,
            onSplit(self) {
              const parts = type === 'chars' ? self.chars : type === 'words' ? self.words : self.lines;
              return gsap.from(parts, {
                yPercent: 110, duration: type === 'chars' ? 0.9 : 1.2, ease: 'expo.out',
                stagger: type === 'chars' ? 0.02 : 0.09, delay: hero ? o.heroDelay : 0, scrollTrigger: st,
              });
            },
          });
        });

        /* ---- Batched reveals (overrides the CSS-transition fallback) ---- */
        const reveals = $$('.reveal');
        gsap.set(reveals, { transition: 'none', autoAlpha: 0, y: 28 });
        ScrollTrigger.batch(reveals, {
          start: 'top 90%', once: true,
          onEnter: (batch) => gsap.to(batch, {
            autoAlpha: 1, y: 0, duration: 1, ease: 'power3.out', stagger: 0.08,
            delay: inFirstView(batch[0]) ? o.heroDelay + 0.2 : 0,
          }),
        });

        /* ---- Clip-path image reveals ---- */
        $$('[data-reveal="clip"]').forEach((el) => {
          const r = getComputedStyle(el).borderRadius || '0px';
          const media = el.querySelector('img, video, canvas');
          const tl = gsap.timeline({ scrollTrigger: { trigger: el, start: 'top 82%', once: true } });
          tl.fromTo(el, { clipPath: `inset(14% 10% 14% 10% round ${r})` }, { clipPath: `inset(0% 0% 0% 0% round ${r})`, duration: 1.5, ease: 'expo.out' });
          if (media) tl.from(media, { scale: 1.18, duration: 1.8, ease: 'expo.out' }, 0);
        });

        /* ---- Parallax ---- */
        $$('[data-speed]').forEach((el) => {
          const s = parseFloat(el.dataset.speed) || 0.2;
          gsap.fromTo(el, { yPercent: -s * 50 }, {
            yPercent: s * 50, ease: 'none',
            scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true },
          });
        });

        /* ---- Counters ---- */
        $$('[data-count]').forEach((el) => {
          const end = parseFloat(el.dataset.count);
          const dec = parseInt(el.dataset.decimals || '0', 10);
          const fmt = new Intl.NumberFormat(undefined, { minimumFractionDigits: dec, maximumFractionDigits: dec });
          const pre = el.dataset.prefix || '', suf = el.dataset.suffix || '';
          const v = { n: 0 };
          gsap.to(v, {
            n: end, duration: 2, ease: 'power2.out',
            scrollTrigger: { trigger: el, start: 'top 90%', once: true },
            onUpdate: () => { el.textContent = pre + fmt.format(v.n) + suf; },
          });
        });

        /* ---- Tilted product frame flattens on scroll ---- */
        $$('.product-tilt > .product-frame').forEach((el) => {
          gsap.fromTo(el,
            { rotateX: 22, rotateZ: -7, skewX: 8, xPercent: 4 },
            { rotateX: 0, rotateZ: 0, skewX: 0, xPercent: 0, ease: 'none',
              scrollTrigger: { trigger: el, start: 'top 90%', end: 'top 15%', scrub: 1 } });
        });

        /* ---- Marquee reacts to scroll velocity ---- */
        $$('.marquee__track').forEach((track) => {
          const anim = track.getAnimations ? track.getAnimations()[0] : null;
          if (!anim) return;
          const state = { rate: 1 };
          ScrollTrigger.create({
            trigger: track, start: 'top bottom', end: 'bottom top',
            onUpdate: (self) => {
              const boost = Math.min(Math.abs(self.getVelocity()) / 400, 5);
              gsap.to(state, { rate: (1 + boost) * (self.direction || 1), duration: 0.2, overwrite: true,
                onUpdate: () => { anim.playbackRate = state.rate; } });
              gsap.to(state, { rate: 1, duration: 1.2, delay: 0.2, ease: 'power2.out',
                onUpdate: () => { anim.playbackRate = state.rate; } });
            },
          });
        });

        /* ---- Horizontal pinned gallery (desktop only) ---- */
        if (desktop) {
          $$('[data-horizontal]').forEach((section) => {
            const track = section.firstElementChild;
            if (!track) return;
            const dist = () => track.scrollWidth - section.clientWidth;
            gsap.to(track, {
              x: () => -dist(), ease: 'none',
              scrollTrigger: { trigger: section, pin: true, scrub: 1, end: () => '+=' + dist(), invalidateOnRefresh: true },
            });
          });
        }

        /* ---- Magnetic buttons + optional cursor (fine pointers only) ---- */
        if (hover) {
          $$('[data-magnetic]').forEach((el) => {
            const xTo = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'power3' });
            const yTo = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'power3' });
            const move = (e) => {
              const r = el.getBoundingClientRect();
              xTo((e.clientX - r.left - r.width / 2) * 0.3);
              yTo((e.clientY - r.top - r.height / 2) * 0.3);
            };
            const leave = () => { xTo(0); yTo(0); };
            el.addEventListener('pointermove', move);
            el.addEventListener('pointerleave', leave);
            cleanups.push(() => { el.removeEventListener('pointermove', move); el.removeEventListener('pointerleave', leave); });
          });

          if (o.cursor) {
            const dot = document.createElement('div');
            dot.className = 'cursor-dot';
            document.body.appendChild(dot);
            const xTo = gsap.quickTo(dot, 'x', { duration: 0.35, ease: 'power3' });
            const yTo = gsap.quickTo(dot, 'y', { duration: 0.35, ease: 'power3' });
            const move = (e) => {
              xTo(e.clientX); yTo(e.clientY);
              const hot = e.target.closest('a, button, [data-magnetic], [data-cursor]');
              gsap.to(dot, { scale: hot ? 3.2 : 1, duration: 0.3, overwrite: 'auto' });
            };
            addEventListener('pointermove', move);
            cleanups.push(() => { removeEventListener('pointermove', move); dot.remove(); });
          }
        }

        if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => ScrollTrigger.refresh());
        return () => cleanups.forEach((fn) => fn());
      }
    );
    JasonMotion.mm = mm;
    return mm;
  };

  global.JasonMotion = JasonMotion;
})(window);
