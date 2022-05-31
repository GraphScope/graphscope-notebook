import { ISessionContext } from '@jupyterlab/apputils';

import {
  IExecuteReplyMsg,
  IExecuteRequestMsg
} from '@jupyterlab/services/lib/kernel/messages';

import { IShellFuture } from '@jupyterlab/services/lib/kernel/kernel';

import { ISignal, Signal } from '@lumino/signaling';

import { KernelMessage } from '@jupyterlab/services';

/**
 * Connector class that handles interactions(execute request) with a kernel
 */
export class KernelConnector {
  constructor(options: KernelConnector.IOptions) {
    this._session_context = options.session_context;

    // register signal for kernel restart
    this._session_context.statusChanged.connect(
      (sender: ISessionContext, newStatus: KernelMessage.Status) => {
        switch (newStatus) {
          case 'restarting':
          case 'autorestarting':
            this._kernelRestarted.emit(this._session_context.ready);
            break;
          default:
            break;
        }
      }
    );
  }

  get kernelRestarted(): ISignal<KernelConnector, Promise<void>> {
    return this._kernelRestarted;
  }

  get kernelLanguage(): Promise<string> {
    return this._session_context!.session!.kernel!.info.then(infoReply => {
      return infoReply.language_info.name;
    });
  }

  get kernelName(): string {
    return this._session_context.kernelDisplayName;
  }

  /**
   * A promise that is fulfilled when the session assosiated with the connector is ready.
   */
  get ready(): Promise<void> {
    return this._session_context.ready;
  }

  /**
   * A signal emitted for a kernel messages.
   */
  get iopubMessage(): ISignal<ISessionContext, KernelMessage.IMessage> {
    return this._session_context.iopubMessage;
  }

  /**
   * Execute the given request on the kernel associated with the connector.
   */
  execute_with_callback(
    content: KernelMessage.IExecuteRequestMsg['content'],
    ioCallback: (msg: KernelMessage.IIOPubMessage) => any
  ): Promise<KernelMessage.IExecuteReplyMsg> {
    const kernel = this._session_context!.session!.kernel;
    if (!kernel) {
      return Promise.reject(new Error('No kernel found.'));
    }

    // execute the request
    const future = kernel.requestExecute(content);
    future.onIOPub = (msg: KernelMessage.IIOPubMessage): void => {
      ioCallback(msg);
    };
    return future.done as Promise<KernelMessage.IExecuteReplyMsg>;
  }

  execute(
    content: KernelMessage.IExecuteRequestMsg['content']
  ): IShellFuture<IExecuteRequestMsg, IExecuteReplyMsg> {
    return this._session_context.session!.kernel!.requestExecute(content);
  }

  private _session_context: ISessionContext;
  private _kernelRestarted = new Signal<this, Promise<void>>(this);
}

/**
 * KernelConnector Options
 */
export namespace KernelConnector {
  export interface IOptions {
    session_context: ISessionContext;
  }
}
