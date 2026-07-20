/* Glimpses scroll choreography (vanilla port of the framer-motion
   ScrollChoreography component).

   Scroll progress across the 300vh .scroll-choreo section is smoothed with a
   spring (stiffness 400, damping 50, mass 1.2 — same as the original) and fed
   through piecewise-linear keyframes:
     0.00–0.30  top-left and bottom-right swap corners vertically
     0.35–0.65  all four tiles converge on the center
     0.70–0.90  the bottom-left (hero) tile expands edge-to-edge over the
                full viewport while the tiles underneath fade out (0.75–0.85)
   Tile height / spread amplitudes come from the --choreo-* custom properties
   in style.css so the media queries there stay in charge of responsiveness.
   Tiles hug their image's natural aspect ratio, so photos are never cropped
   or letterboxed; only the hero switches to cover as it fills the screen. */
(function () {
  'use strict';

  var section = document.getElementById('glimpsesChoreo');
  if (!section) return;

  var tl = section.querySelector('.choreo-tl');
  var tr = section.querySelector('.choreo-tr');
  var bl = section.querySelector('.choreo-bl');
  var br = section.querySelector('.choreo-br');
  if (!tl || !tr || !bl || !br) return;

  var hero = bl;
  var heroImg = hero.querySelector('img');
  var heading = section.querySelector('.choreo-heading');

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  // Spring constants (match the original useSpring config)
  var STIFFNESS = 400;
  var DAMPING = 50;
  var MASS = 1.2;
  var REST_DELTA = 0.001;

  // Layout numbers, refreshed from CSS custom properties on resize
  var cfg = { tileH: 32, offX: 21, offY: 17, centerY: 8 };

  function readConfig() {
    var cs = getComputedStyle(section);
    cfg.tileH = parseFloat(cs.getPropertyValue('--choreo-tile-h')) || 32;
    cfg.offX = parseFloat(cs.getPropertyValue('--choreo-off-x')) || 21;
    cfg.offY = parseFloat(cs.getPropertyValue('--choreo-off-y')) || 17;
    cfg.centerY = parseFloat(cs.getPropertyValue('--choreo-center-y')) || 0;
  }

  function heroRatio() {
    if (heroImg && heroImg.naturalWidth && heroImg.naturalHeight) {
      return heroImg.naturalWidth / heroImg.naturalHeight;
    }
    return 3 / 2;
  }

  // Piecewise-linear interpolation of `values` over `stops` at progress t
  function interp(stops, values, t) {
    if (t <= stops[0]) return values[0];
    if (t >= stops[stops.length - 1]) return values[values.length - 1];
    for (var i = 1; i < stops.length; i++) {
      if (t <= stops[i]) {
        var span = stops[i] - stops[i - 1];
        var f = span === 0 ? 0 : (t - stops[i - 1]) / span;
        return values[i - 1] + (values[i] - values[i - 1]) * f;
      }
    }
    return values[values.length - 1];
  }

  function setPos(el, xVw, yVh) {
    el.style.transform =
      'translate(calc(-50% + ' + xVw + 'vw), calc(-50% + ' + yVh + 'vh))';
  }

  var PHASES = [0, 0.3, 0.35, 0.65, 1];

  function apply(p) {
    var xL = -cfg.offX, xR = cfg.offX, yT = -cfg.offY, yB = cfg.offY;

    // The whole stage sits below the heading; the shift eases back to the
    // true viewport center while the hero grows to full screen.
    var cy = interp([0, 0.65, 0.9, 1], [cfg.centerY, cfg.centerY, 0, 0], p);

    // Top-left: drops to the bottom-left corner, then to center
    setPos(tl,
      interp(PHASES, [xL, xL, xL, 0, 0], p),
      cy + interp(PHASES, [yT, yB, yB, 0, 0], p));

    // Bottom-right: rises to the top-right corner, then to center
    setPos(br,
      interp(PHASES, [xR, xR, xR, 0, 0], p),
      cy + interp(PHASES, [yB, yT, yT, 0, 0], p));

    // Top-right: holds, then to center
    setPos(tr,
      interp(PHASES, [xR, xR, xR, 0, 0], p),
      cy + interp(PHASES, [yT, yT, yT, 0, 0], p));

    // Bottom-left (hero): holds, then to center, then expands full screen
    setPos(hero,
      interp(PHASES, [xL, xL, xL, 0, 0], p),
      cy + interp(PHASES, [yB, yB, yB, 0, 0], p));

    // Heading: pinned until the stack converges, then slides up and fades
    // as the hero takes over the screen.
    if (heading) {
      heading.style.transform =
        'translateY(' + interp([0.65, 0.85], [0, -40], p) + 'vh)';
      heading.style.opacity = interp([0.65, 0.8], [1, 0], p);
    }

    var baseH = (cfg.tileH / 100) * window.innerHeight;
    var baseW = baseH * heroRatio();
    hero.style.width =
      interp([0.65, 0.7, 0.9, 1],
        [baseW, baseW, window.innerWidth, window.innerWidth], p) + 'px';
    hero.style.height =
      interp([0.65, 0.7, 0.9, 1],
        [baseH, baseH, window.innerHeight, window.innerHeight], p) + 'px';
    heroImg.style.borderRadius = interp([0.7, 0.9], [12, 0], p) + 'px';

    // Fade the tiles underneath as the hero takes over
    var under = interp([0.75, 0.85], [1, 0], p);
    tl.style.opacity = under;
    tr.style.opacity = under;
    br.style.opacity = under;
  }

  function getTargetProgress() {
    var rect = section.getBoundingClientRect();
    var scrollable = rect.height - window.innerHeight;
    if (scrollable <= 0) return 0;
    return Math.max(0, Math.min(1, -rect.top / scrollable));
  }

  var current = 0;
  var velocity = 0;
  var target = 0;
  var rafId = null;
  var lastTime = null;

  function frame(now) {
    if (lastTime === null) lastTime = now;
    var dt = Math.min((now - lastTime) / 1000, 1 / 30);
    lastTime = now;

    if (reduceMotion.matches) {
      current = target;
      velocity = 0;
    } else {
      var accel = (-STIFFNESS * (current - target) - DAMPING * velocity) / MASS;
      velocity += accel * dt;
      current += velocity * dt;
    }

    apply(current);

    if (Math.abs(current - target) > REST_DELTA || Math.abs(velocity) > REST_DELTA) {
      rafId = requestAnimationFrame(frame);
    } else {
      current = target;
      velocity = 0;
      apply(current);
      rafId = null;
      lastTime = null;
    }
  }

  function kick() {
    target = getTargetProgress();
    if (rafId === null) {
      lastTime = null;
      rafId = requestAnimationFrame(frame);
    }
  }

  window.addEventListener('scroll', kick, { passive: true });
  window.addEventListener('resize', function () {
    readConfig();
    kick();
  });

  // The hero box is sized from the image's natural ratio, so re-apply once
  // the image has actually loaded (script runs before images finish).
  if (heroImg && !heroImg.complete) {
    heroImg.addEventListener('load', function () {
      apply(current);
    });
  }

  readConfig();
  target = getTargetProgress();
  current = target;
  apply(current);
})();
