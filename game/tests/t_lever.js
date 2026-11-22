// ---------- which lever matters most ----------
{const n0=G.chars.length,act0=G.active,demo0=G.demo,a=Object.assign(newChar(),{name:'Lee',led:true,placed:true,age:25,ret:65,take:4000,spend:3000,inv:10000,high:'no',match:'yes',tax:'no'});G.demo=false;G.chars.push(a);G.active=n0;save();go('home');const c=C();
 chk('the menu has it',MENU.some(m=>m[1]==='lever'));
 const f=lvFv(300,0.07,40);chk('monthly compounding by hand: $300 for 40 years at 7%',Math.abs(f-300*(Math.pow(1+0.07/12,480)-1)/(0.07/12))<1e-6&&Math.round(f/1000)===787,Math.round(f));
 const A=lvAt(25);chk('age 25: +3 years 195k, +1% 260k, +$100 262k, top two tie',Math.round(A.time/1000)===195&&Math.round(A.ret/1000)===260&&Math.round(A.money/1000)===262&&A.win==='money'&&A.tie==='ret',[A.time,A.ret,A.money].map(Math.round).join());
 const B=lvAt(35),E5=lvAt(55);chk('age 35 money wins, age 55 time wins',B.win==='money'&&!B.tie&&E5.win==='time'&&Math.round(E5.time/1000)===24&&Math.round(E5.ret/1000)===3,[E5.time,E5.ret,E5.money].map(Math.round).join());
 chk('very late ages still get a horizon',lvYears(64)===5&&lvYears(80)===5&&lvYears(0)===35);
 const Rs=lvRounds(c);chk('five rounds, each with a right answer among its options',Rs.length===5&&Rs.every(r=>r.opts.length>=2&&r.ok.length>=1&&r.ok.every(k=>r.opts.some(o=>o.k===k))&&r.math.length>0));
 chk('the trap round: the fee is the one you can choose',Rs[3].ok.join()==='fee'&&Rs[3].opts.some(o=>o.k==='more'));
 X('lever');chk('list: six levers in dollars a year, a headline, the game and two paths',W.kind==='lever'&&['Earn','Spend','Protect','Grow','Stretch','Keep'].every(n=>ov().includes('<b>'+n+'</b>'))&&ov().includes('data-a="lvquiz"')&&ov().includes('Two paths')&&ov().includes('a year')&&clean(ov()),junk(ov()));
 chk('headline: the biggest one in your hands sits apart from the biggest swing',ov().includes('Biggest one in your hands')&&ov().includes('Biggest if it lands')&&lvRank(c,derive(c)).sure.k==='spend'&&lvRank(c,derive(c)).swing.k==='earn');
 chk('numbers on guesses get no call',ov().includes('On a guess, so no call yet')&&!ov().includes('cpcell best')&&lvRank(c,derive(c)).sureGuess&&lvRank(c,derive(c)).swingGuess);
 {const i0=c.incs,s0=c.spends;c.incs=[{k:'A main job',amt:4000,s:true}];c.spends=[{k:'Home',amt:3000,s:true}];X('lever');chk('real numbers get the call',!lvRank(c,derive(c)).sureGuess&&!lvRank(c,derive(c)).swingGuess&&(ov().match(/cpcell best/g)||[]).length===2&&ov().includes('Yours to choose')&&ov().includes('Not promised'));c.incs=i0;c.spends=s0}
 const L=lvLevers(c,derive(c)),by=k=>L.find(x=>x.k===k);chk('earn is 10% of yearly pay, spend 10% of yearly spending',by('earn').yr===4800&&by('spend').yr===3600&&Math.round(by('spend').dbl)===90000);
 chk('no costly debt: protect is done; stretch open at 2% of 60% plus two bonuses',by('protect').done&&by('protect').yr===0&&Math.abs(by('stretch').yr-(36000*0.6*0.02+600))<1e-6&&!by('stretch').lock);
 chk('keep: the first account times a guessed 20%',Math.abs(by('keep').yr-Math.min(12000,ROTH)*0.2)<1e-6&&by('keep').cf===0);
 c.debts=[{n:'Card',amt:5000,rate:24,s:true}];c.debt=5000;c.high='yes';const L2=lvLevers(c,derive(c)),p2=L2.find(x=>x.k==='protect'),s2=L2.find(x=>x.k==='stretch');chk('a 24% card: protect is the interest, and stretch waits',p2.yr===1200&&!p2.done&&!!s2.lock&&s2.yr===0);
 X('lever');chk('a locked lever says why and is not ranked',ov().includes('Not yet')&&ov().includes('Protect comes first')&&clean(ov()),junk(ov()));
 c.debts=[];c.debt=0;c.high='no';
 ['earn','spend','protect','grow','stretch','keep'].forEach(k=>{X('lvopen',k);chk('lever '+k+' opens with effort, how sure, worst case and math',W.v===k&&ov().includes('to set up')&&ov().includes('how sure')&&ov().includes('Worst case')&&ov().includes('data-a="lvgo"')&&clean(ov()),junk(ov()))});
 X('lvopen','grow');X('lvgo','grow');chk('grow goes to the Fee X-ray',W&&W.kind==='compare'&&W.tab==='fee');
 X('lvopen','stretch');X('lvgo','stretch');chk('stretch goes to the multipliers board',W&&W.kind==='mult');
 X('lvopen','earn');X('lvgo','earn');chk('earn goes to the Earning area of the map',MP.r==='earn'&&!SH);go('home');
 X('lvopen','two');chk('two paths: both numbers, no call while pay is a guess',W.v==='two'&&ov().includes('invested, by 65')&&ov().includes('extra pay over 40 years')&&ov().includes('makes no call')&&ov().includes('data-a="sharp"')&&clean(ov()),junk(ov()));
 const t2=lvTwo(c,{amt:300,lift:5,odds:0.5});chk('two paths by hand',Math.abs(t2.inv-300*Math.pow(1.07,40))<1e-6&&t2.e===1200&&t2.sum===48000&&t2.ahead==='skill'&&Math.abs(t2.even-300*Math.pow(1.07,40)/(48000*0.5*40)*100)<1e-9);
 X('lvset','10000','amt');X('lvset','2','lift');X('lvset','0.25','odds');chk('chips change the two paths',W.o.amt===10000&&W.o.lift===2&&W.o.odds===0.25&&ov().includes(money(Math.round(10000*Math.pow(1.07,40)))));
 X('lvquiz');chk('game: round one asks at your age, three taps, no numbers shown yet',W.kind==='lvq'&&ov().includes('You are 25')&&(ov().match(/data-a="lvpick"/g)||[]).length===3&&!ov().includes('+$'));
 X('lvpick','time');chk('a miss shows all three, marks the tie, and takes nothing away',W.pick==='time'&&W.right===0&&ov().includes('(your pick)')&&ov().includes('A tie at the top')&&ov().includes('Most people guess that one')&&!/wrong|incorrect|lost|fail/i.test(ov())&&clean(ov()),junk(ov()));
 X('lvpick','money');chk('a second tap does not change the pick',W.pick==='time'&&W.right===0);
 X('lvnext');chk('round two flips the age',W.i===1&&ov().includes('someone who is 55'));X('lvpick','time');chk('time wins at 55',W.right===1&&ov().includes('You called it'));
 X('lvnext');X('lvpick',lvRounds(c)[2].ok[0]);X('lvnext');X('lvpick','fee');chk('the fee round',W.right===3&&ov().includes('Nobody can order 3% more'));X('lvnext');X('lvpick',lvRounds(c)[4].ok[0]);X('lvnext');
 chk('end: the score, the rule, and it is saved',W.i===5&&ov().includes('4 of 5')&&ov().includes('no lever always wins')&&c.x.lvq&&c.x.lvq.n===4&&c.x.lvq.of===5&&clean(ov()),junk(ov()));
 chk('the game is a side mission until played',!msSide(c,derive(c)).some(m=>m.id==='lever:quiz'));delete c.x.lvq;chk('and comes back when not played',msSide(c,derive(c)).some(m=>m.id==='lever:quiz'&&m.a==='lvquiz'));
 X('lever');X('info',null,'gloss:lever');chk('the explain button opens',ov().includes('In plain words')&&ov().includes('Lever'));
 X('close');G.chars.length=n0;G.active=act0;G.demo=demo0;save();go('home')}
