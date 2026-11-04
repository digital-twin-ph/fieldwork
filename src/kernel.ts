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
  // Regression, experiment 167: a design set row by row, fitted, then read back.
  glm_reset(rows:number,cols:number):number; glm_set_x(row:number,col:number,value:number):number;
  glm_set_row(row:number,outcome:number,offset:number,stratum:number):number;
  glm_fit(family:number,stratified:number,maxIter:number,tol:number):number;
  glm_coefficient(col:number):number; glm_covariance(row:number,col:number):number;
  glm_hac_covariance(col:number,other:number,lag:number,stratified:number):number;
  glm_iterations():number; glm_loglik():number; glm_pearson():number;
  glm_used_rows():number; glm_used_strata():number; glm_dropped_strata():number; glm_fitted_value(row:number):number;
}
const bytes=Uint8Array.from(atob(KERNEL_BASE64),character=>character.charCodeAt(0));
export const kernel=(await WebAssembly.instantiate(bytes,{})).instance.exports as unknown as Kernel;
