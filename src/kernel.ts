/** The Rust epi kernel, loaded once. Experiment 161.
 *
 *  Top-level await so every caller can stay synchronous: a measure is arithmetic, and making each
 *  one async would change every step above it for nothing. The bytes are embedded, so there is no
 *  fetch that can fail offline. If this cannot instantiate the module fails to load, which is
 *  right: a kernel that quietly returned nothing would be worse than an application that stops. */
import {KERNEL_BASE64} from './kernel-bytes.js';

type Cells=(a:number,b:number,c:number,d:number)=>number;
type Bound=(a:number,b:number,c:number,d:number,z:number)=>number;
export interface Kernel {
  risk_ratio:Cells; odds_ratio:Cells; risk_difference:Cells; rate_ratio:Cells;
  risk_ratio_ci_lower:Bound; risk_ratio_ci_upper:Bound;
  odds_ratio_ci_lower:Bound; odds_ratio_ci_upper:Bound;
  risk_difference_ci_lower:Bound; risk_difference_ci_upper:Bound;
  rate_ratio_ci_lower:Bound; rate_ratio_ci_upper:Bound;
}
const bytes=Uint8Array.from(atob(KERNEL_BASE64),character=>character.charCodeAt(0));
export const kernel=(await WebAssembly.instantiate(bytes,{})).instance.exports as unknown as Kernel;
