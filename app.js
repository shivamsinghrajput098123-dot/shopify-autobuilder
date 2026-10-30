/* AutoBuilder local demo. Plain JavaScript, no installs.
   Real AI + Shopify connection: look for the "TODO" comments. */
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const KEY = 'autobuilder-v1';

const STYLES = {
  luxury: { name: 'Luxury', bg: '#FAF7F2', ink: '#1B1A17', acc: '#1B1A17', accInk: '#FAF7F2', soft: '#EFE7D8', gold: '#B8872B', head: "'Cormorant Garamond',serif", body: "'Jost',sans-serif", font: 'Cormorant+Garamond:wght@600;700&family=Jost:wght@400;500;600' },
  minimal: { name: 'Minimal', bg: '#FFFFFF', ink: '#111111', acc: '#111111', accInk: '#FFFFFF', soft: '#F1F1F1', gold: '#555555', head: "'Inter',sans-serif", body: "'Inter',sans-serif", font: 'Inter:wght@400;500;600;700' },
  bold: { name: 'Bold', bg: '#FFFDF5', ink: '#12121A', acc: '#E11D48', accInk: '#FFFFFF', soft: '#FFE9A8', gold: '#E11D48', head: "'Manrope',sans-serif", body: "'Inter',sans-serif", font: 'Manrope:wght@700;800&family=Inter:wght@400;500;600' },
  ethnic: { name: 'Ethnic', bg: '#FFF8EE', ink: '#3B0F1A', acc: '#7A1630', accInk: '#FFF8EE', soft: '#F6E3C4', gold: '#B8872B', head: "'Playfair Display',serif", body: "'Jost',sans-serif", font: 'Playfair+Display:wght@600;700&family=Jost:wght@400;500;600' }
};
const FESTIVALS = [
  { id: 'diwali', name: 'Diwali', from: '10-25', to: '11-12', on: true, color: '#C2410C', line: 'Light up your home' },
  { id: 'christmas', name: 'Christmas & New Year', from: '12-10', to: '12-31', on: true, color: '#166534', line: 'Gifts they will keep' },
  { id: 'valentine', name: "Valentine's Day", from: '02-01', to: '02-14', on: true, color: '#BE123C', line: 'Say it with a gift' }
];
const SECTIONS = [
  { id: 'marquee', name: 'Marquee text', on: true }, { id: 'hero', name: 'Hero slider', on: true },
  { id: 'collections', name: 'Collection banners', on: true }, { id: 'festive', name: 'Festival banner', on: true },
  { id: 'video', name: 'Video carousel', on: true }, { id: 'best', name: 'Best sellers', on: true },
  { id: 'trust', name: 'Trust badges', on: true }, { id: 'reviews', name: 'Reviews', on: false }
];
const fresh = () => ({
  store: 'My Store', brand: 'MY BRAND', style: 'luxury', theme: '', csvName: '', products: [],
  sections: JSON.parse(JSON.stringify(SECTIONS)), festivals: JSON.parse(JSON.stringify(FESTIVALS)),
  marquee: 'Free shipping on all orders · Cash on delivery · 7-day easy returns',
  hero: 'Made to be noticed', chat: [], sim: '', device: 'desktop'
});
let S;
try { S = Object.assign(fresh(), JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { S = fresh(); }
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* storage full: ignore */ } };
function toast(t) { const el = $('#toast'); el.textContent = t; el.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove('show'), 2200); }

/* ---------- CSV (Shopify product export format) ---------- */
function parseCSV(text) {
  const rows = []; let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter(r => r.some(x => x.trim()));
}
function productsFromCSV(text) {
  const rows = parseCSV(text.replace(/^\uFEFF/, '')); if (rows.length < 2) return [];
  const h = rows[0].map(x => x.trim().toLowerCase());
  const col = (...names) => { for (const n of names) { const i = h.indexOf(n); if (i >= 0) return i; } return -1; };
  const iH = col('handle'), iT = col('title', 'name'), iTy = col('type', 'product category', 'category'), iV = col('vendor'),
    iP = col('variant price', 'price'), iI = col('image src', 'image');
  const map = new Map();
  rows.slice(1).forEach(r => {
    const title = (r[iT] || '').trim(); const handle = ((iH >= 0 ? r[iH] : title) || '').trim();
    if (!handle) return;
    if (!map.has(handle)) { if (!title) return; map.set(handle, { title, type: (r[iTy] || '').trim() || 'All products', vendor: iV >= 0 ? r[iV] : '', price: iP >= 0 ? r[iP] : '', img: iI >= 0 ? r[iI] : '' }); }
    else { const p = map.get(handle); if (!p.img && iI >= 0 && r[iI]) p.img = r[iI]; if (!p.price && iP >= 0 && r[iP]) p.price = r[iP]; }
  });
  return [...map.values()];
}
const collections = () => { const m = {}; S.products.forEach(p => m[p.type] = (m[p.type] || 0) + 1); return Object.entries(m); };

/* ---------- Festival logic ---------- */
function activeFestival() {
  if (S.sim) return S.festivals.find(f => f.id === S.sim) || null;
  const d = new Date(), md = String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  return S.festivals.find(f => f.on && md >= f.from && md <= f.to) || null;
}

/* ---------- The "AI" (demo rules). TODO: replace with a real AI call ---------- */
function runAI(text) {
  const t = text.toLowerCase(), did = [];
  const setSec = (id, on, label) => { const s = S.sections.find(x => x.id === id); if (s && s.on !== on) { s.on = on; did.push((on ? 'Added ' : 'Removed ') + label); } };
  const remove = /remove|hata|nahi chahiye|delete/.test(t);
  const map = [['marquee', /marquee|scrolling text/, 'marquee text'], ['video', /video|reel/, 'video carousel'], ['trust', /trust|badge/, 'trust badges'],
    ['reviews', /review|rating/, 'reviews'], ['festive', /festiv|diwali|christmas|valentine|banner/, 'festival banner'], ['best', /best ?seller/, 'best sellers'], ['collections', /collection/, 'collection banners'], ['hero', /hero|slider/, 'hero slider']];
  map.forEach(([id, re, label]) => { if (re.test(t)) setSec(id, !remove, label); });
  Object.keys(STYLES).forEach(k => { if (t.includes(k) || (k === 'luxury' && /premium/.test(t))) { if (S.style !== k) did.push('Style set to ' + STYLES[k].name); S.style = k; } });
  const m = text.match(/headline[:\s]+["“]?([^"”\n]{3,60})/i); if (m) { S.hero = m[1].trim(); did.push('Hero headline updated'); }
  if (!did.length) return 'I could not match that yet. Try: "premium look", "add video carousel", "remove reviews", "bold style" or "headline: Festive season is here". A real AI model will understand any instruction once it is connected.';
  return did.join('. ') + '. Check the Preview tab.';
}

/* ---------- Store preview (also used for download) ---------- */
function storeHTML() {
  const st = STYLES[S.style] || STYLES.luxury, fest = activeFestival();
  const on = id => (S.sections.find(s => s.id === id) || {}).on;
  const cols = collections(), prods = S.products;
  const ph = (t, h, bg) => `<div class="ph" style="height:${h}px;${bg ? 'background:' + bg : ''}">${t}</div>`;
  const price = p => p ? '₹' + esc(p) : '';
  const parts = {
    marquee: () => `<div class="mq"><div class="mqi">${[1, 2, 3].map(() => `<span>${esc(S.marquee)}</span>`).join('')}</div></div>`,
    hero: () => `<section class="hero"><div class="ht"><p class="k">${fest ? esc(fest.name) : 'New season'}</p><h1>${esc(S.hero)}</h1><p>Handpicked pieces from ${esc(S.brand)}.</p><div><button class="b">Shop now</button> <button class="b o">View collection</button></div></div><div class="ph" style="min-height:360px;flex:1;min-width:280px">Hero image or video</div></section>`,
    collections: () => `<section class="sc"><h2>Shop by collection</h2><div class="g">${(cols.length ? cols.slice(0, 4) : [['Collection 1'], ['Collection 2'], ['Collection 3'], ['Collection 4']]).map(c => `<a href="#">${ph('Banner', 240)}<div class="cap">${esc(c[0])}</div></a>`).join('')}</div></section>`,
    festive: () => fest ? `<section class="fb" style="background:${fest.color}"><div><p class="k">${esc(fest.name)}</p><h2>${esc(fest.line)}</h2></div><button class="b" style="background:#fff;color:#111">Shop the edit</button></section>` : '',
    video: () => `<section class="sc"><h2>Watch &amp; shop</h2><div class="g">${[1, 2, 3, 4].map(i => `<a href="#">${ph('▶ Video ' + i, 300, '#CFC4AE')}<div class="cap">${esc((prods[i - 1] || {}).title || 'Product name')}</div></a>`).join('')}</div></section>`,
    best: () => `<section class="sc soft"><h2>Best sellers</h2><div class="g">${(prods.length ? prods.slice(0, 4) : [{}, {}, {}, {}]).map(p => `<a href="#">${p.img ? `<img src="${esc(p.img)}" alt="${esc(p.title)}" style="width:100%;height:260px;object-fit:cover;display:block">` : ph('Product image', 260)}<div class="cap l">${esc(p.title || 'Product name')}</div><div class="pr">${price(p.price) || '₹0'}</div></a>`).join('')}</div></section>`,
    trust: () => `<section class="tr">${[['Secure payments', 'UPI, cards, wallets'], ['Free shipping', 'On every order'], ['Easy returns', '7 days'], ['Cash on delivery', 'Available']].map(x => `<div><b>${x[0]}</b><span>${x[1]}</span></div>`).join('')}</section>`,
    reviews: () => `<section class="sc"><h2>Loved by customers</h2><div class="g">${[1, 2, 3].map(() => `<div class="rv">★★★★★<p>Customer review will appear here.</p></div>`).join('')}</div></section>`
  };
  const body = S.sections.filter(s => s.on).map(s => (parts[s.id] || (() => ''))()).join('');
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(S.store)}</title>
<link href="https://fonts.googleapis.com/css2?family=${st.font}&display=swap" rel="stylesheet"><style>
*{box-sizing:border-box}body{margin:0;background:${st.bg};color:${st.ink};font-family:${st.body}}h1,h2{font-family:${st.head};margin:0}a{color:inherit;text-decoration:none}
.top{display:flex;justify-content:space-between;align-items:center;padding:18px 40px;border-bottom:1px solid #0001;flex-wrap:wrap;gap:8px}.top b{font:700 26px ${st.head};letter-spacing:.1em}.top span{font-size:14px}
.mq{background:${st.ink};color:${st.bg};overflow:hidden;white-space:nowrap;padding:9px 0;font-size:13px}.mqi{display:inline-block;animation:m 25s linear infinite}.mqi span{padding:0 40px}@keyframes m{to{transform:translateX(-33.3%)}}
.hero{display:flex;flex-wrap:wrap;background:${st.soft};min-height:420px}.ht{flex:1;min-width:280px;padding:56px 40px;display:flex;flex-direction:column;justify-content:center;gap:16px}.ht h1{font-size:54px;line-height:1.05}.ht p{margin:0}.k{font-size:13px;letter-spacing:.12em;color:${st.gold}}
.b{min-height:46px;padding:0 24px;border:1px solid ${st.acc};background:${st.acc};color:${st.accInk};font:500 14px ${st.body};letter-spacing:.06em;cursor:pointer}.b.o{background:transparent;color:${st.ink}}
.sc{padding:48px 40px}.sc.soft{background:${st.soft}}.sc h2{font-size:34px;text-align:center;margin-bottom:24px}.g{display:flex;gap:16px;flex-wrap:wrap}.g>*{flex:1;min-width:150px}
.ph{background:#E5DECF;color:#6B6458;display:flex;align-items:center;justify-content:center;font-size:13px;text-align:center}.cap{text-align:center;margin-top:10px;font-size:15px}.cap.l{text-align:left}.pr{font-size:14px;opacity:.7}
.fb{color:#fff;padding:36px 40px;display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap}.fb h2{font-size:36px}.fb .k{color:#fff;opacity:.85}
.tr{display:flex;flex-wrap:wrap;gap:20px;padding:36px 40px;border-top:1px solid #0001;border-bottom:1px solid #0001}.tr div{flex:1;min-width:150px;text-align:center}.tr b{display:block;font-size:15px}.tr span{font-size:13px;opacity:.7}
.rv{background:${st.soft};padding:20px;border-radius:6px}footer{background:${st.ink};color:${st.bg};padding:28px 40px;font-size:14px}
@media(max-width:600px){.ht h1{font-size:38px}.top,.sc,.ht,.fb,.tr{padding-left:18px;padding-right:18px}}
</style></head><body><header class="top"><span>Shop · Collections · Sale</span><b>${esc(S.brand)}</b><span>Search · Cart (0)</span></header>${body}<footer>© ${esc(S.brand)} · Built with AutoBuilder</footer></body></html>`;
}

/* ---------- Views ---------- */
const V = {};
V.overview = () => {
  const done = [!!S.store, !!(S.theme || S.csvName), S.products.length > 0, S.chat.length > 0, false];
  const names = ['Store details', 'Upload theme & CSV', 'AI builds pages', 'Review draft', 'Publish'];
  const now = done.indexOf(false);
  return `<div class="head"><div><div class="sub">${esc(S.store)}</div><h1>Build your store</h1></div>
  <a class="btn" href="#preview" style="text-decoration:none;display:inline-flex;align-items:center">Open preview</a></div>
  <section class="card"><h2>Build pipeline</h2><div class="steps">${names.map((n, i) => `<div class="step ${done[i] ? 'done' : i === now ? 'now' : ''}"><small>${i + 1} · ${done[i] ? 'Done' : i === now ? 'Next' : 'Later'}</small><b>${n}</b></div>`).join('')}</div></section>
  <div class="grid"><section class="card"><h2>Store details</h2>
    <label>Store name<br><input id="sn" value="${esc(S.store)}" style="width:100%;min-height:44px;border:1px solid #C9CCD3;border-radius:10px;padding:0 14px;margin:6px 0 12px"></label>
    <label>Brand name shown on website<br><input id="bn" value="${esc(S.brand)}" style="width:100%;min-height:44px;border:1px solid #C9CCD3;border-radius:10px;padding:0 14px;margin:6px 0 12px"></label>
    <button class="btn" id="saveStore">Save details</button></section>
  <section class="card"><h2>Status</h2><div class="tags"><span class="tag">Products: ${S.products.length}</span><span class="tag">Collections: ${collections().length}</span><span class="tag">Style: ${STYLES[S.style].name}</span><span class="tag">Sections on: ${S.sections.filter(s => s.on).length}</span></div>
  <p style="color:#5A5F6B;font-size:14px;margin-top:16px">Next: upload your product CSV, then tell the AI builder what you want.</p>
  <button class="btn ghost" id="reset">Reset all data</button></section></div>`;
};
V.upload = () => `<div class="head"><div><div class="sub">Step 2</div><h1>Theme &amp; CSV upload</h1></div></div>
  <div class="grid"><section class="card"><h2>Theme file</h2><div class="drop">${S.theme ? `<div class="ok">✓ ${esc(S.theme)}</div>` : ''}<p>.zip of your theme (name is saved for now)</p><input type="file" id="themeF" accept=".zip" hidden><button class="btn ghost" data-pick="themeF">Choose file</button></div></section>
  <section class="card"><h2>Products CSV</h2><div class="drop">${S.csvName ? `<div class="ok">✓ ${esc(S.csvName)} · ${S.products.length} products</div>` : ''}<p>Shopify export format (Handle, Title, Type, Variant Price, Image Src)</p><input type="file" id="csvF" accept=".csv" hidden><button class="btn ghost" data-pick="csvF">Choose CSV</button> <button class="btn ghost" id="sample">Load sample data</button></div></section></div>
  ${S.products.length ? `<section class="card"><h2>Collections found</h2><div class="tags">${collections().map(c => `<span class="tag">${esc(c[0])} · ${c[1]}</span>`).join('')}</div></section>
  <section class="card"><h2>Products (first 10)</h2><div style="overflow:auto"><table><tr><th>Title</th><th>Collection</th><th>Vendor</th><th>Price</th></tr>${S.products.slice(0, 10).map(p => `<tr><td>${esc(p.title)}</td><td>${esc(p.type)}</td><td>${esc(p.vendor)}</td><td>${esc(p.price)}</td></tr>`).join('')}</table></div></section>` : ''}`;
V.builder = () => `<div class="head"><div><div class="sub">Step 3 · Draft only, nothing goes live</div><h1>AI builder</h1></div><a class="btn" href="#preview" style="text-decoration:none;display:inline-flex;align-items:center">See preview</a></div>
  <div class="grid"><section class="card"><h2>Tell the AI what you want</h2><div class="chat" id="chat">${S.chat.length ? S.chat.map(m => `<div class="msg ${m.r}">${esc(m.t)}</div>`).join('') : '<div class="msg a">Hi! Write what you want, for example: "premium look, add video carousel and trust badges".</div>'}</div>
    <div class="tags" style="margin-bottom:12px">${['Premium look', 'Add video carousel', 'Add reviews', 'Bold style', 'Remove reviews'].map(x => `<button class="chip" data-q="${x}">${x}</button>`).join('')}</div>
    <div class="row"><label for="ask" style="position:absolute;left:-9999px">Instruction</label><input id="ask" placeholder="Type an instruction..."><button class="btn dark" id="send">Send</button></div></section>
  <section class="card"><h2>Homepage sections</h2>${S.sections.map((s, i) => `<div class="sec-item"><input type="checkbox" data-t="${i}" ${s.on ? 'checked' : ''} aria-label="${s.name}"><span>${s.name}</span><button class="sm" data-up="${i}" aria-label="Move up">↑</button><button class="sm" data-dn="${i}" aria-label="Move down">↓</button></div>`).join('')}
    <h2 style="margin-top:18px">Style</h2><div class="tags">${Object.entries(STYLES).map(([k, v]) => `<button class="chip ${S.style === k ? 'on' : ''}" data-s="${k}">${v.name}</button>`).join('')}</div>
    <h2 style="margin-top:18px">Texts</h2><label>Marquee text<br><input id="mq" value="${esc(S.marquee)}" style="width:100%;min-height:44px;border:1px solid #C9CCD3;border-radius:10px;padding:0 14px;margin:6px 0 10px"></label>
    <label>Hero headline<br><input id="hh" value="${esc(S.hero)}" style="width:100%;min-height:44px;border:1px solid #C9CCD3;border-radius:10px;padding:0 14px;margin:6px 0 10px"></label><button class="btn ghost" id="saveTxt">Save texts</button></section></div>`;
V.calendar = () => { const a = activeFestival(); return `<div class="head"><div><div class="sub">Banners switch on their own and go back after the dates</div><h1>Festival calendar</h1></div></div>
  <section class="card"><h2>Right now</h2><p style="margin:0;font-size:15px">${a ? `<b>${esc(a.name)}</b> banner is active.` : 'No festival is active today, so the normal homepage shows.'}</p></section>
  <section class="card"><h2>Campaigns</h2>${S.festivals.map((f, i) => `<div class="fest"><div><b>${esc(f.name)}</b><div style="font-size:13px;color:#5A5F6B">Shows from ${f.from} to ${f.to} (month-day)</div></div><div class="row"><span class="pill ${f.on ? '' : 'off'}">${f.on ? 'Auto on' : 'Off'}</span><button class="btn ghost" data-f="${i}">${f.on ? 'Turn off' : 'Turn on'}</button></div></div>`).join('')}</section>`; };
V.preview = () => `<div class="head"><div><div class="sub">Draft · not live on Shopify</div><h1>Preview &amp; publish</h1></div>
  <div class="row"><button class="btn ghost" id="dl">Download website (HTML)</button><button class="btn" id="pub">Publish to Shopify</button></div></div>
  <section class="card"><div class="row" style="flex-wrap:wrap;margin-bottom:14px"><button class="chip ${S.device === 'desktop' ? 'on' : ''}" data-d="desktop">Desktop</button><button class="chip ${S.device === 'mobile' ? 'on' : ''}" data-d="mobile">Mobile</button>
  <label style="margin-left:auto;font-size:14px">Test date: <select id="sim" style="min-height:44px;border:1px solid #C9CCD3;border-radius:10px;padding:0 10px"><option value="">Today</option>${S.festivals.map(f => `<option value="${f.id}" ${S.sim === f.id ? 'selected' : ''}>${esc(f.name)}</option>`).join('')}</select></label></div>
  <div class="preview-wrap"><iframe id="frame" title="Store preview" style="max-width:${S.device === 'mobile' ? '390px' : '1200px'}"></iframe></div></section>`;

/* ---------- Wiring ---------- */
function render() {
  const v = (location.hash || '#overview').slice(1); const view = V[v] ? v : 'overview';
  document.querySelectorAll('#nav a').forEach(a => a.classList.toggle('on', a.dataset.v === view));
  $('#view').innerHTML = V[view](); wire(view); window.scrollTo(0, 0);
}
function wire(view) {
  const on = (sel, fn, ev = 'click') => document.querySelectorAll(sel).forEach(e => e.addEventListener(ev, fn));
  if (view === 'overview') {
    on('#saveStore', () => { S.store = $('#sn').value || 'My Store'; S.brand = $('#bn').value || 'MY BRAND'; save(); toast('Saved'); render(); });
    on('#reset', () => { if (confirm('Delete all saved data?')) { S = fresh(); save(); render(); } });
  }
  if (view === 'upload') {
    on('[data-pick]', e => $('#' + e.currentTarget.dataset.pick).click());
    on('#themeF', e => { const f = e.target.files[0]; if (f) { S.theme = f.name; save(); toast('Theme saved'); render(); } }, 'change');
    on('#csvF', e => { const f = e.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = () => { const p = productsFromCSV(String(r.result)); if (!p.length) { toast('No products found. Use a Shopify product CSV.'); return; } S.products = p; S.csvName = f.name; save(); toast(p.length + ' products loaded'); render(); }; r.readAsText(f); }, 'change');
    on('#sample', () => { const sample = 'Handle,Title,Vendor,Type,Variant Price,Image Src\nsilk-kurta,Silk Kurta,My Brand,Kurtas,2499,\ncotton-kurta,Cotton Kurta,My Brand,Kurtas,1299,\nbandhgala,Bandhgala Jacket,My Brand,Jackets,3999,\nnehru-jacket,Nehru Jacket,My Brand,Jackets,2999,\nlinen-shirt,Linen Shirt,My Brand,Shirts,1799,\nstole,Wool Stole,My Brand,Accessories,999,'; S.products = productsFromCSV(sample); S.csvName = 'sample-products.csv'; save(); render(); });
  }
  if (view === 'builder') {
    const send = t => { t = (t || '').trim(); if (!t) return; S.chat.push({ r: 'u', t }); S.chat.push({ r: 'a', t: runAI(t) }); save(); render(); };
    on('#send', () => send($('#ask').value)); on('#ask', e => { if (e.key === 'Enter') send(e.target.value); }, 'keydown');
    on('[data-q]', e => send(e.currentTarget.dataset.q));
    on('[data-t]', e => { S.sections[e.target.dataset.t].on = e.target.checked; save(); }, 'change');
    on('[data-up]', e => { const i = +e.currentTarget.dataset.up; if (i > 0) { [S.sections[i - 1], S.sections[i]] = [S.sections[i], S.sections[i - 1]]; save(); render(); } });
    on('[data-dn]', e => { const i = +e.currentTarget.dataset.dn; if (i < S.sections.length - 1) { [S.sections[i + 1], S.sections[i]] = [S.sections[i], S.sections[i + 1]]; save(); render(); } });
    on('[data-s]', e => { S.style = e.currentTarget.dataset.s; save(); render(); });
    on('#saveTxt', () => { S.marquee = $('#mq').value; S.hero = $('#hh').value; save(); toast('Texts saved'); });
    const c = $('#chat'); if (c) c.scrollTop = c.scrollHeight;
  }
  if (view === 'calendar') on('[data-f]', e => { const f = S.festivals[e.currentTarget.dataset.f]; f.on = !f.on; save(); render(); });
  if (view === 'preview') {
    const draw = () => { $('#frame').srcdoc = storeHTML(); }; draw();
    on('[data-d]', e => { S.device = e.currentTarget.dataset.d; save(); render(); });
    on('#sim', e => { S.sim = e.target.value; save(); draw(); }, 'change');
    on('#dl', () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([storeHTML()], { type: 'text/html' })); a.download = 'store-homepage.html'; a.click(); });
    on('#pub', () => toast('Shopify connection is not added yet. Next step: connect your store.')); /* TODO: Shopify Admin API call goes here */
  }
}
window.addEventListener('hashchange', render);
render();
