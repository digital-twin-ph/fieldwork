/** Colour theme: an explicit light or dark choice, or following the device.
 *  The device option is the default, so a first visit matches the operating system. */
export type ThemePreference='light'|'dark'|'device';
export type ResolvedTheme='light'|'dark';
export const THEME_KEY='fieldwork.theme.v1';
export const THEME_PREFERENCES:readonly ThemePreference[]=['device','light','dark'];
export const THEME_LABELS:Readonly<Record<ThemePreference,string>>={device:'Match device',light:'Light',dark:'Dark'};
export const isThemePreference=(value:unknown):value is ThemePreference=>
  typeof value==='string'&&(THEME_PREFERENCES as readonly string[]).includes(value);
/** What a preference resolves to, given what the device asks for. Pure, so it is testable
 *  without a browser and cannot drift from the CSS selectors it mirrors. */
export const resolveTheme=(preference:ThemePreference,devicePrefersDark:boolean):ResolvedTheme=>
  preference==='device'?(devicePrefersDark?'dark':'light'):preference;
/** An unreadable or unrecognised stored value falls back to the device, never to an error. */
export function readThemePreference():ThemePreference{
  try{const stored=localStorage.getItem(THEME_KEY);return isThemePreference(stored)?stored:'device';}
  catch{return 'device';}
}
export function saveThemePreference(preference:ThemePreference):boolean{
  try{localStorage.setItem(THEME_KEY,preference);return true;}catch{return false;}
}
/** The attribute states the choice, not the outcome: the stylesheet resolves "device" itself
 *  through prefers-color-scheme, so a device change needs no JavaScript to take effect. */
export function applyTheme(preference:ThemePreference,root:HTMLElement=document.documentElement):void{
  root.setAttribute('data-theme',preference);
}
export function deviceQuery():MediaQueryList|null{
  try{return window.matchMedia('(prefers-color-scheme: dark)');}catch{return null;}
}
/** Applies the stored preference and reports the resolved theme on every device change, so a
 *  caller can repaint anything drawn in canvas or SVG rather than styled by CSS. */
export function initTheme(onResolved?:(theme:ResolvedTheme,preference:ThemePreference)=>void):ThemePreference{
  const preference=readThemePreference();
  applyTheme(preference);
  const query=deviceQuery();
  const announce=()=>onResolved?.(resolveTheme(readThemePreference(),query?.matches??false),readThemePreference());
  query?.addEventListener?.('change',announce);
  announce();
  return preference;
}
