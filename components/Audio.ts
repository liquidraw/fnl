
export class Sfx{
  ctx: AudioContext | null = null
  ensure(){ if(!this.ctx) this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)() }
  tone(freq:number, dur=0.12, type: OscillatorType='square', gain=0.04){
    this.ensure(); if(!this.ctx) return
    const o = this.ctx.createOscillator(); const g = this.ctx.createGain()
    o.type = type; o.frequency.value = freq
    g.gain.setValueAtTime(gain, this.ctx.currentTime)
    g.gain.exponentialRampToValueAtTime(0.00001, this.ctx.currentTime + dur)
    o.connect(g); g.connect(this.ctx.destination); o.start(); o.stop(this.ctx.currentTime + dur)
  }
  snap(){ this.tone(220,0.06,'square',0.06) } pass(){ this.tone(440,0.08,'triangle',0.05) }
  catch(){ this.tone(523.25,0.12,'sine',0.07) } tackle(){ this.tone(110,0.16,'sawtooth',0.07) }
  whistle(){ this.tone(1760,0.25,'sine',0.05) } td(){ this.tone(659.25,0.4,'triangle',0.06); this.tone(523.25,0.2,'triangle',0.05) }
  crowd(){ this.tone(200,0.6,'sawtooth',0.01) }
}
