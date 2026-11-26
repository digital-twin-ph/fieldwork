/** THE ONE HTML ESCAPE: the five characters that can change the meaning of markup, the apostrophe included, because
 *  a single-quoted attribute is as much an attribute as a double-quoted one. In a module of its own, naming no DOM
 *  type, so a worker, an exporter and a dialog can all import it; `inspector-kit.ts` re-exports it.
 *
 *  The code review of 2026-11-23 counted the copies. 0.185.0 brought four identical ones here. On 2026-11-25 the
 *  rest followed: eight more of the five-character rule, three that escaped only `&`, `<` and `>`, and seven places
 *  that left out the apostrophe. None of the weaker ones was a defect where it stood, because no template here puts
 *  a value in a single-quoted attribute; which rule ran was still a property of which file you happened to be in.
 *  `tests/escape-html.test.mjs` fails if a module defines its own again.
 *
 *  `unknown` in, because every caller was already stringifying: a number, a null and a missing value are all
 *  things a surface puts in front of a reader. */
import type {Escape} from './types.js';

export const escapeHtml:Escape=(s:unknown)=>String(s??'').replace(/[&<>"']/g,
  c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
