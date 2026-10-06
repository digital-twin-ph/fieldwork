export interface ReasonerQuad {
  subject: string;
  subjectType?: string;
  predicate: string;
  object: string;
  objectType?: string;
  datatype?: string;
  language?: string;
}
export interface ReasoningRequest { id: number; input: string }
export type ReasoningResponse = { id: number; quads: ReasonerQuad[] } | { id: number; error: string };
export type Reasoner = (input: string) => Promise<ReasonerQuad[]>;
