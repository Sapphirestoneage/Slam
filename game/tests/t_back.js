// ---------- the welcome-back card ----------
{const n0=G.chars.length,act0=G.active,demo0=G.demo,tour0=G.tourSeen,a=Object.assign(newChar(),{name:'Bea',led:true,placed:true,age:30,ret:60,take:4000,spend:3000,inv:10000});G.demo=false;G.tourSeen=true;G.chars.push(a);G.active=n0;save();go('home');const c=C(),t=todayISO(),y=addDays(t,-6);
 chk('the menu has it',MENU.some(m=>m[1]==='since'));
 chk('first visit: a picture is kept and no row shows',c.x&&c.x.wb&&c.x.wb.d===t&&c.x.wb.pn===null&&!app().includes('bkrow'));
 X('since');chk('first visit sheet says there is no last time yet',W.kind==='since'&&ov().includes('no last time yet')&&clean(ov()),junk(ov()));X('close');
 const s0=bkSnap(c,derive(c));chk('a picture holds counts and totals only',Object.keys(s0).sort().join()==='cash,d,debt,era,gl,inv,k,kt,ms,mv,nw,sk'&&s0.d===t);
 // pretend the last visit was six days ago: it started with less known, a skill was finished and a payment logged that day
 const tr=Object.keys(SKILLS)[0];c.skills[tr+':0']=y;c.moves.push({d:y,t:'pay',amt:150,k:'debt0'});c.moves.push({d:y,t:'in',amt:900,k:'cash0'});
 const end=bkSnap(c,derive(c));end.d=y;const beg=Object.assign({},end,{k:Math.max(0,end.k-2),sk:end.sk-1,mv:end.mv-2});c.x.wb={d:y,b:beg,n:end,pb:null,pn:null,seen:null};
 go('home');const w=c.x.wb;chk('a new day rolls the last visit back',w.d===t&&w.pn&&w.pn.d===y&&w.pb.sk===end.sk-1&&w.seen===null);
 const h=app();chk('Home shows one slim row, under the four tiles',h.includes('bkrow')&&h.includes('Welcome back, Bea')&&h.includes('homerow')&&h.indexOf('bkrow')>h.indexOf(homeQuad(c,D).slice(0,40))&&clean(h),junk(h));
 const B=bkData(c,derive(c));chk('last time: known, the skill by name, the payment, the moves',B.day===y&&B.days===6&&B.did.some(x=>x.includes('nailed down 2 more things'))&&B.did.some(x=>x.includes(SKILLS[tr].skills[0][0]))&&B.did.some(x=>x.includes('paid $150 toward debt'))&&B.did.some(x=>x.includes('logged 2 money moves')&&x.includes('$900')),JSON.stringify(B.did));
 chk('the row line names the first thing and counts the rest',bkLine(B).startsWith('Last time, '+nice(y)+': you ')&&bkLine(B).includes('and '+(B.did.length-1)+' more'));
 chk('no counting of days away, no guilt words',!/days? (away|missed|since you)|streak|you missed|where have you|finally|too long/i.test(h+bkLine(B)+bkText(c,B)));
 X('since');chk('sheet: last time, since then, what is known, and where to pick up',W.kind==='since'&&ov().includes('Last time, '+nice(y))&&ov().includes('bktick')&&ov().includes('You already know')&&ov().includes('stays done')&&ov().includes('Pick up here')&&clean(ov()),junk(ov()));
 chk('opening it puts the row away for today',c.x.wb.seen===t&&!app().includes('bkrow'));
 X('bkcopy');chk('copy',W.copied===true&&ov().includes('Copied')&&bkText(c,B).split('\n').length>=4);
 X('bkgo');chk('pick up here goes to the next step',!W||W.kind!=='since');X('close');go('home');
 X('since');chk('still reachable from the menu after it is put away',ov().includes('Last time, '+nice(y)));X('close');
 // something moved while away: a coach or another device lowered the debt
 c.x.wb.seen=null;c.x.wb.pn.debt=c.x.wb.pn.debt+400;c.x.wb.b=bkSnap(c,derive(c));const B2=bkData(c,derive(c));chk('since then: a change made elsewhere shows as a plain fact',B2.since.some(x=>x.includes('$400 lower')));
 c.x.wb.pn.debt=c.x.wb.b.debt;const B3=bkData(c,derive(c));X('since');chk('nothing moved: it says so',B3.since.length===0?ov().includes('Everything is where you left it'):true);X('close');
 // saving during a visit keeps the latest picture; same-day reopen does not roll
 const pn=JSON.stringify(c.x.wb.pn);c.moves.push({d:t,t:'in',amt:50,k:'cash0'});save();go('home');chk('same day: the latest picture updates, the last visit stays',c.x.wb.n.mv===c.moves.length&&JSON.stringify(c.x.wb.pn)===pn&&c.x.wb.d===t);
 G.demo=true;go('home');chk('the sample game shows no welcome-back row',!app().includes('bkrow'));G.demo=false;
 G.chars.length=n0;G.active=act0;G.demo=demo0;G.tourSeen=tour0;save();go('home')}
