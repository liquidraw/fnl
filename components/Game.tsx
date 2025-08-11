
'use client'
import React, { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { TEAMS } from '@/lib/teams'
import type { Controls } from '@/lib/types'
import MobileControls from './MobileControls'
import { Sfx } from './Audio'

const FIELD = { width: 100, height: 53.3 }
const CANVAS_W = 960, CANVAS_H = 540, SCALE_X = CANVAS_W / FIELD.width, SCALE_Y = CANVAS_H / FIELD.height
type Player = { x:number; y:number; speed?:number; team:'HOME'|'AWAY'; hasBall?:boolean; color?:string }
type Ball = { x:number; y:number; vx:number; vy:number; inAir:boolean }
type Shell = 'cover3'|'cover2'|'man'
type GameState = { quarter:number; clock:number; possession:'HOME'|'AWAY'; los:number; down:number; yardsToGo:number; ball:Ball; qb:Player; receivers:Player[]; defenders:Player[]; scores:{HOME:number;AWAY:number}; colors:{home:[string,string];away:[string,string]}; snapped:boolean; paused:boolean; targetIndex:number; shell:Shell }
const sfx = new Sfx()
const clamp=(v:number,min:number,max:number)=>Math.max(min,Math.min(max,v))
const dist=(ax:number,ay:number,bx:number,by:number)=>Math.hypot(ax-bx,ay-by)

export default function Game({ initialHomeIndex=6, initialAwayIndex=8, locked=false, onFinal }:{ initialHomeIndex?:number; initialAwayIndex?:number; locked?:boolean; onFinal?:(h:number,a:number,hs:number,as:number)=>void }){
  const [homeIndex,setHomeIndex]=useState(initialHomeIndex)
  const [awayIndex,setAwayIndex]=useState(initialAwayIndex)
  const [len,setLen]=useState(120)
  const [homeScore,setHomeScore]=useState(0); const [awayScore,setAwayScore]=useState(0)
  const [showOverlay,setShowOverlay]=useState(true); const [running,setRunning]=useState(false)
  const [selectedPlay,setSelectedPlay]=useState<'go'|'post'|'slant'|'run'>('go')
  const [shell,setShell]=useState<Shell>('cover3')
  const [recording,setRecording]=useState(false)

  const canvasRef=useRef<HTMLCanvasElement>(null)
  const stateRef=useRef<GameState|null>(null)
  const controls=useRef<Controls>({left:false,right:false,up:false,down:false,snap:false,passBullet:false,passLob:false,cycle:false,pause:false,reset:false})
  const lastTs=useRef(0); const recorderRef=useRef<MediaRecorder|null>(null); const chunksRef=useRef<Blob[]>([])

  useEffect(()=>{ setHomeScore(0); setAwayScore(0) },[homeIndex,awayIndex])

  const onKey=(e:KeyboardEvent,down:boolean)=>{
    const c=e.code; if(c==='ArrowLeft')controls.current.left=down
    if(c==='ArrowRight')controls.current.right=down; if(c==='ArrowUp')controls.current.up=down
    if(c==='ArrowDown')controls.current.down=down; if(c==='KeyS'){controls.current.snap=down; if(down)sfx.snap()}
    if(c==='KeyD')controls.current.passBullet=down; if(c==='KeyA')controls.current.passLob=down
    if(c==='KeyQ')controls.current.cycle=down; if(c==='KeyP')controls.current.pause=down; if(c==='KeyR')controls.current.reset=down
  }
  useEffect(()=>{ const d=(e:KeyboardEvent)=>onKey(e,true), u=(e:KeyboardEvent)=>onKey(e,false); window.addEventListener('keydown',d); window.addEventListener('keyup',u); return ()=>{window.removeEventListener('keydown',d); window.removeEventListener('keyup',u)} },[])

  const yardX=(y:number)=>y*SCALE_X, yardY=(y:number)=>y*SCALE_Y

  function initGame(){
    const H=TEAMS[homeIndex], A=TEAMS[awayIndex]
    const defenders=Array.from({length:7},(_,i)=>({x:35+i*3, y:FIELD.height/2+(Math.random()*20-10), team:'AWAY' as const, color:A.colors[0]}))
    stateRef.current={ quarter:1, clock:len, possession:'HOME', los:25, down:1, yardsToGo:10,
      ball:{x:25,y:FIELD.height/2,vx:0,vy:0,inAir:false},
      qb:{x:25,y:FIELD.height/2,speed:3.2,color:H.colors[0],team:'HOME',hasBall:true},
      receivers:[{x:30,y:FIELD.height/2-8,team:'HOME',speed:2.6},{x:30,y:FIELD.height/2,team:'HOME',speed:2.6},{x:30,y:FIELD.height/2+8,team:'HOME',speed:2.6}],
      defenders, scores:{HOME:homeScore,AWAY:awayScore}, colors:{home:H.colors,away:A.colors}, snapped:false, paused:false, targetIndex:0, shell }
    setShowOverlay(false); setRunning(true); lastTs.current=performance.now(); requestAnimationFrame(loop)
  }
  function resetRoutes(st:GameState){
    const yMid=FIELD.height/2; st.qb.x=st.los-5; st.qb.y=yMid; st.qb.hasBall=false
    st.receivers=[{x:st.los-2,y:yMid-8,team:'HOME',speed:2.6},{x:st.los-2,y:yMid,team:'HOME',speed:2.6},{x:st.los-2,y:yMid+8,team:'HOME',speed:2.6}]
    st.defenders=Array.from({length:7},(_,i)=>({x:st.los+5+i*2.5,y:yMid+(Math.random()*20-10),team:'AWAY' as const,color:st.colors.away[0]}))
    st.ball.inAir=false; st.shell=shell
  }
  function switchPossession(st:GameState){
    st.possession=st.possession==='HOME'?'AWAY':'HOME'; st.los=25; st.down=1; st.yardsToGo=10; st.snapped=false
    const offense=st.possession==='HOME'?st.colors.home:st.colors.away, defense=st.possession==='HOME'?st.colors.away:st.colors.home
    st.qb.color=offense[0]; st.defenders.forEach(d=>d.color=defense[0]); resetRoutes(st)
  }
  function nextDrive(st:GameState,scored:boolean){ if(scored){ if(st.possession==='HOME')st.scores.HOME+=7; else st.scores.AWAY+=7; sfx.td() } switchPossession(st) }
  function endGame(st:GameState){ st.paused=true; setShowOverlay(true); setHomeScore(st.scores.HOME); setAwayScore(st.scores.AWAY); sfx.whistle(); onFinal?.(homeIndex,awayIndex,st.scores.HOME,st.scores.AWAY) }
  function aiDefenders(st:GameState,dt:number){
    for(let i=0;i<st.defenders.length;i++){ const d=st.defenders[i]; let tx=st.qb.x, ty=st.qb.y
      if(st.shell==='cover3'){ const lanes=[FIELD.height*0.25,FIELD.height*0.5,FIELD.height*0.75]; ty=lanes[i%3]; tx=st.los+8+(i*2.5)%18 }
      else if(st.shell==='cover2'){ ty=(i%2===0)?FIELD.height*0.25:FIELD.height*0.75; tx=st.los+10+(i*3)%20 }
      else { const r=st.receivers[i%st.receivers.length]; tx=r.x; ty=r.y }
      const ax=tx-d.x, ay=ty-d.y, L=Math.hypot(ax,ay)||1, sp=st.shell==='man'?0.7:0.45; d.x+=ax/L*sp; d.y+=ay/L*sp
      d.x=clamp(d.x,0,99); d.y=clamp(d.y,4,FIELD.height-4)
    }
  }
  function runRoutes(st:GameState,dt:number,play:'go'|'post'|'slant'|'run'){
    for(let i=0;i<st.receivers.length;i++){ const r=st.receivers[i]
      if(play==='run'){ r.x+=0.5 } else if(play==='go'){ r.x+=0.9 } else if(play==='post'){ r.x+=0.8; r.y+=i===1?-0.12:0 } else if(play==='slant'){ r.x+=0.7; r.y+=i===2?0.12:(i===0?-0.12:0) }
      r.x=clamp(r.x,0,99); r.y=clamp(r.y,4,FIELD.height-4)
    }
  }
  function physics(dt:number){
    const st=stateRef.current; if(!st||st.paused)return; st.clock-=dt; if(st.clock<=0){st.clock=0; return endGame(st)}
    const c=controls.current
    if(!st.snapped){
      const sp=(st.qb.speed||3.2)*dt*12/(1/60); if(c.left)st.qb.x-=sp/10; if(c.right)st.qb.x+=sp/10; if(c.up)st.qb.y-=sp/10; if(c.down)st.qb.y+=sp/10
      st.qb.x=clamp(st.qb.x,st.los-3,st.los+2); st.qb.y=clamp(st.qb.y,6,FIELD.height-6); if(c.snap){st.snapped=true; st.qb.hasBall=true; sfx.crowd()} if(c.cycle){st.targetIndex=(st.targetIndex+1)%st.receivers.length; c.cycle=false} return
    }
    const sp=(st.qb.speed||3.2)*dt*12/(1/60); if(c.left)st.qb.x-=sp/10; if(c.right)st.qb.x+=sp/10; if(c.up)st.qb.y-=sp/10; if(c.down)st.qb.y+=sp/10
    st.qb.x=clamp(st.qb.x,0,99); st.qb.y=clamp(st.qb.y,4,FIELD.height-4); runRoutes(st,dt,selectedPlay); aiDefenders(st,dt)
    if(st.qb.hasBall&&(c.passBullet||c.passLob)){ const r=st.receivers[st.targetIndex]; const dx=r.x-st.qb.x, dy=r.y-st.qb.y; const bullet=c.passBullet&&!c.passLob; const lob=c.passLob&&!c.passBullet; const speed=bullet?0.45:(lob?0.25:0.35)
      st.ball.x=st.qb.x; st.ball.y=st.qb.y; st.ball.vx=dx*speed; st.ball.vy=dy*speed; st.ball.inAir=true; st.qb.hasBall=false; sfx.pass(); c.passBullet=false; c.passLob=false }
    if(st.ball.inAir){
      st.ball.x+=st.ball.vx*dt*6; st.ball.y+=st.ball.vy*dt*6
      for(const r of st.receivers){ if(dist(r.x,r.y,st.ball.x,st.ball.y)<2.2){ st.qb.x=r.x; st.qb.y=r.y; st.qb.hasBall=true; st.ball.inAir=false; sfx.catch(); const gain=Math.max(0,Math.floor(r.x-st.los)); return advanceDown(st,gain) } }
      for(const d of st.defenders){ if(dist(d.x,d.y,st.ball.x,st.ball.y)<1.8){ sfx.tackle(); st.los=Math.max(1,Math.floor(st.ball.x)); return switchPossession(st) } }
      if(st.ball.x<0||st.ball.x>100||st.ball.y<0||st.ball.y>FIELD.height){ return incomplete(st) }
    }
    for(const d of st.defenders){ if(dist(d.x,d.y,st.qb.x,st.qb.y)<1.8){ sfx.tackle(); const gain=Math.max(0,Math.floor(st.qb.x-st.los)); return advanceDown(st,gain) } }
  }
  function advanceDown(st:GameState,gain:number){ st.los+=gain; if(st.los>=100){ return nextDrive(st,true) } st.yardsToGo-=gain; if(st.yardsToGo<=0){ st.down=1; st.yardsToGo=10; st.snapped=false; resetRoutes(st) } else { st.down+=1; if(st.down>4) switchPossession(st); else { st.snapped=false; resetRoutes(st) } } }
  function incomplete(st:GameState){ st.down+=1; if(st.down>4) switchPossession(st); else { st.snapped=false; resetRoutes(st) } }
  function loop(ts:number){ const st=stateRef.current; if(!st)return; const dt=Math.min(0.1,(ts-lastTs.current)/1000); lastTs.current=ts; if(!controls.current.pause)physics(dt); draw(); if(running)requestAnimationFrame(loop) }
  function draw(){ const st=stateRef.current, canvas=canvasRef.current; if(!st||!canvas)return; const ctx=canvas.getContext('2d')!; ctx.fillStyle='#083b12'; ctx.fillRect(0,0,CANVAS_W,CANVAS_H)
    ctx.fillStyle='#0d4d1c'; ctx.fillRect(0,0,10*SCALE_X,CANVAS_H); ctx.fillRect(CANVAS_W-10*SCALE_X,0,10*SCALE_X,CANVAS_H)
    ctx.strokeStyle='#e8f5e9'; ctx.lineWidth=2; ctx.globalAlpha=.85; for(let y=10;y<=90;y+=5){const x=yardX(y); ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,CANVAS_H); ctx.stroke()} ctx.globalAlpha=1
    ctx.fillStyle='rgba(255,255,255,.75)'; for(let y=11;y<=89;y++){const x=yardX(y); for(const yy of [CANVAS_H*.22,CANVAS_H*.78]) ctx.fillRect(x-1,yy-2,2,4)}
    ctx.strokeStyle='rgba(255,255,255,.8)'; ctx.setLineDash([8,6]); ctx.beginPath(); ctx.moveTo(yardX(st.los),0); ctx.lineTo(yardX(st.los),CANVAS_H); ctx.stroke(); ctx.setLineDash([])
    const drawP=(p:Player,c:string)=>{ctx.fillStyle=c; ctx.beginPath(); ctx.arc(yardX(p.x),yardY(p.y),8,0,Math.PI*2); ctx.fill()}
    drawP(st.qb, st.qb.color||'#fff'); st.receivers.forEach((r,i)=>drawP(r, i===st.targetIndex?'#ffd100':st.colors.home[1])); st.defenders.forEach(d=>drawP(d, st.colors.away[0]))
    if(st.qb.hasBall||st.ball.inAir){ ctx.fillStyle='#8b4513'; ctx.beginPath(); ctx.ellipse(yardX(st.ball.x),yardY(st.ball.y),6,4,0,Math.PI*2); ctx.fill() }
    ctx.fillStyle='rgba(0,0,0,.65)'; ctx.fillRect(10,10,420,96); ctx.fillStyle='#ffd100'; ctx.font='bold 16px system-ui'; ctx.fillText(`Down: ${st.down}`,16,32); ctx.fillText(`To Go: ${st.yardsToGo}yd`,110,32)
    ctx.fillStyle='#fff'; const mm=String(Math.floor(st.clock/60)).padStart(2,'0'), ss=String(Math.floor(st.clock%60)).padStart(2,'0'); ctx.fillText(`Poss: ${st.possession}`,16,54); ctx.fillText(`Q${st.quarter} ${mm}:${ss}`,16,72); ctx.fillText(`Play: ${selectedPlay.toUpperCase()} • Shell: ${st.shell.toUpperCase()}`,16,90)
  }
  const onPress=(code:string,down:boolean)=>onKey({code} as KeyboardEvent, down)
  function startRecording(){ const canvas=canvasRef.current; if(!canvas)return; const stream=canvas.captureStream(60); const rec=new MediaRecorder(stream,{mimeType:'video/webm;codecs=vp9'}); chunksRef.current=[]; rec.ondataavailable=e=>{if(e.data.size>0)chunksRef.current.push(e.data)}; rec.onstop=()=>{const blob=new Blob(chunksRef.current,{type:'video/webm'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='hofn-highlight.webm'; a.click(); URL.revokeObjectURL(url)}; rec.start(); recorderRef.current=rec; setRecording(true) }
  function stopRecording(){ recorderRef.current?.stop(); setRecording(false) }

  return (
    <div>
      <header style={{display:'flex',alignItems:'center',gap:16}}>
        <div><Image alt="HOFN" src="http://halloffame.network/wp-content/uploads/2025/04/cropped-HOF-Network-logo_stack.png" width={164} height={64}/></div>
        <div>
          <h1 style={{margin:0}}>HOF Network — Friday Night Legends (Tecmo-Style)</h1>
          <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
            <span className="kbd">← → ↑ ↓</span><span className="kbd">S = Snap</span><span className="kbd">D = Bullet</span><span className="kbd">A = Lob</span><span className="kbd">Q = Cycle</span>
          </div>
        </div>
      </header>
      <div className="grid">
        <div className="card">
          {!locked && <>
            <label>Home Team</label><select value={homeIndex} onChange={e=>setHomeIndex(+e.target.value)}>{TEAMS.map((t,i)=>(<option key={i} value={i}>{t.name}</option>))}</select>
            <label>Away Team</label><select value={awayIndex} onChange={e=>setAwayIndex(+e.target.value)}>{TEAMS.map((t,i)=>(<option key={i} value={i}>{t.name}</option>))}</select>
            <div style={{display:'flex',gap:8}}>
              <div style={{flex:1}}><label>Game Length</label><select value={len} onChange={e=>setLen(+e.target.value)}><option value={60}>Short</option><option value={120}>Standard</option><option value={180}>Extended</option></select></div>
              <div style={{flex:1}}><label>Playbook</label><select value={selectedPlay} onChange={e=>setSelectedPlay(e.target.value as any)}><option value="go">Go</option><option value="post">Post</option><option value="slant">Slant</option><option value="run">Draw</option></select></div>
              <div style={{flex:1}}><label>Defense</label><select value={shell} onChange={e=>setShell(e.target.value as any)}><option value="cover3">Cover 3</option><option value="cover2">Cover 2</option><option value="man">Man</option></select></div>
            </div>
          </>}
          <div style={{height:8}} />
          <button onClick={initGame}>Kickoff</button>
          <div style={{height:12}} />
          {!recording? <button onClick={startRecording}>Start Recording</button> : <button onClick={stopRecording}>Stop & Save Clip</button>}
        </div>
        <div style={{position:'relative'}}>
          <div style={{display:'flex',justifyContent:'space-between',gap:8,margin:'8px 0'}}>
            <div>{TEAMS[homeIndex].name} — {homeScore}</div><div>Live</div><div>{TEAMS[awayIndex].name} — {awayScore}</div>
          </div>
          <canvas ref={canvasRef} width={CANVAS_W} height={CANVAS_H} />
          {showOverlay && <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center'}}><div className="card"><strong>Press Kickoff to start</strong></div></div>}
          <MobileControls onPress={onPress} />
        </div>
      </div>
    </div>
  )
}
