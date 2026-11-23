/* Cristian Victoria — portfolio behaviour.
   Plain JavaScript, no libraries. Everything degrades to a finished, static page
   when motion is reduced or a feature is missing. */
(function () {
  'use strict';

  var root = document.documentElement;
  var EMAIL = 'cristian.victoria.perez@gmail.com';
  var reduceQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  function motion() { return !reduceQuery.matches; }
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function $(s, el) { return (el || document).querySelector(s); }
  function $$(s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); }
  function cols() { return parseInt(getComputedStyle(root).getPropertyValue('--cols'), 10) || 12; }
  function rand(a, b) { return a + Math.random() * (b - a); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  /* ---------- Edge-to-edge name ---------- */
  /* Fills 97% of the column; lower the factor to make the name smaller. */
  function fitTo(el, width) {
    el.style.fontSize = '100px';
    var w = el.getBoundingClientRect().width;
    if (w > 0) el.style.fontSize = (100 * width / w * 0.97).toFixed(2) + 'px';
  }
  function fitNames() {
    var stacked = cols() === 4;
    $$('.fitname').forEach(function (h) {
      var W = h.clientWidth;
      var line = $('.line', h);
      var words = $$('.w', h);
      h.classList.toggle('stacked', stacked);
      if (stacked) {
        line.style.fontSize = '';
        words.forEach(function (w) { fitTo(w, W); });
      } else {
        words.forEach(function (w) { w.style.fontSize = ''; });
        fitTo(line, W);
      }
    });
  }
  fitNames();
  var resizeRaf = 0;
  window.addEventListener('resize', function () {
    cancelAnimationFrame(resizeRaf);
    resizeRaf = requestAnimationFrame(function () { fitNames(); updateTimeline(); });
  });
  var fontsReady = (document.fonts && document.fonts.ready) ? document.fonts.ready : Promise.resolve();
  fontsReady.then(fitNames);

  /* ---------- Live New York time ---------- */
  var clockFmt;
  try {
    clockFmt = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
    });
  } catch (e) { clockFmt = null; }
  var clocks = $$('[data-clock]');
  function tick() {
    if (!clockFmt) return;
    var t = clockFmt.format(new Date()) + ' ET';
    clocks.forEach(function (c) { c.textContent = t; });
  }
  tick();
  setInterval(tick, 1000);

  /* ---------- Intro: hero lands off-grid, then snaps ---------- */
  function offsetFor(el, i, amp) {
    el.style.setProperty('--dx', rand(-amp, amp).toFixed(1) + 'px');
    el.style.setProperty('--dy', rand(-amp * 0.75, amp * 0.75).toFixed(1) + 'px');
    if (i !== undefined) el.style.setProperty('--d', (i * 70) + 'ms');
  }
  async function intro() {
    var snaps = $$('.hero [data-snap]');
    if (!motion() || !root.classList.contains('intro')) {
      root.classList.remove('intro', 'intro-show');
      return;
    }
    var amp = cols() === 4 ? 9 : 18;
    snaps.forEach(function (el, i) { offsetFor(el, i, amp); el.classList.add('off'); });
    await Promise.race([fontsReady, sleep(900)]);
    fitNames();
    root.classList.add('intro-show');
    await sleep(800 + snaps.length * 70);
    snaps.forEach(function (el, i) {
      setTimeout(function () { el.classList.remove('off'); }, i * 55);
    });
    await sleep(snaps.length * 55 + 320);
    root.classList.remove('intro', 'intro-show');
    snaps.forEach(function (el) { el.style.removeProperty('--d'); });
  }
  intro();

  /* ---------- Count-ups ---------- */
  function fmtNum(el, v) {
    var dec = parseInt(el.dataset.decimals || '0', 10);
    return (el.dataset.prefix || '') +
      v.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec }) +
      (el.dataset.suffix || '');
  }
  function countUp(el) {
    var end = parseFloat(el.dataset.count);
    if (!motion()) { el.textContent = fmtNum(el, end); return; }
    var dur = 1400, t0 = performance.now();
    function step(t) {
      var p = clamp((t - t0) / dur, 0, 1);
      var e = 1 - Math.pow(1 - p, 3);
      el.textContent = fmtNum(el, end * e);
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  var counters = $$('[data-count]');
  if ('IntersectionObserver' in window && motion()) {
    counters.forEach(function (el) { el.textContent = fmtNum(el, 0); });
    var countObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { countUp(en.target); countObs.unobserve(en.target); }
      });
    }, { threshold: 0.6 });
    counters.forEach(function (el) { countObs.observe(el); });
  }

  /* ---------- Shared cursor for the product screens ---------- */
  var CURSOR_SVG = '<svg viewBox="0 0 18 22" aria-hidden="true"><path d="M1 1 L1 17.5 L5.4 13.4 L8.4 20.6 L11.6 19.3 L8.7 12.2 L14.8 12.2 Z" fill="#111" stroke="#fff" stroke-width="1.3" stroke-linejoin="round"/></svg><span class="ring"></span>';
  function makeCursor(win) {
    var c = document.createElement('div');
    c.className = 'cursor';
    c.setAttribute('aria-hidden', 'true');
    c.innerHTML = CURSOR_SVG;
    win.appendChild(c);
    return c;
  }
  function pointIn(win, el, fx, fy) {
    var w = win.getBoundingClientRect(), r = el.getBoundingClientRect();
    return [r.left - w.left + r.width * (fx == null ? 0.5 : fx), r.top - w.top + r.height * (fy == null ? 0.5 : fy)];
  }
  function placeCursor(c, x, y, dur) {
    c.style.transitionDuration = dur + 'ms, 300ms';
    c.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px)';
    c.classList.add('on');
  }
  async function move(c, win, el, dur, fx, fy) {
    dur = dur || 700;
    var p = pointIn(win, el, fx, fy);
    placeCursor(c, p[0], p[1], dur);
    await sleep(dur);
  }
  async function click(c, el) {
    c.classList.remove('press');
    void c.offsetWidth;
    c.classList.add('press');
    if (el) el.classList.add('pressing');
    await sleep(150);
    if (el) el.classList.remove('pressing');
    await sleep(130);
  }
  function park(c, win) {
    var w = win.getBoundingClientRect();
    c.style.transitionDuration = '0ms, 0ms';
    c.style.transform = 'translate(' + (w.width * 0.82).toFixed(0) + 'px,' + (w.height + 12).toFixed(0) + 'px)';
    c.classList.remove('on', 'press');
  }

  /* ---------- Screen 1: incident audit ---------- */
  function auditScreen(win) {
    var tabs = $$('.tab', win), fills = $$('.bar-fill', win), vals = $$('.bar-val', win);
    var kls = $$('[data-kl]', win), kvs = $$('[data-kv]', win);
    var data = {
      aiid: { us: 66, row: 34, k: [['Incidents analysed', '136'], ['Report links', '1,177'], ['Model · exploratory', 'IRR 1.43 [0.76, 2.69]']] },
      aiaaic: { us: 55, row: 45, k: [['Incidents with a country', '1,944 of 2,259'], ['Report counts', 'Not in this source'], ['Used for', 'Location cross-check']] }
    };
    function set(src) {
      var d = data[src];
      tabs.forEach(function (t) {
        var on = t.dataset.src === src;
        t.classList.toggle('is-on', on);
        t.setAttribute('aria-selected', String(on));
      });
      fills[0].style.setProperty('--v', d.us);
      fills[1].style.setProperty('--v', d.row);
      vals[0].textContent = d.us + '%';
      vals[1].textContent = d.row + '%';
      kls.forEach(function (k, i) { k.textContent = d.k[i][0]; });
      kvs.forEach(function (k, i) { k.textContent = d.k[i][1]; });
    }
    tabs.forEach(function (t) { t.addEventListener('click', function () { set(t.dataset.src); }); });
    return {
      reset: function () {
        set('aiid');
        fills.forEach(function (f) { f.style.setProperty('--v', 0); });
        vals.forEach(function (v) { v.textContent = '0%'; });
      },
      final: function () { set('aiid'); },
      play: async function (c) {
        await sleep(350);
        set('aiid');
        await sleep(1700);
        await move(c, win, tabs[1], 800);
        await click(c, tabs[1]);
        set('aiaaic');
        await sleep(1900);
        await move(c, win, tabs[0], 650);
        await click(c, tabs[0]);
        set('aiid');
        await sleep(500);
        await move(c, win, $('.aud-foot', win), 700, 0.8, 0.6);
      }
    };
  }

  /* ---------- Screen 2: drift explorer with slider ---------- */
  function driftScreen(win) {
    var heat = $('.heat', win), hds = $$('.hd', win), sel = $('.col-sel', win);
    var cells = $$('.cell', win);
    var slider = $('.slider', win), track = $('.s-track', win), thumb = $('.s-thumb', win);
    var roDec = $('.ro-dec', win), roText = $('.ro-text', win);
    var decades = ['1950s', '1960s', '1970s', '1980s', '1990s', '2000s', '2010s', '2020s'];
    var notes = [
      '<b>trade</b> drifts 0.43, the largest shift in the study, as wartime economics gave way to international trade frameworks.',
      'No headline shift reported for this decade. Social justice and civil rights lead the topics.',
      '<b>terrorism</b> drifts 0.37: the label covers Cold War threats, including Castro’s Cuba. <b>tax</b> spikes.',
      '<b>terrorism</b> drifts again, 0.41, as the label pivots to the Middle East. <b>tax</b>, <b>education</b> and <b>trade</b> become outliers: Reagan-era language reframed them.',
      'Healthcare begins its rise as a topic, a climb that runs through today.',
      'No headline shift reported for this decade.',
      '<b>tax</b> spikes again, between the Bush and Obama eras.',
      'Most terms converge: political language grows more uniform. <b>equality</b> is the exception, less stable now than in the 1950s.'
    ];
    var idx = 0;
    function placeSel() {
      var h = hds[idx], last = cells[cells.length - 1];
      if (!h || !last) return;
      sel.style.transform = 'translate(' + (h.offsetLeft - 2) + 'px,' + (h.offsetTop - 2) + 'px)';
      sel.style.width = (h.offsetWidth + 4) + 'px';
      sel.style.height = (last.offsetTop + last.offsetHeight - h.offsetTop + 4) + 'px';
    }
    function set(i) {
      idx = clamp(i, 0, 7);
      track.style.setProperty('--f', idx / 7);
      hds.forEach(function (h, j) { h.classList.toggle('act', j === idx); });
      placeSel();
      roDec.textContent = decades[idx];
      roText.innerHTML = notes[idx];
      thumb.setAttribute('aria-valuenow', String(idx));
      thumb.setAttribute('aria-valuetext', decades[idx]);
    }
    function fromX(x) {
      var r = track.getBoundingClientRect();
      return Math.round(clamp((x - r.left) / r.width, 0, 1) * 7);
    }
    var dragging = false;
    slider.addEventListener('pointerdown', function (e) {
      dragging = true;
      try { slider.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      win.classList.add('dragging');
      set(fromX(e.clientX));
    });
    slider.addEventListener('pointermove', function (e) { if (dragging) set(fromX(e.clientX)); });
    function endDrag() { dragging = false; win.classList.remove('dragging'); }
    slider.addEventListener('pointerup', endDrag);
    slider.addEventListener('pointercancel', endDrag);
    thumb.addEventListener('keydown', function (e) {
      var k = e.key;
      if (k === 'ArrowRight' || k === 'ArrowUp') set(idx + 1);
      else if (k === 'ArrowLeft' || k === 'ArrowDown') set(idx - 1);
      else if (k === 'Home') set(0);
      else if (k === 'End') set(7);
      else return;
      e.preventDefault();
    });
    window.addEventListener('resize', placeSel);
    fontsReady.then(placeSel);
    set(0);
    return {
      reset: function () { set(0); },
      final: function () { set(3); },
      play: async function (c) {
        set(0);
        await sleep(700);
        await move(c, win, thumb, 800);
        await click(c, thumb);
        win.classList.add('dragging');
        var stops = [2, 3, 6, 7];
        for (var s = 0; s < stops.length; s++) {
          var r = track.getBoundingClientRect(), w = win.getBoundingClientRect();
          var x = r.left - w.left + r.width * (stops[s] / 7);
          var y = r.top - w.top + r.height / 2;
          placeCursor(c, x, y, 700);
          set(stops[s]);
          await sleep(700);
          win.classList.remove('dragging');
          await sleep(s === stops.length - 1 ? 200 : 2000);
          if (s < stops.length - 1) { await click(c, null); win.classList.add('dragging'); }
        }
      }
    };
  }

  /* ---------- Screen 3: test harness ---------- */
  function harnessScreen(win) {
    var btn = $('.run-btn', win), lines = $$('.lines li', win), prog = $('.prog', win), models = $$('.model', win);
    var busy = false;
    function reset() {
      lines.forEach(function (l) { l.classList.remove('show'); });
      prog.style.setProperty('--p', 0);
      btn.textContent = '▶ Run checks';
      btn.classList.remove('done', 'running');
      models.forEach(function (m) { m.classList.remove('pass'); });
    }
    function final() {
      lines.forEach(function (l) { l.classList.add('show'); });
      prog.style.setProperty('--p', 1);
      btn.textContent = '✓ 6 passed';
      btn.classList.remove('running');
      btn.classList.add('done');
      models.forEach(function (m) { m.classList.add('pass'); });
    }
    async function run() {
      if (!motion()) { final(); return; }
      reset();
      btn.classList.add('running');
      btn.textContent = 'Running…';
      for (var i = 0; i < lines.length; i++) {
        await sleep(i === 0 ? 250 : 340);
        var li = lines[i];
        li.classList.add('show');
        prog.style.setProperty('--p', (i + 1) / lines.length);
        if (li.dataset.last) {
          models.forEach(function (m) { if (m.dataset.model === li.dataset.model) m.classList.add('pass'); });
        }
      }
      final();
    }
    btn.addEventListener('click', async function () {
      if (busy) return;
      busy = true;
      try { await run(); } finally { busy = false; }
    });
    return {
      reset: reset,
      final: final,
      play: async function (c) {
        reset();
        await sleep(600);
        await move(c, win, btn, 800);
        await click(c, btn);
        busy = true;
        try { await run(); } finally { busy = false; }
        await sleep(300);
        await move(c, win, $('.term', win), 700, 0.7, 0.85);
      }
    };
  }

  /* ---------- Screen 4: website with event stream ---------- */
  function siteScreen(win) {
    var links = $$('.lk', win), pages = $$('.page', win), list = $('.ev-list', win), path = $('.url-path', win);
    var cta = $('.cta', win), sendDemo = $('.send-demo', win);
    var start = Date.now();
    function log(type, detail) {
      var li = document.createElement('li');
      var s = ((Date.now() - start) / 1000).toFixed(1);
      li.innerHTML = '<span class="t">+' + s + 's</span><b></b><span class="d"></span>';
      li.querySelector('b').textContent = type;
      li.querySelector('.d').textContent = detail;
      list.insertBefore(li, list.firstChild);
      requestAnimationFrame(function () { requestAnimationFrame(function () { li.classList.add('show'); }); });
      while (list.children.length > 6) list.removeChild(list.lastChild);
    }
    function go(p, how) {
      links.forEach(function (l) { l.classList.toggle('on', l.dataset.page === p); });
      pages.forEach(function (pg) { pg.classList.toggle('on', pg.dataset.page === p); });
      var url = p === 'home' ? '/' : '/' + p;
      path.textContent = url;
      if (how) log('click', how);
      log('page_view', url);
    }
    function link(p) { return links.filter(function (l) { return l.dataset.page === p && !l.classList.contains('logo'); })[0]; }
    links.forEach(function (l) {
      l.addEventListener('click', function () { go(l.dataset.page, 'nav · ' + l.textContent.trim()); });
    });
    cta.addEventListener('click', function () { go('contact', 'cta · Get in touch'); });
    sendDemo.addEventListener('click', function () { log('form_submit', '/contact'); });
    function reset() { list.innerHTML = ''; start = Date.now(); go('home'); }
    reset();
    return {
      reset: reset,
      final: reset,
      play: async function (c) {
        reset();
        await sleep(900);
        await move(c, win, link('services'), 800);
        await click(c, link('services'));
        go('services', 'nav · Services');
        await sleep(1500);
        await move(c, win, link('team'), 600);
        await click(c, link('team'));
        go('team', 'nav · Team');
        await sleep(1500);
        await move(c, win, link('home'), 600);
        await click(c, link('home'));
        go('home', 'nav · Home');
        await sleep(900);
        await move(c, win, cta, 700);
        await click(c, cta);
        go('contact', 'cta · Get in touch');
        await sleep(1300);
        await move(c, win, sendDemo, 700);
        await click(c, sendDemo);
        log('form_submit', '/contact');
      }
    };
  }

  /* ---------- Wire up screens: snap in, then play ---------- */
  var factories = { audit: auditScreen, drift: driftScreen, harness: harnessScreen, site: siteScreen };
  var controllers = [];
  $$('.win[data-screen]').forEach(function (win) {
    var make = factories[win.dataset.screen];
    if (!make) return;
    var ctrl = make(win);
    ctrl.win = win;
    ctrl.cursor = makeCursor(win);
    ctrl.playing = false;
    ctrl.played = false;
    controllers.push(ctrl);
    if (motion() && 'IntersectionObserver' in window) {
      ctrl.reset();
      win.classList.add('pre');
    } else {
      ctrl.final();
    }
    var stage = win.closest('.stage');
    var rp = stage ? $('.replay', stage) : null;
    if (rp) rp.addEventListener('click', function () { runScreen(ctrl, true); });
  });

  async function runScreen(ctrl, replay) {
    if (ctrl.playing) return;
    var win = ctrl.win, c = ctrl.cursor;
    if (!motion()) { ctrl.final(); return; }
    ctrl.playing = true;
    try {
      if (!replay) {
        offsetFor(win, undefined, cols() === 4 ? 8 : 16);
        win.classList.add('off');
        await sleep(320);
        win.classList.remove('pre');
        await sleep(650);
        win.classList.remove('off');
        await sleep(380);
      }
      park(c, win);
      ctrl.reset();
      await sleep(60);
      await ctrl.play(c);
    } finally {
      ctrl.playing = false;
      ctrl.played = true;
    }
  }

  if (motion() && 'IntersectionObserver' in window) {
    var screenObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var ctrl = controllers.filter(function (x) { return x.win === en.target; })[0];
        screenObs.unobserve(en.target);
        if (ctrl && !ctrl.played) runScreen(ctrl, false);
      });
    }, { threshold: 0.35 });
    controllers.forEach(function (ctrl) { screenObs.observe(ctrl.win); });
  }

  /* ---------- Timeline draws as you scroll ---------- */
  var timeline = $('#timeline');
  var tlItems = timeline ? $$('.tl-item', timeline) : [];
  function updateTimeline() {
    if (!timeline || !motion()) return;
    var r = timeline.getBoundingClientRect();
    var vh = window.innerHeight || document.documentElement.clientHeight;
    var p = clamp((vh * 0.62 - r.top) / Math.max(r.height, 1), 0, 1);
    timeline.style.setProperty('--p', p.toFixed(4));
    var H = timeline.offsetHeight || 1;
    tlItems.forEach(function (it) {
      it.classList.toggle('lit', (it.offsetTop + 10) / H <= p + 0.001);
    });
  }
  if (timeline && motion()) {
    timeline.classList.add('armed');
    var tlRaf = 0;
    window.addEventListener('scroll', function () {
      if (tlRaf) return;
      tlRaf = requestAnimationFrame(function () { tlRaf = 0; updateTimeline(); });
    }, { passive: true });
    updateTimeline();
  }

  /* ---------- Scroll progress: a line along the top of the menu bar ---------- */
  var navBar = $('header.nav');
  if (navBar) {
    var bar = document.createElement('div');
    bar.className = 'progress';
    bar.setAttribute('aria-hidden', 'true');
    bar.appendChild(document.createElement('span'));
    navBar.appendChild(bar);
    var progressRaf = 0;
    var updateProgress = function () {
      progressRaf = 0;
      var max = document.documentElement.scrollHeight - window.innerHeight;
      var p = max > 0 ? clamp(window.scrollY / max, 0, 1) : 0;
      bar.style.setProperty('--p', p.toFixed(4));
    };
    var queueProgress = function () {
      if (!progressRaf) progressRaf = requestAnimationFrame(updateProgress);
    };
    window.addEventListener('scroll', queueProgress, { passive: true });
    window.addEventListener('resize', queueProgress);
    window.addEventListener('load', queueProgress);
    updateProgress();
  }

  /* ---------- Copy email ---------- */
  $$('[data-copy]').forEach(function (b) {
    b.addEventListener('click', async function () {
      var v = b.dataset.copy, ok = false;
      try {
        await navigator.clipboard.writeText(v);
        ok = true;
      } catch (e) {
        var ta = document.createElement('textarea');
        ta.value = v;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        try { ok = document.execCommand('copy'); } catch (err) { ok = false; }
        document.body.removeChild(ta);
      }
      var lab = b.querySelector('[data-copy-label]');
      var old = 'Copy email';
      lab.textContent = ok ? 'Copied' : 'Select and copy';
      b.classList.toggle('copied', ok);
      setTimeout(function () { lab.textContent = old; b.classList.remove('copied'); }, 1800);
    });
  });

  /* ---------- Brief form → opens the visitor's email app ---------- */
  var form = $('#brief');
  if (form) {
    var status = $('#brief-status');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!form.checkValidity()) {
        form.reportValidity();
        status.textContent = 'Please add your name, your email and a line about what you have in mind.';
        return;
      }
      var d = new FormData(form);
      var name = (d.get('name') || '').toString().trim();
      var org = (d.get('org') || '').toString().trim();
      var subject = 'Message: ' + d.get('type') + ' — ' + (org || name);
      var body = [
        'Name: ' + name,
        'Email: ' + d.get('email'),
        'Organization: ' + (org || '—'),
        'About: ' + d.get('type'),
        '',
        (d.get('message') || '').toString()
      ].join('\n');
      window.location.href = 'mailto:' + EMAIL + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
      status.textContent = 'Your email app should open with this message filled in. If it doesn’t, write to ' + EMAIL + '.';
    });
  }
})();
