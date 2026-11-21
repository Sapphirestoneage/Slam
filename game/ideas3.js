/* ===== ideas3.js: Part 2. Retirement (17 to 23), Investing (24 to 26), Earning (27 to 33). Same frame and rules as ideas.js. All questions and checklists are the game's own wording. ===== */
const IG_Q3=[[0,"Not me"],[1,"Sometimes"],[2,"That is me"]];
function igTop(sc){return Object.keys(sc).sort((a,b)=>sc[b]-sc[a])[0]}
/* ---------- 17. Mike Piper ---------- */
igAdd({id:"piper",grp:"retire",n:"When to claim Social Security",by:"Mike Piper, Oblivious Investor and Open Social Security",one:"Claiming later means a bigger check for life. See each person's check at 62, 67 and 70.",
 what:"You can start Social Security any time from 62 to 70. Each year you wait makes the monthly check bigger for the rest of your life. In a couple, the bigger earner waiting often matters most, because the survivor keeps the larger check.",
 fit:(c,d)=>c.age>=45||c.work==="Retired",
 body:x=>{const ppl=G.demo?[x.c]:[x.c].concat(G.chars.filter(p=>p!==x.c)).slice(0,6),age=x.v("age",67),f=a=>a===62?0.7:a===70?1.24:1,row=p=>{const b=ssEst(ownTake(p)||p.take,p.ret>=62?67:p.ret);return {p,b}},R0=ppl.map(row),tot=R0.reduce((t,r)=>t+r.b*f(age),0);
  return {big:igM(tot)+" a month",cap:"Claiming at "+age+(ppl.length>1?", for all "+ppl.length+" people in this game together.":".")+" In today's dollars. "+igI("ssclaim"),
   html:igRows([["<b>Person</b>","<b>62 · 67 · 70</b>"]].concat(R0.map(r=>[esc(r.p.name||"You"),igM(r.b*0.7)+" · "+igM(r.b)+" · "+igM(r.b*1.24)]))),
   ins:[["age","Claim at what age?","ssclaim",[[62,"62"],[67,"67"],[70,"70"]],67]],
   math:["Full check at 67: worked out from take-home pay and years worked, a rough estimate","At 62: 70% of the full check. At 70: 124% of it","Waiting from 62 to 67 gives up 5 years of the smaller check to get a bigger one for life","62 or 67: you come out ahead by waiting if you live past about 79","67 or 70: past about 82 to 83","In a couple, when one person dies the household keeps the larger of the two checks"],
   note:"These are rough. Your real numbers are at ssa.gov under my Social Security. His free Open Social Security tool works out the best ages for a couple."}},
 val:x=>"About "+igM(ssEst(ownTake(x.c)||x.take,67))+" a month at 67"});
/* ---------- 18. Wade Pfau ---------- */
const IG_PFAU=[["I would rather have a paycheck I can count on than a chance at more.","safe"],["A market drop early in retirement would keep me up at night.","safe"],["I am happy to hand part of my savings to an insurer for income that lasts for life.","safe"],["I want my must-pay bills covered by income that does not depend on the market.","safe"],["I would rather keep control of my money than lock any of it up.","mkt"],["I trust that stocks will carry me over a long retirement.","mkt"],["I can cut my spending for a few years without much trouble.","mkt"],["Leaving money behind matters to me.","mkt"]];
igAdd({id:"pfau",grp:"retire",n:"Your retirement income style",by:"Wade Pfau, Retirement Researcher (with Alex Murguia)",one:"Some people want a floor they can count on. Others want to stay invested and flexible. Know which you are before you pick a plan.",
 what:"His research finds people lean one of two ways about retirement income. Safety-first people want lifetime income for the basics. Market-based people would rather stay invested and adjust. Neither is wrong, and the right plan depends on which you are.",fit:IG_NEAR,
 body:x=>{const q={qs:IG_PFAU,opts:IG_Q3},z=igQz(x,q),s=z.sc.safe||0,m=z.sc.mkt||0,st=s>m+1?"Safety first":m>s+1?"Market based":"A mix of both";
  return {big:z.all?st:null,cap:z.all?(st==="Safety first"?"Cover your must-pay bills with income you cannot outlive (Social Security, a pension, maybe an annuity), then invest the rest.":st==="Market based"?"Stay invested and draw from the portfolio with rules you trust, like guardrails or a rate that moves.":"Put a floor under the basics and keep the rest invested and flexible.")+" "+igI("incstyle"):"",
   html:z.all?igRows([["Safety first",s+" of 8"],["Market based",m+" of 8"]]):`<div class="small">Eight quick taps. There are no right answers.</div>`,quiz:q,
   math:z.all?["Each answer scores 0, 1 or 2","Four statements lean safety first: "+s,"Four lean market based: "+m,"More than 1 apart picks a side. Otherwise it is a mix."]:null,
   note:"These eight statements are the game's own. His full assessment is called the RISA and lives on his site.",links:z.all?(st==="Safety first"?[["Open buckets","idea","benz"]]:[["Open guardrails","idea","gk"]]):[]}}});
/* ---------- 19. Bogleheads VPW ---------- */
igAdd({id:"vpw",grp:"retire",n:"Variable percentage withdrawal",by:"The Bogleheads forum (the VPW method, by the member longinvest)",one:"Take a percent that rises a little every year as you age, so the money is built to last your whole life and not much longer.",
 what:"Each year you take a percentage of whatever your balance is now. The percentage goes up as you age. Your paycheck moves with the market, and you cannot run out early because you never take a fixed dollar amount.",fit:IG_NEAR,
 body:x=>{const age=x.v("at",Math.max(50,Math.min(80,Math.round(x.ret/5)*5))),st=x.v("mix",0.6),g=st*0.05+(1-st)*0.019,pct=a=>{const n=Math.max(1,100-a);return g/(1-Math.pow(1+g,-n))/(1+g)},P=x.P,p=pct(age);
  return {big:igP(p,1)+" this year",cap:"At "+age+", from "+igM(P)+": "+igM(P*p)+" a year, or "+igM(P*p/12)+" a month. Next year you work it out again from your new balance. "+igI("vpw"),
   html:igRows([["<b>Age</b>","<b>Percent to take</b>"]].concat([50,60,70,80,90].map(a=>["Age "+a,igP(pct(a),1)]))),
   ins:[["at","How old are you when you take it?","vpw",[[50,"50"],[55,"55"],[60,"60"],[65,"65"],[70,"70"],[75,"75"],[80,"80"]],Math.max(50,Math.min(80,Math.round(x.ret/5)*5))],["mix","How much is in stocks?","vpw",[[0.4,"40%"],[0.6,"60%"],[0.8,"80%"]],0.6]],
   math:["Growth assumed after inflation: stocks 5% a year, bonds 1.9%","Your mix: "+igP(st)+" stocks, so "+igP(g,1)+" a year","Years to plan for: to age 100, so "+Math.max(1,100-age),"The percent is the level payment, taken at the start of each year, that would use up the money over those years at that growth","At "+age+": "+igP(p,1)+" of "+igM(P)+" = "+igM(P*p)],
   note:"The growth figures are the ones the method is known for, as best the game knows them. Check the Bogleheads VPW table for their exact percentages."}},
 val:x=>"A percent of your balance that rises with age"});
/* ---------- 20. William Bernstein ---------- */
igAdd({id:"bernstein",grp:"retire",n:"When you have won the game, stop playing",by:"William Bernstein",one:"Once you have enough, the goal changes from getting richer to not becoming poor.",
 what:"His line of thinking: when your savings can cover what you need for the rest of your life, you no longer need to take big risks with that part. Move enough for your basic needs into safe holdings, and take risk only with what is left over.",
 fit:(c,d)=>d.pct>=90||c.work==="Retired",
 body:x=>{const yrs=x.v("yrs",20),basic=x.v("basic",0.7),need=x.S*basic*yrs,have=x.inv+x.cash,pct=Math.max(1,Math.round(x.d.pct)),won=have>=x.P,spare=Math.max(0,have-need);
  return {big:won?"You have enough":"About "+pct+"% of the way",cap:(won?"Your savings cover your freedom number. He would say: put "+igM(Math.min(have,need))+" somewhere safe, and only take risk with the other "+igM(spare)+".":"You are not there yet, so this is a preview. When you get there, the safe pile would be about "+igM(need)+".")+" "+igI("wongame"),
   ins:[["yrs","How many years of basics do you want safe?","wongame",[[10,"10 years"],[15,"15 years"],[20,"20 years"],[25,"25 years"]],20],["basic","How much of your spending is basics?","wongame",[[0.5,"Half"],[0.7,"About 70%"],[0.9,"Nearly all"]],0.7]],
   math:["Your spending: "+igM(x.S)+" a year, of which basics are "+igP(basic)+" = "+igM(x.S*basic),igM(x.S*basic)+" × "+yrs+" years = "+igM(need)+" to keep safe","You have: "+igM(have)+" (invested plus cash)","Left to take risk with: "+igM(spare)],
   note:"Other people on this list (Big ERN, Kitces) argue that too little in stocks is its own risk over a 40-year retirement. This is about how much risk you need, not how much you can stomach."}},
 val:x=>x.inv+x.cash>=x.P?"You have reached your freedom number":"About "+Math.max(1,Math.round(x.d.pct))+"% of the way to enough"});
/* ---------- 21. Fritz Gilbert ---------- */
const IG_READY=[["I know what I will do on an ordinary Tuesday.","Structure"],["I have things on the calendar that are not doctor visits.","Structure"],["I have tried my retirement routine for a week or more.","Structure"],["I have friends I see who are not from work.","People"],["My partner or family and I have talked about what our days will look like.","People"],["I belong to a group that would notice if I stopped showing up.","People"],["I can say what I am retiring to, not only what I am leaving.","Purpose"],["There is something I want to get better at.","Purpose"],["Someone will be better off because of how I spend my time.","Purpose"]];
igAdd({id:"gilbert",grp:"retire",n:"Ready for retirement, apart from the money",by:"Fritz Gilbert, The Retirement Manifesto",one:"The money is the easy part to measure. Check the three things that are not money: purpose, people and structure.",
 what:"He writes that the people who struggle in retirement usually have the money right and the rest unplanned. This is a nine-tap check on the non-money side.",fit:IG_NEAR,
 body:x=>{const q={qs:IG_READY,opts:[[0,"Not yet"],[1,"Partly"],[2,"Yes"]]},z=igQz(x,q),low=z.all?Object.keys(z.sc).sort((a,b)=>z.sc[a]-z.sc[b])[0]:null;
  return {big:z.all?"Work on: "+low:null,cap:z.all?"That is your thinnest of the three. One small step this month is enough. "+igI("ig_gilbert"):"",html:z.all?igRows(["Purpose","People","Structure"].map(k=>[k,z.sc[k]+" of 6",k===low])):`<div class="small">Nine quick taps about life after work.</div>`,quiz:q,
   math:z.all?["Three statements each for purpose, people and structure","Each answer scores 0, 1 or 2, so each part is out of 6","The lowest part is the one to work on first"]:null,note:"The nine statements are the game's own."}}});
/* ---------- 22. Tanja Hester ---------- */
const IG_WOPT=[["try","Try one week living your work-optional days, on vacation time","A test run shows what you would miss."],["id","Write one line for who you are when work is not the answer","\"I am a ...\" without your job title."],["health","Price health insurance for the gap years","It is the cost most people guess wrong."],["part","Name one kind of paid work you would still enjoy","Work optional does not mean no work."],["people","Tell the people close to you what you are planning","Their reaction is information."],["give","Pick how you will be useful to someone else","Volunteering, mentoring, family."]];
igAdd({id:"hester",grp:"retire",n:"Work optional",by:"Tanja Hester, Work Optional",one:"The goal is not to never work. It is for work to be a choice.",
 what:"She reframes early retirement as making work optional: enough saved that you can choose work you like, part-time work, or none, and a plan for the parts of life that money does not cover.",
 fit:(c,d)=>c.work!=="Retired"&&d.era>=4,
 body:x=>{const part=x.v("part",1000),S=x.S,need=Math.max(0,S-part*12)/SWR,y0=x.d.yrs,y1=yearsTo(x.inv,x.d.save,need);
  return {big:igM(need)+" makes work optional",cap:"If you still earn "+igM(part)+" a month doing something you like. Your full freedom number is "+igM(x.P)+". "+igI("ig_hester"),
   html:igRows([["Years to full freedom",igYr(y0)],["Years to work optional",igYr(y1)]])+`<div class="small"><b>The non-money side</b></div>`,checks:IG_WOPT,
   ins:[["part","How much might you still earn a month?","ig_hester",[[0,"$0"],[500,"$500"],[1000,"$1,000"],[2000,"$2,000"],[3000,"$3,000"]],1000]],
   math:["Your spending: "+igM(S)+" a year","Still earned: "+igM(part)+" × 12 = "+igM(part*12),"Left for savings to cover: "+igM(Math.max(0,S-part*12)),"÷ 4% = "+igM(need)],note:"The checklist is the game's own wording."}},
 val:x=>"With $1,000 a month of work you like: "+igM(Math.max(0,x.S-12000)/SWR)});
/* ---------- 23. Rule of 55 and 72(t) ---------- */
igAdd({id:"early",grp:"retire",n:"When each account opens up early",by:"IRS rules (the Rule of 55 and 72(t) payments), mapped by many early-retirement writers",one:"59½ is not the only door. Each kind of account has its own way in before then.",
 what:"Retirement accounts charge a 10% penalty for taking money out before 59½, with exceptions. This is a map of which money you can reach at which age without the penalty.",
 fit:(c,d)=>c.ret<60&&d.era>=4,
 body:x=>{const A=x.ret,rows=[["Cash and regular investing accounts","Any age"],["What you paid into a Roth IRA yourself","Any age"],["HSA, for medical costs","Any age"],["A governmental 457(b), after you leave that job","Any age"],["Roth ladder moves","5 tax years after each move"],["72(t) payments from an IRA "+igI("sepp"),"Any age, in fixed yearly amounts"],["The 401(k) at the job you leave at 55 or later "+igI("rule55"),"55"],["Everything else","59½"]],now=A>=59.5?"Everything is open at your stop age.":A>=55?"At "+A+" the Rule of 55 can open your last job's 401(k).":"At "+A+" you need a bridge: the first five lines, or 72(t).";
  return {big:null,html:`<div class="tile small"><b>You stop at ${A} in this plan.</b> ${now}</div>`+igRows([["<b>Money</b>","<b>Opens</b>"]].concat(rows)),
   note:"72(t) locks you into the same yearly amount for 5 years or until 59½, whichever is longer, and breaking it brings the penalty back for every year. Rule of 55 depends on your plan allowing it. Check both with a tax pro before you rely on them.",links:[["Open the Roth ladder","idea","madf"],["How locked is your money?","idea","trench"]]}},
 val:x=>x.ret<55?"You stop before 55, so you need a bridge":x.ret<59.5?"The Rule of 55 may fit you":"Everything is open at your stop age"});
/* ---------- 24. Paul Merriman ---------- */
igAdd({id:"merriman",grp:"invest",n:"Two funds for life",by:"Paul Merriman",one:"A target-date fund for the base, plus a slice of small-company value stocks that shrinks as you age.",
 what:"His two-fund plan: put part of your money in an ordinary target-date fund and the rest in a small-cap value fund. The rule of thumb is your age times 1.5 as the percent in the target-date fund.",
 fit:(c,d)=>d.era>=5&&c.work!=="Retired",
 body:x=>{const age=x.v("age",Math.round(x.age/5)*5),td=Math.min(100,age*1.5),sv=100-td,I=x.inv;
  return {big:Math.round(td)+"% and "+Math.round(sv)+"%",cap:"Target-date fund and small-cap value fund at "+age+". On your "+igM(I)+" that is "+igM(I*td/100)+" and "+igM(I*sv/100)+". "+igI("scv"),
   html:igRows([["<b>Age</b>","<b>Target-date · Small value</b>"]].concat([25,35,45,55,65].map(a=>["Age "+a,Math.min(100,a*1.5)+"% · "+Math.max(0,100-a*1.5)+"%"]))),
   ins:[["age","What age?","ig_merriman",[[20,"20"],[25,"25"],[30,"30"],[35,"35"],[40,"40"],[45,"45"],[50,"50"],[55,"55"],[60,"60"],[65,"65"]],Math.round(x.age/5)*5]],
   math:["Age × 1.5 = percent in the target-date fund",age+" × 1.5 = "+Math.round(td)+"%","The rest, "+Math.round(sv)+"%, goes in small-cap value","By about 67 it is all in the target-date fund"],
   note:"Small-cap value has beaten the broad market over long stretches and trailed it for a decade at a time. Bogle, also on this list, would say own the whole market and stop there."}},
 val:x=>"At "+x.age+": "+Math.min(100,Math.round(x.age*1.5))+"% target-date fund"});
/* ---------- 25. Nassim Taleb ---------- */
igAdd({id:"taleb",grp:"invest",n:"The barbell",by:"Nassim Nicholas Taleb",one:"Keep most of your money very safe and a small part in bets that could pay off many times over. Skip the middle.",
 what:"His barbell: instead of putting everything in medium-risk investments, hold a large safe side that cannot blow up and a small side of long shots. Your worst case is known in advance.",
 fit:(c,d)=>d.era>=5,
 body:x=>{const risky=x.v("risky",0.1),T=x.inv+x.cash,r=T*risky,s=T-r;
  return {big:igM(s)+" safe, "+igM(r)+" in bets",cap:"From the "+igM(T)+" you have. The most you can lose is the "+igM(r)+". "+igI("barbell"),
   html:`<div class="cptop"><i class="c-fixed" style="width:${(1-risky)*100}%"></i><i class="c-fun" style="width:${risky*100}%"></i></div><div class="cpkey tiny muted"><span><i class="c-fixed"></i>Very safe ${igP(1-risky)}</span><span><i class="c-fun"></i>Long shots ${igP(risky)}</span></div>`,
   ins:[["risky","How much goes on the long-shot side?","barbell",[[0.05,"5%"],[0.1,"10%"],[0.15,"15%"],[0.2,"20%"]],0.1]],
   math:["You have: "+igM(T)+" (invested plus cash)","Long shots: "+igM(T)+" × "+igP(risky)+" = "+igM(r),"Very safe: "+igM(s),"Worst case: the long shots go to zero and you still have "+igM(s)],
   note:"A portfolio that is 90% in cash-like holdings gives up most of the market's long-run growth. Most teachers on this list would call that too safe for someone decades from needing the money."}},
 val:x=>"At 10% in long shots, the most you could lose is "+igM((x.inv+x.cash)*0.1)});
/* ---------- 26. Bogleheads asset location ---------- */
igAdd({id:"location",grp:"invest",n:"Which fund goes in which account",by:"The Bogleheads community (tax-efficient fund placement)",one:"The same investments can leave you with more, depending on which account holds which one.",
 what:"Asset location. Different accounts are taxed differently, so it matters where each kind of fund sits. The usual order: bonds in traditional accounts, your fastest growers in Roth, and broad stock index funds in a regular account.",
 fit:(c,d)=>d.era>=5&&(c.invs||[]).length>=2,
 body:x=>{const kind=k=>/roth/i.test(k)?"roth":/401|403|ira|retirement|pension|tsp/i.test(k)?"trad":/hsa/i.test(k)?"hsa":"tax",say={trad:"Bonds first, then stocks. Everything here is taxed as income on the way out, so slow growers fit.",roth:"Your fastest growers. Nothing here is taxed again.",hsa:"Stocks, if you can leave it alone. Treat it like a Roth for health costs.",tax:"Broad stock index funds. They throw off little taxable income."},L=(x.c.invs||[]).filter(r=>(+r.amt||0)>0);
  return {big:null,html:L.length?`<div class="stack" style="gap:6px">${L.map(r=>`<div class="tile"><div class="row between"><b>${esc(r.k)}</b><span class="muted small">${igM(r.amt)}</span></div><div class="small">${say[kind(r.k)]}</div></div>`).join("")}</div>`:`<div class="tile small">Add your investing accounts in My Money and this fills in, one line for each account.</div>`+igRows([["Traditional 401(k) or IRA","Bonds first"],["Roth","Fastest growers"],["Regular account","Broad stock index funds"]]),
   note:"The game tells the account type from its name. Decide your overall mix of stocks and bonds first, then use this to place them. If all your money is in one kind of account, this does not apply yet. "+igI("ig_location"),links:[["Open My Money","tab","money"]]}},
 val:x=>(x.c.invs||[]).length+" investing accounts to place"});
/* ---------- 27. Cal Newport ---------- */
const IG_CAP=[["People pay extra for a skill I have.","Rare"],["It took me years to get good at what I do.","Rare"],["Few people near me could step into my job next month.","Rare"],["I am clearly better at my work than I was two years ago.","Growing"],["I practice the hard parts on purpose, not only the parts I like.","Growing"],["I get feedback from people who are better than me.","Growing"],["I have a say in what I work on.","Used"],["I have traded my skills for better pay, hours or freedom at least once.","Used"]];
igAdd({id:"newport",grp:"earn",n:"Career capital",by:"Cal Newport, So Good They Can't Ignore You",one:"Rare and valuable skills are a kind of savings. Build them, then spend them on a better working life.",
 what:"His argument: great jobs come from having skills that are rare and valuable, which he calls career capital. You build it by deliberate practice, then trade it for pay, control and work that matters to you.",
 fit:(c,d)=>c.work!=="Retired"&&d.era<=7,
 body:x=>{const q={qs:IG_CAP,opts:IG_Q3},z=igQz(x,q),tot=z.all?z.done&&Object.values(z.sc).reduce((a,b)=>a+b,0):0,low=z.all?Object.keys(z.sc).sort((a,b)=>z.sc[a]/(a==="Used"?4:6)-z.sc[b]/(b==="Used"?4:6))[0]:null;
  return {big:z.all?"Career capital: "+Math.max(1,tot)+" of 16":null,cap:z.all?(low==="Rare"?"Next: pick one skill that few people have and go deep on it.":low==="Growing"?"Next: put practice on the calendar for the part of your work you find hardest.":"Next: you have capital you are not spending. Ask for something: pay, hours or the project you want.")+" "+igI("ig_newport"):"",
   html:z.all?igRows([["Rare",z.sc.Rare+" of 6",low==="Rare"],["Growing",z.sc.Growing+" of 6",low==="Growing"],["Used",z.sc.Used+" of 4",low==="Used"]]):`<div class="small">Eight taps about your skills.</div>`,quiz:q,
   math:z.all?["Each answer scores 0, 1 or 2","Rare: 3 statements. Growing: 3. Used: 2","Total: "+tot+" of 16"]:null,note:"The statements are the game's own. The stat grows as you answer higher over time, so come back to it."}}});
/* ---------- 28. Alex Hormozi ---------- */
igAdd({id:"hormozi",grp:"earn",n:"The value equation",by:"Alex Hormozi, $100M Offers",one:"What you can charge depends on four things. Raise two and shrink two.",
 what:"His value equation: an offer is worth more when the result is bigger and more certain, and when it takes less time and less effort from the buyer. It is a way to work on your price if you sell your own work.",
 fit:(c,d)=>c.work!=="Retired"&&(/self|free|own|gig|side/i.test((c.incKinds||[]).join(" ")+c.work)||(c.incs||[]).length>1),
 body:x=>{const a=x.v("dream",3),b=x.v("sure",3),t=x.v("time",3),e=x.v("effort",3),v=(a*b)/(t*e),o=[[1,"1"],[2,"2"],[3,"3"],[4,"4"],[5,"5"]],lever=[["How big the result is",a,1],["How sure it is",b,1],["How long it takes",t,-1],["How much work it is for them",e,-1]].map(r=>({n:r[0],gain:r[2]>0?(r[1]<5?(r[1]+1)/r[1]:1):(r[1]>1?r[1]/(r[1]-1):1)})).sort((p,q)=>q.gain-p.gain)[0];
  return {big:"Value score: "+(Math.round(v*10)/10),cap:"The biggest lift from one step: "+lever.n.toLowerCase()+", worth "+Math.round((lever.gain-1)*100)+"% more. "+igI("ig_hormozi"),
   ins:[["dream","How big is the result your customer wants? (5 is life-changing)","ig_hormozi",o,3],["sure","How sure are they that they will get it? (5 is certain)","ig_hormozi",o,3],["time","How long until they see it? (5 is a long time)","ig_hormozi",o,3],["effort","How much work is it for them? (5 is a lot)","ig_hormozi",o,3]],
   math:["Value = (result × how sure) ÷ (time × effort)","("+a+" × "+b+") ÷ ("+t+" × "+e+") = "+(Math.round(v*10)/10),"A score of 1 is average. Above 1, you have room to charge more"],
   note:"The 1 to 5 scales are the game's way to make it tappable. It is a thinking tool, not a price."}},
 val:x=>"Four taps to see where your offer is weakest"});
/* ---------- 29. Naval Ravikant ---------- */
const IG_NAVAL=[["skill","Something I know that cannot be taught in a class","Specific knowledge. It feels like play to you and looks like work to others."],["name","My name is on my work","Accountability. People can find you and credit you."],["code","Code or tools that work while I sleep","Leverage that needs no one's permission."],["media","Writing, video or audio that people find without me","Leverage that needs no one's permission."],["cap","Money that earns money","Capital. Your investments count."],["labor","People who work with or for me","The oldest kind of leverage, and the hardest to manage."]];
igAdd({id:"naval",grp:"earn",n:"Specific knowledge and leverage",by:"Naval Ravikant (the How to Get Rich thread and The Almanack of Naval Ravikant)",one:"You do not get rich renting out your time. Pair something only you know with something that multiplies it.",
 what:"His earning tree: start with specific knowledge, add accountability, then apply leverage. Leverage comes in four kinds: people, money, code and media. The last two need nobody's permission.",
 fit:(c,d)=>c.work!=="Retired"&&d.era>=2,
 body:x=>{const ck=x.o.ck||{},n=IG_NAVAL.filter(k=>ck[k[0]]).length,cap=x.inv*R/12;
  return {big:Math.max(1,n)+" of 6 branches",cap:(n?"":"Tap the ones you already have. ")+"Your money already earns about "+igM(cap)+" a month for you, which is the capital branch. "+igI("ig_naval"),checks:IG_NAVAL.map(k=>[k[0],k[1],k[2]]),
   math:["Capital branch: "+igM(x.inv)+" invested × 7% a year ÷ 12 = "+igM(cap)+" a month","Each branch you tap counts as 1 of 6"],note:"The branch names are his ideas in the game's own words."}},
 val:x=>"Your money earns about "+igM(x.inv*R/12)+" a month for you"});
/* ---------- 30. Codie Sanchez ---------- */
igAdd({id:"sanchez",grp:"earn",n:"Buying a boring business",by:"Codie Sanchez, Contrarian Thinking and Main Street Millionaire",one:"Laundromats, car washes and landscaping firms already make money. Some people buy one instead of starting from zero.",
 what:"Her advanced earning path: buy a small, dull, profitable business from an owner who wants to retire, often with the seller lending part of the price. This is a quick check on whether a deal's numbers hold up.",
 fit:(c,d)=>d.era>=6&&c.work!=="Retired",
 body:x=>{const profit=x.v("profit",150000),mult=x.v("mult",3),down=x.v("down",0.1),rate=0.1,yrs=10,price=profit*mult,loan=price*(1-down),pay=loan*(rate/12)/(1-Math.pow(1+rate/12,-yrs*12))*12,left=profit-pay,mgr=x.v("mgr",60000);
  return {big:igM(left)+" a year after the loan",cap:"A business making "+igM(profit)+" a year, bought for "+igM(price)+" with "+igM(price*down)+" down. Hire a manager for "+igM(mgr)+" and "+igM(left-mgr)+" is left. "+igI("sde"),
   ins:[["profit","What does it make for its owner in a year?","sde",[[75000,"$75k"],[150000,"$150k"],[250000,"$250k"],[400000,"$400k"]],150000],["mult","How many years of profit is the price?","sde",[[2,"2"],[3,"3"],[4,"4"]],3],["down","How much do you put down?","ig_sanchez",[[0.1,"10%"],[0.2,"20%"],[0.3,"30%"]],0.1],["mgr","What would a manager cost?","ig_sanchez",[[0,"I run it myself"],[60000,"$60k"],[90000,"$90k"]],60000]],
   math:["Price: "+igM(profit)+" × "+mult+" = "+igM(price),"Down: "+igP(down)+" = "+igM(price*down)+". Borrowed: "+igM(loan),"Loan at 10% over 10 years: "+igM(pay)+" a year","Left: "+igM(profit)+" − "+igM(pay)+" = "+igM(left),"After a manager: "+igM(left-mgr)],
   note:`<span class="fkhot">Advanced, and risky.</span> You can lose the down payment and still owe the loan. The profit a seller reports is often rosier than what a new owner sees. Get an accountant and a lawyer before any offer.`}},
 val:x=>"A $150k-a-year business at 3 times profit costs $450,000"});
/* ---------- 31. Chris Guillebeau ---------- */
const IG_HUSTLE=[["I can describe what I would sell in one sentence.",""],["I already know one person who would pay for it.",""],["I could start it for $100 or less.",""],["I could make the first sale within a month.",""],["It uses something I already know how to do.",""],["I could do it in the hours I actually have.",""]];
igAdd({id:"guillebeau",grp:"earn",n:"Side hustle idea checker",by:"Chris Guillebeau, The $100 Startup",one:"A good first side business is something you already know, that someone will pay for, that costs almost nothing to try.",
 what:"His test for a side business: it sits where a skill you have meets something people will pay for, and you can try it fast and cheap. Six taps check one idea.",
 fit:(c,d)=>c.work!=="Retired"&&d.era<=5,
 body:x=>{const q={qs:IG_HUSTLE.map(r=>[r[0],"s"]),opts:[[0,"No"],[1,"Maybe"],[2,"Yes"]]},z=igQz(x,q),s=z.sc.s||0,extra=x.v("extra",500),y0=x.d.yrs,y1=yearsTo(x.inv,x.d.save+extra*12,x.d.fi);
  return {big:z.all?(s>=10?"Worth trying this month":s>=6?"Close. Fix the weakest answer first":"Not yet. Try another idea"):igM(extra)+" a month extra",cap:z.all?"It scored "+s+" of 12. An extra "+igM(extra)+" a month would move your freedom date from "+igYr(y0)+" to "+igYr(y1)+". "+igI("ig_guillebeau"):"would move your freedom date from "+igYr(y0)+" to "+igYr(y1)+". Check an idea below. "+igI("ig_guillebeau"),quiz:q,
   ins:[["extra","What could it bring in a month?","ig_guillebeau",[[200,"$200"],[500,"$500"],[1000,"$1,000"],[2000,"$2,000"]],500]],
   math:["Kept today: "+igM(x.d.save)+" a year. With the extra: "+igM(x.d.save+extra*12),"Years to your freedom number of "+igM(x.d.fi)+": "+igYr(y1),z.all?"Idea score: six answers, 0 to 2 each = "+s+" of 12":null],note:"The six questions are the game's own."}},
 val:x=>"See what $500 a month extra does to your date"});
/* ---------- 32. Arthur Brooks ---------- */
igAdd({id:"brooks",grp:"earn",n:"The second curve",by:"Arthur C. Brooks, From Strength to Strength",one:"The skills that made you good early fade sooner than you think. A second kind of skill keeps rising. Plan to switch.",
 what:"He describes two curves. Quick problem-solving peaks early, often in your 30s, and then declines. The ability to teach, connect ideas and guide others keeps growing into your 60s and beyond. A happy later career moves from the first curve to the second.",
 fit:(c,d)=>c.age>=38&&c.work!=="Retired",
 body:x=>{const age=x.age,stage=age<35?"On the first curve. Build skill fast and save the gains.":age<50?"Around the crossover. Start doing more teaching, mentoring and connecting.":"On the second curve. Your edge is judgment and teaching, so lean into it.",ans=x.o.move;
  return {big:age<35?"First curve":age<50?"The crossover":"Second curve",cap:"At "+age+": "+stage+" "+igI("ig_brooks"),
   html:igRows([["Quick problem-solving","Peaks in your 30s, often"],["Teaching and judgment","Still rising in your 60s"],["Years of work left in your plan",Math.max(0,x.ret-age)+""]]),
   ins:[["move","Which second-curve move fits you?","ig_brooks",[["teach","Teach or train"],["mentor","Mentor"],["advise","Advise or consult"],["write","Write or speak"],["none","None yet"]],null]],
   after:ans&&ans!=="none"?`<div class="tile small">One small step: do it once this quarter, unpaid if you have to, and see how it feels.</div>`:"",math:["Your age: "+age,"Under 35: first curve. 35 to 49: the crossover. 50 and up: second curve","Stop age in your plan: "+x.ret],note:"The ages are typical, and they vary a lot by field."}},
 val:x=>x.age<35?"You are on the first curve":x.age<50?"You are near the crossover":"You are on the second curve"});
/* ---------- 33. Tim Ferriss, mini-retirements ---------- */
igAdd({id:"minir",grp:"earn",n:"Mini-retirements",by:"Tim Ferriss, The 4-Hour Workweek",one:"Take some of your retirement in pieces along the way, instead of saving all of it for the end.",
 what:"His idea: spread retirement through your life as breaks of one to six months. This prices one out: what it costs, what it does to your freedom date, and how long you would save for it.",
 fit:(c,d)=>c.work!=="Retired"&&d.era>=3,
 body:x=>{const mo=x.v("mo",3),every=x.v("every",5),spend=x.v("cost",1),m=x.c.spend*spend,cost=mo*(m+0)+0,lost=mo*x.take,save=x.kept>0?Math.ceil(cost/x.kept):null,n=Math.max(0,Math.floor((x.ret-x.age)/every)),y0=x.d.yrs,y1=yearsTo(Math.max(0,x.inv),x.d.save-(cost+lost-mo*x.c.spend)/every,x.d.fi);
  return {big:igM(cost)+" each",cap:mo+" months off, living on "+igM(m)+" a month. "+(save?"That is about "+save+" months of what you keep now. ":"")+"Doing it every "+every+" years moves your freedom date from "+igYr(y0)+" to "+igYr(y1)+". "+igI("ig_minir"),
   ins:[["mo","How long is each break?","ig_minir",[[1,"1 month"],[3,"3 months"],[6,"6 months"]],3],["every","How often?","ig_minir",[[3,"Every 3 years"],[5,"Every 5 years"],[10,"Every 10 years"]],5],["cost","What would life cost during a break?","ig_minir",[[0.7,"Less than now"],[1,"The same"],[1.5,"Half again as much"]],1]],
   math:["Cost of the break: "+mo+" × "+igM(m)+" = "+igM(cost),"Pay you would not earn: "+mo+" × "+igM(x.take)+" = "+igM(lost),"Spread over "+every+" years, that takes "+igM((cost+lost-mo*x.c.spend)/every)+" a year off what you keep","Breaks before your stop age: about "+n],
   note:"This assumes your job is there when you come back. The trade is a later freedom date for time while you are younger."}},
 val:x=>"Three months off would cost about "+igM(x.c.spend*3)});
Object.assign(GLOSS,{ssclaim:["Claiming age","The age you start your Social Security checks. Any age from 62 to 70. Earlier means smaller checks for more years. Later means bigger checks for fewer years."],incstyle:["Retirement income style","Whether you would rather have guaranteed income for your basics or stay invested and flexible."],vpw:["Variable percentage withdrawal","Taking a set percent of your current balance each year, with the percent rising as you get older."],wongame:["Winning the game","Having enough saved to cover your needs for life. After that, big risks can only hurt you."],sepp:["72(t) payments","A rule that lets you take money from an IRA before 59½ with no penalty, if you take the same calculated amount every year for at least 5 years or until 59½, whichever is longer."],rule55:["Rule of 55","If you leave a job in the year you turn 55 or later, you can take money from that job's 401(k) with no early penalty."],scv:["Small-cap value","Shares of smaller companies that are cheap next to what they earn or own. Riskier than the whole market, with a history of higher long-run returns."],barbell:["Barbell","Holding mostly very safe investments plus a small amount of very risky ones, and little in between."],sde:["Owner's profit","What a small business leaves for its owner in a year, before the owner's own pay. Sellers call it seller's discretionary earnings."]});
