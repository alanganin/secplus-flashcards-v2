/* Editable flashcard app that loads cards.json */
const STORAGE = {
  progress: 'secplus.progress.v3',
  settings: 'secplus.settings.v3',
  last: 'secplus.last.v3',
  deckOverlay: 'secplus.deck.overlay.v2'
};
const WEIGHTS = { know: 1, unsure: 3, dont: 6, unseen: 4 };
const el = id => document.getElementById(id);
const q = (sel, root=document) => root.querySelector(sel);
const qa = (sel, root=document) => [...root.querySelectorAll(sel)];

let BASE = [];
let overlay = JSON.parse(localStorage.getItem(STORAGE.deckOverlay) || '{"added":[],"edited":{},"deleted":{}}');
let CARDS = [];
let FILTERED = [];
let INDEX = 0;
let FRONT = true;

let progress = JSON.parse(localStorage.getItem(STORAGE.progress) || '{}');
let settings = JSON.parse(localStorage.getItem(STORAGE.settings) || '{"dark":true,"showExample":true,"bucket":"all"}');
let last = JSON.parse(localStorage.getItem(STORAGE.last) || '{"i":0}');
if (settings.dark) document.body.dataset.theme = 'dark';

function saveProgress(){ localStorage.setItem(STORAGE.progress, JSON.stringify(progress)); }
function saveSettings(){ localStorage.setItem(STORAGE.settings, JSON.stringify(settings)); }
function saveLast(){ localStorage.setItem(STORAGE.last, JSON.stringify({i:INDEX})); }
function saveOverlay(){ localStorage.setItem(STORAGE.deckOverlay, JSON.stringify(overlay)); }
function bucketOf(id){ return progress[id]?.bucket || 'unseen'; }
function setBucket(id,b){ if(!progress[id]) progress[id]={}; progress[id].bucket=b; progress[id].ts=Date.now(); saveProgress(); updateStats(); }
function unique(arr){ return [...new Set(arr)]; }
function genId(s){ const slug=(s||'card').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,''); return (slug||'card')+'-'+Date.now().toString(36); }

function mergeDeck(){
  const byId = new Map(BASE.map(c=>[c.id,{...c}]));
  for (const [id, card] of Object.entries(overlay.edited||{})){ if(byId.has(id)) byId.set(id,{...byId.get(id),...card}); }
  for (const id of Object.keys(overlay.deleted||{})){ byId.delete(id); }
  (overlay.added||[]).forEach(c=>{ if(!c.id) c.id=genId(c.term||c.definition||'card'); if(byId.has(c.id)) c.id=genId(c.id); byId.set(c.id,{...c}); });
  CARDS = [...byId.values()];
}

async function init(){
  const res = await fetch('cards.json'); BASE = await res.json();
  mergeDeck();
  const categories = unique(CARDS.map(c=>c.category||'Objective')).sort();
  const obs = unique(CARDS.map(c=>c.ob||'Imported')).sort();
  const catSel=el('category'), obSel=el('ob');
  categories.forEach(x=>catSel.insertAdjacentHTML('beforeend', `<option>${x}</option>`));
  obs.forEach(x=>obSel.insertAdjacentHTML('beforeend', `<option>${x}</option>`));
  bindEvents(); applyFilters();
  INDEX = Math.min(last.i||0, FILTERED.length-1); showCard(INDEX,true);
  if(!settings.showExample) toggleExample(false); updateButtonsState();
}
document.addEventListener('DOMContentLoaded', init);

function bindEvents(){
  el('search').addEventListener('keydown', e=>{ if(e.key==='Enter'){ applyFilters(); } });
  document.addEventListener('keydown', e=>{
    if(e.key === '/'){ e.preventDefault(); el('search').focus(); }
    else if(e.key==='ArrowLeft'){ prev(); }
    else if(e.key==='ArrowRight'){ next(); }
    else if(e.key.toLowerCase()==='f'){ flip(); }
    else if(e.key.toLowerCase()==='s'){ mark('know'); }
    else if(e.key.toLowerCase()==='d'){ mark('unsure'); }
    else if(e.key.toLowerCase()==='a'){ mark('dont'); }
    else if(e.key.toLowerCase()==='e'){ openEditor('edit'); }
    else if(e.key.toLowerCase()==='n'){ openEditor('add'); }
  });
  el('category').addEventListener('change', applyFilters);
  el('ob').addEventListener('change', applyFilters);
  el('filterAll').addEventListener('click', ()=>{settings.bucket='all'; saveSettings(); bucketFilterUI(); applyFilters();});
  el('filterUnseen').addEventListener('click', ()=>{settings.bucket='unseen'; saveSettings(); bucketFilterUI(); applyFilters();});
  el('filterDont').addEventListener('click', ()=>{settings.bucket='dont'; saveSettings(); bucketFilterUI(); applyFilters();});
  el('filterUnsure').addEventListener('click', ()=>{settings.bucket='unsure'; saveSettings(); bucketFilterUI(); applyFilters();});
  el('filterKnow').addEventListener('click', ()=>{settings.bucket='know'; saveSettings(); bucketFilterUI(); applyFilters();});

  el('prevBtn').addEventListener('click', prev);
  el('nextBtn').addEventListener('click', next);
  el('flipBtn').addEventListener('click', flip);
  el('shuffleBtn').addEventListener('click', ()=>{ INDEX = pickWeightedIndex(); showCard(INDEX,true); });
  el('toggleExample').addEventListener('click', ()=>toggleExample());

  el('btnKnow').addEventListener('click', ()=>mark('know'));
  el('btnUnsure').addEventListener('click', ()=>mark('unsure'));
  el('btnDont').addEventListener('click', ()=>mark('dont'));
  el('editBtn').addEventListener('click', ()=>openEditor('edit'));
  el('addBtn').addEventListener('click', ()=>openEditor('add'));
  el('deleteBtn').addEventListener('click', delCurrent);

  el('darkToggle').addEventListener('click', ()=>{ settings.dark=!settings.dark; document.body.classList.toggle('light', !settings.dark); saveSettings(); });
  el('exportBtn').addEventListener('click', exportProgress);
  el('importFile').addEventListener('change', importProgress);
  el('printBtn').addEventListener('click', ()=>window.print());

  el('exportDeckBtn').addEventListener('click', exportDeck);
  el('importDeckFile').addEventListener('change', importDeck);

  bucketFilterUI();
}
function bucketFilterUI(){
  const map={all:'filterAll',unseen:'filterUnseen',dont:'filterDont',unsure:'filterUnsure',know:'filterKnow'};
  qa('.sidebar .btn').forEach(b=>b.setAttribute('aria-pressed','false'));
  el(map[settings.bucket]||'filterAll').setAttribute('aria-pressed','true');
}
function applyFilters(){
  const qv=el('search').value.trim().toLowerCase();
  const cat=el('category').value; const ob=el('ob').value; const bucket=settings.bucket||'all';
  FILTERED = CARDS.filter(c=>{
    const matchesQ=!qv || [c.term,c.definition,c.example].some(x=>(x||'').toLowerCase().includes(qv));
    const matchesCat=!cat || (c.category||'')===cat;
    const matchesOB=!ob || (c.ob||'')===ob;
    const matchesBucket=bucket==='all' || bucketOf(c.id)===bucket;
    return matchesQ && matchesCat && matchesOB && matchesBucket;
  });
  renderList(); updateStats();
  if(FILTERED.length){ INDEX=Math.min(INDEX,FILTERED.length-1); showCard(INDEX,true); el('emptyList').hidden=true; }
  else { el('emptyList').hidden=false; el('term').textContent='No cards'; el('definition').textContent=''; el('example').textContent=''; }
}
function renderList(){
  const ul=el('list'); ul.innerHTML='';
  FILTERED.forEach((c,i)=>{
    const b=bucketOf(c.id); const icon=b==='know'?'✅':b==='unsure'?'❓':b==='dont'?'❌':'🆕';
    const node=document.createElement('div'); node.className='item';
    node.innerHTML=`<div><strong>${c.term}</strong> <small>(${c.ob||'—'} • ${c.category||'—'})</small></div><small>${icon} ${(c.definition||'').slice(0,140)}</small>`;
    node.addEventListener('click',()=>{ INDEX=i; showCard(i,true); });
    ul.appendChild(node);
  });
}
function updateStats(){
  const total=CARDS.length, seen=Object.keys(progress).length;
  const counts={know:0,unsure:0,dont:0,unseen: total};
  CARDS.forEach(c=>{ const b=bucketOf(c.id); if(b!=='unseen') counts.unseen--; if(counts[b]!==undefined) counts[b]++; });
  el('countTotal').textContent=total; el('countSeen').textContent=seen;
  el('countKnow').textContent=counts.know; el('countUnsure').textContent=counts.unsure; el('countDont').textContent=counts.dont;
  const pct=Math.round(((counts.know + counts.unsure*0.33) / Math.max(1,total))*100);
  q('#ring').style.setProperty('--deg', `${pct*3.6}deg`); q('#ringPct').textContent=pct+'%';
}
function showCard(i, resetFront=false){
  if(!FILTERED.length) return; const c=FILTERED[i]; if(resetFront) FRONT=true;
  el('term').textContent=c.term||''; el('definition').textContent=FRONT?'':(c.definition||'');
  el('example').textContent=(!FRONT && settings.showExample && c.example)?('Example: '+c.example):'';
  el('currentInfo').textContent=`${i+1}/${FILTERED.length} • ${c.ob||'—'} • ${c.category||'—'} • ${statusEmoji(bucketOf(c.id))}`;
  saveLast(); updateButtonsState();
}
function statusEmoji(b){ return b==='know'?'✅':b==='unsure'?'❓':b==='dont'?'❌':'🆕'; }
function next(){ if(!FILTERED.length) return; INDEX=(INDEX+1)%FILTERED.length; showCard(INDEX,true); }
function prev(){ if(!FILTERED.length) return; INDEX=(INDEX-1+FILTERED.length)%FILTERED.length; showCard(INDEX,true); }
function flip(){ FRONT=!FRONT; showCard(INDEX,false); }
function mark(t){ const c=FILTERED[INDEX]; if(!c) return; setBucket(c.id, t==='know'?'know':t==='unsure'?'unsure':'dont'); showCard(INDEX,false); }
function toggleExample(n){ settings.showExample= typeof n==='boolean'? n: !settings.showExample; saveSettings(); el('toggleExample').setAttribute('aria-pressed', settings.showExample?'true':'false'); showCard(INDEX,false); }
function updateButtonsState(){ el('toggleExample').setAttribute('aria-pressed', settings.showExample?'true':'false'); }
function pickWeightedIndex(){ if(!FILTERED.length) return 0; const w=FILTERED.map(c=>({know:1,unsure:3,dont:6,unseen:4}[bucketOf(c.id)]||1)); const total=w.reduce((a,b)=>a+b,0); let r=Math.random()*total; for(let i=0;i<FILTERED.length;i++){ r-=w[i]; if(r<=0) return i; } return 0; }

function openEditor(mode){
  const modal=el('editor'); modal.setAttribute('open',''); const c=FILTERED[INDEX];
  q('#editorTitle').textContent=mode==='add'?'Add Card':'Edit Card';
  el('fTerm').value=mode==='add'?'':(c?.term||''); el('fDefinition').value=mode==='add'?'':(c?.definition||''); el('fExample').value=mode==='add'?'':(c?.example||''); el('fCategory').value=mode==='add'?'':(c?.category||''); el('fOB').value=mode==='add'?'':(c?.ob||'');
  const save=el('saveEdit'); const cancel=el('cancelEdit');
  const onCancel=()=>{ modal.removeAttribute('open'); cancel.removeEventListener('click', onCancel); save.removeEventListener('click', onSave); };
  const onSave=()=>{
    const card={ term:el('fTerm').value.trim(), definition:el('fDefinition').value.trim(), example:el('fExample').value.trim(), category:(el('fCategory').value.trim()||'Objective'), ob:(el('fOB').value.trim()||'Imported') };
    if(!card.term && !card.definition){ alert('Please enter at least a Term or a Definition.'); return; }
    if(mode==='add'){ card.id=genId(card.term||card.definition); (overlay.added=overlay.added||[]).push(card); }
    else{ const id=c.id; (overlay.edited=overlay.edited||{}); overlay.edited[id]={...(overlay.edited[id]||{}), ...card, id}; }
    saveOverlay(); mergeDeck(); applyFilters(); modal.removeAttribute('open');
  };
  cancel.addEventListener('click', onCancel); save.addEventListener('click', onSave);
}
function delCurrent(){ const c=FILTERED[INDEX]; if(!c) return; if(!confirm(`Delete "${c.term}"?`)) return; overlay.deleted=overlay.deleted||{}; overlay.deleted[c.id]=true; delete progress[c.id]; saveOverlay(); saveProgress(); mergeDeck(); applyFilters(); }

function exportProgress(){ const data={progress, settings, exportedAt:new Date().toISOString()}; const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='secplus-progress.json'; a.click(); URL.revokeObjectURL(url); }
function importProgress(e){ const file=e.target.files?.[0]; if(!file) return; const r=new FileReader(); r.onload=()=>{ try{ const data=JSON.parse(r.result); if(data.progress) progress=data.progress; if(data.settings) settings=data.settings; saveProgress(); saveSettings(); bucketFilterUI(); applyFilters(); alert('Progress imported.'); }catch{ alert('Invalid JSON.'); } }; r.readAsText(file); }

function exportDeck(){ const full=CARDS.map(c=>({id:c.id,term:c.term||'',definition:c.definition||'',example:c.example||'',category:c.category||'Objective',ob:c.ob||'Imported'})); const blob=new Blob([JSON.stringify(full,null,2)],{type:'application/json'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='cards.json'; a.click(); URL.revokeObjectURL(url); }
function importDeck(e){ const file=e.target.files?.[0]; if(!file) return; const r=new FileReader(); r.onload=()=>{ try{ const arr=JSON.parse(r.result); if(!Array.isArray(arr)) throw new Error('expected array'); overlay={added:arr,edited:{},deleted:{}}; saveOverlay(); mergeDeck(); applyFilters(); alert('Deck imported into local overlay.'); }catch{ alert('Invalid deck JSON.'); } }; r.readAsText(file); }
