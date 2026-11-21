/* ===== ideasz.js: loads after every ideas file. The glossary for each idea and its terms, which ideas fit the player right now, and the slim door on Next Steps. ===== */
IG_ORDER.forEach(id=>{const s=IG[id];GLOSS["ig_"+id]=[s.n,s.what+" From: "+s.by+"."]});
Object.assign(GLOSS,{
 wrate:["Withdrawal rate","The share of your invested money you take out each year to live on. Taking $40,000 from $1,000,000 is a 4% rate."],
 seqrisk:["Order of returns","Also called sequence-of-returns risk. Once you are taking money out, a crash in the first few years does far more damage than the same crash later, even if the average return is the same."],
 cape:["CAPE","A measure of how pricey stocks are: the price of the market divided by ten years of company profits. A high CAPE means stocks cost a lot for what they earn. It was created by Robert Shiller."],
 guardrails:["Guardrails","Two lines around your spending. Cross the upper one and you cut back a little. Cross the lower one and you spend a little more. Between them you change nothing."],
 glide:["Glidepath","How your mix of stocks and bonds changes as you age. A rising one starts with fewer stocks at your stop date and adds more over time."],
 buckets:["Buckets","Splitting your money by when you will need it. Cash for now, bonds for the next several years, stocks for later."],
 ladder:["Roth conversion ladder","Moving money from a traditional retirement account to a Roth a little each year. Each move can be spent without penalty five tax years later, so the moves line up like rungs."],
 fiveyr:["The five-year wait","Money you move to a Roth has to sit for five tax years before you can take that amount out early with no penalty. Each year's move has its own clock."],
 hsa:["HSA","A health savings account. Money goes in before tax, grows untaxed, and comes out untaxed for medical costs. It is the only account that skips tax all three times. You need a high-deductible health plan to have one."],
 taxrate:["Top tax rate","The rate on your last dollar of income. It is the rate that matters when you decide whether to pay tax now or later."],
 tvr:["Traditional or Roth","Two kinds of retirement account. Traditional: no tax on the money going in, tax when it comes out. Roth: tax now, none later."],
 fill:["Bracket filling","Choosing your income each year so it fills the lowest tax brackets and stops there. It works when you control your income, which early retirees do."],
 stdded:["Standard deduction","The amount of income everyone gets to earn before federal income tax starts."],
 zerogain:["0% gains band","Profit on investments held over a year is taxed at 0% as long as your taxable income stays under a set line."],
 acahelp:["Marketplace help","Money the government puts toward a health plan you buy yourself on healthcare.gov or your state's site. How much depends on your income for the year. Also called the premium tax credit."],
 fpl:["Poverty line","A dollar figure the government sets each year by household size. Many programs measure your income as a percent of it."],
 magi:["Income, for health insurance","The figure the marketplace uses is close to the income on your tax return: pay, interest, the gain part of sales, and money moved to a Roth. Spending from cash or a Roth does not count."],
 mctrap:["Middle-class trap","Being wealthy on paper while nearly all of it sits where you cannot spend it before 59½: retirement accounts and your home."],
 equity:["Home equity","What your home would sell for, minus what you still owe on it."],
 first25:["The first $25,000","A first pile of money you can actually reach. In Set for Life it is the first milestone, because it buys you choices."],
 resident:["Live like a resident","Keeping your old, smaller lifestyle for a few years after a big raise, and putting the whole raise toward debt and investing."],
 freedays:["Days of freedom","What something costs, counted in days you could live on that money instead of working for it."],
 cushion5:["Cash cushion","Cash set aside to cover the gap between what your investments pay you and what you spend, for a few bad years in a row."],
 yshield:["Yield shield","Tilting your investments toward ones that pay you regularly, so in a bad market you live on the payouts and do not have to sell."],
 geoarb:["Geographic arbitrage","Earning or saving in a place with high pay, and living in a place where life costs less."],
 omy:["One more year","Pushing your stop date back a year at a time for extra safety, even after the numbers say you have enough."],
 fivepct:["The 5% rule","A quick way to compare renting with owning. Multiply the home's price by 5% and divide by 12. That is roughly what owning costs each month that you never get back."],
 lifecycle:["Lifecycle investing","Spreading stock market risk across your whole life by holding more stock when you are young, sometimes with borrowed money, and less when you are older."],
 leverage:["Leverage","Investing with borrowed money. Gains are bigger and so are losses, and you owe the loan either way."],
 nwmult:["Net worth multiple","Your net worth divided by a year of your pay before taxes. A way to set targets that grow as your pay grows."],
 tenthcar:["The 1/10th rule","Spend no more than a tenth of a year's pay before taxes on a car."],
 severance:["Severance","Pay and benefits an employer gives you when a job ends. It is often open to negotiation."],
 ufm:["Uber Frugal Month","A one-month experiment in spending as little as you can, to learn which spending you actually miss."],
 tradeoff:["Trade-off","What you give up to get something. Every dollar and every hour can only go one place."]});
/* ---------- oxygen mask first: look after your own basics before money goes anywhere else.
   The mask is on once basic expenses are covered, there is no high-interest debt, retirement is on track, and a home or tuition goal (if there is one) has a date.
   On track means either the plan reaches the number by the stop age, or the player is at Fidelity's mark for their age. A plan built on guessed numbers counts as not yet.
   Someone with kids is asked for a tuition goal first. ---------- */
if(typeof GOAL_K!=="undefined"&&!GOAL_K.some(g=>g[0]==="Kids' tuition"))GOAL_K.push(["Kids' tuition",40000,5]);
function oxyMask(c,d){d=d||derive(c);const kept=(c.take||0)-(c.spend||0),hi=typeof hiDebt==="function"?hiDebt(c):0,real=!!c.led&&isSharp(c,"take")&&isSharp(c,"spend"),age=c.age||0,ret=c.ret||60,at=d.yrs==null?null:age+d.yrs,plan=real&&at!=null&&at<=ret;let sim=null,fid=false;
 try{const m=typeof knMetrics==="function"?knMetrics(c,d).find(q=>q.id==="invx"):null;fid=!!m&&m.num!=null&&m.st!=="Guess"&&m.zone&&m.zone[1]==="good"}catch(e){}const track=plan||fid;
 const gs=(c.goals||[]).filter(g=>!g.done&&/home|house|tuition|college|school|kid/i.test((g.k||"")+" "+(g.n||""))),fitG=g=>{try{sim=sim||goalSim(c);return !!goalFit(c,g,sim)}catch(e){return false}};
 const parts=[{id:"basics",n:"Basic expenses are covered",ok:kept>=0,why:kept>=0?"More comes in each month than goes out.":"About "+money(Math.round(-kept))+" more goes out each month than comes in.",a:"sharp",v:"spend",go:"Open my spending"},
  {id:"debt",n:"No high-interest debt",ok:hi<=0,why:hi<=0?"Nothing is charging you a high rate.":money(Math.round(hi))+" is still at a high rate.",a:"debtplan",v:"",go:"Open my debt plan"},
  {id:"retire",n:"Retirement is on track",ok:track,why:plan?"Your plan reaches your number at "+at+", by your stop age of "+ret+".":fid?"You are at or past Fidelity's mark for your age.":!real?"Your numbers are still a guess, so the game cannot say yet.":(at==null?"Your plan does not reach your number yet":"Your plan reaches your number at "+at+", after your stop age of "+ret)+", and you are not yet at Fidelity's mark for your age. Either one counts.",a:real?"metric":"sharp",v:real?"yearsfi":"spend",go:real?"Open years to freedom":"Make my numbers real"}];
 if(gs.length)gs.forEach(g=>{const ok=fitG(g);parts.push({id:"goal",n:(g.n||g.k)+" has a date",ok,why:ok?"It fits in your plan.":"It does not fit in your plan yet.",a:"tab",v:"goals",go:"Open My Goals"})});
 if(c.deps==="Kids"&&!(c.goals||[]).some(g=>/tuition|college|school|kid/i.test((g.k||"")+" "+(g.n||""))))parts.push({id:"kids",n:"A kids' tuition goal is on your list",ok:false,why:"You have kids, so the game asks for a tuition goal before giving. It can be small, or marked done.",a:"tab",v:"goals",go:"Add it in My Goals"});
 else if(!gs.length)parts.push({id:"goal",n:"A home or tuition goal has a date",ok:true,na:true,why:"There is none on your goals list, so this part holds nothing up.",a:"tab",v:"goals",go:"Open My Goals"});
 return {on:parts.every(p=>p.ok),parts,next:parts.find(p=>!p.ok)||null}}
function oxyRows(M){return `<div class="stack oxyrows" style="gap:4px">${M.parts.map(p=>`<div class="row between small" style="gap:8px;align-items:flex-start"><span style="min-width:0"><b>${esc(p.n)}</b><div class="tiny muted">${esc(p.why)}</div></span><span class="${p.ok?"muted":p===M.next?"fkhot":"muted"}" style="white-space:nowrap">${p.na?"No goal":p.ok?"Done ✓":"Not yet"}</span></div>`).join("")}</div>`}
GLOSS.oxy=["Oxygen mask first","On a plane you put on your own mask before you help anyone else. With money it means: cover your basic expenses, clear high-interest debt, get retirement on track, and give a home or tuition goal a date. After that, money can go to other people."];
/* which ideas fit this player right now, newest-to-them first */
function igFits(c,d){d=d||derive(c);const X=(c.x&&c.x.ig)||{},seen=X.seen||{};const L=IG_ORDER.filter(id=>{const s=IG[id];if(typeof rfIdeaOn==="function"&&!rfIdeaOn(s))return false;try{return !!s.fit(c,d)}catch(e){return false}});return L.filter(id=>!seen[id]).concat(L.filter(id=>seen[id]))}
function igQuestsOn(c){const out=[];IG_ORDER.forEach(id=>{const s=IG[id];if(!s.quest)return;const cx=igCtx(c,id),z=igQs(cx,s.quest);if(z.on&&!z.over)out.push({s,z})});return out}
function igPlanBlock(c,d){if(!c||(typeof fkFull==="function"&&fkFull(c)))return "";const qs=igQuestsOn(c),fit=igFits(c,d),X=(c.x&&c.x.ig)||{},seen=X.seen||{},nw=fit.filter(id=>!seen[id])[0],s=nw?IG[nw]:null;
 let h=qs.map(q=>`<button class="rowbtn igplan" data-a="idea" data-v="${q.s.id}"><span style="min-width:0"><span class="tiny muted">Side quest · day ${q.z.day} of ${q.s.quest.days}</span><div><b>${esc(q.z.task(q.z.day))}</b></div></span><span class="fkgo">${q.z.dn[q.z.day]?"Done ✓":"Open"}</span></button>`).join("");
 IG_ORDER.forEach(id=>{const q=IG[id];if(!q.due||!rfIdeaOn(q))return;try{if(q.due(c,X[id]||{}))h+=`<button class="rowbtn igplan" data-a="idea" data-v="${id}"><span style="min-width:0"><span class="tiny muted">Due now</span><div><b>${esc(q.n)}</b></div></span><span class="fkgo">Open</span></button>`}catch(e){}});
 if(s)h+=`<button class="rowbtn igplan" data-a="idea" data-v="${s.id}"><span style="min-width:0"><span class="tiny muted">A famous idea that fits where you are</span><div><b>${esc(s.n)}</b></div><div class="tiny muted">From: ${esc(s.by)}</div></span><span class="fkgo">Open</span></button>`;
 return h}
(()=>{if(typeof planTab!=="function")return;const _pt=planTab;planTab=function(){const h=_pt();try{const b=igPlanBlock(C(),D||derive(C()));return b?h.replace(/<\/div>\s*$/,()=>b+"</div>"):h}catch(e){return h}}})();
/* the two drill formats on the list are one tap from the fire drills */
(()=>{if(typeof fdSheet!=="function")return;const _fd=fdSheet;fdSheet=function(){const h=_fd();try{if(W&&W.kind==="drills"&&!W.id&&IG.munger&&IG.fearset)return h+`<div class="small"><b>Two more drill formats</b></div><button class="rowbtn" data-a="idea" data-v="munger"><span style="min-width:0"><b>How would I ruin myself?</b><div class="tiny muted">Inversion, from Charlie Munger</div></span><span class="fkgo">Open</span></button><button class="rowbtn" data-a="idea" data-v="fearset"><span style="min-width:0"><b>Fear-setting</b><div class="tiny muted">Define, prevent, repair, from Tim Ferriss</div></span><span class="fkgo">Open</span></button>`}catch(e){}return h}})();
