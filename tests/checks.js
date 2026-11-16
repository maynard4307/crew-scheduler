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

  // ---------- 15. temp agency: short-handed note when off, Temp worker placeholders when on ----------
  p=await open();await closeModalIfAny(p);await p.click('[data-act=sample]');
  r=await p.evaluate(()=>{tonight.off=roster.workers.filter(w=>!w.lead).slice(0,3).map(w=>w.id);todayOpen[2]=true;solve();render();
    return {step2:document.querySelector('#step2').innerText,warn:[...document.querySelectorAll('#step3 .warn')].map(e=>e.innerText).join('|'),txt:scheduleText(),short:shortList().reduce((a,x)=>a+x.n,0),asg:Object.values(tonight.assign).flat().length}});
  ok(/short 3 workers/.test(r.step2),'step 2 counts the workers short before building',r.step2);
  ok(r.short===3&&/Short 3 workers[\s\S]*Turn on Temp agency/.test(r.warn),'setting off: crews say how many workers are short and suggest turning it on',r.warn);
  ok(/SHORT-HANDED/.test(r.txt)&&!/Temp worker/.test(r.txt),'setting off: copied schedule lists short-handed jobs, no temps');
  r=await p.evaluate(()=>{roster.settings.tempAgency=true;roster.settings.agencies=[{id:"a1",name:"Labor Plus",phone:"910-555-0100",address:"Fayetteville, NC",lat:35.05,lng:-78.88},{id:"a2",name:"Sanford Staffing",phone:"919-555-0111",address:"Sanford, NC",lat:35.48,lng:-79.18}];render();
    const sanfordJob=tonight.jobs.find(j=>/Pittsboro|Sanford/.test(j.address)),fayJob=tonight.jobs.find(j=>/Raeford|Fayetteville/.test(j.address));
    return {ph:[...document.querySelectorAll('#step3 .mem')].filter(e=>/Temp worker/.test(e.innerText)).length,txt:scheduleText(),csv:scheduleCSV().split('\n').filter(l=>/"Temp"/.test(l)).length,
      near1:agencyFor(sanfordJob).a.id,near2:agencyFor(fayJob).a.id,asg:Object.values(tonight.assign).flat().every(id=>wById(id)),leads:tonight.jobs.every(j=>trucksFor(j,tonight.assign[j.id]).trucks.every(t=>!t.lead||t.lead.lead)),hist:snapshotJobs().reduce((a,j)=>a+(j.temps?j.temps.n:0),0)}});
  ok(r.ph===3&&r.csv===3&&/TEMP WORKERS NEEDED — 3/.test(r.txt),'setting on: 3 Temp worker placeholders on crews, schedule and CSV',r);
  ok(r.near1==="a2"&&r.near2==="a1",'closest agency is suggested for each job',r);
  ok(r.asg===true&&r.leads&&r.hist===3,'temps never enter the real crews; History records them',r);
  r=await p.evaluate(()=>{roster.settings.agencies=[];render();return {ph:document.querySelectorAll('#step3 .mem').length,warn:[...document.querySelectorAll('#step3 .warn')].map(e=>e.innerText).join('|')}});
  ok(/Add a temp agency/.test(r.warn),'setting on with no agency: asks to add one',r.warn);
  const bak2=await p.evaluate(()=>{roster.settings.agencies=[{id:"a1",name:"Labor Plus",phone:"910",address:"x",lat:35,lng:-79}];return rosterBackup()});
  const p4=await open();await closeModalIfAny(p4);await p4.evaluate(t=>restoreRoster(t),bak2);await p4.waitForTimeout(300);
  ok(await p4.evaluate(()=>S().tempAgency===true&&S().agencies.length===1&&S().agencies[0].name==="Labor Plus"),'temp agencies come back with a backup');
  ok(p.errs.length+p4.errs.length===0,'no script errors (temp agency)',[p.errs,p4.errs]);

  // ---------- 16. fixes from the Nov 16 review ----------
  p=await open();await closeModalIfAny(p);
  // a lead past their mile limit never ends up driving (normal settings, short-handed 2-truck job)
  r=await p.evaluate(()=>{
    roster.settings={...DEFAULT_SETTINGS,maxLeadMiles:30,agencies:[]};
    roster.workers=[{id:"near",name:"Near Lead",lat:35.05,lng:-78.90,lead:true,active:true},{id:"far",name:"Far Lead",lat:35.95,lng:-79.90,lead:true,active:true},{id:"h1",name:"Helper One",lat:35.06,lng:-78.92,active:true}];
    roster.conflicts=[];roster.prefers=[];
    tonight={jobs:[{id:"j1",name:"Two Truck Job",time:"7:00a",lat:35.00,lng:-78.95,crew:3,trucks:2,requested:[],avoid:[],on:true}],assign:null,locks:{},off:[],drivers:{}};normalize();
    solveInner();const j=tonight.jobs[0];const auto=trucksFor(j,tonight.assign.j1).trucks.map(t=>t.lead&&t.lead.id);
    tonight.assign.j1=["near","h1","far"];tonight.locks.far="j1";solveInner();const byHand=trucksFor(j,tonight.assign.j1).trucks.map(t=>t.lead&&t.lead.id);
    // the "+ Add / move" menu marks past-limit leads by miles, not minutes
    roster.settings.maxLeadMiles=40;roster.workers.push({id:"mid",name:"Mid Lead",lat:35.42,lng:-78.95,lead:true,active:true});tonight.locks={};tonight.assign={j1:["near","h1"]};render();
    const opt=[...document.querySelectorAll('select[data-act=assignTo] option')].map(o=>o.textContent);
    return {auto,byHand,mid:opt.find(t=>/Mid Lead/.test(t)),far:opt.find(t=>/Far Lead/.test(t)),midMi:Math.round(travel(wById("mid"),j).mi)}});
  ok(r.auto.includes("near")&&!r.auto.includes("far"),'a lead past their mile limit is not given the second truck',r.auto);
  ok(r.byHand.includes("far"),'a lead locked to the job by hand may still drive past the limit',r.byHand);
  ok(r.midMi<40&&!/past/.test(r.mid)&&/past 40-mi limit/.test(r.far),'Add / move menu: “past limit” goes by miles',r);
  r=await p.evaluate(()=>{let over=0;const rnd=Math.random;
    for(let d=0;d<120;d++){const n=12+Math.floor(rnd()*20);
      roster.workers=[...Array(n)].map((_,i)=>({id:"w"+i,name:"W"+i,lat:35+rnd(),lng:-79.5+rnd(),lead:rnd()<0.4,active:true,maxMiles:rnd()<0.3?25:0}));roster.settings.maxLeadMiles=40;roster.settings.extraTruck=true;roster.settings.leadsAsHelpers=true;
      tonight.jobs=[...Array(3+Math.floor(rnd()*6))].map((_,i)=>({id:"j"+i,name:"Job"+i,time:"7:00a",lat:35+rnd(),lng:-79.5+rnd(),crew:1+Math.floor(rnd()*4),trucks:1+Math.floor(rnd()*2),requested:[],avoid:[],on:true}));
      tonight.off=[];tonight.locks={};tonight.drivers={};tonight.assign=null;solveInner();
      for(const j of tonight.jobs)for(const t of trucksFor(j,tonight.assign[j.id]).trucks)if(t.lead){const L=leadLimit(t.lead);if(L&&travel(t.lead,j).mi>L)over++}}
    return over});
  ok(r===0,'extra truck on: no lead drives past their limit on 120 random days',r);
  // rebuild keeps people where they are
  await p.evaluate(()=>{roster.settings={...DEFAULT_SETTINGS,agencies:[]};loadSample()});
  r=await p.evaluate(()=>{tonight.assign=null;solveInner();const sig=()=>tonight.jobs.map(j=>(tonight.assign[j.id]||[]).slice().sort().join(',')).join('|');const a=sig();let same=true;for(let i=0;i<8;i++){solveInner();if(sig()!==a)same=false}return same});
  ok(r,'Rebuild with nothing changed leaves every crew as it was');
  // a form keeps what was typed when the screen is redrawn in the background
  await p.evaluate(()=>{tonight.assign=null;tab="tonight";render()});
  await p.click('[data-act=addJob]');await p.fill('#jfName','Smith mowing');await p.fill('#jfAddr','412 Oak St, Raeford, NC');await p.locator('#jfReq .chip').first().click();
  r=await p.evaluate(()=>{document.querySelector('#jfAddr').focus();render();return {name:document.querySelector('#jfName').value,addr:document.querySelector('#jfAddr').value,chip:!document.querySelector('#jfReq .chip').classList.contains('off'),focus:document.activeElement.id}});
  ok(r.name==='Smith mowing'&&r.addr==='412 Oak St, Raeford, NC'&&r.chip&&r.focus==='jfAddr','Add a job keeps typed text, requested people and the cursor through a redraw',r);
  await p.click('[data-tab=workers]');
  ok(await p.locator('.modal',{hasText:"haven't saved"}).count()===1,'switching tabs with a half-filled job asks first');
  await p.keyboard.press('Escape');
  ok(await p.locator('.modalbg').count()===0&&await p.inputValue('#jfName')==='Smith mowing','Esc closes the pop-up and the form is still there');
  await p.click('[data-act=cancelJob]');
  // More menu stays on a phone screen
  await p.locator('#step1 details.more summary').click();await p.waitForTimeout(80);
  r=await p.evaluate(()=>{const m=document.querySelector('#step1 details.more .menu').getBoundingClientRect();return {left:Math.round(m.left),right:Math.round(m.right),w:document.documentElement.clientWidth}});
  ok(r.left>=0&&r.right<=r.w,'More menu in step 1 fits on a phone screen',r);
  await p.locator('h1').click();
  // truck counts refresh before crews are built
  await p.locator('[data-act=jobTrucks]').first().fill('4');await p.locator('[data-act=jobTrucks]').first().dispatchEvent('change');await p.waitForTimeout(60);
  ok(/for 10 trucks/.test(await p.locator('#step2').innerText()),'changing Trucks before building updates the step 2 counts');
  // Clear crews asks; taking someone off a crew can be undone
  await p.click('#step3 [data-act=solve]');await p.waitForSelector('.stats');
  const offId=await p.locator('[data-act=unassign]').first().getAttribute('data-w');
  await p.locator('[data-act=unassign]').first().click();
  ok(!(await p.evaluate(id=>assignedIds().has(id),offId)),'× takes the person off the crew');
  await p.locator('.toast button',{hasText:'Undo'}).last().click();
  ok(await p.evaluate(id=>assignedIds().has(id),offId),'Undo puts the person back on the crew');
  await p.locator('#step3 details.more summary').click();await p.locator('[data-act=clearAsg]').click();
  ok(await p.locator('.modal',{hasText:'Clear the crews'}).count()===1&&await p.evaluate(()=>!!tonight.assign),'Clear crews asks before clearing');
  await p.locator('.modal [data-r=c]').click();
  // ids from a file are cleaned; a crafted file cannot run script
  r=await p.evaluate(async()=>{window.__x=0;const pack=JSON.stringify({jobs:[{id:'a"><img src=x onerror="window.__x=1">',name:"Job",lat:35,lng:-79,crew:2,trucks:1}],off:[],locks:{}});
    const pr=loadPackJobs(pack,"","t.json");await new Promise(r=>setTimeout(r,50));document.querySelector('.modal [data-r=o]')?.click();await pr;await new Promise(r=>setTimeout(r,200));
    const b=readBackup(JSON.stringify({roster:{workers:[{id:'x"><b>',name:"A"},{id:"ok_1",name:"B"}],conflicts:[['x"><b>',"ok_1"]]}}));
    return {ran:window.__x,jobId:tonight.jobs[0].id,ids:b.workers.map(w=>w.id),pair:b.conflicts[0]}});
  ok(r.ran===0&&/^[\w-]+$/.test(r.jobId)&&r.ids.every(i=>/^[\w-]+$/.test(i))&&r.pair[0]===r.ids[0],'ids read from a file are cleaned up',r);
  // History: two jobs with the same name and time keep their own close-out
  r=await p.evaluate(async()=>{loadSample();tonight.jobs=tonight.jobs.slice(0,2);tonight.jobs.forEach(j=>{j.title="";j.name="Smith";j.time="7:00a"});tonight.day=dayKey(new Date());tonight.assign=null;solve();await saveDayToHistory(true);
    const d=scheduleDay();await histEdit(d,c=>{c.jobs[0].status="done";c.jobs[1].status="rain"});await saveDayToHistory(true);return HIST.get(d).jobs.map(j=>j.status+(j.dropped?" dropped":""))});
  ok(JSON.stringify(r)==='["done","rain"]','two jobs with the same name and time keep their own History status',r);
  // deleting a worker tidies up, and same first names get a last initial on the schedule
  r=await p.evaluate(()=>{loadSample();const j=tonight.jobs[0];const w=roster.workers.find(x=>!x.lead);j.avoid=[w.id];tonight.off=[w.id];
    roster.workers=roster.workers.filter(x=>x.id!==w.id);tonight.off=tonight.off.filter(x=>x!==w.id);j.avoid=[];   // what Delete does is checked through the button below
    const L=roster.workers.find(x=>x.lead),H=roster.workers.find(x=>!x.lead);L.name="Mike Stone";H.name="Mike Turner";tonight.jobs=[j];j.trucks=1;j.crew=2;tonight.assign={[j.id]:[L.id,H.id]};
    return scheduleText()});
  ok(/Mike S\.:/.test(r)&&/Mike T\.:/.test(r),'same first name on one job: the schedule adds the last initial',r.slice(0,300));
  await p.evaluate(()=>{loadSample();const w=roster.workers.find(x=>!x.lead);tonight.jobs[0].avoid=[w.id];tonight.off=[w.id];tab="workers";editingWorker=w.id;render()});
  await p.click('[data-act=delWorker]');await p.click('.modal [data-r=o]');await p.waitForTimeout(100);
  r=await p.evaluate(()=>({off:tonight.off.length,avoid:tonight.jobs[0].avoid.length}));
  ok(r.off===0&&r.avoid===0,'deleting a worker also clears them from the off and don\'t-send lists',r);
  ok(p.errs.length===0,'no script errors (review fixes)',p.errs);

  // ---------- 17. 2026.11.16-b: keep off this job, built-in unzip, share sheet ----------
  r=await p.evaluate(()=>({zip:typeof JSZip,ext:[...document.scripts].filter(s=>s.src).length}));
  ok(r.zip==="function"&&r.ext===0,'unzip tool is built in and no outside scripts are loaded',r);
  r=await p.evaluate(async()=>{const z=new JSZip();z.file("a.txt","hello");const b=await z.generateAsync({type:"blob"});const y=await JSZip.loadAsync(b);return await y.file("a.txt").async("string")});
  ok(r==="hello",'built-in unzip tool makes and reads a zip with no internet',r);
  await p.evaluate(()=>{loadSample();tonight.assign=null;tonight.locks={};solve();tab="tonight";render();document.querySelectorAll('.toast').forEach(t=>t.remove())});
  const un=await p.evaluate(()=>{const b=document.querySelector('#step3 [data-act=unassign]');return {w:b.dataset.w,j:b.dataset.j}});
  await p.locator(`#step3 [data-act=unassign][data-w="${un.w}"]`).click();
  r=await p.evaluate(()=>[...document.querySelectorAll('.toast button')].map(b=>b.textContent));
  ok(r.includes("Undo")&&r.includes("Keep off this job"),'taking someone off offers Undo and Keep off this job',r);
  await p.locator('.toast button',{hasText:'Keep off this job'}).click();
  r=await p.evaluate(({w,j})=>{const out={avoid:jById(j).avoid.includes(w),back:[]};for(let i=0;i<6;i++){solveInner();out.back.push(tonight.assign[j].includes(w))}render();return out},un);
  ok(r.avoid&&r.back.every(x=>!x),'Keep off this job: six rebuilds never put the person back on that job',r);
  await p.evaluate(()=>{for(let e=document.querySelector('[data-act=rmAvoid]');e;e=e.parentElement)if(e.tagName==='DETAILS')e.open=true});
  r=await p.locator(`#step3 [data-act=rmAvoid][data-w="${un.w}"]`).count();
  ok(r===1,'the Don\'t-send name has a × to allow them again',r);
  await p.locator(`#step3 [data-act=rmAvoid][data-w="${un.w}"]`).click();
  r=await p.evaluate(({w,j})=>jById(j).avoid.includes(w),un);
  ok(r===false,'× on a Don\'t-send name allows the person on the job again',r);
  // share sheet: phone shares, cancelled share is not a backup, computer downloads
  const pS=await open({hasTouch:true,isMobile:true});
  r=await pS.evaluate(async()=>{loadSample();window.__sh=[];navigator.canShare=d=>!!(d&&d.files&&d.files.length);navigator.share=async d=>{window.__sh.push(d.files[0].name+"|"+d.files[0].type+"|"+d.files[0].size)};
    const coarse=matchMedia("(pointer:coarse)").matches;localStorage.removeItem("crew_backup");tab="settings";render();return {coarse}});
  await pS.click('[data-act=saveRoster]');await pS.waitForTimeout(150);
  r=Object.assign(r,await pS.evaluate(()=>({sh:window.__sh,at:!!backupInfo().at})));
  ok(r.coarse&&r.sh.length===1&&/^crew-roster-.*\.json\|application\/json\|\d+$/.test(r.sh[0])&&+r.sh[0].split("|")[2]>100&&r.at,'on a phone, Save backup file opens the Share sheet with the backup',r);
  r=await pS.evaluate(async()=>{const before=backupInfo().at;navigator.share=async()=>{const e=new Error("x");e.name="AbortError";throw e};return {r:await download("crew-roster-x.json","{}",{share:true}),same:backupInfo().at===before}});
  ok(r.r===false,'closing the Share sheet is reported as not saved',r);
  r=await pS.evaluate(async()=>{navigator.canShare=()=>false;let clicked=0;const oc=HTMLAnchorElement.prototype.click;HTMLAnchorElement.prototype.click=function(){clicked++};const x=await download("crew-roster-x.json","{}",{share:true});HTMLAnchorElement.prototype.click=oc;return {x,clicked}});
  ok(r.x!==false&&r.clicked===1,'a phone that can\'t share files falls back to a normal download',r);
  r=await p.evaluate(async()=>{let shared=0,clicked=0;navigator.canShare=()=>true;navigator.share=async()=>{shared++};const oc=HTMLAnchorElement.prototype.click;HTMLAnchorElement.prototype.click=function(){clicked++};await download("crew-roster-x.json","{}",{share:true});HTMLAnchorElement.prototype.click=oc;return {shared,clicked,coarse:matchMedia("(pointer:coarse)").matches}});
  ok(r.shared===0&&r.clicked===1,'on a computer the backup still downloads',r);
  ok(p.errs.length+pS.errs.length===0,'no script errors (16-b)',[p.errs,pS.errs]);await pS.context().close();

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
