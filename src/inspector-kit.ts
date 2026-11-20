/** WHAT A WIDGET'S OWN INSPECTOR IS GIVEN BY THE APPLICATION (2026-11-19). The practitioner, on splitting app.ts: *"We
 *  can be opportunistic again with app.ts like we did with widgets."* A widget touched for any reason moves its
 *  Inspector out of app.ts into its own module, which draws the standard sections (experiment 186) with these and never
 *  reaches into the application's state. The Name field and the input lists are wired by the application, by their
 *  data attributes, as they are for every step. */
import type {Escape,Workflow,WorkflowNode,NodeType} from './types.js';

export interface InspectorKit {
  esc:Escape;
  /** A standard section: Name, Inputs, Settings or Result. */
  section:(name:string,body:string)=>string;
  /** The Name field, its id given by the widget. */
  name:(id:string,value:string)=>string;
  /** One input list per port, in the widget's own words where given. */
  inputs:(n:WorkflowNode,labels?:Record<string,string>)=>string;
  /** The workflow as it stands, to read; never written through this. */
  workflow:()=>Workflow;
  /** The one way to change it: the change is applied, saved and the canvas redrawn, as every step's are. */
  change:(edit:(w:Workflow)=>void)=>void;
}

/** A widget's Inspector held in its own module: the markup of its sections, and what its controls do once drawn. */
export interface OwnInspector<T extends NodeType> {
  markup:(n:WorkflowNode<T>,kit:InspectorKit)=>string;
  wire:(n:WorkflowNode<T>,kit:InspectorKit,root:ParentNode)=>void;
}

/** WHAT A STEP'S INSPECTOR READS OF THE LAST RUN, and the one change that must reach storage (2026-11-20, for the
 *  widgets moved out of app.ts with this release: Append rows, Relate, Tabular data, Sample a raster, Raster input). */
export interface StepKit extends InspectorKit {
  /** The method the last run's receipt states for the step, if it ran. */
  method:(nodeId:string)=>string|undefined;
  /** Why the last run could not compute the step, if it could not. */
  unfinished:(nodeId:string)=>string|undefined;
  /** The table on one of the step's input ports, where the last run left one. */
  tableOn:(nodeId:string,port:string)=>import('./data-table.js').DataTable|undefined;
  /** A widget's title, as the library names it. */
  title:(type:NodeType)=>string;
  /** A change the project must keep: refused, and said, where storage is full. */
  keep:(edit:(w:Workflow)=>void)=>void;
}
