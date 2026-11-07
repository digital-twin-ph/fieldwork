/** GUIDE QUESTIONS FOR EACH PART OF THE WRITE-UP, shown where a note is written and printed in the Notes page of the
 *  manual, which `tests/imrad-guide.test.mjs` holds to the same wording.
 *
 *  Drawn, in this project's own words, from the CDC/TEPHINET scientific writing course built for FETP residents
 *  (docs/research/fetp-imrad-tephinet-2026-11-07.md): each question turns one of the jobs or faults the course names
 *  for that part into something a writer can ask of a draft. Questions rather than rules, because prompts that ask for
 *  a judgement do better than ones that ask for a label (experiment 183), and a writer can hide them once they are
 *  habit. References has none: it is assembled from what the notes cite. */
import type {WriteUpPart} from './notes.js';

export const GUIDE_QUESTIONS:Partial<Record<WriteUpPart,string[]>>={
  Introduction:[
    'What is the gap in knowledge, and why does filling it matter?',
    'What did earlier studies leave open that this study addresses?',
    'Does the last sentence state the objective?',
    'Is anything here background a reader does not need, or a result?',
  ],
  Methods:[
    'Could someone repeat the study from what is written here?',
    'Is every variable defined, with how it was measured?',
    'Does every method have a result that answers it?',
    'Is anything here a finding rather than what was done?',
  ],
  Results:[
    'Does each result answer a method, in the same order?',
    'Is any sentence interpreting rather than reporting?',
    'Does the text say in a sentence or two what each table or figure shows, without restating it?',
    'Do the numbers add up, and agree with the tables?',
  ],
  Discussion:[
    'Is each conclusion beside the result that supports it?',
    'Does any conclusion or recommendation go further than the results support?',
    'How do these results compare with similar studies?',
    'Are the major limitations stated plainly, with what was done about them?',
  ],
};
