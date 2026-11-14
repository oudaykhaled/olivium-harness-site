/* Benchmark page enhancements. Every section and number is in the HTML already;
   this file only adds navigation state, step-through tabs, tooltips, copy buttons,
   chapter seeking and an image viewer. Loaded with defer. */
(function () {
  'use strict';
  var doc = document;
  function all(sel, root) { return Array.prototype.slice.call((root || doc).querySelectorAll(sel)); }

  var data = null;
  try { data = JSON.parse(doc.getElementById('bench-data').textContent); } catch (e) { data = null; }

  /* ---- 1. section index: mark the section in view ---- */
  (function toc() {
    var nav = doc.querySelector('.bm-toc');
    if (!nav) return;
    var links = all('a[href^="#"]', nav), byId = {};
    links.forEach(function (a) { byId[a.getAttribute('href').slice(1)] = a; });
    var strip = nav.querySelector('ol');
    function mark(id) {
      var link = byId[id];
      if (!link || link.getAttribute('aria-current') === 'location') return;
      links.forEach(function (a) { a.removeAttribute('aria-current'); });
      link.setAttribute('aria-current', 'location');
      if (strip && strip.scrollWidth > strip.clientWidth) {
        var left = link.offsetLeft - (strip.clientWidth - link.offsetWidth) / 2;
        strip.scrollLeft = Math.max(0, left);
      }
    }
    var sections = all('main section[id]').filter(function (s) { return byId[s.id] || byId[s.getAttribute('data-toc-parent')]; });
    if (!('IntersectionObserver' in window) || !sections.length) return;
    var visible = {};
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { visible[en.target.id] = en.isIntersecting; });
      for (var i = 0; i < sections.length; i++) {
        if (visible[sections[i].id]) { mark(byId[sections[i].id] ? sections[i].id : sections[i].getAttribute('data-toc-parent')); break; }
      }
    }, { rootMargin: '-30% 0px -69% 0px', threshold: 0 });
    sections.forEach(function (s) { io.observe(s); });
    mark(sections[0].id);
  })();

  /* ---- 2. tabs: pipeline workbench, paired-difference toggle, task explorer ---- */
  var tabSets = [];
  function initTabs(root) {
    var list = root.querySelector('[data-tablist]');
    if (!list) return;
    var tabs = all('[data-tab]', list);
    var panels = tabs.map(function (t) { return doc.getElementById(t.getAttribute('href').slice(1)); });
    if (!tabs.length || panels.indexOf(null) !== -1) return;
    var prev = root.querySelector('[data-prev]'), next = root.querySelector('[data-next]');
    var count = all('[data-count]', root), current = 0;
    function two(n) { return (n < 10 ? '0' : '') + n; }
    function name(i) { return tabs[i].getAttribute('data-name') || tabs[i].textContent.trim(); }
    function select(i, focus) {
      current = (i + tabs.length) % tabs.length;
      tabs.forEach(function (t, k) {
        var on = k === current;
        t.setAttribute('aria-selected', on ? 'true' : 'false');
        t.tabIndex = on ? 0 : -1;
        panels[k].hidden = !on;
      });
      count.forEach(function (c) { c.textContent = two(current + 1) + ' OF ' + two(tabs.length); });
      if (prev) { prev.disabled = current === 0; }
      if (next) {
        next.disabled = current === tabs.length - 1;
        var label = next.querySelector('[data-next-label]');
        if (label) label.textContent = current === tabs.length - 1 ? 'Last step' : 'Next: ' + name(current + 1);
      }
      if (focus) tabs[current].focus();
    }
    list.setAttribute('role', 'tablist');
    tabs.forEach(function (t, i) {
      var p = panels[i];
      t.setAttribute('role', 'tab');
      t.id = t.id || p.id + '-tab';
      t.setAttribute('aria-controls', p.id);
      p.setAttribute('role', 'tabpanel');
      p.setAttribute('aria-labelledby', t.id);
      t.addEventListener('click', function (ev) { ev.preventDefault(); select(i, false); });
      t.addEventListener('keydown', function (ev) {
        var k = ev.key, to = null;
        if (k === 'ArrowRight' || k === 'ArrowDown') to = current + 1;
        else if (k === 'ArrowLeft' || k === 'ArrowUp') to = current - 1;
        else if (k === 'Home') to = 0;
        else if (k === 'End') to = tabs.length - 1;
        else if (k === ' ' || k === 'Spacebar') { ev.preventDefault(); select(i, false); return; }
        if (to !== null) { ev.preventDefault(); select(to, true); }
      });
    });
    if (prev) prev.addEventListener('click', function () { select(current - 1, false); });
    if (next) next.addEventListener('click', function () { select(current + 1, false); });
    all('[data-js-only]', root).forEach(function (el) { el.hidden = false; });
    root.classList.add('is-tabbed');
    select(0, false);
    /* on wide screens keep the frame the height of its tallest panel, so the controls below do not move */
    if (root.hasAttribute('data-equal')) {
      var equalize = function () {
        var max = 0, wide = window.innerWidth > 940;
        panels.forEach(function (p) { p.style.minHeight = ''; });
        if (!wide) return;
        panels.forEach(function (p) { var was = p.hidden; p.hidden = false; max = Math.max(max, p.offsetHeight); p.hidden = was; });
        panels.forEach(function (p) { p.style.minHeight = max + 'px'; });
      };
      var timer = null;
      window.addEventListener('resize', function () { clearTimeout(timer); timer = setTimeout(equalize, 150); });
      if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(equalize);
      equalize();
    }
    tabSets.push({ panels: panels, select: select });
  }
  all('[data-tabs]').forEach(initTabs);

  /* a link to #step-3 or #task-... opens that panel */
  function openFromHash() {
    var id = decodeURIComponent((location.hash || '').slice(1));
    if (!id) return;
    var target = doc.getElementById(id);
    if (!target) return;
    tabSets.forEach(function (set) {
      set.panels.forEach(function (p, i) {
        if (p === target || p.contains(target)) { set.select(i, false); target.scrollIntoView(); }
      });
    });
  }
  window.addEventListener('hashchange', openFromHash);
  openFromHash();
  /* again once fonts and layout have settled, so the panel does not end up under the sticky index */
  if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(openFromHash);
  window.addEventListener('load', openFromHash);

  /* ---- 3. tooltips with exact values ---- */
  (function tooltips() {
    var tip = doc.createElement('div');
    tip.className = 'bm-tip';
    tip.setAttribute('role', 'tooltip');
    tip.id = 'bm-tip';
    tip.hidden = true;
    doc.body.appendChild(tip);
    var owner = null;
    function text(el) {
      if (el.hasAttribute('data-tip')) return el.getAttribute('data-tip');
      if (!data) return '';
      var t = data.tasks[el.getAttribute('data-task')], s = t && t.setups[el.getAttribute('data-setup')];
      if (!s) return '';
      return t.label + ' / ' + data.setup_labels[el.getAttribute('data-setup')] + ': ' + s.cost + ' mean cost per run, ' +
        s.solved + ' solved, ' + s.refused + ' refused, ' + s.turns + ' mean turns, ' + s.tokens + ' mean tokens';
    }
    function show(el) {
      var value = text(el);
      if (!value) return;
      owner = el;
      tip.textContent = value;
      tip.hidden = false;
      var r = el.getBoundingClientRect(), w = tip.offsetWidth, h = tip.offsetHeight, vw = doc.documentElement.clientWidth;
      var left = Math.min(Math.max(8, r.left + r.width / 2 - w / 2), vw - w - 8);
      var top = r.top - h - 10;
      if (top < 52) top = r.bottom + 10;
      tip.style.left = Math.round(left) + 'px';
      tip.style.top = Math.round(top) + 'px';
    }
    function hide() { owner = null; tip.hidden = true; }
    function target(node) { return node && node.closest ? node.closest('[data-tip], [data-task][data-setup]') : null; }
    doc.addEventListener('mouseover', function (ev) { var el = target(ev.target); if (el) show(el); });
    doc.addEventListener('mouseout', function (ev) { if (target(ev.target) === owner) hide(); });
    doc.addEventListener('focusin', function (ev) { var el = target(ev.target); if (el) show(el); });
    doc.addEventListener('focusout', hide);
    doc.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') hide(); });
    window.addEventListener('scroll', hide, { passive: true });
    /* chart marks become reachable by keyboard; their value is also the mark's label */
    all('[data-tip-focus]').forEach(function (el) { el.setAttribute('tabindex', '0'); });
  })();

  /* ---- 4. copy buttons on commands ---- */
  (function copy() {
    var blocks = all('.bm-cmd');
    if (!blocks.length) return;
    var live = doc.createElement('p');
    live.className = 'sr-only';
    live.setAttribute('role', 'status');
    blocks[0].parentNode.appendChild(live);
    function command(block) {
      return all('.k', block).map(function (k) { return k.textContent.replace(/^\s+/, ''); }).join('\n');
    }
    function fallback(block, value) {
      var ok = false, area = doc.createElement('textarea');
      area.value = value;
      area.setAttribute('readonly', '');
      area.className = 'sr-only';
      doc.body.appendChild(area);
      area.select();
      try { ok = doc.execCommand('copy'); } catch (e) { ok = false; }
      doc.body.removeChild(area);
      if (!ok) {
        var range = doc.createRange(), sel = window.getSelection();
        range.selectNodeContents(block.querySelector('pre'));
        sel.removeAllRanges();
        sel.addRange(range);
      }
      return ok;
    }
    blocks.forEach(function (block) {
      var btn = doc.createElement('button'), timer = null;
      btn.type = 'button';
      btn.className = 'bm-copy';
      btn.innerHTML = '<span data-state>Copy</span><span class="sr-only"> ' + (block.getAttribute('data-copy-label') || 'command') + '</span>';
      var state = btn.querySelector('[data-state]');
      function done(ok) {
        state.textContent = ok ? 'Copied' : 'Selected';
        btn.classList.toggle('is-done', ok);
        live.textContent = ok ? 'Copied to the clipboard.' : 'Copying is not available here. The command is selected; copy it with the keyboard.';
        clearTimeout(timer);
        timer = setTimeout(function () { state.textContent = 'Copy'; btn.classList.remove('is-done'); live.textContent = ''; }, 2400);
      }
      btn.addEventListener('click', function () {
        var value = command(block);
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(value).then(function () { done(true); }, function () { done(fallback(block, value)); });
        } else { done(fallback(block, value)); }
      });
      block.appendChild(btn);
    });
  })();

  /* ---- 5. recording: chapter list seeks the video ---- */
  (function chapters() {
    var video = doc.querySelector('.bm-video video');
    if (!video) return;
    var items = all('.bm-chapters li[data-start]');
    items.forEach(function (li) {
      var time = li.querySelector('.bm-time');
      if (!time) return;
      var btn = doc.createElement('button');
      btn.type = 'button';
      btn.className = 'bm-time';
      btn.innerHTML = time.innerHTML + '<span class="sr-only"> play the recording from here</span>';
      btn.addEventListener('click', function () {
        var at = parseFloat(li.getAttribute('data-start')) || 0;
        function go() { video.currentTime = at; var p = video.play(); if (p && p.catch) p.catch(function () {}); }
        if (video.readyState >= 1) { go(); }
        else {
          video.addEventListener('loadedmetadata', go, { once: true });
          video.preload = 'metadata';
          video.load();
        }
      });
      time.parentNode.replaceChild(btn, time);
    });
    video.addEventListener('timeupdate', function () {
      var t = video.currentTime;
      items.forEach(function (li) {
        var on = t >= parseFloat(li.getAttribute('data-start')) && t < parseFloat(li.getAttribute('data-end'));
        li.classList.toggle('is-now', on && !video.paused);
      });
    });
    video.addEventListener('pause', function () { items.forEach(function (li) { li.classList.remove('is-now'); }); });
  })();

  /* ---- 6. gallery: open a screenshot at full size ---- */
  (function gallery() {
    var links = all('.bm-gallery a.bm-shot');
    if (!links.length || typeof window.HTMLDialogElement !== 'function') return;
    var dlg = doc.createElement('dialog');
    dlg.className = 'bm-lightbox';
    dlg.setAttribute('aria-label', 'Screenshot at full size');
    dlg.innerHTML = '<div class="window-bar"><span class="window-title" data-lb-title></span>' +
      '<span class="bm-lb-actions"><button type="button" data-lb-prev>&larr;<span class="sr-only"> Previous screenshot</span></button>' +
      '<button type="button" data-lb-next>&rarr;<span class="sr-only"> Next screenshot</span></button>' +
      '<button type="button" data-lb-close autofocus>Close</button></span></div>' +
      '<div class="bm-lb-body"><img alt=""></div><p class="bm-cap" data-lb-cap></p>';
    doc.body.appendChild(dlg);
    var first = links[0].querySelector('img');
    dlg.querySelector('img').setAttribute('width', first.getAttribute('width'));
    dlg.querySelector('img').setAttribute('height', first.getAttribute('height'));
    var img = dlg.querySelector('img'), cap = dlg.querySelector('[data-lb-cap]'), title = dlg.querySelector('[data-lb-title]'), at = 0;
    function show(i) {
      at = (i + links.length) % links.length;
      var link = links[at], thumb = link.querySelector('img'), fig = link.closest('figure');
      img.src = link.getAttribute('href');
      img.alt = thumb.alt;
      img.width = thumb.getAttribute('width');
      img.height = thumb.getAttribute('height');
      var copy = fig.querySelector('figcaption').cloneNode(true);
      Array.prototype.forEach.call(copy.querySelectorAll('.bm-srcs, .sr-only'), function (n) { n.parentNode.removeChild(n); });
      cap.innerHTML = copy.innerHTML;
      title.textContent = 'screenshot ' + (at + 1) + ' of ' + links.length;
    }
    links.forEach(function (link, i) {
      link.addEventListener('click', function (ev) {
        if (ev.metaKey || ev.ctrlKey || ev.shiftKey) return;
        ev.preventDefault();
        show(i);
        dlg.showModal();
      });
    });
    dlg.querySelector('[data-lb-close]').addEventListener('click', function () { dlg.close(); });
    dlg.querySelector('[data-lb-prev]').addEventListener('click', function () { show(at - 1); });
    dlg.querySelector('[data-lb-next]').addEventListener('click', function () { show(at + 1); });
    dlg.addEventListener('click', function (ev) { if (ev.target === dlg) dlg.close(); });
    dlg.addEventListener('keydown', function (ev) {
      if (ev.key === 'ArrowRight') show(at + 1);
      else if (ev.key === 'ArrowLeft') show(at - 1);
    });
    dlg.addEventListener('close', function () { links[at].focus(); });
  })();

})();
