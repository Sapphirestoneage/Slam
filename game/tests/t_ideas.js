// ---------- Famous money ideas: every idea opens on real numbers, every tap works, every term has an entry ----------
{const n0=G.chars.length,act0=G.active,demo0=G.demo,R2=r=>Object.assign({s:true,cf:2},r),mk=o=>Object.assign(newChar(),{led:true,placed:true},o);
 const P=[mk({name:'Ada',age:30,ret:50,take:4000,incs:[R2({k:'A main job',amt:4000})],spends:[R2({k:'Home',amt:1700}),R2({k:'Food',amt:500}),R2({k:'Getting around',amt:300}),R2({k:'Bills and subscriptions',amt:300}),R2({k:'Fun and everything else',amt:600})],cashes:[R2({k:'Checking',amt:900})],invs:[R2({k:'401k',amt:5000})],debts:[R2({k:'Store card',amt:120,high:true})]}),
  mk({name:'Bo',led:false,take:3000,spend:2500,spends:[],incs:[]}),
  mk({name:'Di',age:52,ret:55,rel:'Married',take:9000,incs:[R2({k:'A main job',amt:9000})],spends:[R2({k:'Home',amt:2000}),R2({k:'Food',amt:800}),R2({k:'Fun and everything else',amt:1200})],cashes:[R2({k:'Savings',amt:60000})],invs:[R2({k:'401k',amt:700000}),R2({k:'Brokerage',amt:400000})],debts:[]})];
 G.demo=false;P.forEach(p=>{G.chars.push(p);syncAll(p)});save();
 const miss={},bad=[];let opened=0,taps=0;
 const scan=(id,h)=>{(h.match(/gloss:[a-z0-9_]+/g)||[]).forEach(k=>{if(!GLOSS[k.slice(6)])miss[k]=id});if(!clean(h))bad.push(id+': '+junk(h));if(/\u2014/.test(h))bad.push(id+': em dash');if(/\b0% of the way|\b0% of your|\b0% within/.test(h))bad.push(id+': shows 0%')};
 P.forEach((p,pi)=>{G.active=n0+pi;save();IG_ORDER.forEach(id=>{const s=IG[id];if(!rfIdeaOn(s))return;(s.tabs||[[null]]).forEach(t=>{try{X('idea',id,t[0]||'');opened++;let h=ov();scan(id,h);
   if(!h.includes('From: '))bad.push(id+': no credit line');if(!h.includes('gloss:ig_'+id))bad.push(id+': no i on the idea');
   const b=IG[id].body(igCtx(C(),id),t[0]);if(b.big!=null&&!(b.math&&b.math.length))bad.push(id+'/'+t[0]+': a number with no Show the math');
   (h.match(/data-a="igset" data-k="[^"]*" data-v="[^"]*"/g)||[]).forEach(m=>{const k=m.match(/data-k="([^"]*)"/)[1],v=m.match(/data-v="([^"]*)"/)[1];X('igset',v,k);taps++;scan(id,ov())});
   (h.match(/data-a="igset" data-k="[^"]*" data-v="[^"]*"/g)||[]).slice(0,1).forEach(m=>{const k=m.match(/data-k="([^"]*)"/)[1],v=m.match(/data-v="([^"]*)"/)[1];X('igset',v,k);const o1=(C().x.ig[id]||{})[k];X('igset',v,k);const o2=(C().x.ig[id]||{})[k];if(!(o1!=null&&o2==null))bad.push(id+': tapping an answer twice does not take it back')});
   (h.match(/data-a="igpick" data-k="[^"]*" data-v="[^"]*"/g)||[]).forEach(m=>{X('igpick',m.match(/data-v="([^"]*)"/)[1],m.match(/data-k="([^"]*)"/)[1],{l:'3'});taps++;scan(id,ov())});
   (h.match(/data-a="igchk" data-v="[^"]*"/g)||[]).forEach(m=>{X('igchk',m.match(/data-v="([^"]*)"/)[1]);taps++});scan(id,ov());
   let guard=0;while(ov().includes('data-a="igqz"')&&guard++<60){const m=ov().match(/data-a="igqz" data-k="([^"]*)" data-v="([^"]*)"/);X('igqz',m[2],m[1]);taps++}scan(id,ov());
   if(ov().includes('data-a="igstart"')){X('igstart');scan(id,ov());const m=ov().match(/data-a="igday" data-v="([^"]*)"/);if(m){X('igday',m[1]);scan(id,ov())}}
   delete C().x.ig[id];X('close')}catch(e){bad.push(id+'/'+t[0]+' threw '+String(e).slice(0,90))}})})});
 chk('every idea opens for three kinds of player, with a credit line, an i, and the math',bad.length===0,bad.slice(0,6).join(' | '));
 chk('every i in an idea has a glossary entry',Object.keys(miss).length===0,JSON.stringify(miss).slice(0,300));
 chk('opened and tapped a lot',opened>=IG_ORDER.length*3-6&&taps>100,opened+' '+taps);
 // the list
 G.active=n0;save();X('roof');let o=ov();chk('the list opens with every region closed, one main button, and both notes',W.kind==='roof'&&!o.includes('class="rowbtn rfrow"')&&(o.match(/class="rowbtn rfreg/g)||[]).length>=5&&(o.match(/class="primary[^"]*"/g)||[]).length<=1&&o.includes('Nobody listed here made or backs this game')&&o.includes('disagree with each other')&&clean(o));
 X('rfreg','retire');o=ov();chk('a region opens to its rows, each with who it is from',(o.match(/class="rowbtn rfrow"/g)||[]).length>=8&&(o.match(/From: /g)||[]).length>=8&&o.includes('Big ERN'));
 X('rfreg','spend');o=ov();chk('one region open at a time',!o.includes('Big ERN')&&o.includes('Ramit Sethi'));X('rfreg','spend');chk('and it closes',!ov().includes('class="rowbtn rfrow"'));
 const A=rfAll(C());chk('every row has a region the list shows',A.every(x=>RF_REG.some(g=>g[0]===x.r.g)),A.filter(x=>!RF_REG.some(g=>g[0]===x.r.g)).map(x=>x.r.n).join(','));
 // Next Steps
 delete C().x.ig.seen;save();go('plan');chk('Next Steps shows one fitting idea, slim',(app().match(/class="rowbtn igplan"/g)||[]).length===1&&app().includes('A famous idea that fits where you are'));
 {const first=igFits(C())[0];X('idea',first);X('close');go('plan');chk('once opened it makes room for the next one',igFits(C())[0]!==first)}
 // math spot checks, part 1
 {const c=C(),x=igCtx(c,'gcc');chk('0% room: single 16,100 + 49,450',IG.gcc.body(x).big.includes('$65,550'));
  const y=igCtx(c,'rog');chk('ACA band for one: 138% and 400% of 15,960',IG.rog.body(y).big===igM(15960*1.38)+' to '+igM(15960*4));
  const e=IG.ern.body(igCtx(c,'ern'),'cape');chk('CAPE rule at 30: 1.75% + 0.5/30 = 3.4%',e.big.indexOf('3.4%')===0);
  const f=IG.felix.body(igCtx(c,'felix'),'rent');chk('5% rule: $400k is $1,667 a month',f.big.indexOf('$1,667')===0);
  const g=igGK(1000000,0.05,[-.3,.1,.1]);chk('guardrails: a 30% loss pushes the rate past the upper line and cuts 10% (after no raise)',Math.abs(g.rows[1].w-50000/1.03*0.9)<1&&g.rows[1].note==='Cut back 10%');
  const g2=igGK(1000000,0.05,[.5,.1,.1]);chk('guardrails: a 50% gain raises 10%',Math.abs(g2.rows[1].w-55000)<1);
  const a=igRun(100,4,IG_ROUGH),b=igRun(100,4,IG_STRONG);chk('same returns, different order, very different endings',b.end>a.end*3);
  const dg=IG.dogen.body(igCtx(c,'dogen'),'nw');chk('Dogen at 30 is 2 times pay',dg.cap.includes('2 times'));
  const cx=igCtx(c,'madf'),hs=IG.madf.body(cx,'hsa');chk('HSA: $4,400 a year for 35 years at 7%',hs.big===igM(grow(0,35,4400))+' by 65')}
 // math spot checks, part 2 (Ada: 30, take 4000, spend 3400, cash 900, 401k 5000)
 {G.active=n0;save();const c=C(),B=(id,tab,o)=>{c.x.ig=c.x.ig||{};if(o)c.x.ig[id]=o;const r=IG[id].body(igCtx(c,id),tab);delete c.x.ig[id];return r},near=(a,b)=>Math.abs(a-b)<0.51,S=derive(c).fiSpend;
  chk('62 ideas are built outside the add-ons',IG_ORDER.filter(id=>!IG[id].pk).length===62,IG_ORDER.length);
  chk('loan payment: $100,000 at 6% for 30 years is $599.55',Math.abs(igPmt(100000,0.06,30)-599.55)<0.01);
  {const g=0.6*0.05+0.4*0.019,p=g/(1-Math.pow(1+g,-35))/(1+g);chk('VPW at 65 with 60% stocks is about 5%',Math.abs(p-0.05)<0.002&&B('vpw',null,{at:65,mix:0.6}).big.indexOf(igP(p,1))===0,p)}
  chk('Social Security: 62 is 70% and 70 is 124% of the check at 67',(()=>{const b=ssEst(ownTake(c)||c.take,c.ret>=62?67:c.ret),h=B('piper').html;return h.includes(igM(b*0.7)+' · '+igM(b)+' · '+igM(b*1.24))})());
  chk('work optional: (spending − 12,000) ÷ 4%',B('hester',null,{part:1000}).big.indexOf(igM((S-12000)/0.04))===0);
  chk('two funds at 30: 45% and 55%',B('merriman',null,{age:30}).big==='45% and 55%');
  {const pay=igPmt(450000*0.9,0.1,10)*12;chk('boring business: 150k at 3 times, 10% down',B('sanchez',null,{profit:150000,mult:3,down:0.1,mgr:0}).big.indexOf(igM(150000-pay))===0)}
  chk('latte: $5 × 5 days × 52 = $1,300 a year, grown for 20 years',B('bach',null,{day:5,wk:5}).big.indexOf(igM(grow(0,20,1300)))===0);
  chk('a tenth of $4,000 is $400',B('babylon').big.indexOf('$400')===0);
  {const h=hoursOf(c);chk('168 hours: minus sleep, work, chores, screens',B('hours168',null,{sleep:7,chores:14,screens:14}).big.indexOf(String(168-49-h.w-h.cm-28))===0)}
  chk('50,000 points at 1.5 cents is $750',B('rrv',null,{prog:'ur',pts:50000}).big==='$750');
  chk('a $700 trip for 40,000 points is 1.75 cents a point',B('rrv',null,{prog:'ur',pts:50000,price:700,need:40000}).cap.includes('1.75 cents'));
  chk('three $300 bonuses less 22% tax is $702',B('doc',null,{bonus:300,mo:4,tax:0.22}).big.indexOf('$702')===0);
  chk('BRRRR: 150k + 40k in, 75% of 250k out, $2,500 stays',B('brrrr',null,{price:150000,rehab:40000,arv:250000,rent:2000}).big.indexOf('$2,500')===0);
  {const all=igPmt(450000*0.95,0.07,30)+450000*0.02/12;chk('house hack: payment plus 2% a year, minus 90% of rent',B('hack',null,{price:450000,down:0.05,rent:2000}).big.indexOf(igM(all-1800))===0)}
  chk('1% rule: $2,000 on $250,000 is 0.8%',B('onepct',null,{price:250000,rent:2000}).big.indexOf('0.8%')===0);
  {let inc=4000,sv=600;for(let y=1;y<=10;y++){const up=inc*0.03;inc+=up;sv+=up*0.5}chk('save more tomorrow: half of a 3% raise for 10 years',B('smart',null,{raise:0.03,share:0.5}).big===igP(600/4000)+' → '+igP(sv/inc)+' in 10 years',B('smart',null,{raise:0.03,share:0.5}).big)}
  chk('five levels: security is basics ÷ 4%',B('robbins').html.includes(igM(2800*12/0.04)));
  chk('weeks left: (90 − 30) × 52 = 3,120',B('weeks',null,{to:90}).big.indexOf('3,120')===0);
  chk('tail end: (90 − 65) × 4 = 100 visits',B('tailend',null,{their:65,per:4}).big==='100 visits left');
  chk('allowance: 8 years × $1 = $8.00 a week',B('lieber',null,{age:8,rate:1}).big==='$8.00 a week');
  {const agi=knNet(c).gross*12,fl=agi*0.005,A=2*Math.max(16100+1000,10000+5000-fl),Bn=Math.max(16100,10000+10000-fl)+16100;chk('bunching: two years of giving in one, with the 2026 floor and the small deduction',B('daf',null,{who:'one',give:5000,other:10000,tax:0.22}).big.indexOf(igM(Math.max(0,Bn-A)*0.22))===0,[A,Bn,fl])}
  chk('kid Roth: 4 summers of $3,000 from 14, left to 65',B('kidroth',null,{start:14,per:3000,yrs:4}).big.indexOf(igM(grow(0,4,3000)*Math.pow(1.07,47)))===0);
  chk('live like a resident: $1,000 a month for 3 years',B('wci',null,{up:1000,yrs:3}).big.indexOf(igM(grow(0,3,12000)))===0);
  chk('days of freedom: $250 ÷ a day of spending',(()=>{const d=250/(S/365);return B('sabatier',null,{price:250}).big.indexOf(String(d>=10?Math.round(d):Math.round(d*10)/10))===0})());
  chk('cash cushion: (spending − payout) × years',(()=>{const P=igCtx(c,'shen').P;return B('shen','shield',{yield:0.035,yrs:5}).big.indexOf(igM(Math.max(0,S-P*0.035)*5))===0})());
  chk('buckets: 2 years of cash and 8 of bonds',B('benz',null,{cash:2,bond:8,at:'goal'}).big.indexOf(igM(S*2)+' · '+igM(S*8))===0);
  const t0=todayISO(),dd=n=>igAddDays(t0,-n),mkd=a=>{const o={};a.forEach(n=>o[dd(n)]=true);return o};
  chk('never miss twice: one gap keeps the streak, two ends it',igStreak(mkd([0,1,3,4]),t0)===4&&igStreak(mkd([0,1,4,5]),t0)===2&&igStreak(mkd([1,2]),t0)===2&&igStreak({},t0)===0);
  chk('quest day counting',igDays('2026-11-01','2026-11-21')===20&&igAddDays('2026-11-21',14)==='2026-12-05')}
 // quests and due rows on Next Steps
 {const c=C();c.x.ig={ufm:{s:todayISO(),dn:{}},moneydate:{next:todayISO()}};save();go('plan');const h=app();chk('a quest in progress and a due money date both show on Next Steps',h.includes('Side quest · day 1 of 30')&&h.includes('Due now')&&h.includes('Money dates'));
  if(typeof fkX==='function'){const x=fkX(c);x.f=[{k:'bill',s:10,sz:1}];x.at=todayISO();x.lim=10;save();go('plan');chk('when the player is full, the ideas stay out of the way',!app().includes('class="rowbtn igplan"'));x.f=[];save()}
  delete c.x.ig}
 // oxygen mask first
 {const mkc=o=>{const p=mk(Object.assign({name:'Ox',age:30,ret:60,take:6000,incs:[R2({k:'A main job',amt:6000})],spends:[R2({k:'Home',amt:2000}),R2({k:'Food',amt:1000})],cashes:[R2({k:'Savings',amt:20000})],invs:[R2({k:'401k',amt:200000})],debts:[],goals:[]},o));syncAll(p);return p};
  let p=mkc({}),M=oxyMask(p);chk('mask on: basics covered, no high-interest debt, retirement on track, no home or tuition goal to wait for',M.on&&M.parts.length===4&&M.parts[3].na&&M.next===null,JSON.stringify(M.parts.map(q=>[q.id,q.ok])));
  p=mkc({spends:[R2({k:'Home',amt:5000}),R2({k:'Food',amt:1500})]});M=oxyMask(p);chk('basics come first: more going out than coming in',!M.on&&M.next.id==='basics');
  p=mkc({debts:[R2({k:'Card',amt:3000,high:true})]});M=oxyMask(p);chk('then high-interest debt',!M.on&&M.next.id==='debt'&&M.parts[0].ok);
  p=mkc({ret:35,invs:[R2({k:'401k',amt:1000})]});M=oxyMask(p);chk('then retirement on track by the stop age',!M.on&&M.next.id==='retire'&&/after your stop age|does not reach/.test(M.next.why),M.next&&M.next.why);
  p=mkc({});p.spends.forEach(r=>r.s=false);M=oxyMask(p);chk('a plan built on guesses cannot say on track',!M.on&&M.next.id==='retire'&&/guess/.test(M.next.why));
  p=mkc({goals:[{id:'g1',k:'Home',n:'Home',cost:90000000,s:true,era:5,fund:0,blk:null,d:todayISO()}]});M=oxyMask(p);chk('then a home goal that does not fit yet',!M.on&&M.next.id==='goal'&&M.parts.slice(0,3).every(q=>q.ok),JSON.stringify(M.parts.map(q=>[q.id,q.ok])));
  p=mkc({goals:[{id:'g2',k:'Something else',n:'Kids tuition',cost:20000,s:true,era:4,fund:0,blk:null,d:todayISO()}]});M=oxyMask(p);chk('a tuition goal is picked up by its name, and one that fits lets the mask on',M.parts.some(q=>q.id==='goal'&&!q.na&&/Kids tuition/.test(q.n))&&M.on,JSON.stringify(M.parts.map(q=>[q.n,q.ok])));
  chk('the rows read cleanly',clean(oxyRows(oxyMask(mkc({}))))&&!!GLOSS.oxy)}
 G.chars.length=n0;G.active=act0;G.demo=demo0;closeSheet();save();go('home')}
