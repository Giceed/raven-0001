const assert=require("assert");
const fs=require("fs");
const vm=require("vm");

const source=fs.readFileSync("js/config.js","utf8");
const start=source.indexOf('const RAVEN_FRESH_START_TOKEN="fieldtest1";');
const end=source.indexOf("applyRavenFreshStart();",start)+"applyRavenFreshStart();".length;
assert.ok(start>=0&&end>start,"Frischstart-Code fehlt");

const values=new Map([
  ["ravenXP","999"],
  ["ravenStudioPoisV1",JSON.stringify([{id:"studio-punkt"}])],
  ["ravenMissionVisited",JSON.stringify(["alt"])],
  ["ravenActivityVisited",JSON.stringify(["alt"])],
  ["ravenProfile",JSON.stringify({name:"Alt",onboardingDone:true})]
]);
const localStorage={
  getItem:key=>values.has(key)?values.get(key):null,
  setItem:(key,value)=>values.set(key,String(value)),
  removeItem:key=>values.delete(key)
};
let replaced="";
const context={URLSearchParams,Date,JSON,localStorage,location:{search:"?view=player&fresh=fieldtest1",pathname:"/raven-0001/",hash:""},history:{replaceState:(_a,_b,url)=>{replaced=url;}}};
vm.runInNewContext(source.slice(start,end),context);

assert.equal(values.get("ravenXP"),"0");
assert.equal(values.get("ravenLevel"),"1");
assert.deepEqual(JSON.parse(values.get("ravenItems")),{beeren:2,futter:3,lieblingsfutter:0,energiekorn:0,feder:0,glanzstein:0});
assert.deepEqual(JSON.parse(values.get("ravenMissionVisited")),[]);
assert.deepEqual(JSON.parse(values.get("ravenActivityVisited")),[]);
assert.equal(JSON.parse(values.get("ravenProfile")).onboardingDone,false);
assert.equal(JSON.parse(values.get("ravenStudioPoisV1"))[0].id,"studio-punkt");
assert.equal(replaced,"/raven-0001/?view=player");
console.log("✓ Frischstart-Test bestanden: Spielerfortschritt leer, Startitems gesetzt, Studio erhalten");

