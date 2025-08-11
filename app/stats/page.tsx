
export const dynamic = 'force-dynamic'
async function getCSV(){ const r = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/leaderboard.csv`, { cache: 'no-store' }); return await r.text() }
export default async function StatsPage(){ const csv = await getCSV(); return (<div className="container"><h1>Global Leaderboard (CSV)</h1><a className="kbd" href="/api/leaderboard.csv">Download CSV</a><pre style={{whiteSpace:'pre-wrap'}}>{csv}</pre></div>) }
