
export const runtime = 'nodejs'
import { NextResponse } from 'next/server'
import { Pool } from 'pg'
const connStr=process.env.DATABASE_URL
function getPool(){ if(!connStr) return null; return new Pool({ connectionString: connStr, ssl: connStr.includes('sslmode=require')?{rejectUnauthorized:false}:undefined }) }
export async function GET(){ const pool=getPool(); if(!pool) return new NextResponse('team,w,l,pf,pa\n',{headers:{'Content-Type':'text/csv'}}); const q=`select team,sum(w)::int as w,sum(l)::int as l,sum(pf)::int as pf,sum(pa)::int as pa from hofn_leaderboard group by team order by sum(w) desc,(sum(pf)-sum(pa)) desc limit 200`; const r=await pool.query(q); await pool.end(); const rows=['team,w,l,pf,pa',...r.rows.map((x:any)=>`${x.team},${x.w},${x.l},${x.pf},${x.pa}`)].join('\n'); return new NextResponse(rows,{headers:{'Content-Type':'text/csv'}}) }
