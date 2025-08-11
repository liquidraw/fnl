
'use client'
type Props = { onPress: (key: string, down: boolean)=>void }
export default function MobileControls({ onPress }: Props){
  const Btn = ({label, code}:{label:string;code:string}) => (
    <div className="btn" onPointerDown={(e)=>{e.preventDefault();onPress(code,true)}} onPointerUp={(e)=>{e.preventDefault();onPress(code,false)}} role="button">{label}</div>
  )
  return (
    <div className="mobile-controls" style={{position:'absolute',left:12,right:12,bottom:12,display:'flex',justifyContent:'space-between'}}>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,56px)',gridTemplateRows:'repeat(3,56px)',gap:8}}>
        <div /><Btn label="↑" code="ArrowUp" /><div />
        <Btn label="←" code="ArrowLeft" /><div /><Btn label="→" code="ArrowRight" />
        <div /><Btn label="↓" code="ArrowDown" /><div />
      </div>
      <div style={{display:'flex',gap:8}}>
        <Btn label="Snap" code="KeyS" />
        <Btn label="Bullet" code="KeyD" />
        <Btn label="Lob" code="KeyA" />
        <Btn label="Cycle" code="KeyQ" />
      </div>
    </div>
  )
}
