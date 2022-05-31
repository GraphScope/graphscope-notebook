import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

/**
 * Initialization data for the graphscope-notebook extension.
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: 'graphscope-notebook:plugin',
  autoStart: true,
  activate: (app: JupyterFrontEnd) => {
    console.log('JupyterLab extension graphscope-notebook is activated!');
  }
};

export default plugin;
