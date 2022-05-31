import {
  ILabShell,
  ILayoutRestorer,
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import {
  ICommandPalette,
  MainAreaWidget,
  WidgetTracker,
  showDialog,
  Dialog
} from '@jupyterlab/apputils';

import { ReadonlyJSONObject } from '@lumino/coreutils';

import { ITranslator } from '@jupyterlab/translation';

import { INotebookTracker, NotebookPanel } from '@jupyterlab/notebook';

import { CommandIDs, gsIcon, NAMESPACE } from './common';

import { ContextMenuManager } from './contextmenu';

import { VariableInspectionHandler } from './handler';

import { KernelConnector } from './kernelconnector';

import { IStateDB } from '@jupyterlab/statedb';

import { GSVariableManager, IGSVariableManager } from './manager';

import { Languages } from './scripts';

import { SidebarWidget, GraphOpWidget } from './widget';

/**
 * A service providing variable inspection.
 */
const variableinspector: JupyterFrontEndPlugin<IGSVariableManager> = {
  id: '@graphscope/variableinspector',
  autoStart: true,
  requires: [ILabShell, IStateDB],
  optional: [ICommandPalette, ILayoutRestorer, ITranslator],
  provides: IGSVariableManager,
  activate: (
    app: JupyterFrontEnd,
    labShell: ILabShell,
    statedb: IStateDB,
    palette: ICommandPalette | null,
    restorer: ILayoutRestorer | null,
    translator: ITranslator | null
  ): IGSVariableManager => {
    const { commands } = app;
    const trans = translator.load('jupyterlab');

    // context menu manager
    const contextMenuManager = new ContextMenuManager(commands, translator);
    contextMenuManager.init();

    // track and restore the widget state
    const tracker = new WidgetTracker<MainAreaWidget<GraphOpWidget>>({
      namespace: NAMESPACE
    });
    // register to command system
    let graphOpWidget: MainAreaWidget<GraphOpWidget>;
    const command = CommandIDs.open;
    commands.addCommand(command, {
      label: trans.__('Graph Schema'),
      icon: gsIcon,
      execute: args => {
        app.restored
          .then(() => statedb.fetch('@graphscope/variableinspector'))
          .then(value => {
            let sess: string;
            if (args !== null && 'sess' in args) {
              sess = args['sess'].toString();
            } else {
              sess = (value as ReadonlyJSONObject)['sess'] as string;
            }

            if (!graphOpWidget || graphOpWidget.isDisposed) {
              graphOpWidget = new MainAreaWidget({
                content: new GraphOpWidget({ sess: sess }, commands, translator)
              });
              // register to manager
              manager.registePanel(graphOpWidget.content);
              // track the panel
              tracker.add(graphOpWidget);
            }

            if (graphOpWidget.isAttached) {
              if (graphOpWidget.content.meta['sess'] !== sess) {
                showDialog({
                  title: trans.__('WARNING'),
                  body: trans.__(
                    `The graph schema panel already exists with different session "${graphOpWidget.content.meta['sess']}". Please close it first.`
                  ),
                  buttons: [Dialog.cancelButton()]
                }).catch(e => console.log(e));
                return;
              }
            } else {
              statedb.save('@graphscope/variableinspector', { sess });
              labShell.add(graphOpWidget, 'main', { mode: 'split-right' });
            }
            labShell.activateById(graphOpWidget.id);
          });
      }
    });

    // kernel variable manager
    const manager = new GSVariableManager();

    // add left sidebar with rank 501
    // rank(501-899): reserved for third-party extensions.
    const sideBarWidget = new SidebarWidget(commands, translator);
    labShell.add(sideBarWidget, 'left', { rank: 501 });

    if (restorer) {
      // Add the sidebar to the application restorer
      restorer.add(sideBarWidget, '@graphscope/sidebar:plugin');

      // Add the graph operation widget to the application restorer
      restorer.restore(tracker, {
        command,
        args: () => null,
        name: () => NAMESPACE
      });
    }

    manager.registePanel(sideBarWidget);
    return manager;
  }
};

/**
 * An extension that registers notebooks for gs variable inspection.
 */
const notebooks: JupyterFrontEndPlugin<void> = {
  id: '@graphscope/plugin:notebooks',
  autoStart: true,
  requires: [IGSVariableManager, INotebookTracker, ILabShell],
  activate: (
    app: JupyterFrontEnd,
    manager: IGSVariableManager,
    notebooks: INotebookTracker,
    labShell: ILabShell
  ): void => {
    const handlers: { [id: string]: Promise<VariableInspectionHandler> } = {};

    /**
     * Subcribes to the creation of new notebooks.
     *
     * If a new notebook is created, build a new handler for the notebook
     * and add a promise for a instanced handler to the 'handlers' collection.
     */
    notebooks.widgetAdded.connect((sender, nbPanel: NotebookPanel) => {
      handlers[nbPanel.id] = new Promise((resolve, reject) => {
        const session_context = nbPanel.sessionContext;
        const connector = new KernelConnector({ session_context });

        const script: Promise<Languages.LanguageModel> = connector.ready.then(
          () => {
            return connector.kernelLanguage.then(lang => {
              return Languages.getScript(lang);
            });
          }
        );

        script.then((model: Languages.LanguageModel) => {
          const options: VariableInspectionHandler.IOptions = {
            // Use the session path as an identifier.
            id: session_context.path,
            connector: connector,
            initScript: model.initScript,
            queryCommand: model.queryCommand
          };

          const handler = new VariableInspectionHandler(options);
          manager.addHandler(handler);
          nbPanel.disposed.connect(() => {
            delete handlers[nbPanel.id];
            handler.dispose();
          });

          handler.ready.then(() => {
            resolve(handler);
          });

          // error handle
          script.catch((rlt: string) => {
            reject(rlt);
          });
        });
      });
    });

    /**
     * If focus window changes, checks whether new focus widget is a notebook.
     *
     * In that case, retrieves the handler associated to the notebook after it has
     * been initialized and updates the manager with it.
     */
    labShell.currentChanged.connect((sender, args) => {
      const widget = args.newValue;
      if (!widget || !notebooks.has(widget)) {
        return;
      }

      const future = handlers[widget.id];
      // set current widget as new handler of manager
      future.then((new_handler: VariableInspectionHandler) => {
        if (new_handler) {
          manager.handler = new_handler;
          manager.handler.performInspection();
          // set notebook tracker
          manager.notebook = notebooks;
        }
      });
    });
  }
};

/**
 * Expose the plugins as default.
 */
const plugins: JupyterFrontEndPlugin<any>[] = [variableinspector, notebooks];
export default plugins;
