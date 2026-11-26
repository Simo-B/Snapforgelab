(() => {
  const API_BASE = window.__SF_API_BASE || 'https://mcp.snapforgelab.com';
  const $ = (id) => document.getElementById(id);
  const esc = (t) => String(t ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const stackName = (s) => ({ replit: 'Replit', lovable: 'Lovable', bolt: 'Bolt' }[s] || null);
  const track = (event, props) => {
    if (window.posthog && typeof window.posthog.capture === 'function') {
      try { window.posthog.capture(event, props, { transport: 'sendBeacon' }); } catch (_) {}
    }
  };

  const CHECK_LABELS = {
    surface: { done: 'Surface & HTTP headers: checked HTTPS, security headers, cookies, CORS, robots.txt and sitemap.xml.' },
    secrets: {
      done: 'JavaScript bundles: scanned same-origin scripts and chunks for secret keys and source maps.',
      no_scripts_found: 'JavaScript bundles: no external same-origin scripts were referenced on the homepage.',
    },
    supabase_rls: {
      done: 'Supabase Row Level Security: tested discovered tables read-only with your public key (zero row data kept).',
      no_supabase_found: 'Supabase Row Level Security: no Supabase project detected in public bundles.',
      no_public_key_found: 'Supabase Row Level Security: Supabase URL detected, public key not in scanned bundles.',
      no_tables_found: 'Supabase Row Level Security: Supabase detected, no public table list exposed.',
    },
    auth_redirect: { done: 'Auth redirects: checked production code for preview and localhost callback URLs.' },
    storage_buckets: {
      done: 'Storage buckets: checked discovered buckets for anonymous file listing.',
      no_supabase_found: 'Storage buckets: no Supabase project detected.',
      no_public_key_found: 'Storage buckets: Supabase public key not in scanned bundles.',
      no_buckets_found: 'Storage buckets: no bucket names referenced in scanned bundles.',
    },
  };

  let currentPreview = null;
  let stepTimer = null;

  function normUrl(raw) {
    let u = (raw || '').trim();
    if (!u) return '';
    if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
    return u;
  }

  function startSteps() {
    const box = $('scan-progress');
    if (!box) return;
    const steps = Array.from(box.querySelectorAll('.scan-step'));
    let idx = 0;
    steps.forEach((el, i) => {
      el.classList.toggle('active', i === 0);
      el.classList.remove('done');
    });
    box.hidden = false;
    clearInterval(stepTimer);
    stepTimer = setInterval(() => {
      if (idx < steps.length - 1) {
        steps[idx].classList.remove('active');
        steps[idx].classList.add('done');
        idx += 1;
        steps[idx].classList.add('active');
      }
    }, 3200);
  }

  function stopSteps() {
    clearInterval(stepTimer);
    const box = $('scan-progress');
    if (box) box.hidden = true;
  }

  function sevBadge(sev) {
    const s = String(sev || 'medium').toLowerCase();
    const label = { critical: 'Critical', high: 'High', medium: 'Medium', low: 'Low' }[s] || s;
    return '<span class="sev ' + esc(s) + '">' + esc(label) + '</span>';
  }

  function hostOf(u) {
    try { return new URL(u).hostname; } catch (_) { return u || 'your app'; }
  }

  function renderPreview(r, opts = {}) {
    currentPreview = r;
    const score = r.score == null ? 0 : r.score;
    const gauge = $('gauge');
    gauge.style.setProperty('--p', score);
    gauge.dataset.level = score >= 85 ? 'ok' : score >= 60 ? 'mid' : 'low';
    $('score').textContent = r.score == null ? '–' : score;

    const st = stackName(r.stack);
    $('grade').textContent = (r.grade ? 'Grade ' + r.grade : 'No grade') + (st ? ' · ' + st + ' app' : '');

    const total = Number(r.findings_count || 0);
    const prevList = r.preview_findings || [];
    const lockedList = r.locked_findings || [];

    $('verdict').textContent =
      r.reachable === false
        ? 'We could not reach this app. If it is live, visitors may see an error too.'
        : r.http_status >= 400
          ? 'Your homepage answered with HTTP ' + r.http_status + '.'
          : total > 0
            ? total + ' real issue' + (total > 1 ? 's' : '') + ' detected on ' + hostOf(r.url) + '.'
            : 'No exposed secrets, open Supabase tables, CORS leaks or header gaps detected.';

    const sc = r.severity_counts || {};
    const pills = [];
    if (sc.critical) pills.push('<span class="sev-pill">' + sc.critical + ' critical</span>');
    if (sc.high) pills.push('<span class="sev-pill">' + sc.high + ' high</span>');
    if (sc.medium) pills.push('<span class="sev-pill">' + sc.medium + ' medium</span>');
    if (sc.low) pills.push('<span class="sev-pill">' + sc.low + ' low</span>');
    const pillsEl = $('sev-pills');
    pillsEl.innerHTML = pills.join('');
    pillsEl.hidden = !pills.length;

    // Already unlocked in this browser?
    let savedKey = '';
    try { savedKey = localStorage.getItem('sf_rk_' + r.scan_id) || ''; } catch (_) {}
    const savedNote = $('already-unlocked');
    if (savedNote) {
      if (savedKey) {
        savedNote.innerHTML = '<strong>Your full report is already unlocked on this device.</strong> <a class="link" href="/report/?id=' +
          encodeURIComponent(r.scan_id) + '#key=' + encodeURIComponent(savedKey) + '">Open full report &amp; fix prompts →</a>';
        savedNote.hidden = false;
      } else if (opts.canceled) {
        savedNote.innerHTML = 'Checkout canceled — your scan preview is saved below whenever you are ready.';
        savedNote.hidden = false;
      } else {
        savedNote.hidden = true;
      }
    }

    // Preview findings (up to 2 real issues)
    const previewWrap = $('preview-section');
    if (prevList.length) {
      $('preview-heading').textContent = total > prevList.length
        ? 'Preview: ' + prevList.length + ' of ' + total + ' issues found on ' + hostOf(r.url)
        : (prevList.length === 1 ? '1 issue found on ' + hostOf(r.url) : prevList.length + ' issues found on ' + hostOf(r.url));
      $('preview-gaps').innerHTML = prevList.map((f) => (
        '<li class="issue-card">' +
          '<div class="issue-top"><div class="issue-badges">' + sevBadge(f.severity) +
          (f.category ? '<span class="cat-tag">' + esc(f.category) + '</span>' : '') + '</div></div>' +
          '<h3>' + esc(f.title) + '</h3>' +
          '<p class="issue-detail">' + esc(f.detail) + '</p>' +
          (f.why_it_matters ? '<p class="issue-why"><strong>Why it matters:</strong> ' + esc(f.why_it_matters) + '</p>' : '') +
          '<div class="prompt-lock"><span>Tailored builder fix prompt + verification step</span><a class="link" href="#unlock-box">Unlock below ↓</a></div>' +
        '</li>'
      )).join('');
      previewWrap.hidden = false;
    } else {
      previewWrap.hidden = true;
    }

    // Locked findings (#3..N)
    const lockedWrap = $('locked-section');
    if (lockedList.length) {
      $('locked-heading').textContent = '+ ' + lockedList.length + ' more issue' + (lockedList.length > 1 ? 's' : '') + ' detected (locked)';
      $('locked-gaps').innerHTML = lockedList.map((lf) => (
        '<li class="locked-row">' +
          '<div class="locked-main">' + sevBadge(lf.severity) +
            '<strong>' + esc(lf.redacted_title || 'Security issue') + '</strong>' +
          '</div>' +
          '<span class="locked-tag">Exact file/table &amp; fix prompt locked</span>' +
        '</li>'
      )).join('');
      lockedWrap.hidden = false;
    } else {
      lockedWrap.hidden = true;
    }

    // Unlock checkout box vs Clean badge box
    const unlockBox = $('unlock-box');
    const badgeBox = $('badge-box');
    const clean = total === 0 && r.reachable !== false && !(r.http_status >= 400);

    if (clean) {
      unlockBox.hidden = true;
      badgeBox.hidden = false;
      $('badge-code').textContent = '<a href="https://snapforgelab.com/scan/"><img src="https://snapforgelab.com/assets/ship-ready-badge.svg" alt="Ship-Ready checked by Snapforge Lab" width="190" height="40"></a>';
    } else if (r.can_unlock) {
      badgeBox.hidden = true;
      const price = (r.offer && r.offer.display_price) || '$19';
      const host = hostOf(r.url);
      $('unlock-title').textContent = lockedList.length
        ? 'Unlock all ' + total + ' findings & paste-ready fix prompts'
        : 'Unlock your exact fix prompts & Master Prompt';
      $('unlock-price-val').textContent = price;
      $('unlock-btn-label').textContent = 'Unlock full report & prompts — ' + price;
      $('unlock-host-perk').innerHTML = lockedList.length
        ? 'All <strong>' + total + ' findings</strong> on <strong>' + esc(host) + '</strong> (exact files, open tables, headers &amp; impact)'
        : 'Exact step-by-step fix prompts tailored to <strong>' + esc(host) + '</strong>';
      unlockBox.hidden = false;
    } else {
      badgeBox.hidden = true;
      unlockBox.hidden = true;
    }

    // What was checked
    const c = r.checks || {};
    const checkedItems = Object.keys(CHECK_LABELS)
      .map((k) => (c[k] && CHECK_LABELS[k][c[k]] ? '<li>' + esc(CHECK_LABELS[k][c[k]]) + '</li>' : ''))
      .join('');
    $('checked').innerHTML = checkedItems +
      (r.meta && r.meta.truncated ? '<li>Large app: safety caps reached, so additional scripts or tables were skipped.</li>' : '');
    $('disclaimer').textContent = r.disclaimer || '';

    const deepCta = $('deep-cta');
    if (deepCta) deepCta.href = (r.stack === 'lovable' || r.stack === 'bolt') ? '/lovable-bolt-audit' : '/free-audit';

    // Update URL query ?scan=<id> cleanly so back-navigation restores the preview
    if (r.scan_id && history.replaceState) {
      const nextUrl = location.pathname + '?scan=' + encodeURIComponent(r.scan_id);
      history.replaceState(null, '', nextUrl);
    }

    $('result').hidden = false;
    const mcta = document.querySelector('.m-cta');
    if (mcta) mcta.hidden = true;
    if (!opts.noScroll) $('result').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  $('scan').addEventListener('submit', async (e) => {
    e.preventDefault();
    const url = normUrl($('scan-url').value);
    const msg = $('scan-msg');
    if (!url) { msg.className = 'form-msg err'; msg.textContent = 'Paste your live app URL first.'; return; }
    if (!$('scan-own').checked) { msg.className = 'form-msg err'; msg.textContent = 'Please confirm you own this app or are allowed to test it.'; return; }

    $('scan-btn').disabled = true;
    msg.className = 'form-msg';
    msg.textContent = '';
    $('result').hidden = true;
    startSteps();

    try {
      const res = await fetch(API_BASE + '/api/scan', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ url, ownershipConfirmed: true }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || j.error) throw new Error(j.error || 'Scan failed');
      stopSteps();
      track('scan_completed', { stack: j.stack, grade: j.grade, findings: j.findings_count });
      renderPreview(j);
    } catch (err) {
      stopSteps();
      msg.className = 'form-msg err';
      msg.textContent = 'We could not scan that URL: ' + (err.message || 'try again in a minute') + '.';
    } finally {
      $('scan-btn').disabled = false;
    }
  });

  $('unlock-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentPreview || !currentPreview.scan_id) return;
    const email = ($('unlock-email').value || '').trim();
    const msg = $('unlock-msg');
    const btn = $('unlock-btn');
    if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      msg.className = 'form-msg err';
      msg.textContent = 'Enter a valid email address, or leave it blank to use your PayPal email.';
      return;
    }
    btn.disabled = true;
    msg.className = 'form-msg';
    msg.textContent = 'Opening secure PayPal checkout…';
    track('buy_click', { product: 'scan-report-19', scan_id: currentPreview.scan_id });

    try {
      const res = await fetch(API_BASE + '/api/checkout/create', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ scanId: currentPreview.scan_id, email }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j.approveUrl) throw new Error(j.error || 'Could not start checkout.');
      location.href = j.approveUrl;
    } catch (err) {
      msg.className = 'form-msg err';
      msg.textContent = err.message || 'Checkout unavailable right now. Please try again or email hello@snapforgelab.com.';
      btn.disabled = false;
    }
  });

  $('rescan').addEventListener('click', () => {
    $('result').hidden = true;
    $('scan-url').value = '';
    if (history.replaceState) history.replaceState(null, '', location.pathname);
    $('scan-url').focus();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // Restore scan preview from ?scan=scn_... or prefill ?url=...
  const params = new URLSearchParams(location.search);
  const preUrl = params.get('url');
  if (preUrl) $('scan-url').value = preUrl;

  const existingScanId = params.get('scan');
  const wasCanceled = params.get('canceled') === '1';
  if (existingScanId && /^scn_[a-f0-9]{16,32}$/.test(existingScanId)) {
    (async () => {
      try {
        const res = await fetch(API_BASE + '/api/scan/' + encodeURIComponent(existingScanId));
        if (!res.ok) return;
        const j = await res.json();
        if (j && j.scan_id) {
          if (j.url) $('scan-url').value = j.url;
          renderPreview(j, { canceled: wasCanceled, noScroll: false });
        }
      } catch (_) {}
    })();
  }
})();
