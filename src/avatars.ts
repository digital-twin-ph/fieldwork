/** AVATARS (experiment 218, 2026-11-16). The practitioner: *"Can the identity button sport an avatar?"*, then *"It could
 *  also be custom FW avatars"*, and *"Yes build both so we can also see the UI."*
 *
 *  Two pictures, for two jobs:
 *
 *  - **Your avatar**: an icon from Fieldwork's own set on a colour you choose, kept in the identity file as two short
 *    names, so it costs no bytes, needs no photo and works offline. Your initials until you choose one.
 *  - **The key pattern**: drawn from a public key, the same key always the same picture, shown beside a signature. Two
 *    signers with one name and different keys look different, which is where telling them apart matters.
 *
 *  Pure: each returns SVG markup. Every colour carries white at WCAG AA or better (6.3:1 at the least); each avatar has
 *  a light ring so its shape holds on a dark page. */

/** The colours an avatar can take, each with white at 6.3:1 or more. */
export const AVATAR_COLOURS:readonly {id:string;label:string;hex:string}[]=[
  {id:'blue',label:'Blue',hex:'#1f5f8b'},{id:'green',label:'Green',hex:'#2e6b3a'},{id:'rust',label:'Rust',hex:'#8a3b12'},
  {id:'purple',label:'Purple',hex:'#6b3fa0'},{id:'crimson',label:'Crimson',hex:'#9b1d48'},{id:'slate',label:'Slate',hex:'#3d4a5c'},
  {id:'ochre',label:'Ochre',hex:'#755600'},{id:'teal',label:'Teal',hex:'#0f6b6b'},{id:'indigo',label:'Indigo',hex:'#4a4fa8'},
];

/** FIELDWORK'S ICONS, drawn for it on a 24-unit square as white strokes: the things of field work. */
export const AVATAR_ICONS:readonly {id:string;label:string;path:string}[]=[
  {id:'pin',label:'Map pin',path:'<path d="M12 21s6.5-6.6 6.5-11a6.5 6.5 0 1 0-13 0c0 4.4 6.5 11 6.5 11z"/><circle cx="12" cy="10" r="2.4"/>'},
  {id:'magnifier',label:'Magnifier',path:'<circle cx="10.5" cy="10.5" r="5.5"/><path d="M14.5 14.5 20 20"/>'},
  {id:'notebook',label:'Notebook',path:'<rect x="5.5" y="3.5" width="13" height="17" rx="1.8"/><path d="M9 8h6M9 12h6M9 16h4"/>'},
  {id:'pump',label:'Water pump',path:'<path d="M7 20.5h9M9.5 20.5v-11h4v11M13.5 11.5h3.5l1.5 2M9.5 9.5v-4h5.5M12 5.5V3"/>'},
  {id:'compass',label:'Compass',path:'<circle cx="12" cy="12" r="8.5"/><path d="M12 6.5l2.3 5.5-2.3 5.5-2.3-5.5z"/>'},
  {id:'thermometer',label:'Thermometer',path:'<path d="M12 3.5a2 2 0 0 1 2 2v8.8a3.8 3.8 0 1 1-4 0V5.5a2 2 0 0 1 2-2z"/><path d="M12 9v7"/>'},
  {id:'flask',label:'Flask',path:'<path d="M9 3.5h6M10.2 3.5v5.6L5.3 17.8a1.9 1.9 0 0 0 1.7 2.7h10a1.9 1.9 0 0 0 1.7-2.7l-4.9-8.7V3.5M7.8 15h8.4"/>'},
  {id:'chart',label:'Bar chart',path:'<path d="M4 20h16M7.5 20v-6M12 20V7.5M16.5 20v-9.5"/>'},
  {id:'house',label:'House',path:'<path d="M3.5 11 12 3.8l8.5 7.2M5.8 9.3v11.2h12.4V9.3M10 20.5v-5.5h4v5.5"/>'},
  {id:'globe',label:'Globe',path:'<circle cx="12" cy="12" r="8.5"/><ellipse cx="12" cy="12" rx="3.8" ry="8.5"/><path d="M3.5 12h17"/>'},
  {id:'tent',label:'Tent',path:'<path d="M3 20h18M12 4.5 4.5 20M12 4.5 19.5 20M12 12.5l-2.6 7.5M12 12.5l2.6 7.5"/>'},
  {id:'clipboard',label:'Clipboard',path:'<rect x="6" y="4.5" width="12" height="16" rx="1.8"/><rect x="9" y="3" width="6" height="3" rx="1"/><path d="m9 13 2 2 4-4"/>'},
  {id:'drop',label:'Water drop',path:'<path d="M12 3.5s5.8 6.6 5.8 10.6a5.8 5.8 0 0 1-11.6 0c0-4 5.8-10.6 5.8-10.6z"/>'},
];
export interface AvatarChoice {icon:string; colour:string}
export const isAvatarChoice=(v:unknown):v is AvatarChoice=>!!v&&typeof v==='object'
  &&AVATAR_ICONS.some(i=>i.id===(v as AvatarChoice).icon)&&AVATAR_COLOURS.some(c=>c.id===(v as AvatarChoice).colour);

const escape=(s:string)=>s.replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]!));
/** Up to two initials: the first letters of the first and last words of a name. */
export function initials(name:string):string{
  const words=name.trim().split(/\s+/).filter(Boolean);
  const first=[...(words[0]??'?')][0]??'?',last=words.length>1?[...words.at(-1)!][0]??'':'';
  return (first+last).toLocaleUpperCase();
}

/** YOUR AVATAR: the chosen icon on its colour, or your initials on slate. Decorative: the name always stands beside it. */
export function avatarSvg(profile:{name:string;avatar?:AvatarChoice},size=32):string{
  const choice=profile.avatar&&isAvatarChoice(profile.avatar)?profile.avatar:undefined;
  const fill=AVATAR_COLOURS.find(c=>c.id===(choice?.colour??'slate'))!.hex;
  const icon=choice&&AVATAR_ICONS.find(i=>i.id===choice.icon);
  const inner=icon
    ?`<g transform="translate(4.2 4.2) scale(0.65)" fill="none" stroke="#fff" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">${icon.path}</g>`
    :`<text x="12" y="12" dy="0.36em" text-anchor="middle" font-family="system-ui,sans-serif" font-size="9.5" font-weight="700" fill="#fff">${escape(initials(profile.name))}</text>`;
  return `<svg class="fw-avatar" width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">`
    +`<circle cx="12" cy="12" r="11.2" fill="${fill}" stroke="#fff" stroke-width="1.2"/>${inner}</svg>`;
}

/** AN ICON OF THE SET, by itself, for the chooser. */
export function iconSvg(id:string,colour:string,size=48):string{
  return avatarSvg({name:'',avatar:{icon:id,colour}},size);
}

/** THE KEY PATTERN: a 5 by 5 grid mirrored left to right, its cells and colour read from the key's own bytes. The
 *  bytes read are the key's last 16, which for both algorithms are the key itself and not the fixed header before it. */
export function keyPatternSvg(publicKey:string,size=24):string{
  let bytes:number[];
  try{bytes=[...atob(publicKey)].map(c=>c.charCodeAt(0));}catch{bytes=[];}
  const tail=bytes.slice(-16);while(tail.length<16)tail.push(0);
  const colour=AVATAR_COLOURS[tail[0]!%AVATAR_COLOURS.length]!.hex;
  const cells:string[]=[];
  for(let row=0;row<5;row++)for(let col=0;col<3;col++){
    const bit=row*3+col,on=(tail[1+(bit>>3)]!>>(bit&7))&1;
    if(!on)continue;
    for(const x of col===2?[2]:[col,4-col])cells.push(`<rect x="${2+x*4}" y="${2+row*4}" width="4" height="4"/>`);
  }
  return `<svg class="key-pattern" width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">`
    +`<rect x="0.5" y="0.5" width="23" height="23" rx="3" fill="#fff" stroke="#6b7480"/><g fill="${colour}">${cells.join('')}</g></svg>`;
}
