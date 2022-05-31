// import { showDialog, Dialog } from '@jupyterlab/apputils';

import { ITranslator, nullTranslator } from '@jupyterlab/translation';

import { buildIcon } from '@jupyterlab/ui-components';

import { CommandRegistry } from '@lumino/commands';

export namespace CommandIDs {
  // graphscope sidebar item context menu
  // selector: '.jp-gsSidebar-sectionItem'
  export const sidebar_item_open =
    'gs-jupyterlab/sidebar-item-context-menu:open';
}

/**
 * Manager to register context menu.
 */
export class ContextMenuManager {
  constructor(commands: CommandRegistry, translator?: ITranslator) {
    this.commands = commands;
    this.translator = translator || nullTranslator;
  }

  public init(): void {
    const trans = this.translator.load('jupyterlab');

    // register for sidebar item element
    this.commands.addCommand(CommandIDs.sidebar_item_open, {
      label: trans.__('Example'),
      icon: buildIcon,
      execute: () => {}
    });
  }

  private commands: CommandRegistry;
  private translator: ITranslator;
}
