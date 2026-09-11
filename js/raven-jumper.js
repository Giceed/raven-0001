/* Raven Jumper – kleines eigenständiges Geschicklichkeitsspiel. */
const RAVEN_JUMPER_KEY="ravenJumperHighscore";
let ravenJumper=null,ravenJumperFrame=0,ravenJumperKeys={left:false,right:false};
function jumperHighscore(){return Number(localStorage.getItem(RAVEN_JUMPER_KEY))||0;}
function renderJumperHighscore(){const box=document.getElementById("jumperHighscore");if(box)box.textContent=`Rekord ${jumperHighscore()}`;}
function openRavenJumper(){document.getElementById("jumperOverlay")?.classList.add("open");document.body.style.overflow="hidden";drawRavenJumperPreview();}
function closeRavenJumper(){if(ravenJumper?.running)finishRavenJumper("geschlossen");stopRavenJumper();document.getElementById("jumperOverlay")?.classList.remove("open","game-over");document.body.style.overflow="";}
function toggleRavenJumperRun(){if(ravenJumper?.running)finishRavenJumper("beendet");else startRavenJumper();}
function startRavenJumper(){
  if(ravenJumper?.running)return;
  if(typeof ravenLife!=="undefined"&&ravenLife.energy<6){document.getElementById("jumperMessage").textContent="Dein Raven ist zu müde. Lass ihn erst ausruhen.";return;}
  if(typeof ravenLife!=="undefined"){ravenLife.energy=clampRavenNeed(ravenLife.energy-6);ravenLife.hunger=clampRavenNeed(ravenLife.hunger-3);saveRavenLife();renderRavenGamePanel();}
  const canvas=document.getElementById("jumperCanvas");if(!canvas)return;
  ravenJumper={running:true,score:0,last:performance.now(),player:{x:164,y:490,w:32,h:30,vx:0,vy:-9.7},platforms:[]};
  for(let i=0;i<8;i++)ravenJumper.platforms.push({x:i===0?145:20+Math.random()*270,y:550-i*78,w:72});
  document.getElementById("jumperOverlay")?.classList.remove("game-over");document.getElementById("jumperMessage").textContent="Flieg, Raven! Halte links oder rechts gedrückt.";document.getElementById("jumperStartButton").textContent="BEENDEN";
  cancelAnimationFrame(ravenJumperFrame);ravenJumperFrame=requestAnimationFrame(ravenJumperLoop);
}
function stopRavenJumper(){if(ravenJumper)ravenJumper.running=false;cancelAnimationFrame(ravenJumperFrame);ravenJumperKeys.left=ravenJumperKeys.right=false;}
function ravenJumperLoop(now){
  if(!ravenJumper?.running)return;const dt=Math.min(1.8,(now-ravenJumper.last)/16.67);ravenJumper.last=now;const p=ravenJumper.player;
  const steer=(ravenJumperKeys.right?1:0)-(ravenJumperKeys.left?1:0);p.vx+=(steer*.72-p.vx*.12)*dt;p.vx=Math.max(-5.2,Math.min(5.2,p.vx));p.x+=p.vx*dt;if(p.x<-p.w)p.x=360;if(p.x>360)p.x=-p.w;
  const oldBottom=p.y+p.h;p.vy+=.42*dt;p.y+=p.vy*dt;
  if(p.vy>0)for(const platform of ravenJumper.platforms){if(oldBottom<=platform.y+5&&p.y+p.h>=platform.y&&p.x+p.w>platform.x&&p.x<platform.x+platform.w){p.y=platform.y-p.h;p.vy=-10.2;ravenJumper.score+=10;break;}}
  if(p.y<235){const shift=235-p.y;p.y=235;ravenJumper.score+=Math.max(1,Math.round(shift));ravenJumper.platforms.forEach(platform=>platform.y+=shift);}
  ravenJumper.platforms=ravenJumper.platforms.filter(platform=>platform.y<630);while(ravenJumper.platforms.length<8){const top=Math.min(...ravenJumper.platforms.map(platform=>platform.y));ravenJumper.platforms.push({x:16+Math.random()*272,y:top-(62+Math.random()*35),w:58+Math.random()*24});}
  document.getElementById("jumperScore").textContent=Math.floor(ravenJumper.score/10);drawRavenJumper();if(p.y>620)return finishRavenJumper();ravenJumperFrame=requestAnimationFrame(ravenJumperLoop);
}
function drawRavenJumper(){const canvas=document.getElementById("jumperCanvas"),ctx=canvas?.getContext("2d");if(!ctx||!ravenJumper)return;const p=ravenJumper.player,g=ctx.createLinearGradient(0,0,0,600);g.addColorStop(0,"#075985");g.addColorStop(1,"#0f172a");ctx.fillStyle=g;ctx.fillRect(0,0,360,600);ctx.fillStyle="#ffffff22";for(let i=0;i<10;i++){ctx.beginPath();ctx.arc((i*83+40)%380,(i*127+30)%570,2,0,7);ctx.fill();}ravenJumper.platforms.forEach(platform=>{ctx.fillStyle="#d8b4fe";ctx.fillRect(platform.x,platform.y,platform.w,8);ctx.fillStyle="#7e22ce";ctx.fillRect(platform.x+5,platform.y+8,platform.w-10,4);});ctx.font="28px sans-serif";ctx.textAlign="center";ctx.fillText("🐦‍⬛",p.x+p.w/2,p.y+26);}
function drawRavenJumperPreview(){const canvas=document.getElementById("jumperCanvas"),ctx=canvas?.getContext("2d");if(!ctx)return;const g=ctx.createLinearGradient(0,0,0,600);g.addColorStop(0,"#075985");g.addColorStop(1,"#0f172a");ctx.fillStyle=g;ctx.fillRect(0,0,360,600);ctx.textAlign="center";ctx.font="70px sans-serif";ctx.fillText("🐦‍⬛",180,280);ctx.font="bold 20px sans-serif";ctx.fillStyle="#cffafe";ctx.fillText("Bereit zum Abflug?",180,340);}
function finishRavenJumper(reason="abgestürzt"){
  if(!ravenJumper)return;const score=Math.floor(ravenJumper.score/10),old=jumperHighscore(),best=Math.max(old,score);
  localStorage.setItem(RAVEN_JUMPER_KEY,String(best));ravenJumper.running=false;cancelAnimationFrame(ravenJumperFrame);
  const mood=Math.min(12,Math.max(2,Math.floor(score/20)+2));if(typeof ravenLife!=="undefined"){ravenLife.mood=clampRavenNeed(ravenLife.mood+mood);saveRavenLife();recordDailyTask("play");renderRavenGamePanel();}
  document.getElementById("jumperMessage").textContent=score>old?`Neuer Rekord: ${score}! Stimmung +${mood}`:`Flug ${reason}: ${score} Punkte · Rekord ${best}`;document.getElementById("jumperStartButton").textContent="NOCHMAL";document.getElementById("jumperOverlay")?.classList.add("game-over");renderJumperHighscore();
}
function setJumperDirection(direction,active){ravenJumperKeys[direction]=active;document.querySelector(`[data-jumper="${direction}"]`)?.classList.toggle("active",active);}
document.addEventListener("keydown",event=>{if(!document.getElementById("jumperOverlay")?.classList.contains("open"))return;if(event.key==="ArrowLeft"||event.key.toLowerCase()==="a"){event.preventDefault();setJumperDirection("left",true);}if(event.key==="ArrowRight"||event.key.toLowerCase()==="d"){event.preventDefault();setJumperDirection("right",true);}if((event.key===" "||event.key==="Enter")&&!ravenJumper?.running)startRavenJumper();});
document.addEventListener("keyup",event=>{if(event.key==="ArrowLeft"||event.key.toLowerCase()==="a")setJumperDirection("left",false);if(event.key==="ArrowRight"||event.key.toLowerCase()==="d")setJumperDirection("right",false);});
window.addEventListener("DOMContentLoaded",()=>{
  renderJumperHighscore();
  document.querySelectorAll("[data-jumper]").forEach(button=>{const direction=button.dataset.jumper;button.addEventListener("pointerdown",event=>{event.preventDefault();button.setPointerCapture?.(event.pointerId);setJumperDirection(direction,true);});["pointerup","pointercancel","pointerleave"].forEach(type=>button.addEventListener(type,()=>setJumperDirection(direction,false)));});
  const canvas=document.getElementById("jumperCanvas");
  const steerCanvas=event=>{event.preventDefault();const rect=canvas.getBoundingClientRect(),direction=event.clientX-rect.left<rect.width/2?"left":"right";canvas.dataset.steer=direction;setJumperDirection(direction,true);canvas.setPointerCapture?.(event.pointerId);};
  const releaseCanvas=()=>{const direction=canvas.dataset.steer;if(direction)setJumperDirection(direction,false);delete canvas.dataset.steer;};
  canvas?.addEventListener("pointerdown",steerCanvas);["pointerup","pointercancel","pointerleave"].forEach(type=>canvas?.addEventListener(type,releaseCanvas));
});

