/*!
 * Feedback & Bug Report Widget
 * Embed on any website with ONE line:
 *   <script src="https://YOUR-API-URL/widget.js" defer></script>
 *
 * Optional attributes on the script tag:
 *   data-api="https://YOUR-API-URL"   (defaults to the server that served this file)
 *   data-color="#4f46e5"              (button colour)
 *   data-title="Send feedback"        (modal title)
 */
(function () {
  'use strict';

  if (window.__feedbackWidgetLoaded) return;
  window.__feedbackWidgetLoaded = true;

  var script = document.currentScript;
  var scriptSrc = script && script.src ? new URL(script.src) : null;
  var API = ((script && script.getAttribute('data-api')) || (scriptSrc ? scriptSrc.origin : '')).replace(/\/$/, '');
  var COLOR = (script && script.getAttribute('data-color')) || '#4f46e5';
  var TITLE = (script && script.getAttribute('data-title')) || 'Send feedback';
  var HTML2CANVAS = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';

  /* ---------- Build the UI inside a Shadow DOM so site CSS cannot break it ---------- */
  var host = document.createElement('div');
  host.id = 'fbw-host';
  host.setAttribute('data-html2canvas-ignore', 'true');
  var root = host.attachShadow({ mode: 'open' });

  root.innerHTML =
    '<style>' +
    ':host{all:initial}' +
    '*{box-sizing:border-box;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif}' +
    '.fab{position:fixed;right:20px;bottom:20px;z-index:2147483647;background:' + COLOR + ';color:#fff;border:0;' +
    'border-radius:999px;padding:12px 18px;font-size:14px;font-weight:600;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.25)}' +
    '.fab:hover{filter:brightness(1.1)}' +
    '.overlay{position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:2147483647;display:none;align-items:center;justify-content:center;padding:12px}' +
    '.overlay.open{display:flex}' +
    '.modal{background:#fff;color:#111;width:100%;max-width:420px;max-height:92vh;overflow:auto;border-radius:12px;padding:20px;box-shadow:0 10px 40px rgba(0,0,0,.3)}' +
    'h3{margin:0 0 12px;font-size:18px}' +
    'label{display:block;font-size:12px;font-weight:600;margin:10px 0 4px;color:#444}' +
    'input,select,textarea{width:100%;padding:9px 10px;border:1px solid #ccc;border-radius:8px;font-size:14px;background:#fff;color:#111}' +
    'textarea{min-height:90px;resize:vertical}' +
    '.check{display:flex;gap:8px;align-items:center;margin-top:12px;font-size:13px;font-weight:400}' +
    '.check input{width:auto}' +
    '.row{display:flex;gap:8px;margin-top:16px;justify-content:flex-end}' +
    'button.btn{border:0;border-radius:8px;padding:9px 16px;font-size:14px;font-weight:600;cursor:pointer}' +
    '.primary{background:' + COLOR + ';color:#fff}' +
    '.ghost{background:#eee;color:#333}' +
    'button:disabled{opacity:.6;cursor:not-allowed}' +
    '.msg{margin-top:10px;font-size:13px;padding:8px 10px;border-radius:8px;display:none}' +
    '.msg.ok{display:block;background:#dcfce7;color:#166534}' +
    '.msg.err{display:block;background:#fee2e2;color:#991b1b}' +
    '.hint{font-size:11px;color:#777;margin-top:6px}' +
    '</style>' +
    '<button class="fab" id="open" aria-label="Open feedback form">&#128172; Feedback</button>' +
    '<div class="overlay" id="overlay"><form class="modal" id="form">' +
    '<h3>' + escapeHtml(TITLE) + '</h3>' +
    '<label for="type">Type</label>' +
    '<select id="type"><option value="bug">Bug / something is broken</option>' +
    '<option value="feedback">General feedback</option><option value="feature">Feature request</option></select>' +
    '<label for="title">Title (optional)</label><input id="title" maxlength="150" placeholder="Short summary" />' +
    '<label for="description">What happened? *</label>' +
    '<textarea id="description" maxlength="3000" required placeholder="Describe the problem or your idea..."></textarea>' +
    '<label for="name">Your name (optional)</label><input id="name" maxlength="60" />' +
    '<label for="email">Your email (optional)</label><input id="email" type="email" maxlength="100" />' +
    '<label class="check"><input type="checkbox" id="shot" checked /> Include a screenshot of this page</label>' +
    '<div class="hint">We also send the page URL, browser and screen size to help us debug.</div>' +
    '<div class="msg" id="msg"></div>' +
    '<div class="row"><button type="button" class="btn ghost" id="cancel">Cancel</button>' +
    '<button type="submit" class="btn primary" id="send">Send</button></div>' +
    '</form></div>';

  function $(id) {
    return root.getElementById(id);
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* ---------- Helpers ---------- */
  function collectPageInfo() {
    return {
      url: location.href,
      title: document.title,
      referrer: document.referrer,
      userAgent: navigator.userAgent,
      language: navigator.language,
      screen: screen.width + 'x' + screen.height,
      viewport: window.innerWidth + 'x' + window.innerHeight,
    };
  }

  function loadHtml2Canvas() {
    return new Promise(function (resolve, reject) {
      if (window.html2canvas) return resolve(window.html2canvas);
      var s = document.createElement('script');
      s.src = HTML2CANVAS;
      s.onload = function () {
        resolve(window.html2canvas);
      };
      s.onerror = function () {
        reject(new Error('Could not load screenshot library'));
      };
      document.head.appendChild(s);
    });
  }

  // Takes a screenshot of the visible page and compresses it to a small JPEG
  function takeScreenshot() {
    return loadHtml2Canvas().then(function (html2canvas) {
      return html2canvas(document.body, {
        scale: 0.6,
        logging: false,
        useCORS: true,
        x: window.scrollX,
        y: window.scrollY,
        width: window.innerWidth,
        height: window.innerHeight,
        ignoreElements: function (el) {
          return el.id === 'fbw-host';
        },
      }).then(function (canvas) {
        return canvas.toDataURL('image/jpeg', 0.6);
      });
    });
  }

  function showMsg(text, ok) {
    var m = $('msg');
    m.textContent = text;
    m.className = 'msg ' + (ok ? 'ok' : 'err');
  }

  function openModal() {
    $('msg').className = 'msg';
    $('overlay').classList.add('open');
  }
  function closeModal() {
    $('overlay').classList.remove('open');
  }

  /* ---------- Events ---------- */
  $('open').addEventListener('click', openModal);
  $('cancel').addEventListener('click', closeModal);
  $('overlay').addEventListener('click', function (e) {
    if (e.target === $('overlay')) closeModal();
  });

  $('form').addEventListener('submit', function (e) {
    e.preventDefault();
    var sendBtn = $('send');
    sendBtn.disabled = true;
    sendBtn.textContent = 'Sending...';

    // Hide the widget while the screenshot is taken so it is not in the picture
    var wantsShot = $('shot').checked;
    var shotPromise = Promise.resolve(null);
    if (wantsShot) {
      host.style.visibility = 'hidden';
      shotPromise = takeScreenshot()
        .catch(function () {
          return null; // screenshot is optional, never block the report
        })
        .then(function (img) {
          host.style.visibility = 'visible';
          return img;
        });
    }

    shotPromise
      .then(function (screenshot) {
        return fetch(API + '/api/issues/public', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: $('type').value,
            title: $('title').value,
            description: $('description').value,
            reporterName: $('name').value,
            reporterEmail: $('email').value,
            screenshot: screenshot,
            pageInfo: collectPageInfo(),
          }),
        });
      })
      .then(function (res) {
        return res.json().then(function (data) {
          if (!res.ok) throw new Error(data.message || 'Something went wrong');
          return data;
        });
      })
      .then(function (data) {
        showMsg(data.message || 'Thanks for your feedback!', true);
        $('form').reset();
        setTimeout(closeModal, 1800);
      })
      .catch(function (err) {
        showMsg(err.message || 'Could not send. Please try again.', false);
      })
      .then(function () {
        host.style.visibility = 'visible';
        sendBtn.disabled = false;
        sendBtn.textContent = 'Send';
      });
  });

  document.body.appendChild(host);
})();
