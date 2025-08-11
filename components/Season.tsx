
'use client'
import React, { useEffect, useState } from 'react'
import { TEAMS } from '@/lib/teams'
import type { SeasonState, Records } from '@/lib/types'
import Game from './Game'

function loadRecords(): Records{ try{ return JSON.parse(localStorage.getItem('hofn-records')||'{}') }catch{ return {} } }
function saveRecords(r: Records){ localStorage.setItem('hofn-records', JSON.stringify(r)) }

async function getToken(){ try{ const r=await fetch('/api/token'); if(!r.ok) return null; return await r.json() }catch{ return null } }
async function reportGlobal(payload:any, token:any){ try{ await fetch('/api/leaderboard',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...payload,token})}) }catch{} }

export default function Season(){
  const [selection,setSelection]=useState<number[]>(()=>Array.from({length:8},(_,i)=>i))
  const [season,setSeason]=useState<SeasonState|null>(null)
  const [records,setRecords]=useState<Records>({})
  const [live,setLive]=useState<{round:'qf'|'sf'|'f';idx:number;a:number;b:number}|null>(null)
  const [globalTop,setGlobalTop]=useState<any[]>([])

  useEffect(()=>{ setRecords(loadRecords()) },[])
  useEffect(()=>{ (async()=>{ try{ const resp=await fetch('/api/leaderboard.csv'); if(resp.ok){ const text=await resp.text(); const rows=text.trim().split('\n').slice(1).map(l=>l.split(',')); setGlobalTop(rows.map(([team,w,l,pf,pa])=>({team,w:+w,l:+l,pf:+pf,pa:+pa}))) } }catch{} })() },[season])

  const startSeason=()=> setSeason({ teams:selection.slice(0,8), rounds:{ qf:[{a:selection[0],b:selection[7]},{a:selection[3],b:selection[4]},{a:selection[1],b:selection[6]},{a:selection[2],b:selection[5]}], sf:[{a:-1,b:-1},{a:-1,b:-1}], f:[{a:-1,b:-1}] } })
  const playMatch=(round:'qf'|'sf'|'f', idx:number, a:number, b:number)=> setLive({round,idx,a,b})

  const onFinal=async(h:number,a:number,hs:number,as:number)=>{
    if(!season||!live) return
    const r:SeasonState=JSON.parse(JSON.stringify(season)); const winnerIdx=hs>=as?h:a; const loserIdx=hs>=as?a:h
    const roundObj=(r.rounds as any)[live.round][live.idx]; roundObj.winner=winnerIdx; roundObj.score=[hs,as]
    if(live.round==='qf'){ const target=Math.floor(live.idx/2); const slot=(live.idx%2===0)?'a':'b'; (r.rounds.sf[target] as any)[slot]=winnerIdx }
    else if(live.round==='sf'){ const slot=(live.idx===0)?'a':'b'; (r.rounds.f[0] as any)[slot]=winnerIdx }
    else if(live.round==='f'){ r.champion=winnerIdx }
    setSeason(r); setLive(null)
    const wn=TEAMS[winnerIdx].name, ln=TEAMS[loserIdx].name; const recs:Records={...records}
    recs[wn]={ w:(recs[wn]?.w||0)+1, l:recs[wn]?.l||0, pf:(recs[wn]?.pf||0)+Math.max(hs,as), pa:(recs[wn]?.pa||0)+Math.min(hs,as) }
    recs[ln]={ w:recs[ln]?.w||0, l:(recs[ln]?.l||0)+1, pf:(recs[ln]?.pf||0)+Math.min(hs,as), pa:(recs[ln]?.pa||0)+Math.max(hs,as) }
    setRecords(recs); saveRecords(recs)
    const token=await getToken(); await reportGlobal({ winner:wn, loser:ln, winnerScore:Math.max(hs,as), loserScore:Math.min(hs,as) }, token)
  }

  return (
    <div className="card" style={{marginTop:12}}>
      <h2 style={{marginTop:0}}>Season Mode — 8‑Team Bracket</h2>
      {!season && <div>
        <p>Select 8 teams to seed the bracket (1 vs 8, 4 vs 5, 2 vs 7, 3 vs 6).</p>
        {selection.map((val,i)=>(
          <div key={i} style={{display:'flex',gap:8,alignItems:'center',margin:'6px 0'}}>
            <span style={{display:'inline-block',width:24,textAlign:'center',border:'1px solid #555',borderRadius:6}}>{i+1}</span>
            <select value={selection[i]} onChange={e=>{const copy=selection.slice(); copy[i]=+e.target.value; setSelection(copy)}} style={{flex:1}}>
              {TEAMS.map((t,idx)=>(<option key={idx} value={idx}>{t.name}</option>))}
            </select>
          </div>
        ))}
        <button onClick={startSeason} style={{marginTop:8}}>Start Season</button>
      </div>}
      {season && <>
        <h3>Quarterfinals</h3>
        <table className="table"><thead><tr><th>#</th><th>Home</th><th>Away</th><th>Score</th><th>Action</th></tr></thead><tbody>
          {season.rounds.qf.map((m,i)=>(<tr key={i}><td>QF{i+1}</td><td>{TEAMS[m.a].name}</td><td>{TEAMS[m.b].name}</td><td>{m.score?`${m.score[0]} - ${m.score[1]}`:'—'}</td><td>{m.winner!=null?<span>Winner: {TEAMS[m.winner].name}</span>:<button onClick={()=>playMatch('qf',i,m.a,m.b)}>Play Match</button>}</td></tr>))}
        </tbody></table>
        <h3>Semifinals</h3>
        <table className="table"><thead><tr><th>#</th><th>Home</th><th>Away</th><th>Score</th><th>Action</th></tr></thead><tbody>
          {season.rounds.sf.map((m,i)=>(<tr key={i}><td>SF{i+1}</td><td>{m.a>=0?TEAMS[m.a].name:'TBD'}</td><td>{m.b>=0?TEAMS[m.b].name:'TBD'}</td><td>{m.score?`${m.score[0]} - ${m.score[1]}`:'—'}</td><td>{m.a>=0&&m.b>=0?(m.winner!=null?<span>Winner: {TEAMS[m.winner].name}</span>:<button onClick={()=>playMatch('sf',i,m.a,m.b)}>Play Match</button>):'—'}</td></tr>))}
        </tbody></table>
        <h3>Final</h3>
        <table className="table"><thead><tr><th>#</th><th>Home</th><th>Away</th><th>Score</th><th>Action</th></tr></thead><tbody>
          {season.rounds.f.map((m,i)=>(<tr key={i}><td>F</td><td>{m.a>=0?TEAMS[m.a].name:'TBD'}</td><td>{m.b>=0?TEAMS[m.b].name:'TBD'}</td><td>{m.score?`${m.score[0]} - ${m.score[1]}`:'—'}</td><td>{m.a>=0&&m.b>=0?(m.winner!=null?<span>Winner: {TEAMS[m.winner].name}</span>:<button onClick={()=>playMatch('f',i,m.a,m.b)}>Play Match</button>):'—'}</td></tr>))}
        </tbody></table>
      </>}

      <div style={{display:'flex',alignItems:'center',gap:8}}>
        <h3 style={{margin:0}}>Leaderboard (Global)</h3>
        <a href="/api/leaderboard.csv" style={{textDecoration:'underline'}}>Download CSV</a>
      </div>
      <table className="table"><thead><tr><th>Team</th><th>W</th><th>L</th><th>PF</th><th>PA</th><th>Diff</th></tr></thead><tbody>
        {globalTop.length===0?<tr><td colSpan={6}>Global board unavailable (no DB configured).</td></tr>:globalTop.map((row:any)=>(<tr key={row.team}><td>{row.team}</td><td>{row.w}</td><td>{row.l}</td><td>{row.pf}</td><td>{row.pa}</td><td>{row.pf-row.pa}</td></tr>))}
      </tbody></table>

      {live && <div className="card" style={{marginTop:12}}>
        <h3>Live Match</h3><p>Round: {live.round.toUpperCase()} • {TEAMS[live.a].name} vs {TEAMS[live.b].name}</p>
        <Game initialHomeIndex={live.a} initialAwayIndex={live.b} locked onFinal={(h,a,hs,as)=>onFinal(h,a,hs,as)} />
      </div>}
    </div>
  )
}
