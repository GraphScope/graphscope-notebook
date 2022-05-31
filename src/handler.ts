import { IDisposable } from '@lumino/disposable';

import { KernelMessage } from '@jupyterlab/services';

import { ISessionContext } from '@jupyterlab/apputils';

import { IExecuteInputMsg } from '@jupyterlab/services/lib/kernel/messages';

import { IExecuteResult } from '@jupyterlab/nbformat';

import { ISignal, Signal } from '@lumino/signaling';

import { KernelConnector } from './kernelconnector';

import { VariableInspector } from './variableinspector';

/**
 * Class that handles code inspection.
 */
export class VariableInspectionHandler
  implements IDisposable, VariableInspector.IInspectable
{
  constructor(options: VariableInspectionHandler.IOptions) {
    this._id = options.id;
    this._connector = options.connector;
    this._initScript = options.initScript;
    this._queryCommand = options.queryCommand;
    // this._deleteCommand = options.deleteCommand;

    this._ready = this._connector.ready.then(() => {
      this._initOnKernel().then((msg: KernelMessage.IExecuteReplyMsg) => {
        // monitor kernel io message after initialization
        //
        // connect to the kennel iopubMessage signal to act on
        // whatever the current kernel's iopubMessage signal is producing.
        this._connector.iopubMessage.connect(this._queryCall, this);
        return;
      });
    });

    // subscribe to kernel restart changed
    this._connector.kernelRestarted.connect((sender, ready: Promise<void>) => {
      const title: VariableInspector.IVariableTitle = {
        contextName: '<b>Restarting kernel</b> '
      };
      this._inspected.emit({
        title: title,
        payload: []
      } as VariableInspector.IVariableInspectorUpdate);

      this._ready = ready.then(() => {
        this._initOnKernel().then((msg: KernelMessage.IExecuteReplyMsg) => {
          this._connector.iopubMessage.connect(this._queryCall, this);
          this.performInspection();
        });
      });
    });
  }

  get id(): string {
    return this._id;
  }

  /**
   * Signal emitted when the handler is disposed.
   */
  get disposed(): ISignal<VariableInspectionHandler, void> {
    return this._disposed;
  }

  get isDisposed(): boolean {
    return this._isDisposed;
  }

  get ready(): Promise<void> {
    return this._ready;
  }

  /**
   * Signal emitted when an inspector value is generated.
   */
  get inspected(): ISignal<
    VariableInspectionHandler,
    VariableInspector.IVariableInspectorUpdate
  > {
    return this._inspected;
  }

  /**
   * Disposes the kernel connector.
   */
  dispose(): void {
    if (!this.isDisposed) {
      this._isDisposed = true;
      this._disposed.emit(void 0);
      Signal.clearData(this);
    }
  }

  /**
   * Performs variable inspection by sending an execute request with the query comand
   */
  public performInspection(): void {
    const content: KernelMessage.IExecuteRequestMsg['content'] = {
      code: this._queryCommand,
      stop_on_error: false,
      store_history: false
    };
    this._connector.execute_with_callback(
      content,
      this._handleQueryResponse.bind(this)
    );
  }

  private _handleQueryResponse(response: KernelMessage.IIOPubMessage): void {
    const type = response.header.msg_type;
    switch (type) {
      case 'execute_result': {
        const payload = response.content as IExecuteResult;
        let content: string = payload.data['text/plain'] as string;
        if (content.slice(0, 1) === "'" || content.slice(0, 1) === '"') {
          content = content.slice(1, -1);
          content = content.replace(/\\"/g, '"').replace(/\\'/g, "'");
        }
        const title = {
          kernelName: this._connector.kernelName || '',
          contextName: ''
        };
        if (!content) {
          this._inspected.emit({
            title: title,
            payload: []
          } as VariableInspector.IVariableInspectorUpdate);
        } else {
          const update = JSON.parse(content) as VariableInspector.IVariable[];
          this._inspected.emit({
            title: title,
            payload: update
          } as VariableInspector.IVariableInspectorUpdate);
        }
        break;
      }
      default:
        break;
    }
  }

  /**
   * Initializes the kernel by running the setup script.
   */
  private _initOnKernel(): Promise<KernelMessage.IExecuteReplyMsg> {
    const content: KernelMessage.IExecuteRequestMsg['content'] = {
      code: this._initScript,
      stop_on_error: false,
      silent: true
    };
    return this._connector.execute_with_callback(content, () => {
      // no operation
    });
  }

  /**
   * Invokes a inspection if the signal emitted from the kernel is
   * an 'execute_input' msg.
   */
  private _queryCall(sess: ISessionContext, msg: KernelMessage.IMessage): void {
    const type = msg.header.msg_type;
    switch (type) {
      case 'execute_input': {
        const code = (msg as IExecuteInputMsg).content.code;
        if (!(code === this._queryCommand)) {
          this.performInspection();
        }
        break;
      }
      default:
        break;
    }
  }

  private _id: string;
  private _connector: KernelConnector;
  private _initScript: string;
  private _queryCommand: string;
  // private _deleteCommand: string;

  // signal
  private _disposed = new Signal<this, void>(this);
  private _inspected = new Signal<
    this,
    VariableInspector.IVariableInspectorUpdate
  >(this);
  private _isDisposed = false;
  private _ready: Promise<void>;
}

/**
 * Namespace for inspection handler.
 */
export namespace VariableInspectionHandler {
  /**
   * Instantiation options for an inspection handler.
   */
  export interface IOptions {
    id: string;
    connector: KernelConnector;
    initScript: string;
    queryCommand: string;
    // deleteCommand: string,
  }
}
