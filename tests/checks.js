// Release checks for Crew Scheduler. Run before every release:  node tests/checks.js
// Needs Playwright (npm i playwright, or a workspace that has it). Outside services are blocked,
// so this checks the app's own logic: matching rules, the schedule, History, backups and calendar reading.
const {chromium}=require('playwright');
const path=require('path');
const APP='file://'+path.resolve(__dirname,'..','index.html');
let fails=0,passes=0;
const ok=(cond,name,extra)=>{if(cond)passes++;else{fails++;console.log('FAIL: '+name+(extra!==undefined?'  → '+JSON.stringify(extra):''))}};
const pad=n=>String(n).padStart(2,'0');
const key=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const compact=d=>key(d).replace(/-/g,'');
const plus=n=>{const d=new Date();d.setDate(d.getDate()+n);return d};

(async()=>{
  const b=await chromium.launch();
  const open=async(opt={})=>{const c=await b.newContext({viewport:{width:390,height:844},...opt});await c.route(/^https?:/,r=>r.abort());const p=await c.newPage();p.errs=[];p.on('pageerror',e=>p.errs.push(e.message));await p.goto(APP);return p};
  const closeModalIfAny=async p=>{if(await p.locator('.modalbg').count())await p.locator('.modalbg [data-r=c]').first().click()};

  // ---------- 1. sample day: build, schedule text, no script errors ----------
  let p=await open();
  await closeModalIfAny(p);
  await p.click('[data-act=sample]');
  await p.click('#step3 [data-act=solve]');await p.waitForSelector('.stats');
  let r=await p.evaluate(()=>({txt:scheduleText(),jobs:tonight.jobs.length,asg:Object.keys(tonight.assign).length,good:!!document.querySelector('#step3 .good'),bar:document.querySelector('#actionBar').innerText,pinned:isDayKey(tonight.day)}));
  ok(r.asg===r.jobs&&r.good,'sample: every job gets a crew',r);
  ok(/Copy schedule/.test(r.bar),'sample: bottom bar offers Copy schedule');
  ok(r.pinned,'building crews pins the day being scheduled');
  ok(!/NOT SCHEDULED/.test(r.txt),'sample: nothing listed as not scheduled');

  // ---------- 2. a job without a map location is never silently left off ----------
  r=await p.evaluate(()=>{tonight.jobs.push({id:"zz",name:"NoLoc Job",time:"7:00a",address:"somewhere",lat:null,lng:null,crew:2,trucks:1,requested:[],on:true});solve();render();
    return {txt:scheduleText(),bad:[...document.querySelectorAll('#step3 .bad')].map(e=>e.innerText).join('|'),good:[...document.querySelectorAll('#step3 .good')].map(e=>e.innerText).join('|')}});
  ok(/NOT SCHEDULED YET[\s\S]*NoLoc Job/.test(r.txt),'no-location job is listed in the copied schedule');
  ok(/NoLoc Job/.test(r.bad),'no-location job is flagged in red on the crews');
  ok(!/Every truck has a lead/.test(r.good),'no all-good message while a job is skipped',r.good);
  await p.evaluate(()=>{tonight.jobs=tonight.jobs.filter(j=>j.id!=="zz");solve();render()});

  // ---------- 3. unticking a job after building removes it ----------
  const firstName=await p.evaluate(()=>tonight.jobs[0].name);
  await p.evaluate(()=>{todayOpen[1]=true;render()});
  await p.locator('[data-act=jobOn]').first().uncheck();
  r=await p.evaluate(n=>({inText:scheduleText().includes(n),hasAsg:!!tonight.assign[tonight.jobs[0].id]}),firstName);
  ok(!r.inText&&!r.hasAsg,'unticked job leaves the crews and the schedule',r);
  await p.locator('[data-act=jobOn]').first().check();
  r=await p.evaluate(n=>scheduleText(),firstName);
  ok(new RegExp('NOT SCHEDULED YET[\\s\\S]*'+firstName.replace(/[()\/#]/g,'.')).test(r),'re-ticked job is listed as not scheduled until Rebuild');

  // ---------- 4. delete a job, then Undo ----------
  const before=await p.evaluate(()=>tonight.jobs.map(j=>j.id).join());
  await p.locator('[data-act=delJob]').nth(1).click();
  ok(await p.evaluate(()=>tonight.jobs.length)===6,'× removes the job');
  await p.locator('.toast button',{hasText:'Undo'}).click();
  ok(await p.evaluate(()=>tonight.jobs.map(j=>j.id).join())===before,'Undo puts the job back in place');
  ok(p.errs.length===0,'no script errors (sample flow)',p.errs);

  // ---------- 5. a failed save is not silent ----------
  p=await open();await closeModalIfAny(p);await p.click('[data-act=sample]');
  r=await p.evaluate(()=>{
    geoCache["v2|x"]=[{lat:1,lng:1,label:"y".repeat(5000)}];lsSet("crew_geo",geoCache);
    let chunk="x".repeat(1024*1024),i=0;try{for(;;i++)localStorage.setItem("fill"+i,chunk)}catch(e){}
    chunk="x".repeat(512);let k=0;try{for(;;k++)localStorage.setItem("fillk"+k,chunk)}catch(e){}
    roster.workers.push({id:"new1",name:"Small Add "+"z".repeat(1500),lat:35,lng:-79,active:true});save("roster");
    const a={failed:saveFailed,stored:JSON.parse(localStorage.getItem("crew_roster")).workers.length,mem:roster.workers.length,geoGone:!localStorage.getItem("crew_geo")};
    for(let n=0;n<60;n++)roster.workers.push({id:"n"+n,name:"Person "+n+" "+"y".repeat(400),lat:35,lng:-79,active:true});save("roster");
    return {a,failed:saveFailed,stored:JSON.parse(localStorage.getItem("crew_roster")).workers.length,mem:roster.workers.length,status:document.querySelector('#saveState').textContent}});
  ok(r.a.stored===r.a.mem&&!r.a.failed&&r.a.geoGone,'full storage: caches are cleared and the save goes through',r.a);
  ok(r.failed&&/NOT SAVED/.test(r.status),'save that still fails shows NOT SAVED',r);
  await p.waitForTimeout(50);
  ok(await p.locator('#app .bad',{hasText:'NOT saved'}).count()>0,'red not-saved banner is on screen');

  // ---------- 6. backup reminder ----------
  p=await open();await closeModalIfAny(p);
  r=await p.evaluate(()=>{roster.workers=["Ann A","Bob B","Cy C","Di D"].map((n,i)=>({id:"r"+i,name:n,lat:35+i/50,lng:-79,lead:i<2,active:true}));save("roster");render();
    const never=!!backupDue();markBackedUp();const fresh=backupDue();
    const b=backupInfo();b.at=new Date(Date.now()-9*864e5).toISOString();lsSet("crew_backup",b);render();
    return {never,fresh,old:backupDue(),banner:document.querySelector('#app').innerText.includes('Last backup was 9 days ago')}});
  ok(r.never&&!r.fresh&&r.old&&r.banner,'backup reminder: never → shown, fresh → hidden, 9 days → shown',r);
  await p.click('[data-act=backupLater]');
  ok(!(await p.evaluate(()=>backupDue())),'Later hides the reminder');
  r=await p.evaluate(()=>{loadSample();return backupDue()});
  ok(!r,'no reminder for sample data');

  // ---------- 7. the day being scheduled ----------
  r=await p.evaluate(()=>{
    const RealDate=Date;const at=h=>{const n=new RealDate();n.setHours(h,0,0,0);const t=n.getTime();window.Date=class extends RealDate{constructor(...a){if(a.length)super(...a);else super(t)}static now(){return t}}};
    tonight={jobs:[],assign:null,locks:{},off:[]};normalize();
    at(10);const morning=scheduleDay()===dayKey(new Date());
    at(21);const evening=scheduleDay()===tomorrowKey();
    pinDay();const pinned=tonight.day;
    window.Date=RealDate;return {morning,evening,pinnedIsDay:isDayKey(pinned)}});
  ok(r.morning&&r.evening&&r.pinnedIsDay,'Scheduling for: today in the morning, tomorrow from 3 p.m.',r);
  await p.evaluate(()=>{loadSample();const y=new Date();y.setDate(y.getDate()-1);tonight.day=dayKey(y);solve();render()});
  ok(await p.locator('#step1 .bad',{hasText:'already passed'}).count()===1,'past day shows a red warning in step 1');
  await p.locator('#actionBar [data-act=copy]').click();
  ok(await p.locator('.modal',{hasText:'already passed'}).count()===1,'Copy schedule asks before using a past date');
  await p.locator('.modal [data-r=a]').click();await p.waitForTimeout(150);
  if(await p.locator('.modalbg').count())await p.locator('.modalbg button').last().click();   // "select all and copy" box when the test browser has no clipboard
  r=await p.evaluate(()=>({day:scheduleDay(),def:defaultDay(),past:dayIsPast()}));
  ok(r.day===r.def&&!r.past,'“Change to …” moves the schedule to the current day',r);

  // ---------- 8. who's off carries over only if you say so ----------
  r=await p.evaluate(async()=>{tonight.off=[roster.workers[0].id];tonight.offAt=new Date(Date.now()-20*36e5).toISOString();
    const pr=checkOffList();await new Promise(r=>setTimeout(r,30));const asked=!!document.querySelector('.modal');document.querySelector('.modal [data-r=a]').click();await pr;
    const cleared=tonight.off.length===0;
    tonight.off=[roster.workers[0].id];tonight.offAt=new Date().toISOString();await checkOffList();
    return {asked,cleared,recentKept:tonight.off.length===1&&!document.querySelector('.modal')}});
  ok(r.asked&&r.cleared&&r.recentKept,'old off list is asked about; a fresh one is kept quietly',r);

  // ---------- 9. report times ----------
  r=await p.evaluate(()=>["7:00","0700","7","15:30","7:00 AM","630a","12:30p","7 a.m.","noonish","25:00"].map(t=>[t,parseClock(t),normTime(t)]));
  const T=Object.fromEntries(r.map(x=>[x[0],x]));
  ok(T["7:00"][1]===420&&T["0700"][1]===420&&T["7"][1]===420&&T["15:30"][1]===930&&T["7:00 AM"][1]===420&&T["630a"][1]===390&&T["12:30p"][1]===750&&T["7 a.m."][1]===420,'report times are read with or without a/p',r);
  ok(T["7:00"][2]==="7:00a"&&T["15:30"][2]==="3:30p"&&T["noonish"][1]===null&&T["25:00"][1]===null&&T["noonish"][2]==="noonish",'times are tidied; unreadable ones are left alone',r);
  r=await p.evaluate(()=>{const j=tonight.jobs[0];j.time="early";return jobIssues(j,tonight.assign[j.id]||[]).some(x=>/report time/.test(x[1]))});
  ok(r,'unreadable report time is flagged on the job');

  // ---------- 10. calendar: multi-day and repeating events ----------
  const mon=plus(3),ics=`BEGIN:VCALENDAR
X-WR-CALNAME:Jobs
BEGIN:VEVENT
UID:multi
SUMMARY:7a-Duke Energy/Jake M-Pittsboro\\, NC
DTSTART;VALUE=DATE:${compact(mon)}
DTEND;VALUE=DATE:${compact(plus(8))}
END:VEVENT
BEGIN:VEVENT
UID:daily
SUMMARY:630a-Lee Electric/Austin Woody-Aberdeen\\, NC
DTSTART;TZID=America/New_York:${compact(plus(1))}T063000
DTEND;TZID=America/New_York:${compact(plus(1))}T150000
RRULE:FREQ=DAILY;COUNT=5
EXDATE;TZID=America/New_York:${compact(plus(2))}T063000
END:VEVENT
BEGIN:VEVENT
UID:daily
RECURRENCE-ID;TZID=America/New_York:${compact(plus(4))}T063000
SUMMARY:9a-Lee Electric/Austin Woody-Aberdeen\\, NC
DTSTART;TZID=America/New_York:${compact(plus(4))}T090000
DTEND;TZID=America/New_York:${compact(plus(4))}T150000
END:VEVENT
BEGIN:VEVENT
UID:weekly
SUMMARY:7a-NCDOT/Crew #1-Laurinburg\\, NC
DTSTART;TZID=America/New_York:${compact(plus(-28))}T070000
DTEND;TZID=America/New_York:${compact(plus(-28))}T160000
RRULE:FREQ=WEEKLY;INTERVAL=2
END:VEVENT
BEGIN:VEVENT
UID:night
SUMMARY:10p-Night Paving/Sam-Sanford\\, NC
DTSTART;TZID=America/New_York:${compact(plus(1))}T220000
DTEND;TZID=America/New_York:${compact(plus(2))}T040000
END:VEVENT
BEGIN:VEVENT
UID:plain
SUMMARY:7a-One Day/Pat-Raeford\\, NC
DTSTART;TZID=America/New_York:${compact(plus(1))}T070000
DTEND;TZID=America/New_York:${compact(plus(1))}T150000
END:VEVENT
END:VCALENDAR`;
  r=await p.evaluate(t=>{const ev=parseICS(t);const by={};ev.forEach(e=>{(by[e.title.split("/")[0]]=by[e.title.split("/")[0]]||[]).push(e.day+(e.multi?" "+e.multi:""))});return by},ics);
  const daysOf=k=>(r[k]||[]).map(x=>x.slice(0,10));
  ok(JSON.stringify(daysOf('7a-Duke Energy'))===JSON.stringify([3,4,5,6,7].map(n=>key(plus(n)))),'multi-day job appears on each of its 5 days',r['7a-Duke Energy']);
  ok(/day 2 of 5/.test((r['7a-Duke Energy']||[])[1]||''),'multi-day job is marked “day 2 of 5”');
  ok(JSON.stringify(daysOf('630a-Lee Electric'))===JSON.stringify([1,3,5].map(n=>key(plus(n)))),'daily repeat ×5: skipped day and moved day are left out of the series',r['630a-Lee Electric']);
  ok(JSON.stringify(daysOf('9a-Lee Electric'))===JSON.stringify([key(plus(4))]),'the moved day comes from its own event');
  ok(daysOf('7a-NCDOT').includes(key(plus(0)))&&daysOf('7a-NCDOT').includes(key(plus(14)))&&!daysOf('7a-NCDOT').includes(key(plus(7))),'every-2-weeks repeat lands on the right weeks',r['7a-NCDOT']);
  ok(daysOf('10p-Night Paving').length===1&&daysOf('7a-One Day').length===1,'a one-day job (even past midnight) stays one day');
  r=await p.evaluate(()=>{const mk=(rule,start)=>icsDays({start,rrule:rule,exdates:[]}).map(d=>d.day);const n=new Date();const y=n.getFullYear(),m=n.getMonth();
    const first=`${y}${String(m+1).padStart(2,"0")}01`;
    const mo=mk("FREQ=MONTHLY;BYDAY=2TU",first);const d=new Date(mo[mo.length-1]+"T12:00");
    const wk=mk("FREQ=WEEKLY;BYDAY=MO,WE,FR;UNTIL="+dayKey(new Date(y,m,n.getDate()+10)).replace(/-/g,"")+"T235959Z",first);
    return {moOk:mo.length>=3&&d.getDay()===2&&d.getDate()>=8&&d.getDate()<=14,wkOk:wk.length>0&&wk.every(k=>[1,3,5].includes(new Date(k+"T12:00").getDay()))&&wk[wk.length-1]<=dayKey(new Date(y,m,n.getDate()+10))}});
  ok(r.moOk&&r.wkOk,'monthly “2nd Tuesday” and weekly Mon/Wed/Fri-until repeats',r);

  // ---------- 11. Delete everything ----------
  await p.evaluate(()=>{placeSave("412 Oak St, Raeford, NC",35,-79,"x");localStorage.setItem("crew_route",'{"key":"abc"}');localStorage.setItem("crew_ai",'{"key":"k"}');localStorage.setItem("crew_lastimport",'{"raw":"secret"}');geoCache["v2|x"]=[{lat:1,lng:1,label:"12 Home St"}];lsSet("crew_geo",geoCache);tab="settings";render()});
  await p.click('[data-act=wipe]');await p.click('.modal [data-r=o]');await p.waitForTimeout(300);
  r=await p.evaluate(()=>({keys:Object.keys(localStorage),places:Object.keys(places).length,log:JSON.parse(localStorage.getItem("crew_log")||"[]").length,workers:roster.workers.length}));
  ok(!r.keys.includes("crew_places")&&!r.keys.includes("crew_geo")&&!r.keys.includes("crew_lastimport")&&r.places===0&&r.log<=2&&r.workers===0,'Delete everything clears spots, lookups, last import and the log',r);
  ok(r.keys.includes("crew_route")&&r.keys.includes("crew_ai"),'Delete everything keeps the keys');

  // ---------- 12. matching rules on 25 random days ----------
  r=await p.evaluate(()=>{
    const res={conflict:0,avoid:0,dup:0,overLimit:0,overCap:0,offUsed:0,ms:0};
    for(let n0=0;n0<25;n0++){const rnd=Math.random;const n=12+Math.floor(rnd()*30);
      roster.workers=[...Array(n)].map((_,i)=>({id:"w"+i,name:"W"+i+" Last"+i,lat:35+rnd(),lng:-79.5+rnd(),lead:rnd()<0.35,active:true,maxMiles:rnd()<0.2?25:0}));
      roster.conflicts=[...Array(6)].map(()=>["w"+Math.floor(rnd()*n),"w"+Math.floor(rnd()*n)]).filter(p=>p[0]!==p[1]);roster.prefers=[];
      roster.settings.maxLeadMiles=rnd()<0.5?40:0;roster.settings.extraTruck=rnd()<0.5;
      const J=3+Math.floor(rnd()*8);
      tonight.jobs=[...Array(J)].map((_,i)=>({id:"j"+i,name:"Job"+i,time:"7:00a",lat:35+rnd(),lng:-79.5+rnd(),crew:1+Math.floor(rnd()*4),trucks:1+Math.floor(rnd()*2),requested:[],avoid:rnd()<0.3?["w"+Math.floor(rnd()*n)]:[],on:true}));
      tonight.off=["w0"];tonight.locks={};tonight.drivers={};tonight.assign=null;
      const t0=performance.now();solveInner();res.ms=Math.max(res.ms,Math.round(performance.now()-t0));
      const cs=conflictSet();const all=Object.values(tonight.assign).flat();if(new Set(all).size!==all.length)res.dup++;if(all.includes("w0"))res.offUsed++;
      for(const j of tonight.jobs){const c=tonight.assign[j.id];if(c.length>jTrucks(j)*jPer(j))res.overCap++;
        for(let a=0;a<c.length;a++)for(let d=a+1;d<c.length;d++)if(cs.has(pairKey(c[a],c[d])))res.conflict++;
        if(c.some(x=>(j.avoid||[]).includes(x)))res.avoid++;
        for(const t of trucksFor(j,c).trucks){if(t.lead){const L=leadLimit(t.lead);if(L&&travel(t.lead,j).mi>L)res.overLimit++}}}
    }return res});
  ok(r.conflict+r.avoid+r.dup+r.overLimit+r.overCap+r.offUsed===0,'matching rules hold on 25 random days',r);
  ok(r.ms<3000,'building crews stays fast',r.ms);
  ok(p.errs.length===0,'no script errors (rules flow)',p.errs);

  // ---------- 13. backup → restore round trip, and History ----------
  p=await open();await closeModalIfAny(p);await p.click('[data-act=sample]');
  const bak=await p.evaluate(async()=>{localStorage.setItem("crew_ai",'{"key":"SECRETKEY1"}');localStorage.setItem("crew_route",'{"key":"SECRETKEY2"}');localStorage.setItem("crew_jobtext",'{"geminiKey":"SECRETKEY3"}');solve();await saveDayToHistory(true);roster.workers[0].phone="910-555-0100";placeSave("412 Oak St, Raeford, NC",35,-79,"x");return rosterBackup()});
  ok(!/SECRETKEY/.test(bak),'backup holds no keys');
  const p2=await open();await closeModalIfAny(p2);
  await p2.evaluate(t=>restoreRoster(t),bak);await p2.waitForTimeout(300);
  r=await p2.evaluate(()=>({n:roster.workers.length,leads:roster.workers.filter(w=>w.lead).length,conf:roster.conflicts.length,pref:roster.prefers.length,phone:roster.workers[0].phone,hist:HIST.size,places:Object.keys(places).length}));
  ok(r.n===16&&r.leads===8&&r.conf===2&&r.pref===1&&r.phone==="910-555-0100"&&r.hist===1&&r.places===1,'backup restores workers, rules, History and saved spots',r);
  await p2.evaluate(()=>{tab="workers";render()});
  const p3=await open();await closeModalIfAny(p3);await p3.evaluate(()=>{tab="workers";render()});
  await p3.setInputFiles('#fileWorkers',{name:'crew-roster.json',mimeType:'application/json',buffer:Buffer.from(bak)});await p3.waitForTimeout(300);
  ok(await p3.evaluate(()=>roster.workers.length)===16,'backup opened with Import list is restored, not read as a list');
  ok(p2.errs.length+p3.errs.length===0,'no script errors (restore)',[p2.errs,p3.errs]);

  // ---------- 14. version and What's new are in step ----------
  r=await p.evaluate(()=>({v:APP_VERSION,top:CHANGELOG[0].v,shown:document.querySelector('#appVer').textContent}));
  ok(r.v===r.top&&r.shown==="v"+r.v,'APP_VERSION matches the newest What\'s new entry',r);
  const fs=require('fs');const md=fs.readFileSync(path.resolve(__dirname,'..','CHANGELOG.md'),'utf8');
  ok(md.includes('## '+r.v+' '),'CHANGELOG.md has the current version');
  ok(fs.readFileSync(path.resolve(__dirname,'..','HANDOFF.md'),'utf8').includes('**'+r.v+'**'),'HANDOFF.md names the current version');

  await b.close();
  console.log(`\n${passes} passed, ${fails} failed`);
  process.exit(fails?1:0);
})().catch(e=>{console.error(e);process.exit(1)});
