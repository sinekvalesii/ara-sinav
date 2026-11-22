(() => {
'use strict';
const D = window.APP_DATA;
const C = D.courses;
const L = 'ABCDE';
const KEY = 'arasinav.v2';
const $ = (s, r = document) => r.querySelector(s);
const view = $('#view');
const FOOT = `<footer><span>Hazırlayan: selcukyus</span><span>396 çıkmış soru · 4 ders</span></footer>`;

/* ---------- storage ---------- */
let S = load();
function load() {
  let s = null;
  try { s = JSON.parse(localStorage.getItem(KEY)); } catch (e) {}
  s = s || {};
  s.course = typeof s.course === 'number' && C[s.course] ? s.course : 0;
  s.q = s.q || {};       // qid -> {box, c, w, t}
  s.units = s.units || {}; // course-unit -> true
  s.tests = s.tests || []; // {c, s, n, t}
  s.open = s.open || {};
  return s;
}
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
const qid = (ci, i) => ci + ':' + i;
const qs = (ci = S.course) => C[ci].qs;
const st = id => S.q[id] || { box: 0, c: 0, w: 0, t: 0 };
function mark(id, ok) {
  const r = st(id);
  if (ok) { r.c++; r.box = Math.min(5, r.box + 1); } else { r.w++; r.box = 0; }
  r.t = Date.now(); S.q[id] = r; save();
}
const isWrong = id => S.q[id] && S.q[id].box === 0 && S.q[id].w > 0;
const mastered = id => S.q[id] && S.q[id].box >= 2;

/* ---------- helpers ---------- */
const esc = t => String(t).replace(/[&<>"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[m]);
const fmt = t => esc(t).replace(/\s(?=(?:I|II|III|IV|V)\.\s)/g, '\n').replace(/\s(?=Yukarıda)/, '\n');
const norm = t => t.toLocaleLowerCase('tr').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ı/g, 'i');
function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; }
function hl(html, term) {
  if (!term) return html;
  const n = norm(term);
  return html.replace(/>([^<]+)</g, (m, txt) => {
    const nt = norm(txt); let out = '', i = 0, k;
    while ((k = nt.indexOf(n, i)) !== -1) { out += txt.slice(i, k) + '<mark>' + txt.slice(k, k + n.length) + '</mark>'; i = k + n.length; }
    return '>' + out + txt.slice(i) + '<';
  });
}
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('on');
  clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('on'), 1600);
}
function buzz(ms) { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) {} }
function confirmBox(text, okLabel, cb) {
  const m = document.createElement('div'); m.className = 'modal';
  m.innerHTML = `<div class="card stack"><div class="t">${esc(text)}</div><div class="row" style="margin-top:18px"><button class="btn sec" style="flex:1" data-x>Vazgeç</button><button class="btn" style="flex:1" data-y>${esc(okLabel)}</button></div></div>`;
  m.addEventListener('click', e => { if (e.target === m || e.target.closest('[data-x]')) m.remove(); if (e.target.closest('[data-y]')) { m.remove(); cb(); } });
  document.body.appendChild(m);
}
const searchBox = (ph, val) => `<div class="search"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg><input id="sq" type="search" inputmode="search" placeholder="${ph}" value="${esc(val || '')}" autocomplete="off"><button class="clr ${val ? '' : 'hide'}" id="sqc" aria-label="Temizle">×</button></div>`;
function bindSearch(onChange) {
  const i = $('#sq'), c = $('#sqc'); let to;
  i.addEventListener('input', () => { c.classList.toggle('hide', !i.value); clearTimeout(to); to = setTimeout(() => onChange(i.value.trim()), 120); });
  c.addEventListener('click', () => { i.value = ''; c.classList.add('hide'); onChange(''); i.focus(); });
}

/* ---------- header ---------- */
function coursePct(ci) {
  const n = qs(ci).length; let m = 0;
  for (let i = 0; i < n; i++) if (mastered(qid(ci, i))) m++;
  return Math.round(100 * m / n);
}
function renderHeader() {
  $('#courses').innerHTML = C.map((c, i) => `<button class="chip ${i === S.course ? 'on' : ''}" data-c="${i}">${esc(c.short)}<span class="cp">%${coursePct(i)}</span></button>`).join('');
  const done = Object.keys(S.q).filter(k => k.startsWith(S.course + ':') && mastered(k)).length;
  $('#hstat').innerHTML = `<b>${done}</b>/${qs().length} öğrenildi`;
  const on = $('#courses .on'); if (on) on.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}
$('#courses').addEventListener('click', e => {
  const b = e.target.closest('[data-c]'); if (!b) return;
  S.course = +b.dataset.c; save(); T = null; FC = null; route();
});

/* ---------- router ---------- */
const TABS = ['notlar', 'kartlar', 'test', 'sorular', 'ilerleme'];
let cur = 'notlar';
function route() {
  const h = location.hash.replace('#', '');
  cur = TABS.includes(h) ? h : 'notlar';
  document.querySelectorAll('nav.tabs button').forEach(b => b.classList.toggle('on', b.dataset.t === cur));
  renderHeader();
  ({ notlar: vNotes, kartlar: vCards, test: vTest, sorular: vBank, ilerleme: vProg })[cur]();
}
document.querySelector('nav.tabs').addEventListener('click', e => {
  const b = e.target.closest('[data-t]'); if (!b) return;
  if (location.hash === '#' + b.dataset.t) route(); else location.hash = b.dataset.t;
  window.scrollTo(0, 0);
});
window.addEventListener('hashchange', () => { route(); window.scrollTo(0, 0); });

/* ---------- NOTLAR ---------- */
let noteQ = '';
function vNotes() {
  const c = C[S.course], N = c.notes;
  const doneN = N.units.filter((u, i) => S.units[S.course + '-' + i]).length;
  view.innerHTML = `<p class="eyebrow">Ezber notları · ${doneN}/${N.units.length} ünite bitti</p><h2>${esc(c.name)}</h2>
  <div class="intro">${N.intro}</div>
  ${searchBox('Notlarda ara: FOB, antrepo, kısas…', noteQ)}
  <div class="toolbar"><button class="link" id="openAll">Tümünü aç</button><button class="link" id="closeAll">Tümünü kapat</button></div>
  <div id="units" style="margin-top:14px"></div>${FOOT}`;
  const draw = () => {
    const term = noteQ; let any = false;
    $('#units').innerHTML = N.units.map((u, i) => {
      const k = S.course + '-' + i;
      const hit = !term || norm(u.t + ' ' + u.h.replace(/<[^>]+>/g, ' ')).includes(norm(term));
      if (!hit) return '';
      any = true;
      const open = term ? true : !!S.open[k];
      return `<div class="unit ${open ? 'open' : ''} ${S.units[k] ? 'done' : ''}" data-k="${k}">
        <button data-tg aria-expanded="${open}"><span class="tick">${S.units[k] ? '✓ ' : ''}${String(i + 1).padStart(2, '0')}</span><span class="ttl">${hl('>' + esc(u.t.replace(/^Ünite \d+:\s*/, '')) + '<', term).slice(1, -1)}</span><svg class="chev" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 5v14M5 12h14"/></svg></button>
        <div class="ubody">${hl(u.h, term)}<button class="btn ${S.units[k] ? 'sec' : ''} block donebtn" data-done>${S.units[k] ? 'Bitti olarak işaretli · geri al' : 'Bu üniteyi bitirdim <span class="arr">→</span>'}</button></div></div>`;
    }).join('') || '';
    if (!any) $('#units').innerHTML = `<div class="empty">“${esc(term)}” için sonuç yok.</div>`;
  };
  draw();
  bindSearch(v => { noteQ = v; draw(); });
  $('#units').addEventListener('click', e => {
    const u = e.target.closest('.unit'); if (!u) return; const k = u.dataset.k;
    if (e.target.closest('[data-tg]')) { u.classList.toggle('open'); S.open[k] = u.classList.contains('open'); save(); }
    if (e.target.closest('[data-done]')) { S.units[k] = !S.units[k]; save(); if (S.units[k]) { toast('Ünite tamamlandı'); u.classList.remove('open'); S.open[k] = false; save(); } vNotes(); }
  });
  $('#openAll').onclick = () => { N.units.forEach((u, i) => S.open[S.course + '-' + i] = true); save(); draw(); };
  $('#closeAll').onclick = () => { N.units.forEach((u, i) => S.open[S.course + '-' + i] = false); save(); draw(); };
}

/* ---------- KARTLAR (Leitner) ---------- */
let FC = null, fcSrc = 'all';
function cardPool() {
  const n = qs().length; let ids = [...Array(n).keys()];
  if (fcSrc === 'hot') ids = ids.filter(i => qs()[i].f > 1);
  if (fcSrc === 'weak') ids = ids.filter(i => !mastered(qid(S.course, i)));
  // lowest box first, random inside
  return shuffle(ids).sort((a, b) => st(qid(S.course, a)).box - st(qid(S.course, b)).box);
}
function vCards() {
  if (!FC) FC = { pool: cardPool(), i: 0, flip: false, known: 0, unknown: 0 };
  const total = FC.pool.length;
  let html = `<p class="eyebrow">Kartlar · ${esc(C[S.course].name)}</p><h2>Cevabı bil, sonra çevir.</h2><p class="sub">Karta dokun, cevabı gör. Sağa kaydır: biliyordum. Sola kaydır: bilmiyordum.</p>
  <div class="seg" id="fcs"><button data-s="all" class="${fcSrc === 'all' ? 'on' : ''}">Tümü</button><button data-s="hot" class="${fcSrc === 'hot' ? 'on' : ''}">2+ sınavda</button><button data-s="weak" class="${fcSrc === 'weak' ? 'on' : ''}">Öğrenilmemiş</button></div><div style="height:20px"></div>`;
  if (!total) { view.innerHTML = html + `<div class="empty">Bu filtrede kart kalmadı. Hepsini öğrenmişsin.</div>`; bindFcSeg(); return; }
  if (FC.i >= total) {
    view.innerHTML = html + `<div class="score">${FC.known}<small> / ${FC.known + FC.unknown}</small></div><p class="verdict">Tur bitti.</p><p class="mut">${FC.known} kartı bildin, ${FC.unknown} kart tekrar listesine girdi.</p><button class="btn block" id="again" style="margin-top:18px">Yeni tur <span class="arr">→</span></button>`;
    bindFcSeg(); $('#again').onclick = () => { FC = null; vCards(); }; return;
  }
  const qi = FC.pool[FC.i], q = qs()[qi], r = st(qid(S.course, qi));
  html += `<div class="spread small mut" style="margin-bottom:6px"><span>${FC.i + 1} / ${total}</span><span>Kutu ${r.box}/5</span></div>
  <div class="bar" style="margin-bottom:16px"><i style="width:${100 * FC.i / total}%"></i></div>
  <div class="fc-wrap" id="fcw"><div class="fc ${FC.flip ? 'flip' : ''}" id="fc">
    <div class="face"><div class="meta"><span class="tag ${q.f > 1 ? 'hot' : ''}">${q.f} sınavda çıktı</span><span>${esc(q.s.join(' · '))}</span></div><div class="q">${fmt(q.q)}</div><div class="hint">Dokun · cevabı gör</div></div>
    <div class="face back"><div class="tag ok">Doğru cevap</div><div class="big">${esc(q.o[q.a])}</div><div class="hint">Biliyor muydun?</div></div>
  </div></div>
  <div class="row" style="margin-top:16px"><button class="btn no" style="flex:1" id="no">← Bilmiyordum</button><button class="btn ok" style="flex:1" id="yes">Biliyordum →</button></div>
  <div class="boxes" style="margin-top:20px">${[1, 2, 3, 4, 5].map(b => `<i class="${r.box >= b ? 'on' : ''}"></i>`).join('')}</div>
  <p class="small mut" style="text-align:center">Bildiğin kart bir üst kutuya çıkar. Bilmediğin kart ilk kutuya döner ve daha sık gelir.<span class="kbd"> Klavye: Boşluk = çevir, ← / →</span></p>`;
  view.innerHTML = html;
  bindFcSeg();
  const fc = $('#fc'), w = $('#fcw');
  fc.onclick = () => { FC.flip = !FC.flip; fc.classList.toggle('flip', FC.flip); };
  const answer = ok => {
    mark(qid(S.course, qi), ok); ok ? FC.known++ : FC.unknown++;
    if (!ok) FC.pool.push(qi); // bilinmeyen kart turun sonuna tekrar eklenir
    w.classList.add(ok ? 'sr' : 'sl'); buzz(ok ? 15 : [30, 40, 30]);
    setTimeout(() => { FC.i++; FC.flip = false; renderHeader(); vCards(); }, 220);
  };
  $('#yes').onclick = () => answer(true); $('#no').onclick = () => answer(false);
  let x0 = null, dx = 0;
  w.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; dx = 0; w.style.transition = 'none'; }, { passive: true });
  w.addEventListener('touchmove', e => { if (x0 === null) return; dx = e.touches[0].clientX - x0; w.style.transform = `translateX(${dx}px) rotate(${dx / 25}deg)`; }, { passive: true });
  w.addEventListener('touchend', () => {
    w.style.transition = ''; w.style.transform = '';
    if (Math.abs(dx) > 90) answer(dx > 0); x0 = null;
  });
  keyHandler = e => {
    if (e.key === ' ') { e.preventDefault(); fc.click(); }
    else if (e.key === 'ArrowRight') answer(true); else if (e.key === 'ArrowLeft') answer(false);
  };
}
function bindFcSeg() { $('#fcs').onclick = e => { const b = e.target.closest('[data-s]'); if (!b) return; fcSrc = b.dataset.s; FC = null; vCards(); }; }

/* ---------- TEST ---------- */
let T = null, tCfg = { n: 20, src: 'all', timer: false };
function vTest() {
  if (!T) return testSetup();
  if (T.i >= T.pool.length) return testResult();
  const qi = T.pool[T.i], q = qs()[qi], ans = T.answers[T.i];
  const pr = 100 * T.i / T.pool.length;
  view.innerHTML = `<div class="spread small mut" style="margin-bottom:6px"><span>Soru ${T.i + 1}/${T.pool.length}</span><span>✓ ${T.ok} · ✗ ${T.answers.filter(a => a != null).length - T.ok}${tCfg.timer ? ` · <span class="timer" id="tm"></span>` : ''}</span></div>
  <div class="bar" style="margin-bottom:26px"><i style="width:${pr}%"></i></div>
  <div><div class="meta"><span class="tag ${q.f > 1 ? 'hot' : ''}">${q.f} sınavda çıktı</span><span>${esc(q.s.join(' · '))}</span></div>
  <div class="q">${fmt(q.q)}</div>
  <div class="opts">${T.perm.map((oi, k) => {
    let cl = ''; if (ans != null) cl = oi === q.a ? 'ok' : oi === ans ? 'no' : 'dim';
    return `<button class="opt ${cl}" data-o="${oi}" ${ans != null ? 'disabled' : ''}><span class="L">${L[k]}</span><span>${esc(q.o[oi])}</span></button>`;
  }).join('')}</div></div>
  ${ans != null ? `<div class="sticky-act"><button class="btn block" id="nx">${T.i + 1 < T.pool.length ? 'Sonraki soru' : 'Sonucu gör'} <span class="arr">→</span></button></div>` : `<div class="toolbar" style="margin-top:14px"><button class="link" id="skip">Boş bırak</button><button class="link" id="quit">Testi bitir</button></div>`}
  <p class="small mut kbd" style="text-align:center">Klavye: A–E veya 1–5 ile seç, Enter = sonraki</p>`;
  if (tCfg.timer) tick();
  view.querySelectorAll('.opt').forEach(b => b.onclick = () => choose(+b.dataset.o));
  const nx = $('#nx'); if (nx) { nx.onclick = next; nx.focus({ preventScroll: true }); }
  const sk = $('#skip'); if (sk) sk.onclick = () => { T.answers[T.i] = -1; T.wrong.push(qi); next(); };
  const qt = $('#quit'); if (qt) qt.onclick = () => confirmBox('Testi şimdi bitirmek istiyor musun? Cevaplanmamış sorular boş sayılır.', 'Bitir', () => { for (let j = T.i; j < T.pool.length; j++) { T.answers[j] = -1; T.wrong.push(T.pool[j]); } T.i = T.pool.length; vTest(); });
  function choose(o) {
    if (T.answers[T.i] != null) return;
    T.answers[T.i] = o; const ok = o === q.a;
    if (ok) T.ok++; else T.wrong.push(qi);
    mark(qid(S.course, qi), ok); buzz(ok ? 15 : [30, 40, 30]);
    vTest(); renderHeader();
    const sa = $('.sticky-act'); if (sa) sa.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
  function next() { T.i++; T.perm = shuffle([0, 1, 2, 3, 4]); vTest(); window.scrollTo(0, 0); }
  keyHandler = e => {
    const k = e.key.toUpperCase(); let idx = L.indexOf(k); if (idx < 0 && '12345'.includes(k)) idx = +k - 1;
    if (idx >= 0 && ans == null) choose(T.perm[idx]);
    else if (e.key === 'Enter' && $('#nx')) next();
  };
}
function tick() {
  const el = $('#tm'); if (!el) return;
  const s = Math.floor((Date.now() - T.start) / 1000);
  el.textContent = String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
  clearTimeout(tick._t); tick._t = setTimeout(tick, 1000);
}
function testSetup() {
  const all = qs().length, hot = qs().filter(q => q.f > 1).length;
  const wrongN = qs().filter((q, i) => isWrong(qid(S.course, i))).length;
  const newN = qs().filter((q, i) => !S.q[qid(S.course, i)]).length;
  const best = S.tests.filter(t => t.c === S.course).reduce((m, t) => Math.max(m, Math.round(100 * t.s / t.n)), 0);
  view.innerHTML = `<p class="eyebrow">Test · en iyi skor ${best ? '%' + best : 'henüz yok'}</p><h2>${esc(C[S.course].name)}</h2><p class="sub">Şıklar her soruda karışır. Yanlış yaptığın soru “Yanlışlarım”a düşer, doğru bildiğinde çıkar.</p>
  <div class="field"><p class="label">Soru kaynağı</p>
  <div class="seg" id="src"><button data-v="all">Tümü<small>${all}</small></button><button data-v="hot">2+ sınavda<small>${hot}</small></button><button data-v="new">Çözülmemiş<small>${newN}</small></button><button data-v="wrong">Yanlışlarım<small>${wrongN}</small></button></div></div>
  <div class="field"><p class="label">Soru sayısı</p>
  <div class="seg" id="cnt"><button data-v="10">10</button><button data-v="20">20</button><button data-v="40">40</button><button data-v="0">Hepsi</button></div></div>
  <label class="field spread" style="cursor:pointer"><span><span class="label" style="display:block;margin-bottom:6px">Süre</span><span class="small mut">Gerçek sınav: 20 soru, 30 dakika</span></span><input type="checkbox" id="tmr" ${tCfg.timer ? 'checked' : ''}></label>
  <button class="btn acc block" id="go" style="margin-top:24px">Teste başla <span class="arr">→</span></button>
  ${FOOT}`;
  const paint = () => {
    $('#src').querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.v === tCfg.src));
    $('#cnt').querySelectorAll('button').forEach(b => b.classList.toggle('on', +b.dataset.v === tCfg.n));
  };
  paint();
  $('#src').onclick = e => { const b = e.target.closest('button'); if (b) { tCfg.src = b.dataset.v; paint(); } };
  $('#cnt').onclick = e => { const b = e.target.closest('button'); if (b) { tCfg.n = +b.dataset.v; paint(); } };
  $('#tmr').onchange = e => tCfg.timer = e.target.checked;
  $('#go').onclick = () => {
    let ids = [...Array(all).keys()];
    if (tCfg.src === 'hot') ids = ids.filter(i => qs()[i].f > 1);
    if (tCfg.src === 'new') ids = ids.filter(i => !S.q[qid(S.course, i)]);
    if (tCfg.src === 'wrong') ids = ids.filter(i => isWrong(qid(S.course, i)));
    if (!ids.length) return toast(tCfg.src === 'wrong' ? 'Kayıtlı yanlışın yok' : 'Bu filtrede soru yok');
    ids = shuffle(ids); if (tCfg.n) ids = ids.slice(0, tCfg.n);
    startTest(ids);
  };
}
function startTest(ids) { T = { pool: ids, i: 0, ok: 0, answers: [], wrong: [], perm: shuffle([0, 1, 2, 3, 4]), start: Date.now() }; vTest(); }
function testResult() {
  clearTimeout(tick._t);
  if (!T.saved) { S.tests.push({ c: S.course, s: T.ok, n: T.pool.length, t: Date.now() }); S.tests = S.tests.slice(-100); save(); T.saved = true; }
  const p = Math.round(100 * T.ok / T.pool.length);
  const net = T.ok; const dur = Math.round((Date.now() - T.start) / 60000);
  const msg = p >= 85 ? 'Sınava hazırsın.' : p >= 60 ? 'Yanlışları bir tur daha çöz.' : 'Önce notlara, sonra yanlışlara dön.';
  const wrongU = [...new Set(T.wrong)];
  view.innerHTML = `<p class="eyebrow">Sonuç · ${esc(C[S.course].name)}</p>
    <div class="score">%${p}</div>
    <p class="verdict">${net} / ${T.pool.length} doğru. ${msg}</p>
    <p class="mut small">${tCfg.timer ? dur + ' dakika sürdü.' : ''}</p>
    <div class="row" style="margin-top:22px">${wrongU.length ? `<button class="btn acc" style="flex:1" id="rw">Yanlışları çöz · ${wrongU.length}</button>` : ''}<button class="btn sec" style="flex:1" id="nt">Yeni test <span class="arr">→</span></button></div>
  ${wrongU.length ? `<h3 class="sec">Yanlış ya da boş bıraktıkların</h3><div class="qlist">${wrongU.map(i => { const q = qs()[i]; return `<div class="qitem"><div class="q">${fmt(q.q)}</div><div class="ans"><b>Doğru cevap</b>${esc(q.o[q.a])}</div></div>`; }).join('')}</div>` : ''}`;
  if (p >= 85) buzz([20, 60, 20]);
  const rw = $('#rw'); if (rw) rw.onclick = () => startTest(shuffle(wrongU));
  $('#nt').onclick = () => { T = null; vTest(); };
}

/* ---------- SORULAR (bank) ---------- */
let bankQ = '', bankF = 'all', hideAns = false, bankLimit = 40;
function vBank() {
  view.innerHTML = `<p class="eyebrow">Soru bankası · ${esc(C[S.course].name)}</p><h2>${qs().length} çıkmış soru</h2><p class="sub">En çok tekrar eden üstte. Cevapları gizleyip kendini sınayabilirsin.</p>
  ${searchBox('Soru ya da cevapta ara', bankQ)}
  <div class="seg" id="bf" style="margin-top:16px"><button data-v="all">Tümü</button><button data-v="hot">2+ sınavda</button><button data-v="wrong">Yanlışlarım</button></div>
  <label class="spread" style="padding:16px 0;cursor:pointer"><span class="small">Cevapları gizle, dokununca aç</span><input type="checkbox" id="ha" ${hideAns ? 'checked' : ''}></label>
  <div id="bl" class="qlist"></div><div id="more"></div>${FOOT}`;
  const paintSeg = () => $('#bf').querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.v === bankF));
  const draw = () => {
    paintSeg();
    let items = qs().map((q, i) => ({ q, i }));
    if (bankF === 'hot') items = items.filter(x => x.q.f > 1);
    if (bankF === 'wrong') items = items.filter(x => isWrong(qid(S.course, x.i)));
    if (bankQ) { const n = norm(bankQ); items = items.filter(x => norm(x.q.q + ' ' + x.q.o.join(' ')).includes(n)); }
    const shown = items.slice(0, bankLimit);
    $('#bl').innerHTML = shown.length ? shown.map(({ q, i }) => {
      const r = S.q[qid(S.course, i)];
      const stTag = r ? (r.box === 0 ? '<span class="tag no">Yanlış</span>' : r.box >= 2 ? '<span class="tag ok">Öğrenildi</span>' : '<span class="tag">Çalışılıyor</span>') : '';
      return `<div class="qitem"><div class="meta"><span><span class="tag ${q.f > 1 ? 'hot' : ''}">${q.f} sınavda</span>${stTag}</span><span>${esc(q.s.join(' · '))}</span></div>
      <div class="q">${hl('>' + fmt(q.q) + '<', bankQ).slice(1, -1)}</div>
      <div class="ans ${hideAns ? 'blur' : ''}" data-rv><b>Cevap</b>${hl('>' + esc(q.o[q.a]) + '<', bankQ).slice(1, -1)}</div></div>`;
    }).join('') : `<div class="empty">Bu aramaya uyan soru yok.</div>`;
    $('#more').innerHTML = items.length > bankLimit ? `<button class="btn sec block" id="mb" style="margin-top:20px">${items.length - bankLimit} soru daha göster <span class="arr">↓</span></button>` : '';
    const mb = $('#mb'); if (mb) mb.onclick = () => { bankLimit += 40; draw(); };
  };
  draw();
  bindSearch(v => { bankQ = v; bankLimit = 40; draw(); });
  $('#bf').onclick = e => { const b = e.target.closest('button'); if (b) { bankF = b.dataset.v; bankLimit = 40; draw(); } };
  $('#ha').onchange = e => { hideAns = e.target.checked; draw(); };
  $('#bl').addEventListener('click', e => { const a = e.target.closest('[data-rv]'); if (a) a.classList.remove('blur'); });
}

/* ---------- İLERLEME ---------- */
function vProg() {
  const rows = C.map((c, ci) => {
    const n = c.qs.length; let m = 0, seen = 0, cc = 0, ww = 0;
    c.qs.forEach((q, i) => { const r = S.q[qid(ci, i)]; if (r) { seen++; cc += r.c; ww += r.w; if (r.box >= 2) m++; } });
    const ud = c.notes.units.filter((u, i) => S.units[ci + '-' + i]).length;
    const ts = S.tests.filter(t => t.c === ci);
    const last = ts.slice(-1)[0];
    return { c, ci, n, m, seen, acc: cc + ww ? Math.round(100 * cc / (cc + ww)) : null, ud, un: c.notes.units.length, tn: ts.length, last };
  });
  const tot = rows.reduce((a, r) => a + r.n, 0), totM = rows.reduce((a, r) => a + r.m, 0);
  const allC = Object.values(S.q).reduce((a, r) => a + r.c, 0), allW = Object.values(S.q).reduce((a, r) => a + r.w, 0);
  view.innerHTML = `<p class="eyebrow">İlerleme</p><h2>${totM} / ${tot} soru öğrenildi</h2><p class="sub">Bir soru art arda 2 kez doğru bilindiğinde öğrenilmiş sayılır. Kayıt yalnızca bu tarayıcıda tutulur.</p>
  <div class="kpis"><div class="kpi"><b>%${Math.round(100 * totM / tot)}</b><span>Öğrenildi</span></div><div class="kpi"><b>${allC + allW ? '%' + Math.round(100 * allC / (allC + allW)) : '—'}</b><span>İsabet</span></div><div class="kpi"><b>${S.tests.length}</b><span>Test</span></div></div>
  <div>${rows.map(r => `<div class="course-row">
    <div class="spread"><span class="nm">${esc(r.c.name)}</span><button class="link" data-go="${r.ci}">Teste geç <span class="arr">→</span></button></div>
    <div class="pc"><div class="bar"><i style="width:${100 * r.m / r.n}%"></i></div><span class="small">${r.m}/${r.n}</span></div>
    <div class="small mut" style="margin-top:10px">Ünite ${r.ud}/${r.un} · çözülen ${r.seen} · isabet ${r.acc == null ? '—' : '%' + r.acc} · ${r.tn} test${r.last ? ` · son ${r.last.s}/${r.last.n}` : ''}</div>
  </div>`).join('')}</div>
  <button class="link" id="rst" style="margin-top:20px;color:var(--no)">İlerlemeyi sıfırla</button>
  ${FOOT}`;
  view.querySelectorAll('[data-go]').forEach(b => b.onclick = () => { S.course = +b.dataset.go; save(); T = null; FC = null; location.hash = 'test'; });
  $('#rst').onclick = () => confirmBox('Tüm derslerdeki ilerleme, yanlışlar ve test geçmişi silinsin mi?', 'Sıfırla', () => { const c = S.course; localStorage.removeItem(KEY); S = load(); S.course = c; save(); T = null; FC = null; toast('İlerleme sıfırlandı'); route(); });
}

/* ---------- keyboard ---------- */
let keyHandler = null;
document.addEventListener('keydown', e => {
  if (e.target.matches('input,textarea') || e.metaKey || e.ctrlKey || e.altKey) return;
  if ((cur === 'kartlar' || cur === 'test') && keyHandler) keyHandler(e);
});
const _route = route;
route = function () { keyHandler = null; _route(); };

route();
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
})();
