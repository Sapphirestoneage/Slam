// ---------- what's built ----------
{const R=btRows(),c=btCount(R);
 chk('every built or partly row passes its probe against the loaded game',c.x===0,R.filter(r=>r.st==='x').map(r=>r.n).join(' | '));
 chk('the three counts add up and none is empty',c.b+c.p+c.n===WB.length&&c.b>20&&c.p>3&&c.n>10,JSON.stringify(c));
 chk('every built row that opens a screen names a real action',R.filter(r=>r.a).every(r=>typeof ACT[r.a]==='function'),R.filter(r=>r.a&&typeof ACT[r.a]!=='function').map(r=>r.a).join());
 chk('every not-yet and partly row says what is missing',R.filter(r=>r.st!=='b').every(r=>r.note&&r.note.length>8),R.filter(r=>r.st!=='b'&&!(r.note&&r.note.length>8)).map(r=>r.n).join());
 chk('a probe that fails shows as missing, not built',(()=>{const keep=ACT.quick;delete ACT.quick;const x=btRows().find(r=>r.n.startsWith('Quick math'));ACT.quick=keep;return x.st==='x'&&x.a===null&&x.note.includes('Missing')})());
 chk('the menu has it',MENU.some(m=>m[1]==='built'));
 X('built');chk('the sheet: counts, groups, pills',W.kind==='built'&&ov().includes('Getting your numbers in')&&ov().includes('Built ✓')&&ov().includes('Not yet')&&ov().includes('Partly')&&ov().includes('Copy this list')&&clean(ov()),junk(ov()));
 X('btf','n');chk('filter to not yet',W.f==='n'&&!ov().includes('Built ✓')&&ov().includes('Show everything')&&ov().includes('Guilds'));
 X('btf','all');const tx=btText();chk('copies as plain text with the counts',tx.includes('Built '+c.b+', partly '+c.p+', not yet '+c.n)&&tx.includes('[Not yet] Guilds')&&tx.includes('[Built] Two moves side by side'),tx.slice(0,200));
 X('btcopy');chk('copy confirms',W.copied);X('close')}
