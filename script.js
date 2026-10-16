/* ------------------------------------------------------------------
   STUDIO IL · behaviour
   All text, pictures, projects and journal notes come from the JSON files
   in /content, which the client edits at /admin (Decap CMS).
   ------------------------------------------------------------------ */
(() => {
  const qs = (s, r = document) => r.querySelector(s);
  const qsa = (s, r = document) => [...r.querySelectorAll(s)];
  const pad = n => String(n).padStart(2, '0');
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const slugOf = str => String(str).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const root = document.documentElement;
  const body = document.body;

  /* ---------- Load the editable content ---------- */
  const FILES = ['home', 'projects', 'projects-page', 'journal', 'topics', 'journal-page', 'contact', 'contact-page', 'tamil'];
  Promise.all(FILES.map(f => fetch(`content/${f}.json`, { cache: 'no-cache' }).then(r => (r.ok ? r.json() : {})).catch(() => ({}))))
    .then(list => main(Object.fromEntries(FILES.map((f, i) => [f, list[i] || {}]))));

  function main(C) {
    /* ---------- Shape the content for the pages ---------- */
    const PROJECTS = (C.projects.projects || []).map(p => ({
      ...p,
      status: /complete/i.test(p.status || '') ? 'completed' : 'upcoming',
      sections: (p.spaces || []).map(s => ({ title: s.title, images: (s.images || []).filter(Boolean).map(src => ({ src })) }))
    }));
    // notes are dated YYYY-MM-DD in the dashboard; newest first, so each topic shows its latest note
    const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const ISO = /^(\d{4})-(\d{2})-(\d{2})/;
    const when = d => { const m = ISO.exec(d || ''); return m ? +(m[1] + m[2] + m[3]) : 0; };
    const showDate = d => { const m = ISO.exec(d || ''); return m ? `${+m[3]} ${MONTHS[m[2] - 1]} ${m[1]}` : d || ''; };
    const JOURNAL = (C.journal.notes || []).map(n => ({
      ...n, id: slugOf(n.title), date: showDate(n.date), at: when(n.date),
      body: String(n.body || '').split(/\n\s*\n/).map(x => x.trim()).filter(Boolean)
    })).sort((a, b) => b.at - a.at);
    const DIVS = (C.topics.topics || []).map(x => x.name).filter(Boolean);
    const CT = C.contact;
    const PHONES = (CT.phones || []).filter(Boolean);
    const INSTA = (CT.instagram || []).filter(a => a && a.url);

    /* ---------- Language: English or Tamil ---------- */
    const LANG = root.lang === 'ta' ? 'ta' : 'en';
    const TA = Object.fromEntries((C.tamil.translations || []).filter(x => x.en && x.ta).map(x => [x.en.trim(), x.ta]));
    const t = str => (LANG === 'ta' && TA[String(str).trim()]) || str;
    const T = str => esc(t(str));
    const fill = (sel, text) => { const el = qs(sel); if (el && text != null && text !== '') el.textContent = t(text); };

    /* ---------- Text set in the dashboard, put into the fixed parts of each page ---------- */
    const home = qs('#home-info');
    if (home && C.home.title) {
      home.innerHTML = `
        <h1 class="title">${T(C.home.title)}</h1>
        <div class="credits">${(C.home.credits || []).map(c => `<p>${c.label ? `${T(c.label)}: ` : ''}${T(c.value)}</p>`).join('')}</div>
        ${(C.home.paragraphs || []).filter(Boolean).map(p => `<p>${T(p)}</p>`).join('')}`;
    }
    const PP = C['projects-page'];
    fill('[data-f="upcoming"]', PP.upcoming); fill('[data-f="completed"]', PP.completed);
    fill('#w-intro', PP.intro);
    const JP = C['journal-page'];
    fill('#j-kicker', JP.kicker); fill('#j-heading', JP.title); fill('#j-subtitle', JP.subtitle);
    const CP = C['contact-page'];
    fill('#c-title', CP.title); fill('#c-intro', CP.intro);
    const opts = (sel, list) => { const el = qs(sel); if (el && list && list.length) el.innerHTML = list.filter(Boolean).map(o => `<option>${esc(o)}</option>`).join(''); };
    opts('select[name="interest"]', CP.interests); opts('select[name="source"]', CP.sources);
    qsa('.foot-name').forEach(el => { if (CT.name) el.textContent = t(CT.name); });
    qsa('.foot-rights-text').forEach(el => { if (CT.rights) el.textContent = t(CT.rights); });

    if (LANG === 'ta') {
      const font = document.createElement('link');
      font.rel = 'stylesheet';
      font.href = 'https://fonts.googleapis.com/css2?family=Noto+Sans+Tamil:wght@300;400;600&display=swap';
      document.head.appendChild(font);
      qsa('[data-i18n]').forEach(el => { el.textContent = t(el.textContent.trim()); });
      qsa('[data-i18n-ph]').forEach(el => { el.placeholder = t(el.placeholder); });
      qsa('select option').forEach(el => { el.textContent = t(el.textContent.trim()); });
    }
    qsa('.lang').forEach(btn => {
      btn.textContent = LANG === 'ta' ? 'English' : 'தமிழ்';
      btn.lang = LANG === 'ta' ? 'en' : 'ta';
      btn.setAttribute('aria-label', LANG === 'ta' ? 'Switch to English' : 'தமிழுக்கு மாற்று');
      btn.addEventListener('click', () => {
        try { localStorage.setItem('il-lang', LANG === 'ta' ? 'en' : 'ta'); } catch (e) { /* private mode: not remembered */ }
        location.reload();
      });
    });

    /* ---------- Pictures ----------
       The original project photos have ready-made WebP versions next to them.
       Pictures uploaded in the dashboard are shown as they were uploaded. */
    const prebuilt = src => /^\/?projects\/.+\.jpe?g$/i.test(src);
    const big = src => (prebuilt(src) ? src.replace(/\.jpe?g$/i, '.webp') : src);
    const pic = (src, alt, sizes, lazy = true) => {
      if (!src) return '';
      const tail = ` sizes="${sizes}" alt="${esc(alt)}" decoding="async"${lazy ? ' loading="lazy"' : ''}>`;
      if (prebuilt(src)) {
        const base = esc(src.replace(/\.jpe?g$/i, ''));
        return `<img src="${base}.webp" srcset="${base}-800.webp 800w, ${base}.webp 1520w"${tail}`;
      }
      return `<img src="${esc(src)}"${tail}`;
    };
    const TRIO = '(max-width: 767px) 300px, (max-width: 1023px) 470px, 750px';
    const ROW = '(max-width: 767px) 92vw, 86vw';
    const byCode = code => PROJECTS.find(p => p.code === code);

    /* ---------- Home: slideshow ---------- */
    const track = qs('#track');
    if (track) {
      const slides = (C.home.slideshow || []).filter(s => s && s.image).map(s => ({ src: s.image, p: byCode(s.project) }));
      track.innerHTML = slides.map(s => {
        const name = s.p ? t(s.p.name) : '';
        const inner = pic(s.src, name, '(max-width: 1023px) 92vw, 72vw', false);
        return s.p ? `<a class="slide" href="project.html?p=${esc(s.p.code)}" aria-label="${esc(name)}" draggable="false">${inner}</a>` : `<div class="slide">${inner}</div>`;
      }).join('');
      const dots = qs('#slide-dots'), cap = qs('#slide-cap');
      dots.innerHTML = slides.map((_, i) => `<button aria-label="Image ${i + 1}"></button>`).join('');
      let cur = 0, timer = null;
      const go = n => {
        if (!slides.length) return;
        cur = (n + slides.length) % slides.length;
        track.style.transform = `translateX(${-cur * 100}%)`;
        qsa('button', dots).forEach((d, i) => d.setAttribute('aria-current', i === cur));
        cap.textContent = slides[cur].p ? t(slides[cur].p.name) : '';
      };
      const play = () => { clearInterval(timer); if (slides.length > 1) timer = setInterval(() => go(cur + 1), 6000); };
      const stop = () => clearInterval(timer);
      qs('.slide-arrow.go-prev').addEventListener('click', () => { go(cur - 1); play(); });
      qs('.slide-arrow.go-next').addEventListener('click', () => { go(cur + 1); play(); });
      qsa('button', dots).forEach((d, i) => d.addEventListener('click', () => { go(i); play(); }));
      addEventListener('keydown', e => {
        if (e.key === 'ArrowLeft') { go(cur - 1); play(); }
        if (e.key === 'ArrowRight') { go(cur + 1); play(); }
      });
      // swipe on phones
      let x0 = null, moved = false;
      const view = qs('.slides-view');
      view.addEventListener('pointerdown', e => { x0 = e.clientX; moved = false; });
      view.addEventListener('pointerup', e => {
        if (x0 === null) return;
        const dx = e.clientX - x0; x0 = null;
        if (Math.abs(dx) > 40) { moved = true; go(cur + (dx < 0 ? 1 : -1)); play(); }
      });
      view.addEventListener('click', e => { if (moved) e.preventDefault(); }, true);
      view.addEventListener('mouseenter', stop);
      view.addEventListener('mouseleave', play);
      go(0);
      if (!matchMedia('(prefers-reduced-motion: reduce)').matches) play();
    }

    /* ---------- Projects page: upcoming / completed (both shown until one is chosen) ---------- */
    const works = qs('#works');
    if (works) {
      works.innerHTML = PROJECTS.map((p, i) => `
        <a class="work" href="project.html?p=${esc(p.code)}" data-status="${p.status}">
          <div class="pic">${pic(p.cover, t(p.name), '(max-width: 767px) 46vw, (max-width: 1023px) 30vw, 22vw', i > 3)}</div>
          <p class="credits">${T(p.name)}</p>
        </a>`).join('');
      const nav = qs('#w-filter'), empty = qs('#w-empty');
      let current = null;
      const filter = f => {
        current = f;
        nav.classList.toggle('all', !f);
        qsa('a', nav).forEach(a => a.toggleAttribute('aria-current', a.dataset.f === f));
        qsa('.work', works).forEach(w => { w.hidden = !!f && w.dataset.status !== f; });
        const none = f && !qsa('.work:not([hidden])', works).length;
        empty.hidden = !none;
        if (none) empty.textContent = t(f === 'completed' ? 'Completed projects will appear here soon.' : 'New projects will appear here soon.');
      };
      qsa('a', nav).forEach(a => a.addEventListener('click', e => {
        e.preventDefault();
        const f = current === a.dataset.f ? null : a.dataset.f;   // pressing the chosen word again shows everything
        history.replaceState(null, '', f ? a.getAttribute('href') : 'projects.html');
        filter(f);
      }));
      const f0 = new URLSearchParams(location.search).get('f');
      filter(['upcoming', 'completed'].includes(f0) ? f0 : null);
    }

    /* ---------- Journal: the newest note of each topic, the first one large ---------- */
    const journal = qs('#journal');
    if (journal) {
      const params = new URLSearchParams(location.search);
      const only = DIVS.find(d => slugOf(d) === params.get('d'));   // one topic's older notes
      const per = 5;
      const link = n => `post.html?id=${encodeURIComponent(n.id)}`;
      const block = (notes, start) => {
        const num = i => pad(start + i + 1);
        const text = (n, i) => `
          <div class="j-text">
            <p class="j-cat credits"><a href="journal.html?d=${slugOf(n.category)}">${T(n.category)}</a> · ${num(i)}</p>
            <h3 class="title"><a href="${link(n)}">${T(n.title)}</a></h3>
            <p>${T(n.summary)}</p>
            <div class="j-meta"><span class="j-date credits">${T(n.date)}</span><a href="${link(n)}" aria-label="${T('Read')}: ${T(n.title)}">→</a></div>
          </div>`;
        const [first, ...rest] = notes;
        if (!first) return `<p class="j-empty">${T('No notes yet.')}</p>`;
        return `
          <article class="j-feature">
            <a class="j-pic" href="${link(first)}">${pic(first.image, t(first.title), '(max-width: 767px) 92vw, 60vw')}</a>
            ${text(first, 0)}
          </article>
          ${rest.length ? `<div class="j-grid">${rest.map((n, i) => `
            <article class="j-card">
              <a class="j-pic" href="${link(n)}">${pic(n.image, t(n.title), '(max-width: 767px) 92vw, 20vw')}</a>
              ${text(n, i + 1)}
            </article>`).join('')}</div>` : ''}`;
      };
      if (!only) {
        const picks = DIVS.map(d => JOURNAL.find(n => n.category === d)).filter(Boolean);
        journal.innerHTML = block(picks, 0);
      } else {
        const all = JOURNAL.filter(n => n.category === only);
        const pages = Math.max(1, Math.ceil(all.length / per));
        const page = Math.min(pages, Math.max(1, parseInt(params.get('page'), 10) || 1));
        const start = (page - 1) * per;
        qs('#j-kicker').innerHTML = `<a href="journal.html">${T(JP.kicker || 'Journal')}</a> · ${T(only)}`;
        journal.innerHTML = `<section class="j-section"><div class="j-head"><h2 class="title">${T(only)}</h2><span class="credits">${pad(all.length)}</span></div>${block(all.slice(start, start + per), start)}</section>`;
        const pageLink = n => `journal.html?d=${slugOf(only)}&page=${n}`;
        qs('#j-pages').innerHTML = `<span>${page > 1 ? `<a href="${pageLink(page - 1)}">← ${T('Newer notes')}</a>` : `<a href="journal.html">← ${T('All notes')}</a>`}</span><span>${page < pages ? `<a href="${pageLink(page + 1)}">${T('Older notes')} →</a>` : ''}</span>`;
      }
    }
    const post = qs('#post');
    if (post) {
      const id = new URLSearchParams(location.search).get('id');
      const n = JOURNAL.find(x => x.id === id) || JOURNAL[0];
      if (n) {
        const i = JOURNAL.filter(x => x.category === n.category).indexOf(n);
        document.title = `${t(n.title)} | ${t(CT.name || 'Studio Il')}`;
        post.innerHTML = `
          <div class="post-head">
            <p class="j-cat credits">${T(n.category)} · ${pad(i + 1)} · ${T(n.date)}</p>
            <h1 class="j-title title">${T(n.title)}</h1>
            <p class="j-sub">${T(n.summary)}</p>
          </div>
          <div class="post-pic">${pic(n.image, t(n.title), '92vw', false)}</div>
          <div class="post-body">${n.body.map(par => `<p>${T(par)}</p>`).join('')}</div>
          <a class="post-back" href="journal.html">← ${T(JP.kicker || 'Journal')}</a>`;
      }
    }

    /* ---------- Project page: text | image | text, then every image on its own row ---------- */
    const gallery = [];
    const host = qs('#project');
    if (host && PROJECTS.length) {
      const code = (new URLSearchParams(location.search).get('p') || '').toUpperCase();
      const idx = Math.max(0, PROJECTS.findIndex(p => String(p.code).toUpperCase() === code));
      const p = PROJECTS[idx];
      const next = PROJECTS[(idx + 1) % PROJECTS.length];
      document.title = `${t(p.name)} | ${t(CT.name || 'Studio Il')}`;
      const rows = p.sections.map(s => {
        const isPlan = /plan|moodboard/i.test(s.title);
        const shots = s.images.map(im => {
          const n = gallery.push({ src: big(im.src), cap: `${t(p.name)}, ${t(s.title)}` }) - 1;
          return `<button class="shot${isPlan ? ' plan' : ''}" data-i="${n}" aria-label="${T(s.title)}"><div>${pic(im.src, `${t(p.name)}, ${t(s.title)}`, ROW, n > 0)}</div></button>`;
        }).join('');
        // the room name shows above its pictures on phones only
        return `<section class="space" id="${slugOf(s.title)}"><p class="space-name credits">${T(s.title)}</p>${shots}</section>`;
      }).join('');
      const line = (label, value) => (value ? `<p>${T(label)}: ${T(value)}</p>` : '');
      host.innerHTML = `
        <div class="trio">
          <div class="trio-col">
            <a class="back" href="projects.html">${T('← All work')}</a>
            <h1 class="title">${T(p.name)}</h1>
            <div class="credits">
              ${line('Project', [p.code, p.no].filter(Boolean).join(' '))}
              ${line('Type', p.type)}
              ${line('Scope', p.scope)}
              ${line('Stage', [t(p.stage), p.year].filter(Boolean).join(', '))}
            </div>
            <p>${T(p.summary)}</p>
          </div>
          <div class="trio-pic"><div>${pic(p.cover, t(p.name), TRIO, false)}</div></div>
          <div class="trio-col">
            <div class="spaces">${p.sections.map(s => `<a href="#${slugOf(s.title)}">${T(s.title)}</a>`).join('')}</div>
          </div>
        </div>
        ${rows}
        ${PROJECTS.length > 1 ? `<a class="next" href="project.html?p=${esc(next.code)}"><p class="credits">${T('Next project')}</p><p class="title">${T(next.name)}</p></a>` : ''}`;
    }

    /* ---------- Menu: press "Menu" and the options take its place ---------- */
    const word = qs('.menu-word'), drop = qs('.drop');
    const setDrop = open => {
      // the paper sheet is sized to reach just below the last option
      if (open && drop) root.style.setProperty('--drop-h', `${Math.round(drop.getBoundingClientRect().bottom - qs('.bar').getBoundingClientRect().top) + 28}px`);
      body.classList.toggle('drop-open', open);
      if (word) { word.setAttribute('aria-expanded', open); word.setAttribute('aria-label', open ? 'Close menu' : 'Menu'); }
    };
    if (word) {
      word.addEventListener('click', e => { e.stopPropagation(); setDrop(!body.classList.contains('drop-open')); });
      document.addEventListener('click', e => { if (!e.target.closest('.drop')) setDrop(false); });
    }
    // the bar follows the page down; give it a strip of paper once content is passing under it
    const onScroll = () => body.classList.toggle('scrolled', scrollY > 8);
    addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    addEventListener('keydown', e => { if (e.key === 'Escape') setDrop(false); });

    /* ---------- Footer icons: phone, email, LinkedIn, Instagram ---------- */
    const icons = qs('#foot-icons');
    if (icons) {
      const ICON = {
        phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/>',
        mail: '<rect x="2.5" y="4.5" width="19" height="15" rx="1.5"/><path d="M3 6l9 7 9-7"/>',
        linkedin: '<rect x="2.5" y="2.5" width="19" height="19" rx="2.5"/><path d="M7.5 10v6.5M7.5 7.3v.1M11.5 16.5V10M11.5 12.8c0-1.6 1.1-2.8 2.6-2.8s2.4 1 2.4 2.8v3.7"/>',
        insta: '<rect x="2.5" y="2.5" width="19" height="19" rx="5"/><circle cx="12" cy="12" r="4.2"/><path d="M17.4 6.6v.01"/>'
      };
      const a = (key, href, label, ext) => `<a href="${esc(href)}" aria-label="${esc(label)}"${ext ? ' target="_blank" rel="noopener noreferrer"' : ''}><svg viewBox="0 0 24 24" aria-hidden="true">${ICON[key]}</svg></a>`;
      icons.innerHTML = [
        PHONES[0] && a('phone', `tel:${PHONES[0].replace(/\s/g, '')}`, 'Call'),
        CT.email && a('mail', `mailto:${CT.email}`, 'Email'),
        CT.linkedin && a('linkedin', CT.linkedin, 'LinkedIn', true),
        INSTA[0] && a('insta', INSTA[0].url, 'Instagram', true)
      ].filter(Boolean).join('');
    }

    /* ---------- Cursor: a small dot inside a fine ring that trails it (mouse only) ---------- */
    if (matchMedia('(hover: hover) and (pointer: fine)').matches && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const dot = document.createElement('div'), ring = document.createElement('div');
      dot.className = 'cursor-dot'; ring.className = 'cursor-ring';
      body.append(dot, ring);
      root.classList.add('has-cursor');
      let mx = 0, my = 0, rx = 0, ry = 0, running = false;
      const loop = () => {
        rx += (mx - rx) * 0.2; ry += (my - ry) * 0.2;
        ring.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;
        if (Math.abs(mx - rx) + Math.abs(my - ry) > 0.1) requestAnimationFrame(loop); else running = false;
      };
      addEventListener('pointermove', e => {
        if (e.pointerType !== 'mouse') return;
        if (!body.classList.contains('cursor-on')) { rx = e.clientX; ry = e.clientY; }
        mx = e.clientX; my = e.clientY;
        dot.style.transform = `translate3d(${mx}px, ${my}px, 0)`;
        body.classList.add('cursor-on');
        const el = e.target.closest ? e.target : null;
        body.classList.toggle('cursor-text', !!(el && el.closest('input, textarea, select')));
        body.classList.toggle('cursor-link', !!(el && el.closest('a, button, label')));
        if (!running) { running = true; requestAnimationFrame(loop); }
      }, { passive: true });
      document.addEventListener('pointerleave', () => body.classList.remove('cursor-on'));
    }

    /* ---------- Contact page ---------- */
    const cpic = qs('#contact-pic');
    if (cpic) cpic.innerHTML = pic(CP.image || (PROJECTS[0] && PROJECTS[0].cover), t(CP.title || ''), '(max-width: 1023px) 92vw, 42vw', false);
    const details = qs('#details');
    if (details) {
      const tel = n => `<a href="tel:${esc(n.replace(/\s/g, ''))}">${esc(n)}</a>`;
      details.innerHTML = `
        <div><p class="credits">${T('Call')}</p>${PHONES.map(tel).join('')}</div>
        <div><p class="credits">${T('Write')}</p>${CT.email ? `<a href="mailto:${esc(CT.email)}">${esc(CT.email)}</a>` : ''}</div>
        <div><p class="credits">${T('Visit')}</p>${(CT.address || []).filter(Boolean).map(l => `<p>${T(l)}</p>`).join('')}${CT.map_url ? `<a href="${esc(CT.map_url)}" target="_blank" rel="noopener noreferrer">${T('Open in Maps')}</a>` : ''}</div>
        <div><p class="credits">${T('Follow')}</p>${INSTA.map(a => `<a href="${esc(a.url)}" target="_blank" rel="noopener noreferrer">${esc(a.label)}</a>`).join('')}</div>`;
    }
    const form = qs('.form');
    if (form) {
      const note = qs('.form-note', form), send = qs('.send', form);
      form.addEventListener('submit', async e => {
        e.preventDefault();
        const data = new FormData(form);
        send.disabled = true; send.textContent = t('Sending');
        try {
          if (data.get('company')) throw new Error('trap'); // only spam bots fill the hidden field
          // sent by Web3Forms using the key set in the dashboard; without a key it falls through to email
          if (!CT.form_key) throw new Error('no form key');
          const body = Object.fromEntries(['name', 'phone', 'email', 'interest', 'source', 'message'].map(k => [k, data.get(k) || '']));
          body.access_key = CT.form_key;
          body.subject = 'Website enquiry from ' + (body.name || 'Studio Il website');
          const res = await fetch('https://api.web3forms.com/submit', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(body) });
          if (!res.ok) throw new Error(res.status);
          form.reset();
          note.textContent = t('Thank you. We will be in touch soon.');
        } catch (err) {
          note.textContent = t('Could not send from here. Your email app will open instead.');
          const lines = ['name', 'phone', 'email', 'interest', 'source', 'message'].map(k => `${k}: ${data.get(k) || ''}`);
          location.href = `mailto:${CT.email}?subject=${encodeURIComponent('Enquiry from ' + (data.get('name') || 'website'))}&body=${encodeURIComponent(lines.join('\n'))}`;
        }
        send.disabled = false; send.textContent = t('Send');
      });
    }

    /* ---------- Lightbox (project pages) ---------- */
    const lb = qs('.lightbox');
    if (lb && gallery.length) {
      const img = qs('img', lb), cap = qs('.lb-cap', lb);
      qs('.lb-close', lb).textContent = t('Close');
      let cur = 0;
      const show = i => {
        cur = (i + gallery.length) % gallery.length;
        img.src = gallery[cur].src; img.alt = gallery[cur].cap;
        cap.textContent = `${pad(cur + 1)} / ${pad(gallery.length)} · ${gallery[cur].cap}`;
      };
      const close = () => { lb.classList.remove('open'); lb.setAttribute('aria-hidden', 'true'); body.classList.remove('locked'); };
      qsa('button.shot').forEach(b => b.addEventListener('click', () => {
        show(+b.dataset.i); lb.classList.add('open'); lb.setAttribute('aria-hidden', 'false'); body.classList.add('locked');
      }));
      qs('.lb-close', lb).addEventListener('click', close);
      qs('.lb-prev', lb).addEventListener('click', () => show(cur - 1));
      qs('.lb-next', lb).addEventListener('click', () => show(cur + 1));
      lb.addEventListener('click', e => { if (e.target === lb) close(); });
      addEventListener('keydown', e => {
        if (!lb.classList.contains('open')) return;
        if (e.key === 'Escape') close();
        if (e.key === 'ArrowLeft') show(cur - 1);
        if (e.key === 'ArrowRight') show(cur + 1);
      });
    }

    qsa('.year').forEach(el => { el.textContent = new Date().getFullYear(); });
  }
})();
