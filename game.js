/* BREACH PROTOCOL — web port (HTML5 Canvas).
   Full game: Blue Team (defend) + Red Hat (attack) + 65 achievements.
   Faithful port of the pygame desktop version. Saves to localStorage. */
"use strict";

/* ============================ config ============================ */
const CELL = 38, COLS = 22, ROWS = 14;
const GRID_W = COLS * CELL, GRID_H = ROWS * CELL;     // 836 x 532
const GX = 234, GY = 66;
const WIN_W = 1290, WIN_H = 720;

const C = {
  BG:'#05070d', PANEL:'#0b1020', PANEL2:'#090d1a', LINE:'#16306b', DARK:'#070b16',
  NEON:'#00e5ff', GREEN:'#3ddc97', AMBER:'#ffb703', RED:'#ff3b5c', PURPLE:'#b15dff',
  INK:'#cfe9ff', DIM:'#6b86b8',
};

const ENEMY = {
  virus:    {name:'Malware',       hp:30, spd:55, reward:8,  dmg:6,  color:'#ff5d5d', sym:'M', info:'Self-replicating malicious code. Counter with Antivirus signature scanning.'},
  ddos:     {name:'DDoS Botnet',   hp:16, spd:100,reward:5,  dmg:4,  color:'#ff9f1c', sym:'D', info:'Flood of junk traffic from many bots. Fast & weak. Firewalls rate-limit them.'},
  phish:    {name:'Phishing',      hp:22, spd:72, reward:6,  dmg:5,  color:'#ffd23f', sym:'P', info:'Deceptive lure to steal credentials. Email Gateway filters it out.'},
  injection:{name:'SQL Injection', hp:34, spd:66, reward:9,  dmg:8,  color:'#3ddc97', sym:'S', info:'Malicious query targeting your database. A WAF inspects & blocks it.'},
  ransom:   {name:'Ransomware',    hp:60, spd:44, reward:14, dmg:13, color:'#b15dff', sym:'R', info:'Encrypts your files for ransom. Tanky. EDR/Backup shreds it fast.'},
  zeroday:  {name:'Zero-Day',      hp:78, spd:62, reward:22, dmg:16, color:'#eef2ff', sym:'Z', info:'Unknown exploit, no signature exists. Only AI Threat Intel reliably stops it.'},
  apt:      {name:'APT Boss',      hp:620,spd:34, reward:140,dmg:55, color:'#ff2e63', sym:'A', info:'Advanced Persistent Threat. A funded adversary. Concentrate ALL firepower.'},
};

const TOWER = {
  av: {name:'Antivirus',      cost:40, rng:92, rate:2.6, dmg:14, primary:'virus',     color:'#00e5ff', sym:'AV',  desc:'Signature-based malware scanner. 3x vs Malware.'},
  fw: {name:'Firewall',       cost:55, rng:118,rate:3.6, dmg:7,  primary:'ddos',      color:'#ff9f1c', sym:'FW',  slow:true, desc:'Packet filter + rate-limiter. Shreds & slows DDoS floods.'},
  eg: {name:'Email Gateway',  cost:48, rng:104,rate:2.0, dmg:19, primary:'phish',     color:'#ffd23f', sym:'EG',  desc:'Quarantines malicious mail. 3x vs Phishing.'},
  waf:{name:'Web Firewall',   cost:62, rng:100,rate:2.3, dmg:20, primary:'injection', color:'#3ddc97', sym:'WAF', desc:'Inspects HTTP requests. 3x vs SQL Injection.'},
  edr:{name:'EDR / Backup',   cost:78, rng:88, rate:1.5, dmg:32, primary:'ransom',    color:'#b15dff', sym:'BK',  desc:'Endpoint detection + snapshots. 3x vs Ransomware.'},
  ai: {name:'AI Threat Intel',cost:130,rng:140,rate:2.1, dmg:17, primary:'zeroday',   color:'#e0aaff', sym:'AI',  allr:true, desc:'ML anomaly detection. Hits everything, best vs Zero-Day.'},
};
const SHOP = ['av','fw','eg','waf','edr','ai'];

const DIFF = {
  easy:   {core:150, credits:130, hpmul:0.85, label:'ROOKIE'},
  normal: {core:100, credits:100, hpmul:1.0,  label:'ANALYST'},
  hard:   {core:70,  credits:85,  hpmul:1.25, label:'RED TEAM'},
};
const ATK_DIFF = {
  easy:   {core:60, intel:170, regen:12.0, esc:18.0, defs:2, cap:5, label:'ROOKIE'},
  normal: {core:85, intel:140, regen:9.5,  esc:14.0, defs:3, cap:7, label:'ANALYST'},
  hard:   {core:105,intel:120, regen:8.0,  esc:11.5, defs:4, cap:9, label:'RED TEAM'},
};
const ATTACK = [['ddos',12],['virus',22],['phish',18],['injection',26],['ransom',40],['zeroday',80]];
const ATTACK_COST = Object.fromEntries(ATTACK);
const ATK_HP_MUL = 3.0, ATK_BREACH_MUL = 1.8, ATK_OFF_MUL = 0.12;

function effmul(key, et){
  const t = TOWER[key];
  if (t.allr) return et==='zeroday' ? 1.5 : (et==='apt' ? 0.95 : 0.8);
  return t.primary===et ? 1.0 : 0.34;
}
function eff_atk(key, et){
  const t = TOWER[key];
  if (t.allr) return et==='zeroday' ? 1.3 : 0.55;
  return t.primary===et ? 1.0 : ATK_OFF_MUL;
}

/* ============================ path ============================ */
const WP = [[-1,2],[18,2],[18,6],[3,6],[3,10],[18,10],[21,10]];
const WPX = WP.map(([c,r]) => [c*CELL+CELL/2+GX, r*CELL+CELL/2+GY]);
function buildSegments(pts){
  const segs = []; let total = 0;
  for (let i=0;i<pts.length-1;i++){
    const a=pts[i], b=pts[i+1], L=Math.hypot(b[0]-a[0], b[1]-a[1]);
    segs.push({a,b,L,cs:total}); total += L;
  }
  return {segs, total};
}
const {segs:SEGS, total:TOTAL} = buildSegments(WPX);
function pointAt(d){
  if (d<=0) return SEGS[0].a;
  for (const s of SEGS){ if (d<=s.cs+s.L){ const t = s.L>0?(d-s.cs)/s.L:0; return [s.a[0]+(s.b[0]-s.a[0])*t, s.a[1]+(s.b[1]-s.a[1])*t]; } }
  return SEGS[SEGS.length-1].b;
}
const PATH_CELLS = new Set();
for (let i=0;i<WP.length-1;i++){
  let [c0,r0]=WP[i], [c1,r1]=WP[i+1];
  const dc=Math.sign(c1-c0), dr=Math.sign(r1-r0);
  let c=c0, r=r0; PATH_CELLS.add(c+','+r);
  while (c!==c1||r!==r1){ c+=dc; r+=dr; PATH_CELLS.add(c+','+r); }
}
function buildable(c,r){ return c>=0&&c<COLS&&r>=0&&r<ROWS&&!PATH_CELLS.has(c+','+r); }
const _PATH_PTS = []; for (let d=0; d<TOTAL; d+=6) _PATH_PTS.push(pointAt(d));
const DEFENSE_CELLS = [];
for (let c=0;c<COLS;c++) for (let r=0;r<ROWS;r++){
  if (!buildable(c,r)) continue;
  const cx=c*CELL+CELL/2+GX, cy=r*CELL+CELL/2+GY;
  let m=1e18; for (const p of _PATH_PTS){ const dd=(cx-p[0])**2+(cy-p[1])**2; if (dd<m) m=dd; }
  if (m<=60*60) DEFENSE_CELLS.push([c,r]);
}

/* ============================ util ============================ */
const rnd = (a,b)=>a+Math.random()*(b-a);
const choice = a => a[(Math.random()*a.length)|0];
const dist = (ax,ay,bx,by)=>Math.hypot(ax-bx,ay-by);
const clamp = (v,a,b)=>Math.max(a,Math.min(b,v));
function fmtTime(s){ s=Math.floor(s); return Math.floor(s/60)+':'+String(s%60).padStart(2,'0'); }
function unlockedTypes(n){ const t=['virus']; if(n>=2)t.push('ddos'); if(n>=3)t.push('phish'); if(n>=4)t.push('injection'); if(n>=6)t.push('ransom'); if(n>=8)t.push('zeroday'); return t; }
function genWave(n){
  const q=[], types=unlockedTypes(n), count=5+Math.floor(n*2.2); let t=0;
  for (let i=0;i<count;i++){ t+=rnd(0.45,1.0)*Math.max(0.55,1-n*0.02); q.push([t, choice(types), 1+n*0.13]); }
  if (n%5===0) q.push([t+2.2,'apt',1+n*0.16]);
  q.sort((a,b)=>a[0]-b[0]); return q;
}

/* ============================ persistence ============================ */
const SAVE_KEY = 'breach_protocol_save';
function loadScores(){ try { return JSON.parse(localStorage.getItem(SAVE_KEY)) || {}; } catch(e){ return {}; } }
function saveScores(s){ try { localStorage.setItem(SAVE_KEY, JSON.stringify(s)); } catch(e){} }
let UNLOCKED = new Set();
function loadUnlocked(){ return new Set(loadScores().achievements || []); }
function persistUnlock(id){ const sc=loadScores(); const lst=sc.achievements||(sc.achievements=[]); if(!lst.includes(id)){ lst.push(id); saveScores(sc); } }

/* ============================ achievements ============================ */
function lvl3(g){ return g.towers.filter(t=>t.lvl>=3).length; }
const ACHIEVEMENTS = [
  ['d_first','First Contact','Block your first threat.','BLUE TEAM', g=>g.mode==='defend'&&g.ev.kills>=1],
  ['d_w1','Script Kiddie','Clear wave 1.','BLUE TEAM', g=>g.mode==='defend'&&g.wavesCleared>=1],
  ['d_w5','Holding the Line','Reach wave 5.','BLUE TEAM', g=>g.mode==='defend'&&g.wave>=5],
  ['d_w10','Hardened Target','Reach wave 10.','BLUE TEAM', g=>g.mode==='defend'&&g.wave>=10],
  ['d_w15','Fortress','Reach wave 15.','BLUE TEAM', g=>g.mode==='defend'&&g.wave>=15],
  ['d_w20','Impenetrable','Reach wave 20.','BLUE TEAM', g=>g.mode==='defend'&&g.wave>=20],
  ['d_untouch','Untouchable','Clear a wave with zero core damage.','BLUE TEAM', g=>g.ev.untouchable],
  ['d_flaw','Flawless Defense','Reach wave 10 at full integrity.','BLUE TEAM', g=>g.ev.flawless10],
  ['d_types','Full Stack','Build all 6 defense types in one game.','BLUE TEAM', g=>g.ev.tower_types.size>=6],
  ['d_lvl3','Maxed Out','Upgrade a defense to level 3.','BLUE TEAM', g=>lvl3(g)>=1],
  ['d_arsenal','Overwatch','Field three level-3 defenses at once.','BLUE TEAM', g=>lvl3(g)>=3],
  ['d_quar','Containment','Use Quarantine.','BLUE TEAM', g=>g.ev.used_q],
  ['d_ir','Rapid Response','Use IR Strike.','BLUE TEAM', g=>g.ev.used_w],
  ['d_rich','Budget Surplus','Bank 400 credits in one game.','BLUE TEAM', g=>g.ev.max_credits>=400],
  ['d_depth','Defense in Depth','Deploy 14 defenses in one game.','BLUE TEAM', g=>g.ev.towers_built>=14],
  ['d_zero','Zero-Day Hunter','Destroy a Zero-Day threat.','BLUE TEAM', g=>g.ev.killed_zeroday>=1],
  ['d_boss','Boss Slayer','Destroy an APT boss.','BLUE TEAM', g=>g.ev.killed_apt>=1],
  ['d_iron','Iron Wall','Clear an APT wave with no core damage.','BLUE TEAM', g=>g.ev.iron_wall],
  ['a_first','Initiate','Launch your first attack.','RED HAT', g=>g.ev.launched>=1],
  ['a_breach1','Foot in the Door','Land your first breach on a target.','RED HAT', g=>g.ev.breaches>=1],
  ['a_win','Inside Job','Win an intrusion.','RED HAT', g=>g.mode==='attack'&&g.win],
  ['a_ghost','Ghost','Win with Trace under 25%.','RED HAT', g=>g.mode==='attack'&&g.win&&g.trace<25],
  ['a_clean','No Fingerprints','Win without a single attack blocked.','RED HAT', g=>g.mode==='attack'&&g.win&&g.ev.blocked===0],
  ['a_f60','Smash & Grab','Breach a core in under 60 seconds.','RED HAT', g=>g.mode==='attack'&&g.win&&g.runTime<60],
  ['a_f30','Lightning Heist','Breach a core in under 30 seconds.','RED HAT', g=>g.mode==='attack'&&g.win&&g.runTime<30],
  ['a_surge','Flood the Gates','Win after using a DDoS Surge.','RED HAT', g=>g.mode==='attack'&&g.win&&g.ev.used_surge],
  ['a_exploit','Zero-Day Master','Win after using a Zero-Day Exploit.','RED HAT', g=>g.mode==='attack'&&g.win&&g.ev.used_exploit],
  ['a_phish','Social Engineer','Breach a core with Phishing.','RED HAT', g=>g.ev.breach_types.has('phish')],
  ['a_ransom','Hostage Taker','Breach a core with Ransomware.','RED HAT', g=>g.ev.breach_types.has('ransom')],
  ['a_inject','Little Bobby Tables','Breach a core with SQL Injection.','RED HAT', g=>g.ev.breach_types.has('injection')],
  ['a_zb','Unknown Unknown','Breach a core with a Zero-Day.','RED HAT', g=>g.ev.breach_types.has('zeroday')],
  ['a_alltype','Full Arsenal','Breach using all 6 attack types in a run.','RED HAT', g=>g.ev.breach_types.size>=6],
  ['a_botnet','Botnet Herder','Have 10+ attacks live at once.','RED HAT', g=>g.ev.max_onscreen>=10],
  ['a_cover','Cover Up','Use Cover Tracks.','RED HAT', g=>g.ev.used_cover],
  ['a_wanted','Most Wanted','Win after Trace went above 90%.','RED HAT', g=>g.mode==='attack'&&g.win&&g.ev.max_trace>=90],
  ['a_elite','Red Team Elite','Win an intrusion on Red Team difficulty.','RED HAT', g=>g.mode==='attack'&&g.win&&g.diff==='hard'],
  ['d_combo','Combo Breaker','Destroy 5 threats within 2 seconds.','BLUE TEAM', g=>g.ev.combo_max>=5],
  ['d_streak','On a Roll','Clear 3 waves in a row with no damage.','BLUE TEAM', g=>g.ev.clean_streak_max>=3],
  ['d_last','Last Stand','Clear a wave with core integrity <= 10.','BLUE TEAM', g=>g.ev.laststand],
  ['d_minimal','Minimalist','Reach wave 8 with 5 or fewer defenses.','BLUE TEAM', g=>g.ev.minimal],
  ['d_purist','Purist','Reach wave 7 using only one defense type.','BLUE TEAM', g=>g.ev.purist],
  ['d_pacifist','Stoic Wall','Reach wave 6 without using any ability.','BLUE TEAM', g=>g.ev.pacifist],
  ['d_tycoon','Tycoon','Bank 800 credits in one game.','BLUE TEAM', g=>g.ev.max_credits>=800],
  ['d_reaper','Reaper','Destroy 150 threats in one game.','BLUE TEAM', g=>g.ev.kills>=150],
  ['d_bhunt','Boss Hunter','Destroy 5 APT bosses in one game.','BLUE TEAM', g=>g.ev.killed_apt>=5],
  ['a_hat','Hat Trick','Land 3 breaches within 5 seconds.','RED HAT', g=>g.ev.hat],
  ['a_blitz','Blitzkrieg','Land 3 breaches in the first 20 seconds.','RED HAT', g=>g.ev.blitz],
  ['a_s20','Sub-20','Breach a core in under 20 seconds.','RED HAT', g=>g.mode==='attack'&&g.win&&g.runTime<20],
  ['a_untr','Untraceable','Win with Trace never exceeding 5%.','RED HAT', g=>g.mode==='attack'&&g.win&&g.ev.max_trace<5],
  ['a_over','Overclocked','Have 15+ attacks live at once.','RED HAT', g=>g.ev.max_onscreen>=15],
  ['a_bare','No Gadgets','Win without DDoS Surge or Zero-Day tool.','RED HAT', g=>g.mode==='attack'&&g.win&&!g.ev.used_surge&&!g.ev.used_exploit],
  ['a_mara','War of Attrition','Win an intrusion lasting over 4 minutes.','RED HAT', g=>g.mode==='attack'&&g.win&&g.runTime>240],
  ['a_solo','Surgical Strike','Win an intrusion using only one attack type.','RED HAT', g=>g.mode==='attack'&&g.win&&g.ev.breach_types.size===1],
  ['a_s15','Speed Demon','Breach a core in under 15 seconds.','RED HAT', g=>g.mode==='attack'&&g.win&&g.runTime<15],
  ['a_perf','Perfect Heist','Win with 0 blocks and Trace never above 20%.','RED HAT', g=>g.mode==='attack'&&g.win&&g.ev.blocked===0&&g.ev.max_trace<20],
  ['m_double','Double Agent','Play both Blue Team and Red Hat.','GENERAL', g=>(g.meta.sides||[]).length>=2],
  ['m_master','Both Sides of the Wire','Reach wave 10 defending and win attacking.','GENERAL', g=>g.meta.def10&&(g.meta.atk_wins||[]).length],
  ['m_vet','Veteran','Play 10 games.','GENERAL', g=>(g.meta.games||0)>=10],
  ['m_addict','No Life','Play 25 games.','GENERAL', g=>(g.meta.games||0)>=25],
  ['m_triple','Triple Threat','Win Red Hat on all three difficulties.','GENERAL', g=>['easy','normal','hard'].every(d=>(g.meta.atk_wins||[]).includes(d))],
  ['m_cent','Centurion','Destroy 100 threats across all games.','GENERAL', g=>(g.meta.total_kills||0)>=100],
  ['m_hydra','Persistent Threat','Breach 50 cores across all games.','GENERAL', g=>(g.meta.total_breaches||0)>=50],
  ['m_trophy','Trophy Hunter','Unlock 25 achievements.','GENERAL', g=>UNLOCKED.size>=25],
  ['m_perfect','Perfectionist','Unlock 45 achievements.','GENERAL', g=>UNLOCKED.size>=45],
  ['m_legend','Legend','Unlock 60 achievements.','GENERAL', g=>UNLOCKED.size>=60],
];

/* ============================ sound (Web Audio) ============================ */
let actx = null;
function audio(){ if(!actx){ try{ actx = new (window.AudioContext||window.webkitAudioContext)(); }catch(e){ actx=null; } } if(actx&&actx.state==='suspended') actx.resume(); return actx; }
function blip(freq,dur,vol,type){ const a=audio(); if(!a)return; const o=a.createOscillator(), g=a.createGain(); o.type=type||'sine'; o.frequency.value=freq; o.connect(g); g.connect(a.destination); const t=a.currentTime; g.gain.setValueAtTime(vol,t); g.gain.exponentialRampToValueAtTime(0.0001,t+dur); o.start(t); o.stop(t+dur+0.02); }
let muted = false;
const SFX = {
  kill(){ if(!muted) blip(520,0.10,0.12); },
  breach(){ if(!muted) blip(150,0.24,0.18,'sawtooth'); },
  place(){ if(!muted) blip(680,0.07,0.10); },
  wave(){ if(!muted) blip(330,0.16,0.10); },
  ability(){ if(!muted) blip(440,0.15,0.16,'triangle'); },
  achv(){ if(!muted) [[660,0],[880,90],[1175,180]].forEach(([f,d])=>setTimeout(()=>blip(f,0.14,0.13,'triangle'),d)); },
};

/* ============================ canvas + draw helpers ============================ */
const canvas = document.getElementById('cv');
const ctx = canvas.getContext('2d');
canvas.width = WIN_W; canvas.height = WIN_H;
if (!ctx.roundRect) { ctx.roundRect = function(x,y,w,h,r){ this.beginPath(); this.moveTo(x+r,y); this.arcTo(x+w,y,x+w,y+h,r); this.arcTo(x+w,y+h,x,y+h,r); this.arcTo(x,y+h,x,y,r); this.arcTo(x,y,x+w,y,r); this.closePath(); return this; }; }

function fontStr(size,bold){ return (bold?'bold ':'')+size+'px "Menlo","Consolas","Monaco",monospace'; }
function text(s,x,y,size,color,opts){
  opts = opts||{};
  ctx.font = fontStr(size, opts.bold);
  ctx.fillStyle = color;
  if (opts.center){ ctx.textAlign='center'; ctx.textBaseline='middle'; }
  else if (opts.right){ ctx.textAlign='right'; ctx.textBaseline='middle'; }
  else { ctx.textAlign='left'; ctx.textBaseline='top'; }
  ctx.fillText(s,x,y);
}
function panel(x,y,w,h,fill,border){ ctx.fillStyle=fill||C.PANEL; ctx.beginPath(); ctx.roundRect(x,y,w,h,10); ctx.fill(); ctx.strokeStyle=border||C.LINE; ctx.lineWidth=1; ctx.beginPath(); ctx.roundRect(x,y,w,h,10); ctx.stroke(); }
function rectFill(x,y,w,h,fill,r){ ctx.fillStyle=fill; if(r){ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();} else ctx.fillRect(x,y,w,h); }
function rectLine(x,y,w,h,col,lw,r){ ctx.strokeStyle=col; ctx.lineWidth=lw||1; if(r){ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.stroke();} else ctx.strokeRect(x,y,w,h); }
function circle(x,y,r,fill){ ctx.beginPath(); ctx.arc(x,y,r,0,7); ctx.fillStyle=fill; ctx.fill(); }
function circleLine(x,y,r,col,lw){ ctx.beginPath(); ctx.arc(x,y,r,0,7); ctx.strokeStyle=col; ctx.lineWidth=lw||1; ctx.stroke(); }
function line(x1,y1,x2,y2,col,lw){ ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.strokeStyle=col; ctx.lineWidth=lw||1; ctx.stroke(); }
function wrap(s,size,maxw){ ctx.font=fontStr(size); const words=String(s).split(' '); const out=[]; let cur=''; for(const w of words){ const t=(cur+' '+w).trim(); if(ctx.measureText(t).width<=maxw) cur=t; else { if(cur)out.push(cur); cur=w; } } if(cur)out.push(cur); return out; }
function trunc(s,size,maxw,bold){ ctx.font=fontStr(size,bold); if(ctx.measureText(s).width<=maxw) return s; while(s&&ctx.measureText(s+'..').width>maxw) s=s.slice(0,-1); return s+'..'; }
function withAlpha(hex,a){ const n=parseInt(hex.slice(1),16); return `rgba(${(n>>16)&255},${(n>>8)&255},${n&255},${a})`; }

/* ============================ entities ============================ */
class Enemy {
  constructor(type, hpmul, diffmul){
    const b=ENEMY[type]; this.type=type;
    this.maxhp=Math.max(1, Math.round(b.hp*hpmul*diffmul)); this.hp=this.maxhp;
    this.spd=b.spd; this.d=0; this.slow=0; this.freeze=0;
    const p=pointAt(0); this.x=p[0]; this.y=p[1];
  }
  update(dt){
    let spd;
    if (this.freeze>0){ this.freeze-=dt; spd=0; }
    else { spd=this.spd; if(this.slow>0){ this.slow-=dt; spd*=0.5; } }
    this.d += spd*dt;
    const p=pointAt(this.d); this.x=p[0]; this.y=p[1];
  }
}
class Tower {
  constructor(key,c,r){ this.key=key; this.c=c; this.r=r; this.x=c*CELL+CELL/2+GX; this.y=r*CELL+CELL/2+GY; this.lvl=1; this.cd=0; this.invested=TOWER[key].cost; this.angle=0; }
  get rng(){ return TOWER[this.key].rng+(this.lvl-1)*14; }
  get dmg(){ return TOWER[this.key].dmg*(1+(this.lvl-1)*0.5); }
  upCost(){ return Math.round(TOWER[this.key].cost*this.lvl*1.15); }
}
class Shot {
  constructor(x,y,tgt,dmg,col,slow){ this.x=x; this.y=y; this.tgt=tgt; this.dmg=dmg; this.col=col; this.slow=slow; this.spd=560; }
}

/* ============================ game ============================ */
class Game {
  constructor(){
    this.state='menu'; this.mode='defend'; this.menuSide='defend'; this.win=false;
    this.toasts=[]; this.speed=1; this.paused=false;
    this._resetButtons();
  }
  _resetButtons(){
    this.shopRects = []; for(let i=0;i<6;i++) this.shopRects.push([14,92+i*50,206,44]);
    this.abQ=[14,430,100,42]; this.abW=[120,430,100,42]; this.patchR=[14,480,206,34];
    this.startR=[234,606,220,42]; this.speedR=[1100,15,80,36]; this.pauseR=[1190,15,84,36];
    this.upR=null; this.sellR=null; this.menuRects={}; this.sideRects={}; this.restartR=null; this.achvBtn=null; this.achvBack=null;
  }
  start(diff, mode){
    this.mode=mode; this.diff=diff;
    this.enemies=[]; this.towers=[]; this.shots=[]; this.floats=[]; this.pops=[];
    this.placing=null; this.hover=null; this.selected=null; this.speed=1; this.paused=false;
    this.abQt=0; this.abWt=0; this.flash=0; this.t=0; this.seen=new Set(); this.log=[]; this.state='play';
    this.runTime=0; this.wavesCleared=0; this.best=null; this.toasts=[];
    this.ev = {
      kills:0, untouchable:false, iron_wall:false, flawless10:false,
      breaches_wave:0, wave_has_apt:false, tower_types:new Set(), towers_built:0,
      used_q:false, used_w:false, used_surge:false, used_exploit:false, used_cover:false,
      max_credits:0, killed_zeroday:0, killed_apt:0,
      launched:0, breaches:0, breach_types:new Set(), blocked:0, max_onscreen:0, max_trace:0,
      kill_times:[], combo_max:0, clean_streak:0, clean_streak_max:0,
      laststand:false, minimal:false, purist:false, pacifist:false, breach_times:[], hat:false, blitz:false,
    };
    const sc=loadScores(); const meta=sc.meta||(sc.meta={});
    meta.games=(meta.games||0)+1; const sides=meta.sides||(meta.sides=[]); if(!sides.includes(mode))sides.push(mode);
    saveScores(sc); this.meta=meta;
    if (mode==='defend'){
      const d=DIFF[diff]; this.dconf=d; this.core=d.core; this.coreMax=d.core; this.credits=d.credits; this.wave=0;
      this.queue=[]; this.waveActive=false; this.waveT=0; this.spawned=0;
      this.logmsg(C.NEON,'System online. Build defenses, then START WAVE.');
      this.logmsg(C.DIM,'Each defense is 3x vs its matching threat, weak vs others. Mix them.');
    } else {
      const d=ATK_DIFF[diff]; this.dconf=d; this.core=d.core; this.coreMax=d.core; this.credits=d.intel;
      this.regen=d.regen; this.trace=0; this.intrusion=false; this.cloak=0;
      this.escInterval=d.esc; this.escT=d.esc; this.defCap=d.cap; this.wave=0; this.waveActive=false;
      for(let i=0;i<d.defs;i++) this.aiAddDefense(false);
      this.logmsg(C.NEON,'Target acquired. Survey the defenses, then BEGIN INTRUSION.');
      this.logmsg(C.DIM,'Send attacks the nearby defenses are WEAK against. Getting blocked raises Trace.');
    }
  }
  logmsg(col,msg){ this.log.unshift([col,msg]); if(this.log.length>30) this.log.pop(); }
  threatLevel(){ const w=this.wave; return w>=8?['CRITICAL',C.RED]:w>=5?['HIGH',C.AMBER]:w>=3?['ELEVATED','#ffd23f']:['LOW',C.GREEN]; }

  startWave(){
    if (this.waveActive||this.state!=='play') return;
    this.wave++;
    if (this.wave>=10 && this.core>=this.coreMax) this.ev.flawless10=true;
    if (this.wave>=8 && this.towers.length<=5) this.ev.minimal=true;
    if (this.wave>=7 && this.ev.tower_types.size===1) this.ev.purist=true;
    if (this.wave>=6 && !this.ev.used_q && !this.ev.used_w) this.ev.pacifist=true;
    this.queue=genWave(this.wave); this.ev.breaches_wave=0; this.ev.wave_has_apt=this.queue.some(s=>s[1]==='apt');
    this.waveActive=true; this.waveT=0; this.spawned=0;
    this.logmsg(C.NEON,`Wave ${this.wave} incoming - ${this.queue.length} threats. Threat ${this.threatLevel()[0]}.`);
    SFX.wave();
  }
  spawn(spec){ const [,type,hpmul]=spec; this.enemies.push(new Enemy(type,hpmul,this.dconf.hpmul||1)); if(!this.seen.has(type)){ this.seen.add(type); const b=ENEMY[type]; this.logmsg(C.NEON,`NEW THREAT: ${b.name}. ${b.info}`); } }
  tryPlace(c,r){
    if(!this.placing) return; const t=TOWER[this.placing];
    if(!buildable(c,r)) return; if(this.towers.some(tw=>tw.c===c&&tw.r===r)) return;
    if(this.credits<t.cost){ this.logmsg(C.RED,`Not enough credits for ${t.name}.`); return; }
    this.credits-=t.cost; this.towers.push(new Tower(this.placing,c,r));
    this.ev.towers_built++; this.ev.tower_types.add(this.placing);
    this.logmsg(C.GREEN,`Deployed ${t.name}.`); SFX.place();
    if(this.credits<t.cost) this.placing=null;
  }
  upgrade(tw){ if(tw.lvl>=3) return; const c=tw.upCost(); if(this.credits<c){ this.logmsg(C.RED,'Not enough credits to upgrade.'); return; } this.credits-=c; tw.invested+=c; tw.lvl++; this.logmsg(C.GREEN,`${TOWER[tw.key].name} upgraded to Lv${tw.lvl}.`); }
  sell(tw){ const back=Math.round(tw.invested*0.6); this.credits+=back; this.towers=this.towers.filter(x=>x!==tw); this.selected=null; this.logmsg(C.DIM,`Decommissioned ${TOWER[tw.key].name}. +${back} recovered.`); }
  patch(){ if(this.core>=this.coreMax) return; if(this.credits<60){ this.logmsg(C.RED,'Need 60 credits to patch.'); return; } this.credits-=60; this.core=Math.min(this.coreMax,this.core+20); this.logmsg(C.GREEN,'Patched core. +20 integrity.'); }
  ability(which){
    if(which==='Q'){ if(this.abQt>0)return; this.abQt=30; this.ev.used_q=true; for(const e of this.enemies)e.freeze=3.5; this.pops.push({x:GX+GRID_W/2,y:GY+GRID_H/2,col:C.NEON,life:0.6,mx:0.6,big:true}); this.logmsg(C.NEON,'QUARANTINE - all threats frozen 3.5s.'); SFX.ability(); }
    else { if(this.abWt>0)return; this.abWt=45; this.ev.used_w=true; for(const e of this.enemies)e.hp-=70; for(const e of [...this.enemies]) if(e.hp<=0) this.kill(e); this.pops.push({x:GX+GRID_W/2,y:GY+GRID_H/2,col:C.RED,life:0.6,mx:0.6,big:true}); this.logmsg(C.RED,'IR STRIKE - 70 damage to every active threat.'); SFX.ability(); }
  }
  // attacker
  aiAddDefense(announce){
    if(announce===undefined) announce=true;
    const used=new Set(this.towers.map(t=>t.c+','+t.r));
    const free=DEFENSE_CELLS.filter(c=>!used.has(c[0]+','+c[1]));
    if(this.towers.length<this.defCap && free.length){
      const covered=new Set(this.towers.map(t=>TOWER[t.key].primary));
      const gaps=SHOP.filter(k=>!covered.has(TOWER[k].primary));
      const key=gaps.length?choice(gaps):choice(SHOP);
      const [c,r]=choice(free); this.towers.push(new Tower(key,c,r));
      if(announce) this.logmsg(C.RED,`Blue team deployed ${TOWER[key].name}.`);
    } else {
      const ups=this.towers.filter(t=>t.lvl<3);
      if(ups.length){ const t=choice(ups); t.lvl++; if(announce) this.logmsg(C.RED,`Blue team upgraded ${TOWER[t.key].name} to Lv${t.lvl}.`); }
    }
  }
  beginIntrusion(){ if(this.intrusion)return; this.intrusion=true; this.logmsg(C.NEON,'Intrusion live. Breach their core before Trace hits 100%.'); }
  launchAttack(key){
    if(!this.intrusion){ this.logmsg(C.AMBER,'Press BEGIN INTRUSION first.'); return; }
    const cost=ATTACK_COST[key]; if(this.credits<cost){ this.logmsg(C.RED,'Not enough intel.'); return; }
    this.credits-=cost; this.enemies.push(new Enemy(key,ATK_HP_MUL,1)); this.ev.launched++;
    this.trace=Math.min(100,this.trace+0.6+cost*0.03); this.logmsg(C.GREEN,`Launched ${ENEMY[key].name}.`);
  }
  attackSurge(){ if(this.abQt>0||!this.intrusion)return; this.abQt=25; this.ev.used_surge=true; for(let i=0;i<8;i++){ const e=new Enemy('ddos',ATK_HP_MUL,1); e.d=-i*20; const p=pointAt(e.d); e.x=p[0]; e.y=p[1]; this.enemies.push(e); this.ev.launched++; } this.trace=Math.min(100,this.trace+4); this.logmsg(C.NEON,'DDoS SURGE - 6 botnet floods launched (free).'); SFX.ability(); }
  attackExploit(){ if(this.abWt>0||!this.intrusion)return; this.abWt=40; this.ev.used_exploit=true; this.cloak=4.5; this.trace=Math.min(100,this.trace+6); this.logmsg(C.NEON,'ZERO-DAY EXPLOIT - attacks cloaked from non-AI defenses 4.5s.'); SFX.ability(); }
  coverTracks(){ if(this.credits<60||this.trace<=0)return; this.credits-=60; this.trace=Math.max(0,this.trace-25); this.ev.used_cover=true; this.logmsg(C.GREEN,'Covered tracks. -25% trace.'); }

  kill(e){
    const b=ENEMY[e.type];
    if(this.mode==='defend'){
      this.credits+=b.reward; this.ev.kills++;
      if(e.type==='zeroday') this.ev.killed_zeroday++; else if(e.type==='apt') this.ev.killed_apt++;
      const kt=this.ev.kill_times; kt.push(this.t); this.ev.kill_times=kt.filter(t=>t>=this.t-2); this.ev.combo_max=Math.max(this.ev.combo_max,this.ev.kill_times.length);
      this.floats.push({x:e.x,y:e.y,txt:'+'+b.reward,col:C.GREEN,life:1});
    } else {
      this.ev.blocked++; this.trace=Math.min(100,this.trace+4);
      this.floats.push({x:e.x,y:e.y,txt:'TRACED',col:C.RED,life:1});
      this.logmsg(C.AMBER,`Your ${b.name} was blocked & traced. (+4% trace)`);
    }
    this.pops.push({x:e.x,y:e.y,col:b.color,life:0.4,mx:0.4,big:false});
    const i=this.enemies.indexOf(e); if(i>=0) this.enemies.splice(i,1);
    SFX.kill();
  }
  coreHit(e){
    const b=ENEMY[e.type]; this.flash=0.5; SFX.breach();
    if(this.mode==='defend'){
      this.core=Math.max(0,this.core-b.dmg); this.ev.breaches_wave++;
      this.logmsg(C.RED,`${b.name} breached the core! -${b.dmg} integrity.`);
      if(this.core<=0) this.end(false);
    } else {
      const dmg=Math.round(b.dmg*ATK_BREACH_MUL); this.core=Math.max(0,this.core-dmg);
      this.ev.breaches++; this.ev.breach_types.add(e.type);
      const bt=this.ev.breach_times; bt.push(this.runTime);
      if(bt.filter(t=>t>=this.runTime-5).length>=3) this.ev.hat=true;
      if(bt.filter(t=>t<=20).length>=3) this.ev.blitz=true;
      const reward=Math.round(dmg*0.7); this.credits+=reward; this.trace=Math.min(100,this.trace+0.5);
      this.floats.push({x:e.x,y:e.y,txt:'-'+dmg,col:C.RED,life:1});
      this.logmsg(C.GREEN,`${b.name} breached their core! -${dmg} integrity, +${reward} intel.`);
      if(this.core<=0) this.end(true);
    }
  }
  end(win){ this.state='over'; this.win=win; this.recordScore(); }
  recordScore(){
    const sc=loadScores();
    if(this.mode==='defend'){ const d=sc.defend||(sc.defend={}); d[this.diff]=Math.max(d[this.diff]||0,this.wavesCleared); this.best=d[this.diff]; }
    else { const d=sc.attack||(sc.attack={}); if(this.win){ const t=Math.round(this.runTime*10)/10; if(d[this.diff]==null||t<d[this.diff]) d[this.diff]=t; } this.best=d[this.diff]; }
    const meta=sc.meta||(sc.meta={});
    meta.total_kills=(meta.total_kills||0)+this.ev.kills; meta.total_breaches=(meta.total_breaches||0)+this.ev.breaches;
    if(this.mode==='defend'&&this.wavesCleared>=10) meta.def10=true;
    if(this.mode==='attack'&&this.win){ const aw=meta.atk_wins||(meta.atk_wins=[]); if(!aw.includes(this.diff))aw.push(this.diff); }
    saveScores(sc); this.meta=meta; this.checkAchievements();
  }
  checkAchievements(){
    for(const a of ACHIEVEMENTS){ const [id,name,desc,,fn]=a; if(UNLOCKED.has(id)) continue; let ok=false; try{ ok=fn(this); }catch(e){} if(ok){ UNLOCKED.add(id); persistUnlock(id); this.toasts.push({name,desc,life:5}); SFX.achv(); } }
  }
  updateToasts(dt){ for(const t of [...this.toasts]){ t.life-=dt; if(t.life<=0) this.toasts.splice(this.toasts.indexOf(t),1); } }

  update(dt){
    if(this.state!=='play'||this.paused) return;
    this.t+=dt;
    if(this.flash>0) this.flash-=dt;
    if(this.abQt>0) this.abQt=Math.max(0,this.abQt-dt);
    if(this.abWt>0) this.abWt=Math.max(0,this.abWt-dt);

    if(this.mode==='defend'){
      if(this.waveActive){
        this.waveT+=dt;
        while(this.spawned<this.queue.length && this.queue[this.spawned][0]<=this.waveT){ this.spawn(this.queue[this.spawned]); this.spawned++; }
        if(this.spawned>=this.queue.length && this.enemies.length===0){
          this.waveActive=false; this.wavesCleared=this.wave;
          if(this.ev.breaches_wave===0){ this.ev.untouchable=true; if(this.ev.wave_has_apt) this.ev.iron_wall=true; this.ev.clean_streak++; this.ev.clean_streak_max=Math.max(this.ev.clean_streak_max,this.ev.clean_streak); }
          else this.ev.clean_streak=0;
          if(this.core<=10) this.ev.laststand=true;
          const bonus=20+this.wave*6; this.credits+=bonus; this.logmsg(C.GREEN,`Wave ${this.wave} cleared! Bonus +${bonus}.`);
        }
      }
    } else if(this.intrusion){
      this.runTime+=dt; this.credits+=this.regen*dt; this.trace=Math.max(0,this.trace-2.2*dt);
      if(this.cloak>0) this.cloak-=dt;
      this.escT-=dt; if(this.escT<=0){ this.escT=this.escInterval; this.aiAddDefense(true); }
      if(this.core<=0){ this.end(true); return; }
      if(this.trace>=100){ this.logmsg(C.RED,'TRACE COMPLETE - the blue team pinned your location.'); this.end(false); return; }
    }

    for(const e of [...this.enemies]){ e.update(dt); if(e.d>=TOTAL){ this.enemies.splice(this.enemies.indexOf(e),1); this.coreHit(e); } }

    const cloaked = this.mode==='attack' && this.cloak>0;
    for(const tw of this.towers){
      const d=TOWER[tw.key], rng=tw.rng; if(tw.cd>0) tw.cd-=dt;
      if(cloaked && !d.allr) continue;
      let best=null;
      if(this.mode==='defend'){ let bk=-1e18; for(const e of this.enemies){ if((e.x-tw.x)**2+(e.y-tw.y)**2<=rng*rng && e.d>bk){ bk=e.d; best=e; } } }
      else { let bk=null; for(const e of this.enemies){ if((e.x-tw.x)**2+(e.y-tw.y)**2<=rng*rng){ const strong=eff_atk(tw.key,e.type)>=0.5?1:0; const k=[strong,-e.hp,e.d]; if(bk===null||cmpKey(k,bk)>0){ bk=k; best=e; } } } }
      if(best){ tw.angle=Math.atan2(best.y-tw.y,best.x-tw.x); if(tw.cd<=0){ tw.cd=1/d.rate; const mul=this.mode==='defend'?effmul(tw.key,best.type):eff_atk(tw.key,best.type); this.shots.push(new Shot(tw.x,tw.y,best,tw.dmg*mul,d.color,!!d.slow)); } }
    }
    for(const s of [...this.shots]){
      if(!this.enemies.includes(s.tgt)){ this.shots.splice(this.shots.indexOf(s),1); continue; }
      const dx=s.tgt.x-s.x, dy=s.tgt.y-s.y, dd=Math.hypot(dx,dy), step=s.spd*dt;
      if(dd<=step){ s.tgt.hp-=s.dmg; if(s.slow) s.tgt.slow=Math.max(s.tgt.slow,1.2); if(s.tgt.hp<=0) this.kill(s.tgt); this.shots.splice(this.shots.indexOf(s),1); }
      else { s.x+=dx/dd*step; s.y+=dy/dd*step; }
    }
    for(const f of [...this.floats]){ f.y-=24*dt; f.life-=dt; if(f.life<=0) this.floats.splice(this.floats.indexOf(f),1); }
    for(const p of [...this.pops]){ p.life-=dt; if(p.life<=0) this.pops.splice(this.pops.indexOf(p),1); }

    this.ev.max_credits=Math.max(this.ev.max_credits,Math.floor(this.credits));
    this.ev.max_onscreen=Math.max(this.ev.max_onscreen,this.enemies.length);
    if(this.mode==='attack') this.ev.max_trace=Math.max(this.ev.max_trace,this.trace);
    this.checkAchievements();
  }

  /* -------- drawing -------- */
  draw(){
    ctx.fillStyle=C.BG; ctx.fillRect(0,0,WIN_W,WIN_H);
    this.drawGame(); this.drawHud(); this.drawLeft(); this.drawRight(); this.drawControls(); this.drawTooltip();
    if(this.state==='over') this.drawEnd();
    this.drawToasts();
  }
  drawGame(){
    panel(GX,GY,GRID_W,GRID_H,C.DARK);
    ctx.save(); ctx.beginPath(); ctx.rect(GX,GY,GRID_W,GRID_H); ctx.clip();
    ctx.strokeStyle='#12244e'; ctx.lineWidth=1;
    for(let c=0;c<=COLS;c++){ const x=GX+c*CELL; line(x,GY,x,GY+GRID_H,'#12244e',1); }
    for(let r=0;r<=ROWS;r++){ const y=GY+r*CELL; line(GX,y,GX+GRID_W,y,'#12244e',1); }
    // conduit
    ctx.lineCap='round'; ctx.lineJoin='round';
    ctx.strokeStyle='#085c5c'; ctx.lineWidth=CELL-8; ctx.beginPath(); ctx.moveTo(WPX[0][0],WPX[0][1]); for(let i=1;i<WPX.length;i++) ctx.lineTo(WPX[i][0],WPX[i][1]); ctx.stroke();
    ctx.strokeStyle='#0a5a78'; ctx.lineWidth=3; ctx.beginPath(); ctx.moveTo(WPX[0][0],WPX[0][1]); for(let i=1;i<WPX.length;i++) ctx.lineTo(WPX[i][0],WPX[i][1]); ctx.stroke();
    // flow dots
    const sp=60, n=Math.floor(TOTAL/sp), off=(this.t*70)%sp;
    for(let i=0;i<=n;i++){ const d=i*sp+off; if(d<TOTAL){ const p=pointAt(d); circle(p[0],p[1],2,C.NEON); } }
    // core
    const core=WPX[WPX.length-1], pulse=1+Math.sin(this.t*4)*0.06, sz=20*pulse;
    const col=this.flash>0?C.RED:C.NEON, fill=this.flash>0?'#3a0d18':'#08263a';
    rectFill(core[0]-sz-6,core[1]-sz,sz*2,sz*2,fill,5); rectLine(core[0]-sz-6,core[1]-sz,sz*2,sz*2,col,2,5);
    text('CORE',core[0]-6,core[1],9,'#bfe9ff',{center:true,bold:true});
    // placement preview
    if(this.placing&&this.hover){
      const [c,r]=this.hover, d=TOWER[this.placing];
      const ok=buildable(c,r)&&!this.towers.some(t=>t.c===c&&t.r===r)&&this.credits>=d.cost;
      const x=GX+c*CELL+CELL/2, y=GY+r*CELL+CELL/2, ring=ok?C.GREEN:C.RED;
      ctx.fillStyle=withAlpha(ring,0.1); ctx.beginPath(); ctx.arc(x,y,d.rng,0,7); ctx.fill();
      circleLine(x,y,d.rng,ring,1); this.drawTowerIcon(x,y,d,1,0.6);
    }
    if(this.selected&&this.towers.includes(this.selected)){ const tw=this.selected; ctx.fillStyle=withAlpha(C.NEON,0.06); ctx.beginPath(); ctx.arc(tw.x,tw.y,tw.rng,0,7); ctx.fill(); circleLine(tw.x,tw.y,tw.rng,'#00a0c8',1); }
    for(const tw of this.towers) this.drawTowerIcon(tw.x,tw.y,TOWER[tw.key],tw.lvl,1,tw.angle);
    for(const s of this.shots) circle(s.x,s.y,3,s.col);
    for(const e of this.enemies) this.drawEnemy(e);
    for(const p of this.pops){ const rad=(p.big?60:20)*(1-p.life/p.mx); const a=p.life/p.mx; ctx.globalAlpha=a; circleLine(p.x,p.y,rad,p.col,2); ctx.globalAlpha=1; }
    for(const f of this.floats){ ctx.globalAlpha=clamp(f.life,0,1); text(f.txt,f.x,f.y,13,f.col,{center:true,bold:true}); ctx.globalAlpha=1; }
    ctx.restore();
  }
  drawTowerIcon(x,y,d,lvl,alpha,angle){
    ctx.globalAlpha=alpha==null?1:alpha;
    if(angle!=null){ const ex=x+Math.cos(angle)*16, ey=y+Math.sin(angle)*16; line(x,y,ex,ey,d.color,5); }
    circle(x,y,15,'#0a1530'); circleLine(x,y,15,d.color,2);
    text(d.sym,x,y,9,d.color,{center:true,bold:true});
    for(let i=0;i<lvl;i++) circle(x-6+i*6,y+13,2,d.color);
    ctx.globalAlpha=1;
  }
  drawEnemy(e){
    const b=ENEMY[e.type], big=e.type==='apt', rad=big?17:11, x=e.x, y=e.y;
    if(e.freeze>0){ ctx.fillStyle=withAlpha(C.NEON,0.27); ctx.beginPath(); ctx.arc(x,y,rad+4,0,7); ctx.fill(); }
    if(big){ circle(x,y,rad,b.color); circleLine(x,y,rad,'#000',2); }
    else { ctx.fillStyle=b.color; ctx.beginPath(); ctx.roundRect(x-rad,y-rad,rad*2,rad*2,5); ctx.fill(); ctx.strokeStyle='#000'; ctx.lineWidth=2; ctx.beginPath(); ctx.roundRect(x-rad,y-rad,rad*2,rad*2,5); ctx.stroke(); }
    text(b.sym,x,y,big?14:11,e.type==='zeroday'?'#222':'#0a0f1a',{center:true,bold:true});
    const w=rad*2, p=Math.max(0,e.hp/e.maxhp);
    rectFill(x-rad,y-rad-7,w,3,'#1a0f14'); rectFill(x-rad,y-rad-7,w*p,3, p>0.5?C.GREEN:p>0.25?C.AMBER:C.RED);
  }
  meter(x,label,frac,col){
    text(label,x,12,9,C.DIM); const bx=x,by=27,bw=170,bh=11;
    rectFill(bx,by,bw,bh,'#0a1228',5); rectLine(bx,by,bw,bh,C.LINE,1,5);
    frac=clamp(frac,0,1); if(frac>0){ rectFill(bx,by,bw*frac,bh,col,5); }
  }
  drawHud(){
    panel(8,8,WIN_W-16,50,'#0c1226');
    text('BREACH PROTOCOL',22,13,17,C.NEON,{bold:true});
    const stat=(x,val,label,color)=>{ text(String(val),x,12,17,color||C.INK,{bold:true}); text(label,x,34,9,C.DIM); };
    if(this.mode==='defend'){
      text('// SOC DEFENSE',210,18,10,C.DIM);
      const frac=Math.max(0,this.core/this.coreMax), col=frac>0.4?C.GREEN:frac>0.2?C.AMBER:C.RED;
      this.meter(320,'CORE INTEGRITY',frac,col);
      stat(520,Math.floor(Math.max(0,this.core)),'INTEGRITY'); stat(610,Math.floor(this.credits),'CREDITS',C.GREEN);
      stat(730,this.wave,'WAVE'); const tl=this.threatLevel(); stat(820,tl[0],'THREAT',tl[1]);
    } else {
      text('// RED HAT',210,18,10,C.RED);
      const frac=Math.max(0,this.core/this.coreMax), tcol=frac>0.4?C.RED:frac>0.2?C.AMBER:C.GREEN;
      this.meter(300,'TARGET CORE',frac,tcol);
      stat(490,Math.round(frac*100)+'%','TARGET'); stat(590,Math.floor(this.credits),'INTEL',C.NEON);
      stat(700,this.towers.length,'DEFENSES',C.RED);
      const tf=this.trace/100, trc=tf<0.4?C.GREEN:tf<0.7?C.AMBER:C.RED; this.meter(800,'TRACE  (caught at 100%)',tf,trc); stat(985,Math.floor(this.trace)+'%','TRACE',trc);
    }
    this.button(this.speedR,(this.speed===2?'2x':'1x')+' >>',true,this.speed===2);
    this.button(this.pauseR,this.paused?'Resume':'Pause',true,this.paused);
  }
  shopRow(rect,color,sym,name,cost,idx,afford,sel,cur){
    const [x,y,w,h]=rect;
    rectFill(x,y,w,h,sel?'#0c1630':'#0a1024',8); rectLine(x,y,w,h,sel?C.NEON:C.LINE,sel?2:1,8);
    rectFill(x+6,y+7,30,30,afford?color:withAlpha(color,0.5),6);
    text(sym,x+21,y+22,9,'#04121a',{center:true,bold:true});
    text(name,x+44,y+7,12,afford?C.INK:C.DIM); text(cost+cur,x+44,y+24,10,afford?C.GREEN:C.DIM); text(String(idx),x+w-16,y+6,9,C.DIM);
  }
  drawLeft(){
    panel(8,66,218,646);
    if(this.mode==='defend'){
      text('DEFENSES - click then place',16,72,10,C.DIM,{bold:true});
      SHOP.forEach((key,i)=>{ const d=TOWER[key]; const aff=this.state==='play'&&this.credits>=d.cost; this.shopRow(this.shopRects[i],d.color,d.sym,d.name,d.cost,i+1,aff,this.placing===key,'c'); });
      text('INCIDENT RESPONSE',16,414,10,C.DIM,{bold:true});
      this.abilityBtn(this.abQ,'Quarantine',this.abQt,30); this.abilityBtn(this.abW,'IR Strike',this.abWt,45);
      this.button(this.patchR,'Patch Core (60c)', this.state==='play'&&this.credits>=60&&this.core<this.coreMax);
    } else {
      text('ATTACKS - click to launch',16,72,10,C.DIM,{bold:true});
      ATTACK.forEach(([key,cost],i)=>{ const b=ENEMY[key]; const aff=this.intrusion&&this.credits>=cost; this.shopRow(this.shopRects[i],b.color,b.sym,b.name,cost,i+1,aff,false,' intel'); });
      text('OFFENSIVE TOOLS',16,414,10,C.DIM,{bold:true});
      this.abilityBtn(this.abQ,'DDoS Surge',this.abQt,25); this.abilityBtn(this.abW,'Zero-Day',this.abWt,40);
      this.button(this.patchR,'Cover Tracks (60 intel)', this.intrusion&&this.credits>=60&&this.trace>0);
    }
  }
  abilityBtn(rect,label,cd,cdmax){ const [x,y,w,h]=rect; const ready=cd<=0&&this.state==='play'; rectFill(x,y,w,h,ready?'#0c1530':'#090d1a',8); rectLine(x,y,w,h,ready?C.AMBER:C.LINE,1,8); text(label,x+w/2,y+h/2,11,ready?C.INK:C.DIM,{center:true}); if(cd>0){ const ww=w*cd/cdmax; rectFill(x,y+h-3,ww,3,C.AMBER); } }
  button(rect,label,enabled,active){ const [x,y,w,h]=rect; if(enabled===undefined)enabled=true; rectFill(x,y,w,h, active?'#0c1834':(enabled?'#0c1530':'#0a0d18'),8); rectLine(x,y,w,h,active?C.NEON:C.LINE,1,8); text(label,x+w/2,y+h/2,11,enabled?C.INK:C.DIM,{center:true}); }
  drawRight(){
    const ix=1078, iw=204; panel(ix,66,iw,220);
    text('INSPECTOR',ix+8,74,10,C.DIM,{bold:true});
    this.upR=null; this.sellR=null;
    if(this.selected&&this.towers.includes(this.selected)){
      const tw=this.selected, d=TOWER[tw.key];
      rectFill(ix+10,94,34,34,d.color,6); text(d.sym,ix+27,111,10,'#04121a',{center:true,bold:true});
      text(d.name,ix+52,96,12, this.mode==='defend'?C.INK:C.RED);
      text(this.mode==='defend'?`Level ${tw.lvl} / 3`:`HOSTILE - Level ${tw.lvl}/3`, ix+52,114,10, this.mode==='defend'?C.DIM:C.RED);
      const best=tw.key==='ai'?'ALL / Zero-Day':ENEMY[d.primary].name;
      const rows=[[this.mode==='defend'?'Best vs':'Counters',best],['Damage',`${tw.dmg.toFixed(0)} x${d.rate}/s`],['DPS(on-type)',(tw.dmg*d.rate).toFixed(0)],['Range',tw.rng+'px']];
      let y=138; for(const [k,v] of rows){ text(k,ix+10,y,11,C.DIM); text(v,ix+iw-10,y+6,11,C.INK,{right:true}); y+=20; }
      if(this.mode==='defend'){
        this.upR=[ix+10,246,88,30]; this.sellR=[ix+106,246,88,30];
        if(tw.lvl<3) this.button(this.upR,`Up ${tw.upCost()}c`, this.credits>=tw.upCost()); else { this.button(this.upR,'MAX',false); this.upR=null; }
        this.button(this.sellR,`Sell ${Math.round(tw.invested*0.6)}c`);
      } else { text('Send attacks it is WEAK vs.',ix+10,256,11,C.AMBER); }
    } else {
      const lines=this.mode==='defend'?['Click a defense to inspect,','upgrade, or sell it.','Hover threats & towers','for live intel.']:['Click a hostile defense to','see what it counters.','Send attacks it is weak vs;','getting blocked raises Trace.'];
      lines.forEach((ln,j)=>text(ln,ix+10,102+j*18,11,C.DIM));
    }
    const fy=294, fh=712-fy; panel(ix,fy,iw,fh);
    text(this.mode==='defend'?'THREAT FEED':'INTRUSION LOG',ix+8,fy+8,10,C.DIM,{bold:true});
    let y=fy+28; const maxw=iw-20;
    for(const [color,msg] of this.log){ const lines=wrap(msg,11,maxw); for(const ln of lines){ if(y>fy+fh-14) break; text(ln,ix+10,y,11,color); y+=15; } y+=3; if(y>fy+fh-14) break; }
  }
  drawControls(){
    let label,en,hint;
    if(this.mode==='defend'){ if(this.waveActive){ label=`WAVE ${this.wave} ACTIVE`; en=false; } else { label=`START WAVE ${this.wave+1}`; en=true; } hint='1-6 build  Q/W abilities  F speed  P pause  Space wave  Esc cancel'; }
    else { if(this.intrusion){ label='INTRUSION ACTIVE'; en=false; } else { label='BEGIN INTRUSION'; en=true; } hint='1-6 launch  Q/W tools  F speed  P pause  Space begin  Esc deselect'; }
    const [x,y,w,h]=this.startR;
    rectFill(x,y,w,h,en?'#0a8f5b':'#0c1828',8); rectLine(x,y,w,h,en?'#0bb37a':C.LINE,1,8);
    text((en?'> ':'')+label,x+w/2,y+h/2,13,en?'#02110c':C.DIM,{center:true,bold:true});
    text(hint,x+w+16,y+h/2-8,10,C.DIM);
    if(this.mode==='attack'&&this.intrusion) text('TIME  '+fmtTime(this.runTime),x+w+16,y+h/2+8,11,C.NEON);
  }
  drawTooltip(){
    if(this.placing) return; const [mx,my]=mouse; let lines=null;
    if(this.state==='play'){
      if(this.mode==='defend'){ for(let i=0;i<6;i++){ if(inRect(mx,my,this.shopRects[i])){ const d=TOWER[SHOP[i]]; lines=[[d.name+'  '+d.cost+'c',d.color]]; for(const ln of wrap(d.desc,11,220)) lines.push([ln,C.INK]); lines.push([`DMG ${d.dmg} - Rate ${d.rate}/s - Rng ${d.rng}`,C.DIM]); break; } } }
      else { for(let i=0;i<ATTACK.length;i++){ if(inRect(mx,my,this.shopRects[i])){ const [key,cost]=ATTACK[i], b=ENEMY[key]; lines=[[b.name+'  '+cost+' intel',b.color]]; for(const ln of wrap(b.info,11,220)) lines.push([ln,C.INK]); lines.push([`HP ${b.hp} - Spd ${b.spd} - Breach dmg ${b.dmg}`,C.DIM]); break; } } }
    }
    if(!lines && inRect(mx,my,[GX,GY,GRID_W,GRID_H])){
      for(const e of this.enemies){ if((e.x-mx)**2+(e.y-my)**2<18*18){ const b=ENEMY[e.type]; lines=[[b.name,b.color]]; for(const ln of wrap(b.info,11,220)) lines.push([ln,C.INK]); lines.push([`HP ${Math.max(0,Math.round(e.hp))}/${e.maxhp}`,C.DIM]); break; } }
      if(!lines) for(const tw of this.towers){ if((tw.x-mx)**2+(tw.y-my)**2<18*18){ const d=TOWER[tw.key]; lines=[[d.name+'  Lv'+tw.lvl,d.color]]; for(const ln of wrap(d.desc,11,220)) lines.push([ln,C.INK]); break; } }
    }
    if(!lines) return;
    ctx.font=fontStr(11); let w=0; for(const [t] of lines) w=Math.max(w,ctx.measureText(t).width); w+=20; const h=lines.length*16+12;
    let x=mx+14,y=my+14; if(x+w>WIN_W) x=mx-w-8; if(y+h>WIN_H) y=my-h-8;
    rectFill(x,y,w,h,'#0a1428',8); rectLine(x,y,w,h,C.NEON,1,8);
    lines.forEach(([t,c],i)=>text(t,x+10,y+6+i*16,11,c,{bold:i===0,top:true}));
  }
  drawEnd(){
    ctx.fillStyle='rgba(3,5,12,0.86)'; ctx.fillRect(0,0,WIN_W,WIN_H);
    const cw=560,ch=260, cx=WIN_W/2-cw/2, cy=WIN_H/2-130; panel(cx,cy,cw,ch,'#0b1226');
    let title,msg,sub;
    if(this.mode==='defend'){ title=this.win?'NETWORK SECURE':'CORE BREACHED'; msg=this.win?`You held the line through ${this.wave} waves.`:`The adversary breached your core after ${this.wavesCleared} wave(s) on ${this.dconf.label}.`; sub=`Waves cleared: ${this.wavesCleared}   |   Best: ${this.best||0}`; }
    else { title=this.win?"CORE BREACHED - YOU'RE IN":'TRACED & CAUGHT'; if(this.win) msg=`Breached the target in ${fmtTime(this.runTime)} at ${Math.floor(this.trace)}% trace.`; else { const pct=Math.round(100*this.core/this.coreMax); msg=`The blue team traced you. Target was still at ${pct}% integrity.`; } const bs=this.best!=null?fmtTime(this.best):'--'; sub=`Fastest breach (${this.dconf.label}): ${bs}`; }
    text(title,WIN_W/2,cy+50,30,this.win?C.GREEN:C.RED,{center:true,bold:true});
    text(msg,WIN_W/2,cy+100,13,C.INK,{center:true}); text(sub,WIN_W/2,cy+124,12,C.AMBER,{center:true});
    this.restartR=[WIN_W/2-90,cy+ch-64,180,40]; const [rx,ry,rw,rh]=this.restartR;
    rectFill(rx,ry,rw,rh,'#0a8f5b',8); text('Back to Menu',rx+rw/2,ry+rh/2,14,'#02110c',{center:true,bold:true});
  }
  drawToasts(){
    let x=GX+GRID_W-312, y=GY+10;
    for(const t of this.toasts){
      const w=302,h=66; ctx.save(); const a=clamp(t.life/0.4,0,1);
      ctx.globalAlpha=a; rectFill(x,y,w,h,'#0e1832',10); rectLine(x,y,w,h,C.AMBER,2,10);
      circle(x+26,y+24,14,C.AMBER); text('*',x+26,y+23,16,'#140e00',{center:true,bold:true});
      text('ACHIEVEMENT UNLOCKED',x+48,y+9,9,C.AMBER,{bold:true}); text(t.name,x+48,y+24,13,C.INK,{bold:true});
      const dl=wrap(t.desc||'',9,w-60); if(dl.length) text(dl[0],x+48,y+45,9,C.DIM);
      ctx.globalAlpha=1; ctx.restore(); y+=74;
    }
  }
  /* -------- input -------- */
  click(mx,my){
    if(this.state==='over'){ if(this.restartR&&inRect(mx,my,this.restartR)) this.state='menu'; return; }
    if(this.state!=='play') return;
    if(inRect(mx,my,this.speedR)){ this.speed=this.speed===1?2:1; return; }
    if(inRect(mx,my,this.pauseR)){ this.paused=!this.paused; return; }
    if(inRect(mx,my,this.startR)){ this.mode==='defend'?this.startWave():this.beginIntrusion(); return; }
    if(inRect(mx,my,this.patchR)){ this.mode==='defend'?this.patch():this.coverTracks(); return; }
    if(inRect(mx,my,this.abQ)){ this.mode==='defend'?this.ability('Q'):this.attackSurge(); return; }
    if(inRect(mx,my,this.abW)){ this.mode==='defend'?this.ability('W'):this.attackExploit(); return; }
    if(this.mode==='defend'){ for(let i=0;i<6;i++){ if(inRect(mx,my,this.shopRects[i])){ this.placing=this.placing===SHOP[i]?null:SHOP[i]; this.selected=null; return; } } }
    else { for(let i=0;i<ATTACK.length;i++){ if(inRect(mx,my,this.shopRects[i])){ this.launchAttack(ATTACK[i][0]); return; } } }
    if(this.upR&&inRect(mx,my,this.upR)&&this.selected){ this.upgrade(this.selected); return; }
    if(this.sellR&&inRect(mx,my,this.sellR)&&this.selected){ this.sell(this.selected); return; }
    if(inRect(mx,my,[GX,GY,GRID_W,GRID_H])){
      const c=Math.floor((mx-GX)/CELL), r=Math.floor((my-GY)/CELL);
      if(this.placing) this.tryPlace(c,r);
      else { for(const tw of this.towers){ if((tw.x-mx)**2+(tw.y-my)**2<18*18){ this.selected=tw; this.placing=null; return; } } this.selected=null; }
    }
  }
  key(k){
    if(this.state!=='play') return;
    if(k>='1'&&k<='6'){ const i=+k-1; if(this.mode==='defend'){ this.placing=this.placing===SHOP[i]?null:SHOP[i]; this.selected=null; } else this.launchAttack(ATTACK[i][0]); }
    else if(k==='q') this.mode==='defend'?this.ability('Q'):this.attackSurge();
    else if(k==='w') this.mode==='defend'?this.ability('W'):this.attackExploit();
    else if(k==='f') this.speed=this.speed===1?2:1;
    else if(k==='p') this.paused=!this.paused;
    else if(k===' ') this.mode==='defend'?this.startWave():this.beginIntrusion();
    else if(k==='escape'){ this.placing=null; this.selected=null; }
  }
  motion(mx,my){ if(inRect(mx,my,[GX,GY,GRID_W,GRID_H])) this.hover=[Math.floor((mx-GX)/CELL),Math.floor((my-GY)/CELL)]; else this.hover=null; }
}
function cmpKey(a,b){ for(let i=0;i<a.length;i++){ if(a[i]!==b[i]) return a[i]<b[i]?-1:1; } return 0; }
function inRect(x,y,rect){ return x>=rect[0]&&x<=rect[0]+rect[2]&&y>=rect[1]&&y<=rect[1]+rect[3]; }

/* ============================ menu + achievements screens ============================ */
function drawMenu(g){
  ctx.fillStyle=C.BG; ctx.fillRect(0,0,WIN_W,WIN_H); const cx=WIN_W/2, side=g.menuSide;
  text('BREACH PROTOCOL',cx,70,44,C.NEON,{center:true,bold:true});
  text('Cyber Defense  //  Choose your side',cx,108,14,C.DIM,{center:true});
  const nun=[...UNLOCKED].filter(id=>ACHIEVEMENTS.some(a=>a[0]===id)).length;
  g.achvBtn=[WIN_W-258,20,230,34]; rectFill(...g.achvBtn,'#0c1530',8); rectLine(...g.achvBtn,C.AMBER,1,8); text(`* ACHIEVEMENTS  ${nun}/${ACHIEVEMENTS.length}`,g.achvBtn[0]+g.achvBtn[2]/2,g.achvBtn[1]+17,12,C.AMBER,{center:true});
  const sides=[['defend','BLUE TEAM','Defend the network',C.NEON],['attack','RED HAT','Attack & breach it',C.RED]];
  const sw=230,sgap=24; let sx=cx-(sw*2+sgap)/2; g.sideRects={};
  for(const [sid,name,sub,col] of sides){ const rect=[sx,140,sw,54]; g.sideRects[sid]=rect; const sel=side===sid; rectFill(...rect,sel?'#0c1630':'#090d1a',10); rectLine(...rect,col,sel?3:1,10); text(name,sx+sw/2,158,16,sel?col:C.INK,{center:true,bold:true}); text(sub,sx+sw/2,178,11,C.DIM,{center:true}); sx+=sw+sgap; }
  let intro,lt,rt,help;
  if(side==='defend'){ intro='BLUE TEAM: Waves of cyber-attacks race toward your Core. Deploy the right defense against the right threat, manage your budget, upgrade, and survive.'; lt='THREATS'; rt='YOUR DEFENSES'; help='Click a defense, then click a tile to place it. Each is 3x vs its matching threat.'; }
  else { intro='RED HAT: You are the attacker. Spend intel to launch attacks the enemy defenses are weak against, breach their Core, and stay under 100% Trace before they catch you.'; lt='YOUR ATTACKS'; rt='ENEMY DEFENSES'; help="Click an attack to launch it. Read the defenses; send what they CAN'T counter."; }
  let y=214; for(const ln of wrap(intro,14,760)){ text(ln,cx,y,14,C.INK,{center:true}); y+=22; }
  y+=12; text(lt,cx-340,y,11,C.DIM,{bold:true}); text(rt,cx+30,y,11,C.DIM,{bold:true}); y+=24;
  if(side==='defend'){ ['virus','ddos','phish','injection','ransom','zeroday','apt'].forEach((ek,i)=>{ const e=ENEMY[ek],yy=y+i*22; rectFill(cx-340,yy,12,12,e.color,3); text(`${e.sym}  ${e.name}`,cx-322,yy-2,12,C.INK); }); }
  else { ATTACK.forEach(([ek,cost],i)=>{ const e=ENEMY[ek],yy=y+i*22; rectFill(cx-340,yy,12,12,e.color,3); text(`${e.sym}  ${e.name}  (${cost} intel)`,cx-322,yy-2,12,C.INK); }); }
  SHOP.forEach((tk,i)=>{ const d=TOWER[tk],yy=y+i*22; rectFill(cx+30,yy,12,12,d.color,3); const suffix=side==='defend'?`  (${d.cost}c)`:`  (stops ${ENEMY[d.primary].sym})`; text(`${d.sym}  ${d.name}${suffix}`,cx+48,yy-2,12,C.INK); });
  const rows=side==='defend'?7:6; text(help,cx,y+rows*22+14,12,C.DIM,{center:true});
  const labels=[['easy','ROOKIE','Forgiving',C.GREEN],['normal','ANALYST','Balanced',C.AMBER],['hard','RED TEAM','Brutal',C.RED]];
  const bw=180,gap=20, total=bw*3+gap*2; let bx=cx-total/2, by=WIN_H-96;
  text(`START AS ${side==='defend'?'BLUE TEAM':'RED HAT'}  -  pick difficulty:`,cx,by-18,11,C.DIM,{center:true});
  g.menuRects={};
  for(const [diff,name,sub,col] of labels){ const rect=[bx,by,bw,60]; g.menuRects[diff]=rect; rectFill(...rect,'#0c1530',10); rectLine(...rect,col,2,10); text(name,bx+bw/2,by+20,15,col,{center:true,bold:true}); text(sub,bx+bw/2,by+42,11,C.DIM,{center:true}); bx+=bw+gap; }
  const sc=loadScores(); let rec;
  if(side==='defend'){ const store=sc.defend||{}; rec='Best waves:   '+labels.map(([d,n])=>`${n} ${store[d]||0}w`).join('    '); }
  else { const store=sc.attack||{}; rec='Fastest breach:   '+labels.map(([d,n])=>`${n} ${store[d]!=null?fmtTime(store[d]):'--'}`).join('    '); }
  text(rec,cx,by+74,11,C.AMBER,{center:true});
}
function drawAchievements(g){
  ctx.fillStyle=C.BG; ctx.fillRect(0,0,WIN_W,WIN_H); const cx=WIN_W/2;
  const nun=[...UNLOCKED].filter(id=>ACHIEVEMENTS.some(a=>a[0]===id)).length;
  text('ACHIEVEMENTS',cx,30,30,C.NEON,{center:true,bold:true}); text(`${nun} / ${ACHIEVEMENTS.length} unlocked`,cx,64,13,C.AMBER,{center:true});
  const catcol={'BLUE TEAM':C.NEON,'RED HAT':C.RED,'GENERAL':C.AMBER};
  const cols=4, per=Math.ceil(ACHIEVEMENTS.length/cols), colw=315, x0=cx-colw*cols/2+8, top=86, rowh=32, tw=colw-44;
  ACHIEVEMENTS.forEach((a,i)=>{ const [id,name,desc,cat]=a; const col=Math.floor(i/per), row=i%per, x=x0+col*colw, y=top+row*rowh; const un=UNLOCKED.has(id); const c=un?catcol[cat]:'#34425e';
    rectFill(x,y,24,24,un?'#0c1428':'#0a0e18',6); rectLine(x,y,24,24,c,2,6);
    if(un){ const px=x+12,py=y+12; ctx.strokeStyle=c; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(px-6,py); ctx.lineTo(px-2,py+5); ctx.lineTo(px+6,py-6); ctx.stroke(); }
    else text('?',x+12,y+12,12,c,{center:true,bold:true});
    text(trunc(name,11,tw,un),x+32,y-1,11,un?C.INK:C.DIM,{bold:un}); text(trunc(desc,9,tw),x+32,y+15,9,un?C.DIM:'#42506e');
  });
  g.achvBack=[cx-90,WIN_H-50,180,36]; rectFill(...g.achvBack,'#0c1530',8); rectLine(...g.achvBack,C.NEON,1,8); text('< Back',cx,WIN_H-32,13,C.INK,{center:true});
}

/* ============================ input wiring ============================ */
let mouse=[0,0];
function evtPos(ev){ const r=canvas.getBoundingClientRect(); const sx=canvas.width/r.width, sy=canvas.height/r.height; const cx=(ev.clientX!=null?ev.clientX:(ev.touches&&ev.touches[0].clientX)); const cy=(ev.clientY!=null?ev.clientY:(ev.touches&&ev.touches[0].clientY)); return [(cx-r.left)*sx,(cy-r.top)*sy]; }
canvas.addEventListener('pointermove', ev=>{ mouse=evtPos(ev); if(g.state==='play') g.motion(mouse[0],mouse[1]); });
canvas.addEventListener('pointerdown', ev=>{
  ev.preventDefault(); audio(); const [x,y]=evtPos(ev); mouse=[x,y];
  if(g.state==='menu'){
    if(g.achvBtn&&inRect(x,y,g.achvBtn)){ g.state='achv'; return; }
    for(const sid in g.sideRects){ if(inRect(x,y,g.sideRects[sid])){ g.menuSide=sid; return; } }
    for(const diff in g.menuRects){ if(inRect(x,y,g.menuRects[diff])){ g.start(diff,g.menuSide); return; } }
  } else if(g.state==='achv'){ if(g.achvBack&&inRect(x,y,g.achvBack)) g.state='menu'; }
  else g.click(x,y);
}, {passive:false});
window.addEventListener('keydown', ev=>{
  const k=ev.key.toLowerCase();
  if(k===' ') ev.preventDefault();
  if(g.state==='play') g.key(k);
  else if(g.state==='achv'&&k==='escape') g.state='menu';
});

/* ============================ main loop ============================ */
const g = new Game();
UNLOCKED = loadUnlocked();
let last=performance.now();
function frame(now){
  let dt=(now-last)/1000; last=now; if(dt>0.05) dt=0.05;
  if(g.state==='play'){ for(let i=0;i<g.speed;i++) g.update(dt); }
  g.updateToasts(dt);
  if(g.state==='menu') drawMenu(g);
  else if(g.state==='achv') drawAchievements(g);
  else g.draw();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
