// ---------- Storage (safe: falls back to memory if blocked) ----------
var memory = {};
function load(k){ try { var v = localStorage.getItem(k); return v === null ? memory[k] || null : v; } catch(e){ return memory[k] || null; } }
function store(k,v){ memory[k] = v; try { localStorage.setItem(k,v); } catch(e){} }

var MOODS = ['😊','😌','🤩','😢','😤','😰'];
var PRESETS = [['Tomorrow',1],['1 week',7],['1 month',30],['6 months',182],['1 year',365]];
var letters = [];
var state = { mood:'😊', cat:'General', filter:'all', openIds:{}, editing:null, limit:20, img:'', selMode:false, sel:{} };
var TEMPLATES = {
  'Goals check-in':'Where I am right now:\n\nMy top 3 goals:\n1.\n2.\n3.\n\nWhat I’m doing about them:\n\nWhat I hope is true when I read this:\n',
  'Year in review':'Biggest win this year:\n\nBiggest lesson:\n\nPeople who mattered:\n\nWhat I want more of:\n\nWhat I want less of:\n',
  'Gratitude list':'Right now I’m grateful for:\n1.\n2.\n3.\n\nA small moment I want to remember:\n'
};
var QUOTES = ['The best time to plant a tree was twenty years ago. The second best time is now.',
  'A year from now you will wish you had started today.','Small steps still move you forward.',
  'Be kind to the person you’re becoming.','Write it down. Future you will thank you.'];
var ACCENTS = [['Purple','#673ab7','#5b2fb3','#a98bff','#bba2ff'],['Rose','#c2185b','#ad1457','#f48fb1','#f8bbd0'],
  ['Ocean','#0277bd','#01579b','#4fc3f7','#81d4fa'],['Forest','#2e7d32','#1b5e20','#81c784','#a5d6a7'],['Sunset','#ef6c00','#e65100','#ffb74d','#ffcc80']];
var CATS = ['General','Goals','Memories','Advice','Gratitude','Love'];
var PROMPTS = [
  'What are you proud of this month?',
  'What worries you right now, and what would you tell yourself about it?',
  'Describe a perfect ordinary day in your life right now.',
  'Which three goals matter most, and what have you done toward them?',
  'Who has made a difference to you lately?',
  'What do you hope has changed by the time you read this?',
  'What song, food or place defines this season of your life?',
  'What advice would you give yourself a year from now?'
];

try { letters = JSON.parse(load('letters')) || []; } catch(e){ letters = []; }
if (!Array.isArray(letters)) letters = [];
letters.forEach(function(l){ if(!l.id) l.id = uid(); if(!l.created) l.created = new Date().toISOString(); });

var $ = function(id){ return document.getElementById(id); };

// ---------- Helpers ----------
function uid(){ return Date.now().toString(36) + Math.random().toString(36).slice(2,7); }
function pad(n){ return String(n).padStart(2,'0'); }
function fmtDate(d){ return d.getFullYear() + '-' + pad(d.getMonth()+1) + '-' + pad(d.getDate()); }
function todayStr(){ return fmtDate(new Date()); }
function parseLocal(s){ var p = s.split('-').map(Number); return new Date(p[0], p[1]-1, p[2]); }
function addDays(n){ var d = new Date(); d.setDate(d.getDate()+n); return fmtDate(d); }
function daysUntil(s){ return Math.round((parseLocal(s) - parseLocal(todayStr())) / 864e5); }
function nice(s){ return parseLocal(s).toLocaleDateString(undefined,{year:'numeric',month:'long',day:'numeric'}); }
function esc(t){
  return String(t == null ? '' : t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#039;');
}
function isOpen(l){ return daysUntil(l.unlockDate) <= 0; }
function persist(){ store('letters', JSON.stringify(letters)); }
function toast(msg, undo){
  var t = $('toast'); t.textContent = msg;
  if (undo){ var ub = document.createElement('button'); ub.className = 'undo'; ub.textContent = 'Undo';
    ub.onclick = function(){ undo(); t.classList.remove('show'); }; t.appendChild(ub); }
  t.classList.add('show');
  clearTimeout(toast.t); toast.t = setTimeout(function(){ t.classList.remove('show'); }, undo ? 6500 : 2800);
}
function countdown(l){
  var d = daysUntil(l.unlockDate);
  if (d <= 0) return 'Ready to read';
  if (d === 1) return 'Opens tomorrow';
  if (d < 60) return 'Opens in ' + d + ' days';
  var m = Math.round(d/30.4);
  return d < 700 ? 'Opens in about ' + m + ' months' : 'Opens in about ' + (d/365).toFixed(1) + ' years';
}

// ---------- Welcome ----------
$('envelope').addEventListener('click', function(){
  var e = $('envelope'); if (e.classList.contains('open')) return;
  e.classList.add('open');
  setTimeout(function(){
    $('welcome').classList.add('hidden'); $('app').classList.remove('hidden');
    var ready = letters.filter(function(l){ return isOpen(l) && !l.read; }).length;
    if (ready) toast('💌 ' + ready + (ready === 1 ? ' letter is' : ' letters are') + ' ready to open!');
  }, 1300);
});

// ---------- Theme ----------
function applyTheme(t){
  document.documentElement.setAttribute('data-theme', t);
  applyAccent();
  $('themeBtn').textContent = t === 'dark' ? '☀️' : '🌙';
}
var savedTheme = load('theme');
applyTheme(savedTheme || (matchMedia('(prefers-color-scheme:dark)').matches ? 'dark' : 'light'));
$('themeBtn').addEventListener('click', function(){
  var next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  applyTheme(next); store('theme', next);
});

// ---------- Form ----------
function hello(){
  var h = new Date().getHours();
  $('greeting').textContent = (h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening') +
    ' — what would you like to tell future you?';
}
hello();

$('unlockDate').min = addDays(1);
function wordCount(s){ s = String(s || '').trim(); return s ? s.split(/\s+/).length : 0; }
function updateCount(){ var v = $('message').value; $('count').textContent = v.length; $('words').textContent = wordCount(v); }
$('message').addEventListener('input', updateCount);

$('moods').innerHTML = MOODS.map(function(m){
  return '<button type="button" class="chip mood' + (m === state.mood ? ' on' : '') + '" data-mood="' + m + '" aria-label="Mood ' + m + '">' + m + '</button>';
}).join('');
$('moods').addEventListener('click', function(e){
  var b = e.target.closest('[data-mood]'); if (!b) return;
  state.mood = b.dataset.mood;
  [].forEach.call($('moods').children, function(c){ c.classList.toggle('on', c === b); });
});

$('presets').innerHTML = PRESETS.map(function(p){
  return '<button type="button" class="chip" data-days="' + p[1] + '">' + p[0] + '</button>';
}).join('');
$('presets').addEventListener('click', function(e){
  var b = e.target.closest('[data-days]'); if (!b) return;
  $('unlockDate').value = addDays(+b.dataset.days);
});

// Categories
$('cats').innerHTML = CATS.map(function(c){
  return '<button type="button" class="chip' + (c === state.cat ? ' on' : '') + '" data-cat="' + c + '">' + c + '</button>';
}).join('');
$('cats').addEventListener('click', function(e){
  var b = e.target.closest('[data-cat]'); if (!b) return;
  state.cat = b.dataset.cat; pick('cats','cat',state.cat);
});
$('catFilter').innerHTML = '<option value="">All categories</option>' + CATS.map(function(c){
  return '<option value="' + c + '">' + c + '</option>';
}).join('');
$('catFilter').addEventListener('change', render);
function pick(box, attr, val){
  [].forEach.call($(box).children, function(c){ c.classList.toggle('on', c.dataset[attr] === val); });
}

// Writing prompts
$('promptBtn').addEventListener('click', function(){
  var m = $('message'), p = PROMPTS[Math.floor(Math.random() * PROMPTS.length)];
  m.value = (m.value ? m.value + '\n\n' : '') + p + '\n';
  m.focus(); updateCount(); saveDraft();
});

// Draft autosave
function saveDraft(){
  if (state.editing) return;
  store('draft', JSON.stringify({ t:$('title').value, g:$('tags').value, m:$('message').value, d:$('unlockDate').value, mood:state.mood, cat:state.cat }));
}
['title','message','unlockDate','tags'].forEach(function(id){
  $(id).addEventListener('input', saveDraft); $(id).addEventListener('change', saveDraft);
});
['moods','presets','cats'].forEach(function(id){
  $(id).addEventListener('click', function(){ setTimeout(saveDraft, 0); });
});
(function restoreDraft(){
  try {
    var d = JSON.parse(load('draft')); if (!d) return;
    $('title').value = d.t || ''; $('tags').value = d.g || ''; $('message').value = d.m || ''; updateCount();
    if (d.d && daysUntil(d.d) >= 1) $('unlockDate').value = d.d;
    if (d.mood){ state.mood = d.mood; pick('moods','mood',d.mood); }
    if (d.cat){ state.cat = d.cat; pick('cats','cat',d.cat); }
  } catch(e){}
})();

// Keyboard shortcut: Ctrl/Cmd + Enter locks the letter
document.addEventListener('keydown', function(e){
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && !$('app').classList.contains('hidden')) $('saveBtn').click();
});

// Confetti
function confetti(){
  if (opts().confetti === false) return;
  if (matchMedia('(prefers-reduced-motion:reduce)').matches) return;
  var c = $('confetti'), x = c.getContext('2d'), f = 0;
  var colors = ['#673ab7','#f48fb1','#ffd54f','#4dd0e1','#81c784'];
  c.classList.remove('hidden'); c.width = innerWidth; c.height = innerHeight;
  var ps = Array.from({length:130}, function(){
    return { x:Math.random()*c.width, y:-20-Math.random()*c.height*.5, r:4+Math.random()*6,
      vx:-2+Math.random()*4, vy:2+Math.random()*4, col:colors[Math.floor(Math.random()*colors.length)] };
  });
  (function tick(){
    x.clearRect(0,0,c.width,c.height);
    ps.forEach(function(p){ p.x += p.vx; p.y += p.vy; x.fillStyle = p.col; x.fillRect(p.x,p.y,p.r,p.r*1.6); });
    if (++f < 150) requestAnimationFrame(tick); else c.classList.add('hidden');
  })();
}

// ----- v3 helpers -----
function parseTags(s){
  var seen = {};
  return String(s).split(',').map(function(t){ return t.trim().replace(/^#/,'').slice(0,20); })
    .filter(function(t){ var k = t.toLowerCase(); if (!t || seen[k]) return false; seen[k] = 1; return true; }).slice(0,6);
}
function tagsHtml(l){
  if (!l.tags || !l.tags.length) return '';
  return '<div class="tags">' + l.tags.map(function(t){
    return '<button class="tag" data-tag="' + esc(t) + '">#' + esc(t) + '</button>';
  }).join('') + '</div>';
}
function ago(l){
  var n = Math.max(0, Math.round((Date.now() - new Date(l.created)) / 864e5));
  return n === 0 ? ' (today)' : ' (' + n + (n === 1 ? ' day' : ' days') + ' ago)';
}
function streak(){
  var days = {}; letters.forEach(function(l){ days[fmtDate(new Date(l.created))] = 1; });
  var d = new Date(), n = 0; if (!days[fmtDate(d)]) d.setDate(d.getDate() - 1);
  while (days[fmtDate(d)]){ n++; d.setDate(d.getDate() - 1); }
  return n;
}
function renderBanner(unread){
  var td = todayStr().slice(5), otd = letters.filter(function(l){ var c = fmtDate(new Date(l.created)); return c.slice(5) === td && c !== todayStr(); });
  var locked = letters.filter(function(l){ return !isOpen(l); })
    .sort(function(a,b){ return a.unlockDate.localeCompare(b.unlockDate); });
  $('banner').textContent = unread ? '✨ ' + unread + (unread === 1 ? ' letter is' : ' letters are') + ' ready to open!'
    : locked.length ? '⏳ Next up: “' + locked[0].title + '” · ' + countdown(locked[0])
    : '🌱 Nothing sealed yet. Write a letter to start your time capsule.';
  if (otd.length) $('banner').textContent += '  📅 On this day: you wrote “' + otd[0].title + '” in ' + new Date(otd[0].created).getFullYear() + '.';
}
function downloadTxt(l){
  if (l.enc && !plain[l.id]){ toast('Enter the password first'); return; }
  var txt = l.title + '\nWritten: ' + nice(fmtDate(new Date(l.created))) + '\nOpened: ' + nice(l.unlockDate) +
    '\n\n' + textOf(l) + (l.reply ? '\n\n--- My reply ---\n' + l.reply : '') + '\n';
  try {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([txt], {type:'text/plain'}));
    a.download = (l.title.replace(/[^\w]+/g,'-').toLowerCase() || 'letter') + '.txt';
    document.body.appendChild(a); a.click(); a.remove();
  } catch(e){ toast('Download isn’t available here'); }
}
function startEdit(id){
  var l = find(id); if (!l) return;
  if (l.enc){ toast('Encrypted letters can’t be edited'); return; }
  state.editing = id; state.mood = l.mood || '😊'; state.cat = l.cat || 'General';
  $('title').value = l.title; $('message').value = l.message; $('unlockDate').value = l.unlockDate;
  $('tags').value = (l.tags || []).join(', '); updateCount();
  pick('moods','mood',state.mood); pick('cats','cat',state.cat);
  $('saveBtn').textContent = '💾 Save changes'; $('cancelEdit').classList.remove('hidden');
  scrollTo({ top:0, behavior:'smooth' }); toast('✏️ Editing “' + l.title + '”');
}
function stopEdit(){
  state.editing = null;
  ['title','message','unlockDate','tags'].forEach(function(id){ $(id).value = ''; });
  updateCount(); showErr('');
  $('saveBtn').textContent = '🔒 Lock my letter'; $('cancelEdit').classList.add('hidden');
}
$('cancelEdit').addEventListener('click', stopEdit);
document.addEventListener('keydown', function(e){ if (e.key === 'Escape' && state.editing) stopEdit(); });

$('tplSel').innerHTML = '<option value="">📋 Template…</option>' + Object.keys(TEMPLATES).map(function(k){
  return '<option>' + k + '</option>';
}).join('');
$('tplSel').addEventListener('change', function(){
  var all = allTemplates(); if (!all[this.value]) return;
  var m = $('message'); m.value = (m.value ? m.value + '\n\n' : '') + all[this.value];
  this.value = ''; updateCount(); saveDraft(); m.focus();
});

$('randBtn').addEventListener('click', function(){
  var o = letters.filter(isOpen); if (!o.length){ toast('No opened letters yet'); return; }
  var l = o[Math.floor(Math.random() * o.length)];
  state.filter = 'all'; $('search').value = ''; $('catFilter').value = ''; state.openIds[l.id] = true;
  if (!l.read){ l.read = true; persist(); confetti(); }
  render();
  var el = document.querySelector('[data-toggle="' + l.id + '"]');
  if (el) el.scrollIntoView({ behavior:'smooth', block:'center' });
});
$('quote').textContent = '“' + QUOTES[Math.floor(Math.random() * QUOTES.length)] + '”';

// ----- v5: encryption + recurring letters -----
var plain = {};
function textOf(l){ return l.enc ? (plain[l.id] || '') : l.message; }
function wc(l){ return l.words != null ? l.words : wordCount(l.message); }
function msgHtml(l){
  if (l.enc && !plain[l.id]) return '<div class="msg"><button class="small" data-unlock="' + l.id + '">🔐 Enter password to read</button></div>';
  return '<div class="msg">' + linkify(esc(textOf(l))) + '</div>' +
    (l.img && /^data:image\/jpeg;base64,/.test(l.img) ? '<img class="letterimg" alt="Attached photo" src="' + l.img + '">' : '') + nowHtml(l);
}
function b64(buf){ var b = new Uint8Array(buf), s = ''; for (var i = 0; i < b.length; i++) s += String.fromCharCode(b[i]); return btoa(s); }
function unb64(s){ return Uint8Array.from(atob(s), function(c){ return c.charCodeAt(0); }); }
async function deriveKey(pw, salt){
  var base = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name:'PBKDF2', salt:salt, iterations:200000, hash:'SHA-256' }, base,
    { name:'AES-GCM', length:256 }, false, ['encrypt','decrypt']);
}
async function encryptText(text, pw){
  var salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
  var ct = await crypto.subtle.encrypt({ name:'AES-GCM', iv:iv }, await deriveKey(pw, salt), new TextEncoder().encode(text));
  return { s:b64(salt), i:b64(iv), d:b64(ct) };
}
async function decryptText(o, pw){
  var buf = await crypto.subtle.decrypt({ name:'AES-GCM', iv:unb64(o.i) }, await deriveKey(pw, unb64(o.s)), unb64(o.d));
  return new TextDecoder().decode(buf);
}
function addMonths(d, m){
  var x = new Date(d.getFullYear(), d.getMonth() + m, 1), last = new Date(x.getFullYear(), x.getMonth() + 1, 0).getDate();
  x.setDate(Math.min(d.getDate(), last)); return x;
}
function nextDate(d, every){
  if (every === 'weekly') return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 7);
  if (every === 'monthly') return addMonths(d, 1);
  if (every === 'yearly') return addMonths(d, 12);
  return d;
}
async function buildAndSave(title, message, date, tags){
  var enc = $('encOn').checked, pw = $('encPw').value;
  if (enc && state.img){ showErr('Photos can’t be added to password-protected letters.'); return; }
  var every = $('recOn').checked ? $('recEvery').value : '';
  var n = every ? Math.min(52, Math.max(2, parseInt($('recCount').value, 10) || 2)) : 1;
  if (enc && !(window.crypto && crypto.subtle)){ showErr('Encryption isn’t available in this browser or page.'); return; }
  $('saveBtn').disabled = true;
  try {
    var series = n > 1 ? uid() : '', d = parseLocal(date), made = [];
    for (var i = 0; i < n; i++){
      var l = { id:uid(), title:n > 1 ? title + ' (' + (i + 1) + '/' + n + ')' : title, message:enc ? '' : message,
        unlockDate:fmtDate(d), mood:state.mood, created:new Date().toISOString(), reply:'', read:false,
        cat:state.cat, fav:false, tags:tags, words:wordCount(message), img:state.img || '' };
      if (enc) l.enc = await encryptText(message, pw);
      if (series){ l.series = series; l.n = i + 1; l.of = n; }
      made.push(l); d = nextDate(d, every);
    }
    letters = letters.concat(made); persist(); store('draft', '');
    ['title','message','unlockDate','tags','encPw'].forEach(function(id){ $(id).value = ''; });
    setImg(''); $('encOn').checked = false; $('recOn').checked = false; $('encPw').classList.add('hidden'); $('recBox').classList.add('hidden');
    updateCount(); render();
    toast(n > 1 ? '🔁 ' + n + ' letters scheduled. The first opens ' + nice(date) : '💌 Locked until ' + nice(date));
  } catch(e){ showErr('Something went wrong while sealing the letter.'); }
  $('saveBtn').disabled = false;
}
var pwId = null;
function askPw(id){ pwId = id; $('pwIn').value = ''; $('pwErr').textContent = ''; $('pwDlg').showModal(); $('pwIn').focus(); }
async function tryPw(){
  var l = find(pwId); if (!l) return;
  try { plain[l.id] = await decryptText(l.enc, $('pwIn').value); $('pwDlg').close(); render(); toast('🔓 Decrypted for this session'); }
  catch(e){ $('pwErr').textContent = 'Wrong password. Try again.'; }
}
$('pwOk').addEventListener('click', tryPw);
$('pwCancel').addEventListener('click', function(){ $('pwDlg').close(); });
$('pwIn').addEventListener('keydown', function(e){ if (e.key === 'Enter') tryPw(); });
$('encOn').addEventListener('change', function(){ $('encPw').classList.toggle('hidden', !this.checked); });
$('recOn').addEventListener('change', function(){ $('recBox').classList.toggle('hidden', !this.checked); });
function endSeries(sid){
  confirmBox('Remove every still-locked letter in this series? Opened ones stay.', function(){
    letters = letters.filter(function(l){ return !(l.series === sid && !isOpen(l)); }); persist(); render(); toast('Series ended');
  });
}

function showErr(m){ $('err').textContent = m; }
$('saveBtn').addEventListener('click', function(){
  var title = $('title').value.trim(), message = $('message').value.trim(), date = $('unlockDate').value;
  if (!title || !message || !date){ showErr('Add a title, a message and an open date.'); return; }
  if (!state.editing && daysUntil(date) < 1){ showErr('Pick a date from tomorrow onward so the letter stays sealed.'); return; }
  showErr('');
  if ($('encOn').checked && ($('encPw').value.length < 4 || state.editing)){
    showErr(state.editing ? 'Turn off password protection to save edits.' : 'Use a password of at least 4 characters.'); return;
  }
  var tags = parseTags($('tags').value);
  if (state.editing){
    var ed = find(state.editing);
    ed.title = title; ed.message = message; ed.mood = state.mood; ed.cat = state.cat; ed.tags = tags;
    ed.edited = new Date().toISOString();
    stopEdit(); persist(); render(); toast('✏️ Changes saved'); return;
  }
  buildAndSave(title, message, date, tags);
});

// ---------- Filters / search / sort ----------
var FILTERS = [['all','All'],['fav','⭐ Favorites'],['locked','🔒 Locked'],['open','🔓 Unlocked']];
function drawFilters(){
  $('filters').innerHTML = FILTERS.map(function(f){
    return '<button class="chip' + (state.filter === f[0] ? ' on' : '') + '" data-f="' + f[0] + '">' + f[1] + '</button>';
  }).join('');
}
$('filters').addEventListener('click', function(e){
  var b = e.target.closest('[data-f]'); if (!b) return;
  state.filter = b.dataset.f; render();
});
$('search').addEventListener('input', render);
$('sort').addEventListener('change', render);

// ---------- Render ----------
function render(){
  drawFilters();
  var q = $('search').value.trim().toLowerCase(), sort = $('sort').value, cf = $('catFilter').value, mf = $('moodFilter').value;
  var openCount = letters.filter(isOpen).length;
  $('sTotal').textContent = letters.length;
  $('sLocked').textContent = letters.length - openCount;
  $('sReady').textContent = openCount;
  $('sWords').textContent = letters.reduce(function(n,l){ return n + wc(l); }, 0).toLocaleString();
  $('sStreak').textContent = streak();
  var unread = letters.filter(function(l){ return isOpen(l) && !l.read; }).length;
  renderBanner(unread);
  document.title = (unread ? '(' + unread + ') ' : '') + 'Dear Me';

  var list = letters.filter(function(l){
    if (state.filter === 'locked' && isOpen(l)) return false;
    if (state.filter === 'open' && !isOpen(l)) return false;
    if (state.filter === 'fav' && !l.fav) return false;
    if (mf && (l.mood || '😊') !== mf) return false;
    if (cf && (l.cat || 'General') !== cf) return false;
    if (!q) return true;
    // Locked messages stay private, so only search titles for those
    var tq = q.replace(/^#/,'');
    return l.title.toLowerCase().indexOf(q) > -1 || (isOpen(l) && textOf(l).toLowerCase().indexOf(q) > -1) ||
      (l.tags || []).some(function(t){ return t.toLowerCase().indexOf(tq) > -1; });
  });
  list.sort(function(a,b){
    if (!!a.fav !== !!b.fav) return a.fav ? -1 : 1;
    if (sort === 'new') return b.created.localeCompare(a.created);
    if (sort === 'old') return a.created.localeCompare(b.created);
    return a.unlockDate.localeCompare(b.unlockDate);
  });

  if (!list.length){
    $('letters').innerHTML = '<div class="empty">' + (letters.length
      ? 'No letters match that search or filter.'
      : 'Nothing sealed yet.<br>Write your first letter above and lock it away.') + '</div>';
    return;
  }

  var shown = list.slice(0, state.limit);
  $('moreBtn').classList.toggle('hidden', list.length <= shown.length);
  $('moreBtn').textContent = 'Show more (' + (list.length - shown.length) + ' left)';
  $('letters').innerHTML = shown.map(function(l){
    var open = isOpen(l), isExp = !!state.openIds[l.id];
    var written = new Date(l.created).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'});
    var badge = open ? (l.read ? '<span class="badge">🔓 Opened</span>' : '<span class="badge new">✨ New</span>')
                     : '<span class="badge">🔒 ' + esc(countdown(l)) + '</span>';
    var progress = '';
    if (!open){
      var total = Math.max(1, (parseLocal(l.unlockDate) - new Date(l.created)) / 864e5);
      var done = Math.min(100, Math.max(2, 100 - (daysUntil(l.unlockDate) / total) * 100));
      progress = '<div class="bar" title="Time until opening"><i style="width:' + done.toFixed(0) + '%"></i></div>';
    }
    var head = '<div><h3>' + (l.enc ? '🔐 ' : '') + (l.series ? '🔁 ' : '') + (l.fav ? '⭐ ' : '') + esc(l.mood || '') + ' ' + esc(l.title) + '</h3><div class="meta">Written ' + esc(written) + esc(ago(l)) +
      ' · Opens ' + esc(nice(l.unlockDate)) + ' · ' + esc(l.cat || 'General') + '</div></div>' + badge;
    var inner = open
      ? '<button class="lh" data-toggle="' + l.id + '" aria-expanded="' + isExp + '">' + head + '</button>' +
        '<div class="body">' + tagsHtml(l) + msgHtml(l) +
        '<h4>Reply to your past self</h4><textarea data-reply="' + l.id + '" placeholder="What would you say back?">' + esc(l.reply) + '</textarea>' +
        '<div class="actions"><button class="small" data-fav="' + l.id + '">' + (l.fav ? '★ Unfavorite' : '☆ Favorite') + '</button>' +
        '<button class="small" data-edit="' + l.id + '">✏️ Edit</button><button class="small" data-txt="' + l.id + '">⬇ .txt</button><button class="small" data-img="' + l.id + '">🖼 Image</button><button class="small" data-copy="' + l.id + '">Copy letter</button>' +
        '<button class="del" data-del="' + l.id + '">Delete</button></div></div>'
      : '<div class="lh">' + head + '</div>' + tagsHtml(l) + progress +
        '<div class="actions"><button class="small" data-fav="' + l.id + '">' + (l.fav ? '★ Unfavorite' : '☆ Favorite') + '</button>' +
        '<button class="small" data-delay="' + l.id + '">⏳ Delay 1 week</button>' +
        (l.series ? '<button class="small" data-endseries="' + l.series + '">🛑 End series</button>' : '') +
        '<button class="del" data-del="' + l.id + '">Delete</button></div>';
    return '<div class="letter ' + (open ? (l.read ? '' : 'ready') : 'locked') + (isExp && open ? ' open' : '') + '">' + (state.selMode ? '<label class="selbox"><input type="checkbox" data-sel="' + l.id + '"' + (state.sel[l.id] ? ' checked' : '') + '> Select</label>' : '') + inner + '</div>';
  }).join('');
}

// ---------- Letter actions (event delegation) ----------
function find(id){ return letters.filter(function(l){ return l.id === id; })[0]; }
$('letters').addEventListener('click', function(e){
  var t = e.target.closest('[data-toggle],[data-del],[data-copy],[data-fav],[data-delay],[data-tag],[data-edit],[data-txt],[data-unlock],[data-endseries],[data-now],[data-img]'); if (!t) return;
  if (t.dataset.img){ shareImage(find(t.dataset.img)); return; }
  if (t.dataset.now){ var ln = find(t.dataset.now); ln.moodNow = t.dataset.m; persist(); render(); return; }
  if (t.dataset.unlock){ askPw(t.dataset.unlock); return; }
  if (t.dataset.endseries){ endSeries(t.dataset.endseries); return; }
  if (t.dataset.tag){ $('search').value = '#' + t.dataset.tag; render(); return; }
  if (t.dataset.edit){ startEdit(t.dataset.edit); return; }
  if (t.dataset.txt){ downloadTxt(find(t.dataset.txt)); return; }
  if (t.dataset.fav){ var fv = find(t.dataset.fav); fv.fav = !fv.fav; persist(); render(); return; }
  if (t.dataset.delay){
    var dl = find(t.dataset.delay), nd = parseLocal(dl.unlockDate); nd.setDate(nd.getDate() + 7);
    dl.unlockDate = fmtDate(nd); persist(); render(); toast('⏳ Pushed back to ' + nice(dl.unlockDate)); return;
  }
  if (t.dataset.toggle){
    var l = find(t.dataset.toggle);
    state.openIds[l.id] = !state.openIds[l.id];
    if (state.openIds[l.id] && !l.read){ l.read = true; persist(); toast('💌 Letter opened. Hello from the past!'); confetti(); }
    render();
  } else if (t.dataset.copy){
    var c = find(t.dataset.copy);
    if (c.enc && !plain[c.id]){ toast('Enter the password first'); return; }
    var txt = c.title + '\n\n' + textOf(c);
    if (navigator.clipboard) navigator.clipboard.writeText(txt).then(function(){ toast('Copied to clipboard'); },
      function(){ toast('Copy isn’t available here'); });
    else toast('Copy isn’t available here');
  } else if (t.dataset.del){
    var id = t.dataset.del;
    confirmBox('Delete this letter forever? This can’t be undone.', function(){
      var gone = find(id), gi = letters.indexOf(gone); letters.splice(gi, 1); persist(); render();
      toast('Letter deleted', function(){ letters.splice(gi, 0, gone); persist(); render(); });
    });
  }
});
$('letters').addEventListener('change', function(e){
  var id = e.target.dataset && e.target.dataset.reply; if (!id) return;
  find(id).reply = e.target.value; persist(); toast('Reply saved');
});

// ---------- Confirm dialog ----------
var pending = null;
function confirmBox(text, fn){
  $('dlgText').textContent = text; pending = fn;
  if ($('dlg').showModal) $('dlg').showModal(); else if (confirm(text)) fn();
}
$('dlgYes').addEventListener('click', function(){ $('dlg').close(); if (pending) pending(); pending = null; });
$('dlgNo').addEventListener('click', function(){ $('dlg').close(); pending = null; });

// ---------- Backup / restore ----------
$('exportBtn').addEventListener('click', function(){
  if (!letters.length){ toast('Nothing to back up yet'); return; }
  try {
    var blob = new Blob([JSON.stringify(letters,null,2)], {type:'application/json'});
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'dear-me-backup.json';
    document.body.appendChild(a); a.click(); a.remove();
  } catch(e){ toast('Download isn’t available here'); }
});
$('importBtn').addEventListener('click', function(){ $('importFile').click(); });
$('importFile').addEventListener('change', function(){
  var f = this.files[0]; if (!f) return;
  var r = new FileReader();
  r.onload = function(){
    try {
      var data = JSON.parse(r.result), added = 0;
      if (!Array.isArray(data)) throw 0;
      data.forEach(function(l){
        if (!l || !l.title || (!l.message && !l.enc) || !/^\d{4}-\d{2}-\d{2}$/.test(l.unlockDate || '')) return;
        l.id = l.id || uid(); l.created = l.created || new Date().toISOString();
        l.img = /^data:image\/jpeg;base64,[A-Za-z0-9+\/=]+$/.test(l.img || '') ? l.img : '';
        if (!find(l.id)){ letters.push(l); added++; }
      });
      persist(); render(); toast('Restored ' + added + (added === 1 ? ' letter' : ' letters'));
    } catch(e){ toast('That file isn’t a valid backup'); }
  };
  r.readAsText(f); this.value = '';
});

// ---------- Keep everything fresh (handles midnight unlocks) ----------
var lastDay = todayStr();
setInterval(function(){
  if (todayStr() !== lastDay){
    lastDay = todayStr(); $('unlockDate').min = addDays(1); hello(); render();
    var n = letters.filter(function(l){ return daysUntil(l.unlockDate) === 0; }).length;
    if (n){ var nm = '💌 ' + n + ' new letter' + (n > 1 ? 's' : '') + ' ready to open!'; toast(nm); notify(nm); }
  }
}, 30000);

render();


// ================= v4: settings, PIN, insights =================
function opts(){ try { return JSON.parse(load('opts')) || {}; } catch(e){ return {}; } }
function setOpt(k, v){ var o = opts(); o[k] = v; store('opts', JSON.stringify(o)); }
function notify(msg){
  if (opts().notify && 'Notification' in window && Notification.permission === 'granted') new Notification('Dear Me', { body:msg });
}
function applyAccent(){
  var name = load('accent') || 'Purple', r = document.documentElement.style;
  var a = ACCENTS.filter(function(x){ return x[0] === name; })[0];
  if (!a || name === 'Purple'){ r.removeProperty('--primary'); r.removeProperty('--primary-h'); return; }
  var dark = document.documentElement.getAttribute('data-theme') === 'dark';
  r.setProperty('--primary', dark ? a[3] : a[1]); r.setProperty('--primary-h', dark ? a[4] : a[2]);
}
function drawAccents(){
  var cur = load('accent') || 'Purple';
  $('accents').innerHTML = ACCENTS.map(function(a){
    return '<button class="sw' + (a[0] === cur ? ' on' : '') + '" data-acc="' + a[0] + '" style="background:' + a[1] +
      '" aria-label="' + a[0] + ' accent"></button>';
  }).join('');
}
$('accents').addEventListener('click', function(e){
  var b = e.target.closest('[data-acc]'); if (!b) return;
  store('accent', b.dataset.acc); applyAccent(); drawAccents();
});
function applyOpts(){
  document.body.classList.toggle('compact', !!opts().compact);
  document.body.classList.remove('font-serif','font-hand');
  if (opts().font) document.body.classList.add('font-' + opts().font);
}
applyOpts(); applyAccent();

$('settingsBtn').addEventListener('click', function(){
  var o = opts(); drawAccents();
  $('optCompact').checked = !!o.compact; $('optConfetti').checked = o.confetti !== false; $('optNotify').checked = !!o.notify;
  $('pinNew').value = ''; $('optFont').value = o.font || ''; storageInfo(); drawTplList(); $('settings').showModal();
});
$('closeSettings').addEventListener('click', function(){ $('settings').close(); });
$('optCompact').addEventListener('change', function(){ setOpt('compact', this.checked); applyOpts(); });
$('optConfetti').addEventListener('change', function(){ setOpt('confetti', this.checked); });
$('optNotify').addEventListener('change', function(){
  var box = this;
  if (!box.checked){ setOpt('notify', false); return; }
  if (!('Notification' in window)){ box.checked = false; toast('Notifications aren’t supported here'); return; }
  Notification.requestPermission().then(function(p){
    if (p === 'granted'){ setOpt('notify', true); toast('🔔 Notifications on'); }
    else { box.checked = false; setOpt('notify', false); toast('Notification permission was denied'); }
  });
});
$('wipeBtn').addEventListener('click', function(){
  $('settings').close();
  confirmBox('Delete ALL letters forever? Consider backing up first.', function(){
    letters = []; persist(); render(); toast('All letters deleted');
  });
});

// PIN lock (a privacy screen: the PIN is only lightly hashed and stored in this browser)
function hash(s){ var h = 5381; s = 'dm:' + s; for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return String(h); }
function showPin(){ $('pinInput').value = ''; $('pinErr').textContent = ''; $('pinScreen').classList.remove('hidden'); $('pinInput').focus(); }
$('pinSet').addEventListener('click', function(){
  var v = $('pinNew').value.trim();
  if (!/^\d{4,8}$/.test(v)){ toast('PIN must be 4 to 8 digits'); return; }
  store('pin', hash(v)); $('pinNew').value = ''; toast('🔐 PIN set');
});
$('pinOff').addEventListener('click', function(){ store('pin', ''); toast('PIN removed'); });
$('lockNow').addEventListener('click', function(){
  if (!load('pin')){ toast('Set a PIN first'); return; }
  $('settings').close(); showPin();
});
function tryPin(){
  if (hash($('pinInput').value.trim()) === load('pin')){ $('pinScreen').classList.add('hidden'); }
  else { $('pinErr').textContent = 'That PIN isn’t right.'; $('pinInput').value = ''; }
}
$('pinGo').addEventListener('click', tryPin);
$('pinInput').addEventListener('keydown', function(e){ if (e.key === 'Enter') tryPin(); });
if (load('pin')) showPin();

// Insights
function bars(title, map){
  var keys = Object.keys(map); if (!keys.length) return '';
  var max = Math.max.apply(null, keys.map(function(k){ return map[k]; }));
  return '<h4>' + title + '</h4>' + keys.map(function(k){
    return '<div class="irow"><span>' + esc(k) + '</span><div class="ibar"><i style="width:' + Math.round(map[k] / max * 100) +
      '%"></i></div><b>' + map[k] + '</b></div>';
  }).join('');
}
$('insBtn').addEventListener('click', function(){
  var body = $('insBody');
  if (!letters.length){ body.innerHTML = '<p class="ins-note">Write a few letters and your stats will show up here.</p>'; $('insights').showModal(); return; }
  var mood = {}, cat = {}, month = {}, words = 0, longest = null;
  letters.forEach(function(l){
    var m = l.mood || '😊', c = l.cat || 'General', mo = l.created.slice(0,7), w = wc(l);
    mood[m] = (mood[m] || 0) + 1; cat[c] = (cat[c] || 0) + 1; month[mo] = (month[mo] || 0) + 1; words += w;
    if (!longest || w > longest.w) longest = { t:l.title, w:w };
  });
  var recent = {}; Object.keys(month).sort().slice(-6).forEach(function(k){ recent[k] = month[k]; });
  var up = letters.filter(function(l){ return !isOpen(l); })
    .sort(function(a,b){ return a.unlockDate.localeCompare(b.unlockDate); }).slice(0,5);
  body.innerHTML =
    '<p class="ins-note">' + letters.length + ' letters · ' + words.toLocaleString() + ' words · avg ' +
      Math.round(words / letters.length) + ' per letter</p>' +
    '<p class="ins-note">Longest: “' + esc(longest.t) + '” (' + longest.w + ' words) · Current streak: ' + streak() + ' days</p>' +
    bars('Moods', mood) + bars('Categories', cat) + bars('Letters written (last 6 months)', recent) +
    (up.length ? '<h4>Coming up</h4>' + up.map(function(l){
      return '<p class="ins-note">🔒 ' + esc(l.title) + ' — ' + esc(nice(l.unlockDate)) + '</p>'; }).join('') : '');
  $('insights').showModal();
});
$('closeIns').addEventListener('click', function(){ $('insights').close(); });

// Focus mode + back-to-top
$('focusBtn').addEventListener('click', function(){
  var on = document.body.classList.toggle('focus');
  this.textContent = on ? '✖ Exit focus' : '🧘 Focus';
  if (on) $('message').focus();
});
window.addEventListener('scroll', function(){ $('toTop').classList.toggle('hidden', window.scrollY < 500); });
$('toTop').addEventListener('click', function(){ scrollTo({ top:0, behavior:'smooth' }); });


// ================= v6: calendar, photos, dictation, more =================
function linkify(h){ return h.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'); }
function nowHtml(l){
  return '<h4>How do you feel reading this now?</h4><div class="row">' + MOODS.map(function(m){
    return '<button class="chip mood' + (l.moodNow === m ? ' on' : '') + '" data-now="' + l.id + '" data-m="' + m + '" aria-label="Feel ' + m + '">' + m + '</button>';
  }).join('') + '</div>' + (l.moodNow && l.mood ? '<p class="meta">Then ' + l.mood + ' → now ' + l.moodNow + '</p>' : '');
}
function storageInfo(){
  var kb = Math.round(((load('letters') || '').length) / 1024);
  $('storeInfo').textContent = 'Your letters use about ' + kb + ' KB of the roughly 5,000 KB your browser allows.';
}
$('optFont').addEventListener('change', function(){ setOpt('font', this.value); applyOpts(); });

// Mood filter + show more
$('moodFilter').innerHTML = '<option value="">All moods</option>' + MOODS.map(function(m){ return '<option>' + m + '</option>'; }).join('');
$('moodFilter').addEventListener('change', function(){ state.limit = 20; render(); });
$('moreBtn').addEventListener('click', function(){ state.limit += 20; render(); });

// Photos
function setImg(d){
  state.img = d; var p = $('imgPrev');
  if (!d){ p.classList.add('hidden'); p.innerHTML = ''; return; }
  p.classList.remove('hidden'); p.innerHTML = '<img alt="Photo preview" src="' + d + '"><button type="button" class="small" id="imgX">Remove photo</button>';
}
$('imgPrev').addEventListener('click', function(e){ if (e.target.id === 'imgX') setImg(''); });
$('imgIn').addEventListener('change', function(){
  var f = this.files[0]; this.value = ''; if (!f) return;
  var img = new Image(), url = URL.createObjectURL(f);
  img.onload = function(){
    var s = Math.min(1, 900 / Math.max(img.width, img.height)), c = document.createElement('canvas');
    c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
    setImg(c.toDataURL('image/jpeg', 0.75));
  };
  img.onerror = function(){ toast('Couldn’t read that image'); };
  img.src = url;
});

// Dictation
var SR = window.SpeechRecognition || window.webkitSpeechRecognition, rec = null;
$('micBtn').addEventListener('click', function(){
  if (!SR){ toast('Dictation isn’t supported in this browser'); return; }
  if (rec){ rec.stop(); return; }
  rec = new SR(); rec.continuous = true; rec.interimResults = false; rec.lang = navigator.language || 'en-US';
  rec.onresult = function(e){
    var t = ''; for (var i = e.resultIndex; i < e.results.length; i++) if (e.results[i].isFinal) t += e.results[i][0].transcript;
    if (t){ var m = $('message'); m.value += (m.value && !/\s$/.test(m.value) ? ' ' : '') + t.trim(); updateCount(); saveDraft(); }
  };
  rec.onend = function(){ rec = null; $('micBtn').textContent = '🎤 Dictate'; };
  rec.onerror = function(){ toast('Dictation stopped'); };
  rec.start(); $('micBtn').textContent = '⏹ Stop';
});

// Calendar
var cal = new Date(); cal.setDate(1);
function drawCal(){
  var y = cal.getFullYear(), m = cal.getMonth(), first = new Date(y, m, 1).getDay(), days = new Date(y, m + 1, 0).getDate();
  $('calTitle').textContent = cal.toLocaleDateString(undefined, { month:'long', year:'numeric' });
  var h = ['S','M','T','W','T','F','S'].map(function(d){ return '<b>' + d + '</b>'; }).join('');
  for (var i = 0; i < first; i++) h += '<span class="day blank"></span>';
  for (var d = 1; d <= days; d++){
    var ds = y + '-' + pad(m + 1) + '-' + pad(d), has = letters.some(function(l){ return l.unlockDate === ds; });
    h += '<button class="day' + (has ? ' has' : '') + (ds === todayStr() ? ' today' : '') + '" data-d="' + ds + '">' + d + '</button>';
  }
  $('calGrid').innerHTML = h;
}
$('calBtn').addEventListener('click', function(){ drawCal(); $('calDlg').showModal(); });
$('calPrev').addEventListener('click', function(){ cal.setMonth(cal.getMonth() - 1); drawCal(); });
$('calNext').addEventListener('click', function(){ cal.setMonth(cal.getMonth() + 1); drawCal(); });
$('calClose').addEventListener('click', function(){ $('calDlg').close(); });
$('calGrid').addEventListener('click', function(e){
  var b = e.target.closest('[data-d]'); if (!b) return;
  var ds = b.dataset.d, hits = letters.filter(function(l){ return l.unlockDate === ds; });
  if (hits.length){
    $('calNote').textContent = nice(ds) + ': ' + hits.map(function(l){ return (isOpen(l) ? '🔓 ' : '🔒 ') + l.title; }).join(' · ');
  } else if (daysUntil(ds) >= 1){
    $('unlockDate').value = ds; saveDraft(); $('calDlg').close(); toast('📅 Open date set to ' + nice(ds));
  } else $('calNote').textContent = nice(ds) + ': no letters on this day.';
});

// CSV export (locked letters never include their message)
function csvCell(v){ return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"'; }
$('csvBtn').addEventListener('click', function(){
  if (!letters.length){ toast('Nothing to export yet'); return; }
  var rows = [['Title','Written','Opens','Mood','Mood now','Category','Tags','Message']].concat(letters.map(function(l){
    return [l.title, l.created.slice(0,10), l.unlockDate, l.mood || '', l.moodNow || '', l.cat || '', (l.tags || []).join(' '), isOpen(l) ? textOf(l) : ''];
  }));
  try {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['\ufeff' + rows.map(function(r){ return r.map(csvCell).join(','); }).join('\n')], { type:'text/csv' }));
    a.download = 'dear-me-letters.csv'; document.body.appendChild(a); a.click(); a.remove();
  } catch(e){ toast('Download isn’t available here'); }
});

// Keyboard shortcuts: / search, n new letter, c calendar
document.addEventListener('keydown', function(e){
  if (e.ctrlKey || e.metaKey || e.altKey || /^(INPUT|TEXTAREA|SELECT)$/.test((e.target.tagName || '')) || $('app').classList.contains('hidden')) return;
  if (document.querySelector('dialog[open]') || !$('pinScreen').classList.contains('hidden')) return;
  if (e.key === '/'){ e.preventDefault(); $('search').focus(); }
  else if (e.key === 'n'){ e.preventDefault(); scrollTo({ top:0, behavior:'smooth' }); $('title').focus(); }
  else if (e.key === 'c'){ $('calBtn').click(); }
});


// ================= v7: image share, templates, timer, bulk select =================
function shareImage(l){
  if (!l) return;
  if (l.enc && !plain[l.id]){ toast('Enter the password first'); return; }
  var cs = getComputedStyle(document.documentElement), v = function(n){ return cs.getPropertyValue(n).trim() || '#333'; };
  var W = 1080, P = 80, F = 'Poppins, system-ui, sans-serif', c = document.createElement('canvas'), x = c.getContext('2d'), lines = [];
  x.font = '30px ' + F;
  textOf(l).split('\n').forEach(function(par){
    if (!par.trim()){ lines.push(''); return; }
    var cur = '';
    par.split(/\s+/).forEach(function(w){
      var t = cur ? cur + ' ' + w : w;
      if (x.measureText(t).width > W - 2 * P && cur){ lines.push(cur); cur = w; } else cur = t;
    });
    lines.push(cur);
  });
  if (lines.length > 28) lines = lines.slice(0, 28).concat('…');
  var H = 340 + lines.length * 46 + 110;
  c.width = W; c.height = H; x = c.getContext('2d');
  var g = x.createLinearGradient(0, 0, W, H); g.addColorStop(0, v('--bg1')); g.addColorStop(1, v('--bg2'));
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  x.fillStyle = v('--card'); x.beginPath();
  if (x.roundRect) x.roundRect(40, 40, W - 80, H - 80, 36); else x.rect(40, 40, W - 80, H - 80);
  x.fill();
  var tt = (l.mood || '') + ' ' + l.title; if (tt.length > 34) tt = tt.slice(0, 33) + '…';
  x.fillStyle = v('--primary'); x.font = '700 46px ' + F; x.fillText(tt, P, 150);
  x.fillStyle = v('--muted'); x.font = '24px ' + F;
  x.fillText('Written ' + nice(fmtDate(new Date(l.created))) + ' · Opened ' + nice(l.unlockDate), P, 205);
  x.fillStyle = v('--text'); x.font = '30px ' + F;
  lines.forEach(function(ln, i){ x.fillText(ln, P, 300 + i * 46); });
  x.fillStyle = v('--primary'); x.font = '600 26px ' + F; x.fillText('💌 Dear Me', P, H - 80);
  c.toBlob(function(b){
    if (!b){ toast('Couldn’t make the image'); return; }
    var a = document.createElement('a'); a.href = URL.createObjectURL(b);
    a.download = (l.title.replace(/[^\w]+/g, '-').toLowerCase() || 'letter') + '.png';
    document.body.appendChild(a); a.click(); a.remove();
  });
}

// Custom templates
function customTpls(){ try { return JSON.parse(load('tpls')) || {}; } catch(e){ return {}; } }
function allTemplates(){
  var o = {}, c = customTpls();
  Object.keys(TEMPLATES).forEach(function(k){ o[k] = TEMPLATES[k]; });
  Object.keys(c).forEach(function(k){ o['⭐ ' + k] = c[k]; });
  return o;
}
function drawTpl(){
  $('tplSel').innerHTML = '<option value="">📋 Template…</option>' + Object.keys(allTemplates()).map(function(k){
    return '<option value="' + esc(k) + '">' + esc(k) + '</option>';
  }).join('');
}
function drawTplList(){
  var c = customTpls(), keys = Object.keys(c);
  $('tplList').innerHTML = keys.length ? keys.map(function(k){
    return '<div class="tpli"><span>⭐ ' + esc(k) + '</span><button class="small" data-tdel="' + esc(k) + '">Remove</button></div>';
  }).join('') : '<p class="hint" style="margin:4px 0!important">None yet. Use “Save as template” while writing.</p>';
}
$('tplList').addEventListener('click', function(e){
  var b = e.target.closest('[data-tdel]'); if (!b) return;
  var c = customTpls(); delete c[b.dataset.tdel]; store('tpls', JSON.stringify(c)); drawTpl(); drawTplList();
});
$('tplMake').addEventListener('click', function(){
  if (!$('message').value.trim()){ toast('Write something first'); return; }
  $('tplName').value = ''; $('tplErr').textContent = ''; $('tplDlg').showModal(); $('tplName').focus();
});
$('tplCancel').addEventListener('click', function(){ $('tplDlg').close(); });
$('tplSave').addEventListener('click', function(){
  var n = $('tplName').value.trim(); if (!n){ $('tplErr').textContent = 'Give it a name.'; return; }
  var c = customTpls(); c[n] = $('message').value; store('tpls', JSON.stringify(c));
  drawTpl(); $('tplDlg').close(); toast('💾 Template “' + n + '” saved');
});
drawTpl();

// Writing timer
function fmtSecs(s){ return Math.floor(s / 60) + ':' + pad(s % 60); }
var tm = null;
$('timerBtn').addEventListener('click', function(){
  var b = this;
  if (tm){
    var secs = Math.round((Date.now() - tm.t0) / 1000), w = Math.max(0, wordCount($('message').value) - tm.w0);
    clearInterval(tm.i); tm = null; b.textContent = '⏱ Timer';
    toast('⏱ ' + fmtSecs(secs) + ' · ' + w + ' words · ' + (secs ? Math.round(w / (secs / 60)) : 0) + ' wpm'); return;
  }
  tm = { t0:Date.now(), w0:wordCount($('message').value) };
  tm.i = setInterval(function(){ b.textContent = '⏹ ' + fmtSecs(Math.round((Date.now() - tm.t0) / 1000)); }, 1000);
  b.textContent = '⏹ 0:00'; $('message').focus();
});

// Bulk select
function selIds(){ return Object.keys(state.sel); }
function updateBulk(){ $('bulkCount').textContent = selIds().length + ' selected'; }
$('selBtn').addEventListener('click', function(){
  state.selMode = !state.selMode; state.sel = {};
  this.textContent = state.selMode ? '✖ Done selecting' : '☑ Select';
  $('bulkBar').classList.toggle('hidden', !state.selMode); updateBulk(); render();
});
$('letters').addEventListener('change', function(e){
  var id = e.target.dataset && e.target.dataset.sel; if (!id) return;
  if (e.target.checked) state.sel[id] = 1; else delete state.sel[id];
  updateBulk();
});
$('selAll').addEventListener('click', function(){
  [].forEach.call(document.querySelectorAll('[data-sel]'), function(cb){ cb.checked = true; state.sel[cb.dataset.sel] = 1; });
  updateBulk();
});
$('bulkFav').addEventListener('click', function(){
  var ids = selIds(); if (!ids.length){ toast('Select some letters first'); return; }
  letters.forEach(function(l){ if (state.sel[l.id]) l.fav = true; }); persist(); render(); toast('⭐ Favorited ' + ids.length);
});
$('bulkDel').addEventListener('click', function(){
  var ids = selIds(); if (!ids.length){ toast('Select some letters first'); return; }
  confirmBox('Delete ' + ids.length + (ids.length === 1 ? ' letter' : ' letters') + '? You can undo right after.', function(){
    var before = letters.slice();
    letters = letters.filter(function(l){ return !state.sel[l.id]; }); state.sel = {}; persist(); updateBulk(); render();
    toast('Deleted ' + ids.length, function(){ letters = before; persist(); render(); });
  });
});
