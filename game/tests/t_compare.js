// ---------- side by side and the fee X-ray ----------
{const n0=G.chars.length,act0=G.active,a=Object.assign(newChar(),{name:'Cy',led:true,placed:true,age:30,ret:60,take:5000,spend:3800,inv:20000,home:'Renting'});G.chars.push(a);G.active=n0;save();go('home');
 const c=C();X('moves');chk('What if offers side by side',ov().includes('Put two moves side by side'));
 X('compare');chk('side by side: as it is plus two moves, three rows',W.kind==='compare'&&W.picks.length===2&&ov().includes('As it is')&&ov().includes('Left over each month')&&ov().includes('Work becomes optional')&&ov().includes('Next era')&&clean(ov()),junk(ov()));
 const ms=movesFor(c),p0=W.picks.slice();chk('columns use the same engine as What if',cpCol(c,ms[0]).free===ms[0].f1&&cpCol(c,null).left===1200,JSON.stringify([cpCol(c,ms[0]).free,ms[0].f1]));
 const other=ms.map(r=>r.id).find(id=>!p0.includes(id));if(other){X('cppick',other);chk('picking a third drops the oldest, never more than two',W.picks.length===2&&W.picks[1]===other&&W.picks[0]===p0[1])}
 X('cppick',W.picks[0]);X('cppick',W.picks[0]);chk('no picks leaves just the plan as it is',W.picks.length===0&&ov().includes('As it is')&&clean(ov()));
 X('cptab','fee');chk('fee X-ray: two columns, dollars and years',W.tab==='fee'&&ov().includes('At 1%')&&ov().includes('At 0.05%')&&ov().includes('The fee takes')&&ov().includes('more year')&&clean(ov()),junk(ov()));
 const F=cpFee(c,1,1200),hand=(()=>{let hi=20000,lo=20000;for(let y=0;y<30;y++){hi=hi*1.06+14400;lo=lo*1.0695+14400}return [hi,lo]})();
 chk('fee math matches a hand sum',Math.abs(F.hi-hand[0])<1&&Math.abs(F.lo-hand[1])<1&&F.yrs===30&&F.lost>0&&F.extra>=1&&F.extra<=6,JSON.stringify(F));
 chk('a low fee finds nothing',cpFee(c,0.05,500).lost===0&&cpFee(c,0.05,500).extra===0);
 X('cpfee','0.05');chk('already at the low end says so',ov().includes('already at the low end'));
 X('cpfee','0.5');X('cpadd','0');chk('chips move the sum',W.fee===0.5&&W.add===0&&ov().includes('At 0.5%'));
 X('cpusefee','0.5');chk('remembering the fee feeds Key numbers',C().x.kin.fee.v===0.5&&knGot(C(),'fee').v===0.5&&!ov().includes('Remember it'));
 X('close');G.chars.length=n0;G.active=act0;save();go('home')}
