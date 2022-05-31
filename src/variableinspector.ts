import { ISignal } from '@lumino/signaling';

/**
 * Interface for an inspector.
 */
export interface IVariableInspector {
  handler: VariableInspector.IInspectable | null;
}

/**
 * Namespace for inspector interfaces.
 */
export namespace VariableInspector {
  export interface IInspectable {
    inspected: ISignal<any, IVariableInspectorUpdate>;
    disposed: ISignal<any, void>;
    performInspection(): void;
    // performDelete(name: string): void;
  }

  export interface IVariableInspectorUpdate {
    title: IVariableTitle;
    payload: Array<IVariable>;
  }

  export interface IVariable {
    name: string;
    type: string;
    content: string;
    props: {
      session_id: string;
      state: string;
    };
    size?: string;
    shape?: string; // Shape currently reserved for tensor/dataframe.
  }

  export interface IVariableTitle {
    kernelName?: string;
    contextName?: string; // Context currently reserved for special information.
  }
}
