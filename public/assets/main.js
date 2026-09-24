(() => {
  const d = document;

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

  // Lead form: async submit to Formspree, inline confirmation
  d.querySelectorAll('form[data-lead]').forEach((form) => {
    const msg = form.querySelector('.form-msg');
    const btn = form.querySelector('button[type=submit]');
    form.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const data = new FormData(form);
      Object.entries(attr).forEach(([k, v]) => data.append('attr_' + k, v));
      data.append('page', location.pathname);
      btn.disabled = true; btn.textContent = 'Sending…';
      msg.className = 'form-msg'; msg.textContent = '';
      try {
        const res = await fetch(form.action, { method: 'POST', body: data, headers: { Accept: 'application/json' } });
        if (!res.ok) throw new Error(String(res.status));
        form.reset();
        msg.className = 'form-msg ok';
        msg.textContent = 'Got it. Your fixed-price plan lands in your inbox within 48 hours.';
        btn.textContent = 'Sent ✓';
        if (window.plausible) window.plausible('Lead');
      } catch (_) {
        msg.className = 'form-msg err';
        msg.innerHTML = 'Something went wrong. Email us at <a href="mailto:hello@snapforgelab.com">hello@snapforgelab.com</a>.';
        btn.disabled = false; btn.textContent = 'Get my fixed-price plan';
      }
    });
  });

  // Sticky mobile CTA: hide once the contact section is on screen
  const mcta = d.querySelector('.m-cta');
  const target = d.getElementById('contact');
  if (mcta && target && 'IntersectionObserver' in window) {
    new IntersectionObserver(([e]) => mcta.classList.toggle('hide', e.isIntersecting), { threshold: 0.05 }).observe(target);
  }

  d.querySelectorAll('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });
})();
