
export const runtime = 'nodejs'
import { NextResponse } from 'next/server'
import crypto from 'crypto'
export async function GET(){ const secret=process.env.LEADERBOARD_SECRET||'dev-secret'; const exp=Math.floor(Date.now()/1000)+300; const nonce=crypto.randomBytes(16).toString('hex'); const payload=Buffer.from(JSON.stringify({exp,nonce})).toString('base64url'); const sig=crypto.createHmac('sha256',secret).update(payload).digest('base64url'); return NextResponse.json({ payload, sig }) }
