(() => {
  const d = document;

  // Paste the checkout link for the $199 Ship-Ready Review here
  // (PayPal payment link or paypal.me/<name>/199USD).
  // While empty, "buy" buttons scroll to the review request form instead.
  const PAYMENT_URL = 'https://paypal.me/mbsimo/199USD';
  if (PAYMENT_URL) {
    d.querySelectorAll('[data-buy="review"]').forEach((a) => { a.href = PAYMENT_URL; });
  }

  // Founding-client offer: private page /founding-review/ (first 3 clients, $99).
  // Set open to false once the three spots are taken; the page then sends
  // visitors to the regular $199 review instead.
  const FOUNDING = { open: true, url: 'https://paypal.me/mbsimo/99USD' };
  const founding = d.querySelectorAll('[data-buy="founding"]');
  if (founding.length) {
    if (FOUNDING.open) founding.forEach((a) => { a.href = FOUNDING.url; });
    else location.replace('/replit-app-to-production/#book');
  }

  // Reveal on scroll
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((es) => {
      es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { threshold: 0.1 });
    d.querySelectorAll('.reveal').forEach((el) => io.observe(el));
  } else {
    d.querySelectorAll('.reveal').forEach((el) => el.classList.add('in'));
  }

  // Attribution: keep first-touch UTM params / referrer for the lead form
  const KEY = 'sf_attr';
  let attr = {};
  try { attr = JSON.parse(sessionStorage.getItem(KEY) || '{}'); } catch (_) {}
  const q = new URLSearchParams(location.search);
  if (!attr.source) {
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'ref'].forEach((k) => { if (q.get(k)) attr[k] = q.get(k); });
    attr.source = attr.utm_source || attr.ref || (d.referrer ? new URL(d.referrer).hostname : 'direct');
    attr.landing = location.pathname;
    try { sessionStorage.setItem(KEY, JSON.stringify(attr)); } catch (_) {}
  }

  // Lead form: async submit to Formspree, inline confirmation matched to the request
  const SUCCESS = {
    build: 'Got it. Your fixed-price plan lands in your inbox within 48 hours.',
    review: 'Got it. I’ll reply within 24 hours with the payment link and next steps.',
    'ship-ready-review': 'Got it. I’ll answer your question within 24 hours.',
    care: 'Got it. I’ll reply within 48 hours about Care for your app.',
    'readiness-score': 'Got it. I’ll email your results and the full checklist within 24 hours.',
  };
  d.querySelectorAll('form[data-lead]').forEach((form) => {
    const msg = form.querySelector('.form-msg');
    const btn = form.querySelector('button[type=submit]');
    const label = btn.textContent;
    form.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const data = new FormData(form);
      const kind = data.get('interest') || data.get('offer') || 'build';
      if (data.get('interest')) data.set('_subject', `New ${kind} request — snapforgelab.com`);
      Object.entries(attr).forEach(([k, v]) => data.append('attr_' + k, v));
      data.append('page', location.pathname);
      btn.disabled = true; btn.textContent = 'Sending…';
      msg.className = 'form-msg'; msg.textContent = '';
      try {
        const res = await fetch(form.action, { method: 'POST', body: data, headers: { Accept: 'application/json' } });
        if (!res.ok) throw new Error(String(res.status));
        form.reset();
        msg.className = 'form-msg ok';
        msg.textContent = SUCCESS[kind] || SUCCESS.build;
        btn.textContent = 'Sent ✓';
        if (window.plausible) window.plausible('Lead', { props: { kind } });
      } catch (_) {
        msg.className = 'form-msg err';
        msg.innerHTML = navigator.onLine === false
          ? 'You seem to be offline. Check your connection and send again; your message is still here.'
          : 'Your message didn’t go through. Send again, or email <a href="mailto:hello@snapforgelab.com">hello@snapforgelab.com</a>. Your message is still here.';
        btn.disabled = false; btn.textContent = label;
      }
    });
  });

  // Buttons that lead to the form pre-select what the visitor needs
  d.querySelectorAll('[data-interest]').forEach((a) => a.addEventListener('click', () => {
    const r = d.querySelector(`input[name="interest"][value="${a.dataset.interest}"]`);
    if (r) r.checked = true;
  }));

  // Sticky mobile CTA: only when no other primary action is on screen
  const mcta = d.querySelector('.m-cta');
  const zones = ['.hero', '#book', '#contact'].map((sel) => d.querySelector(sel)).filter(Boolean);
  if (mcta && zones.length && 'IntersectionObserver' in window) {
    const seen = new Set();
    mcta.classList.add('hide');
    const io = new IntersectionObserver((es) => {
      es.forEach((e) => (e.isIntersecting ? seen.add(e.target) : seen.delete(e.target)));
      mcta.classList.toggle('hide', seen.size > 0);
    }, { threshold: 0.05 });
    zones.forEach((z) => io.observe(z));
  }

  // Post-checkout redirect (?paid=1): confirm and give next step
  if (q.get('paid') === '1') {
    const m = d.getElementById('main');
    if (m) {
      const n = d.createElement('div');
      n.className = 'paid-note';
      n.setAttribute('role', 'status');
      n.innerHTML = '<strong>Payment received. Thank you!</strong> Next step: invite <b>hello@snapforgelab.com</b> as a collaborator on your Repl. Your report lands within 48 hours of access.';
      m.prepend(n);
    }
  }

  d.querySelectorAll('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });
})();
