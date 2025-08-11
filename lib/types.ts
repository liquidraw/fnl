
export type Team = { name: string; colors: [string,string]; logo?: string };
export type Controls = { left:boolean; right:boolean; up:boolean; down:boolean; snap:boolean; passBullet:boolean; passLob:boolean; cycle:boolean; pause:boolean; reset:boolean }
export type SeasonRound = { a:number; b:number; winner?:number; score?:[number,number] }
export type SeasonState = { teams:number[]; rounds:{ qf:SeasonRound[]; sf:SeasonRound[]; f:SeasonRound[] }; champion?:number }
export type Records = Record<string, { w:number; l:number; pf:number; pa:number }>
