/* ============================================================
   #HACK26 — RENO Hackathon 2026
   Vanilla JS. No libraries, no network calls.
   ============================================================ */
(function () {
  'use strict';

  var reduceMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  function prefersReducedMotion() { return reduceMotionQuery.matches; }

  /* ============================================================
     1. STARFIELD (multi-layer canvas, twinkle, parallax, shooting stars)
     ============================================================ */
  (function starfield() {
    var canvas = document.getElementById('starfield');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var w, h, dpr;
    var layers = [];
    var shootingStars = [];
    var lastFrame = 0;
    var running = true;
    var scrollY = 0;

    var STAR_COLORS = ['#FFFFFF', '#FFFFFF', '#FFC46B', '#CFE0FF', '#FFD9A8', '#E4D8FF'];
    var LAYER_CONFIG = [
      { count: 130, sizeMin: 0.5, sizeMax: 1.2, opacityMax: 0.55, speed: 0.02 },
      { count: 85, sizeMin: 1.0, sizeMax: 1.9, opacityMax: 0.8, speed: 0.05 },
      { count: 46, sizeMin: 1.7, sizeMax: 2.9, opacityMax: 1, speed: 0.1 }
    ];

    function rand(min, max) { return Math.random() * (max - min) + min; }

    function buildStars() {
      layers = LAYER_CONFIG.map(function (cfg) {
        var stars = [];
        for (var i = 0; i < cfg.count; i++) {
          stars.push({
            x: rand(0, w),
            y: rand(0, h * 2.2),
            size: rand(cfg.sizeMin, cfg.sizeMax),
            baseOpacity: rand(cfg.opacityMax * 0.35, cfg.opacityMax),
            color: STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)],
            twinkleDur: rand(2, 6),
            twinkleDelay: rand(0, 6),
            speed: cfg.speed
          });
        }
        return stars;
      });
    }

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      buildStars();
    }

    var SHOOTING_STAR_COLORS = ['255,255,255', '255,196,107', '207,224,255'];

    function maybeSpawnShootingStar() {
      if (prefersReducedMotion()) return;
      if (Math.random() < 0.006 && shootingStars.length < 3) {
        shootingStars.push({
          x: rand(0, w * 0.9),
          y: rand(0, h * 0.5),
          len: rand(90, 210),
          speed: rand(9, 16),
          angle: rand(Math.PI / 5, Math.PI / 3),
          life: 1,
          color: SHOOTING_STAR_COLORS[Math.floor(Math.random() * SHOOTING_STAR_COLORS.length)]
        });
      }
    }

    function draw(t) {
      if (!running) return;
      var dt = t - lastFrame;
      lastFrame = t;
      ctx.clearRect(0, 0, w, h);

      var reduced = prefersReducedMotion();
      var ptr = window.__hkPointer || { x: 0, y: 0 };

      layers.forEach(function (stars, li) {
        var pOffX = reduced ? 0 : ptr.x * (li + 1) * 9;
        var pOffY = reduced ? 0 : ptr.y * (li + 1) * 6;
        stars.forEach(function (s) {
          var x = s.x + pOffX;
          var y = s.y - scrollY * s.speed + pOffY;
          var wrapH = h * 2.2;
          y = ((y % wrapH) + wrapH) % wrapH;
          if (y > h + 10) return;

          var opacity = s.baseOpacity;
          if (!reduced) {
            var phase = (t / 1000 + s.twinkleDelay) / s.twinkleDur;
            opacity = s.baseOpacity * (0.35 + 0.65 * Math.max(0, Math.sin(phase * Math.PI * 2)));
          }
          opacity = Math.max(0, Math.min(1, opacity));

          /* soft glow halo on the brighter, near-layer stars */
          if (li === 2 && opacity > 0.5) {
            ctx.globalAlpha = opacity * 0.35;
            ctx.fillStyle = s.color;
            ctx.beginPath();
            ctx.arc(x, y, s.size * 3, 0, Math.PI * 2);
            ctx.fill();
          }

          ctx.globalAlpha = opacity;
          ctx.fillStyle = s.color;
          ctx.beginPath();
          ctx.arc(x, y, s.size, 0, Math.PI * 2);
          ctx.fill();
        });
      });
      ctx.globalAlpha = 1;

      if (!reduced) {
        maybeSpawnShootingStar();
        shootingStars.forEach(function (star) {
          var dx = Math.cos(star.angle) * star.speed;
          var dy = Math.sin(star.angle) * star.speed;
          star.x += dx;
          star.y += dy;
          star.life -= 0.012;

          var lifeClamped = Math.max(0, star.life);
          var grad = ctx.createLinearGradient(
            star.x, star.y,
            star.x - Math.cos(star.angle) * star.len,
            star.y - Math.sin(star.angle) * star.len
          );
          grad.addColorStop(0, 'rgba(' + star.color + ',' + lifeClamped + ')');
          grad.addColorStop(1, 'rgba(' + star.color + ',0)');
          ctx.strokeStyle = grad;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(star.x, star.y);
          ctx.lineTo(star.x - Math.cos(star.angle) * star.len, star.y - Math.sin(star.angle) * star.len);
          ctx.stroke();

          ctx.globalAlpha = lifeClamped;
          ctx.fillStyle = 'rgb(' + star.color + ')';
          ctx.beginPath();
          ctx.arc(star.x, star.y, 1.8, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        });
        shootingStars = shootingStars.filter(function (s) { return s.life > 0 && s.y < h + 100; });
      }

      requestAnimationFrame(draw);
    }

    window.addEventListener('resize', resize, { passive: true });
    window.addEventListener('scroll', function () {
      scrollY = window.scrollY || window.pageYOffset;
    }, { passive: true });

    document.addEventListener('visibilitychange', function () {
      running = !document.hidden;
      if (running) requestAnimationFrame(draw);
    });

    resize();
    requestAnimationFrame(draw);
  })();

  /* ============================================================
     2. SCROLL PROGRESS BAR
     ============================================================ */
  (function scrollProgress() {
    var bar = document.getElementById('scrollProgress');
    if (!bar) return;
    var ticking = false;
    function update() {
      var doc = document.documentElement;
      var scrollTop = doc.scrollTop || document.body.scrollTop;
      var scrollHeight = (doc.scrollHeight || document.body.scrollHeight) - doc.clientHeight;
      var pct = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
      bar.style.width = pct + '%';
      ticking = false;
    }
    window.addEventListener('scroll', function () {
      if (!ticking) {
        requestAnimationFrame(update);
        ticking = true;
      }
    }, { passive: true });
    update();
  })();

  /* ============================================================
     3. NAV: mobile toggle, active-section highlight, smooth scroll
     ============================================================ */
  (function nav() {
    var toggle = document.getElementById('navToggle');
    var list = document.getElementById('navList');
    if (toggle && list) {
      toggle.addEventListener('click', function () {
        var open = list.classList.toggle('open');
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
      list.querySelectorAll('a').forEach(function (a) {
        a.addEventListener('click', function () {
          list.classList.remove('open');
          toggle.setAttribute('aria-expanded', 'false');
        });
      });
    }

    var navLinks = Array.prototype.slice.call(document.querySelectorAll('.nav-list a[data-nav]'));
    var sections = navLinks
      .map(function (a) { return document.getElementById(a.getAttribute('href').slice(1)); })
      .filter(Boolean);

    if ('IntersectionObserver' in window && sections.length) {
      var sectionObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          var link = navLinks.find(function (a) { return a.getAttribute('href') === '#' + entry.target.id; });
          if (!link) return;
          if (entry.isIntersecting) {
            navLinks.forEach(function (a) { a.classList.remove('active'); });
            link.classList.add('active');
          }
        });
      }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });
      sections.forEach(function (s) { sectionObserver.observe(s); });
    }

    /* Smooth scroll for CTA / anchors (native scroll-behavior handles most,
       this ensures nav offset is respected) */
    document.querySelectorAll('a[href^="#"]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        var id = a.getAttribute('href');
        if (id.length < 2) return;
        var target = document.querySelector(id);
        if (!target) return;
        e.preventDefault();
        var navH = document.querySelector('.site-nav').offsetHeight;
        var top = target.getBoundingClientRect().top + window.pageYOffset - navH + 1;
        window.scrollTo({ top: top, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
      });
    });
  })();

  /* ============================================================
     4. SCROLL REVEAL (IntersectionObserver)
     ============================================================ */
  (function reveal() {
    var items = document.querySelectorAll('.reveal');
    if (!items.length) return;

    if (!('IntersectionObserver' in window) || prefersReducedMotion()) {
      items.forEach(function (el) { el.classList.add('in-view'); });
      return;
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -60px 0px' });

    items.forEach(function (el) { observer.observe(el); });
  })();

  /* ============================================================
     5. COUNT-UP ANIMATIONS
     ============================================================ */
  (function countUp() {
    var els = document.querySelectorAll('[data-countup]');
    if (!els.length) return;

    function animate(el) {
      var target = parseFloat(el.getAttribute('data-countup'));
      var decimals = parseInt(el.getAttribute('data-decimals') || '0', 10);
      if (prefersReducedMotion() || isNaN(target)) {
        el.textContent = target.toFixed(decimals);
        return;
      }
      var duration = 1200;
      var start = null;
      function step(ts) {
        if (start === null) start = ts;
        var progress = Math.min((ts - start) / duration, 1);
        var eased = 1 - Math.pow(1 - progress, 3);
        var value = target * eased;
        el.textContent = value.toFixed(decimals);
        if (progress < 1) requestAnimationFrame(step);
        else el.textContent = target.toFixed(decimals);
      }
      requestAnimationFrame(step);
    }

    if (!('IntersectionObserver' in window)) {
      els.forEach(animate);
      return;
    }
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          animate(entry.target);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.4 });
    els.forEach(function (el) { observer.observe(el); });
  })();

  /* ============================================================
     6. COUNTDOWN — target 2026-09-23T09:00:00+08:00
     ============================================================ */
  (function countdown() {
    var target = new Date('2026-09-23T09:00:00+08:00');
    var daysEl = document.getElementById('cdDays');
    var hoursEl = document.getElementById('cdHours');
    var minsEl = document.getElementById('cdMinutes');
    var secsEl = document.getElementById('cdSeconds');
    var gridEl = document.getElementById('countdownGrid');
    var liveEl = document.getElementById('countdownLive');
    if (!daysEl) return;

    var prev = { d: null, h: null, m: null, s: null };

    function pad(n) { return String(n).padStart(2, '0'); }

    function setUnit(el, value, prevKey) {
      var text = pad(value);
      if (el.textContent !== text) {
        el.textContent = text;
        if (!prefersReducedMotion()) {
          el.classList.remove('flip');
          void el.offsetWidth; /* restart animation */
          el.classList.add('flip');
        }
      }
    }

    function tick() {
      var now = new Date();
      var diff = target.getTime() - now.getTime();

      if (diff <= 0) {
        gridEl.hidden = true;
        liveEl.hidden = false;
        return;
      }

      gridEl.hidden = false;
      liveEl.hidden = true;

      var totalSeconds = Math.floor(diff / 1000);
      var days = Math.floor(totalSeconds / 86400);
      var hours = Math.floor((totalSeconds % 86400) / 3600);
      var minutes = Math.floor((totalSeconds % 3600) / 60);
      var seconds = totalSeconds % 60;

      setUnit(daysEl, days);
      setUnit(hoursEl, hours);
      setUnit(minsEl, minutes);
      setUnit(secsEl, seconds);

      window.requestAnimationFrame(function () {
        setTimeout(tick, 1000 - (Date.now() % 1000));
      });
    }

    tick();
  })();

  /* ============================================================
     7. PARALLAX (theme gear drift) — rAF driven, transform only.
        The hero glow + logo are owned by heroInteract() (module 10)
        so scroll and pointer offsets compose without fighting.
     ============================================================ */
  (function parallax() {
    if (prefersReducedMotion()) return;
    var gears = document.querySelectorAll('.theme-gear');
    if (!gears.length) return;
    var ticking = false;

    function update() {
      gears.forEach(function (g, i) {
        var rect = g.getBoundingClientRect();
        if (rect.top < window.innerHeight && rect.bottom > 0) {
          var offset = (rect.top - window.innerHeight / 2) * 0.06;
          g.style.transform = 'translate3d(0,' + offset + 'px,0)';
        }
      });
      ticking = false;
    }

    window.addEventListener('scroll', function () {
      if (!ticking) {
        requestAnimationFrame(update);
        ticking = true;
      }
    }, { passive: true });
    update();
  })();

  /* ============================================================
     8. PROGRAMME TABS
     ============================================================ */
  (function programmeTabs() {
    var tabs = document.querySelectorAll('.prog-tab');
    var panels = document.querySelectorAll('.prog-panel');
    if (!tabs.length) return;

    function activate(day) {
      tabs.forEach(function (t) {
        var isActive = t.getAttribute('data-day') === day;
        t.classList.toggle('active', isActive);
        t.setAttribute('aria-selected', isActive ? 'true' : 'false');
        t.tabIndex = isActive ? 0 : -1;
      });
      panels.forEach(function (p) {
        var match = p.id === 'panel-' + day;
        p.classList.toggle('active', match);
        p.hidden = !match;
      });
    }

    tabs.forEach(function (tab, idx) {
      tab.addEventListener('click', function () { activate(tab.getAttribute('data-day')); });
      tab.addEventListener('keydown', function (e) {
        var newIdx = null;
        if (e.key === 'ArrowRight') newIdx = (idx + 1) % tabs.length;
        if (e.key === 'ArrowLeft') newIdx = (idx - 1 + tabs.length) % tabs.length;
        if (newIdx !== null) {
          e.preventDefault();
          tabs[newIdx].focus();
          activate(tabs[newIdx].getAttribute('data-day'));
        }
      });
    });
  })();

  /* ============================================================
     9. PRIZE CARD CURSOR TILT
     ============================================================ */
  (function prizeTilt() {
    if (prefersReducedMotion()) return;
    var cards = document.querySelectorAll('.prize-card');
    if (!cards.length) return;

    cards.forEach(function (card) {
      var raf = null;
      function onMove(e) {
        if (raf) return;
        raf = requestAnimationFrame(function () {
          var rect = card.getBoundingClientRect();
          var px = (e.clientX - rect.left) / rect.width - 0.5;
          var py = (e.clientY - rect.top) / rect.height - 0.5;
          card.style.transform = 'translateY(-8px) rotateX(' + (py * -8) + 'deg) rotateY(' + (px * 10) + 'deg)';
          raf = null;
        });
      }
      function onLeave() {
        if (raf) { cancelAnimationFrame(raf); raf = null; }
        card.style.transform = '';
      }
      card.addEventListener('mousemove', onMove);
      card.addEventListener('mouseleave', onLeave);
    });
  })();

  /* ============================================================
     10. HERO INTERACTION — pointer + scroll parallax, magnetic CTA
         Owns the hero glow + logo transforms and publishes a shared
         normalised pointer (window.__hkPointer) the starfield reads.
     ============================================================ */
  (function heroInteract() {
    if (prefersReducedMotion()) return;
    var hero = document.getElementById('hero');
    if (!hero) return;
    var glow = document.querySelector('.hero-glow');
    var logo = document.querySelector('.hero-logo');
    var cta = document.querySelector('.hero .cta-btn');
    var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

    /* Wrap the logo so pointer/scroll translate never fights the
       entrance + float animations living on the <img> itself. */
    var logoWrap = null;
    if (logo && logo.parentNode) {
      logoWrap = document.createElement('span');
      logoWrap.className = 'hero-logo-tilt';
      logo.parentNode.insertBefore(logoWrap, logo);
      logoWrap.appendChild(logo);
    }

    var targetX = 0, targetY = 0, curX = 0, curY = 0;
    var scrollY = window.pageYOffset || document.documentElement.scrollTop || 0;
    var heroInView = true, running = false;
    window.__hkPointer = { x: 0, y: 0 };

    if (fine) {
      window.addEventListener('pointermove', function (e) {
        targetX = (e.clientX / window.innerWidth) - 0.5;
        targetY = (e.clientY / window.innerHeight) - 0.5;
      }, { passive: true });
      document.addEventListener('mouseleave', function () { targetX = 0; targetY = 0; }, { passive: true });
    }
    window.addEventListener('scroll', function () {
      scrollY = window.pageYOffset || document.documentElement.scrollTop || 0;
    }, { passive: true });

    function ensureLoop() { if (!running) { running = true; requestAnimationFrame(loop); } }

    function loop() {
      curX += (targetX - curX) * 0.08;
      curY += (targetY - curY) * 0.08;
      window.__hkPointer.x = curX;
      window.__hkPointer.y = curY;

      if (glow) {
        glow.style.transform = 'translate3d(calc(-50% + ' + (curX * 30).toFixed(2) + 'px),' +
          (scrollY * 0.15 + curY * 20).toFixed(2) + 'px,0)';
      }
      if (logoWrap) {
        logoWrap.style.transform = 'translate3d(' + (curX * -18).toFixed(2) + 'px,' +
          (scrollY * -0.045 + curY * -12).toFixed(2) + 'px,0)';
      }

      if (heroInView && !document.hidden) { requestAnimationFrame(loop); }
      else { running = false; }
    }

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        heroInView = es[0].isIntersecting;
        if (heroInView) ensureLoop();
      }, { threshold: 0 }).observe(hero);
    }
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden && heroInView) ensureLoop();
    });
    ensureLoop();

    /* Magnetic CTA — subtle pull toward the cursor (fine pointers only). */
    if (fine && cta) {
      var craf = null, ce = null;
      cta.addEventListener('pointermove', function (e) {
        ce = e;
        if (craf) return;
        craf = requestAnimationFrame(function () {
          var r = cta.getBoundingClientRect();
          var mx = (ce.clientX - (r.left + r.width / 2)) / (r.width / 2);
          var my = (ce.clientY - (r.top + r.height / 2)) / (r.height / 2);
          cta.style.transform = 'translate(' + (mx * 8).toFixed(2) + 'px,' + (my * 6 - 3).toFixed(2) + 'px)';
          craf = null;
        });
      });
      cta.addEventListener('pointerleave', function () {
        if (craf) { cancelAnimationFrame(craf); craf = null; }
        cta.style.transform = '';
      });
    }
  })();

  /* ============================================================
     11. HERO WORDMARK DECODE — one-time "boot" flourish
     ============================================================ */
  (function heroDecode() {
    if (prefersReducedMotion()) return;
    var el = document.querySelector('.hero-word');
    if (!el) return;
    var finalText = el.textContent;
    if (!finalText) return;
    el.setAttribute('aria-label', finalText);
    var glyphs = '#@%&$/\\<>*0123456789ABCDEFHKXYZ';
    var chars = finalText.split('');
    var duration = 820, start = null;

    function frame(ts) {
      if (start === null) start = ts;
      var p = Math.min((ts - start) / duration, 1);
      var revealed = Math.floor(p * chars.length + 0.001);
      var out = '';
      for (var i = 0; i < chars.length; i++) {
        if (i < revealed || chars[i] === ' ') out += chars[i];
        else out += glyphs.charAt(Math.floor(Math.random() * glyphs.length));
      }
      el.textContent = out;
      if (p < 1) requestAnimationFrame(frame);
      else el.textContent = finalText;
    }
    el.classList.add('is-decoding');
    setTimeout(function () {
      requestAnimationFrame(function (ts) {
        frame(ts);
        setTimeout(function () { el.classList.remove('is-decoding'); }, duration + 60);
      });
    }, 360);
  })();

  /* ============================================================
     12. CARD INTERACTION — pointer spotlight + subtle tilt
         Spotlight is a consistent light-follow on card surfaces;
         tilt is reserved for the showcase cards. Fine pointers only.
     ============================================================ */
  (function cardInteract() {
    if (prefersReducedMotion()) return;
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    var spotlightSel = '.theme-card, .headline-card, .mvp-card, .submit-card, .date-row';
    var tiltSel = '.theme-card, .submit-card';

    document.querySelectorAll(spotlightSel).forEach(function (card) {
      var doTilt = card.matches(tiltSel);
      if (doTilt) card.classList.add('hk-tilt');
      var raf = null, ce = null;

      if (doTilt) {
        card.addEventListener('pointerenter', function () { card.style.transition = 'none'; });
      }
      card.addEventListener('pointermove', function (e) {
        ce = e;
        if (raf) return;
        raf = requestAnimationFrame(function () {
          var r = card.getBoundingClientRect();
          var px = (ce.clientX - r.left) / r.width;
          var py = (ce.clientY - r.top) / r.height;
          card.style.setProperty('--hk-mx', (px * 100).toFixed(1) + '%');
          card.style.setProperty('--hk-my', (py * 100).toFixed(1) + '%');
          if (doTilt) {
            var rx = (0.5 - py) * 6;
            var ry = (px - 0.5) * 7;
            card.style.transform = 'perspective(900px) rotateX(' + rx.toFixed(2) +
              'deg) rotateY(' + ry.toFixed(2) + 'deg) translateY(-6px)';
          }
          raf = null;
        });
      });
      card.addEventListener('pointerleave', function () {
        if (raf) { cancelAnimationFrame(raf); raf = null; }
        if (doTilt) { card.style.transition = ''; card.style.transform = ''; }
      });
    });
  })();

  /* ============================================================
     13. EXTENDED SCROLL REVEALS — timeline items + rubric rows
         "Information appears on scroll" for content that used to pop in.
     ============================================================ */
  (function extendReveals() {
    var reduce = prefersReducedMotion();
    var items = [];

    document.querySelectorAll('.timeline').forEach(function (tl) {
      tl.querySelectorAll('.tl-item').forEach(function (li, i) {
        li.classList.add('reveal');
        li.style.setProperty('--d', i);
        items.push(li);
      });
    });
    document.querySelectorAll('.rubric-table tbody tr').forEach(function (tr, i) {
      tr.classList.add('reveal');
      tr.style.setProperty('--d', i);
      items.push(tr);
    });
    if (!items.length) return;

    if (reduce || !('IntersectionObserver' in window)) {
      items.forEach(function (el) { el.classList.add('in-view'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in-view'); io.unobserve(en.target); }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
    items.forEach(function (el) { io.observe(el); });
  })();

})();
