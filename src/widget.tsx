import {
  ReactWidget,
  UseSignal,
  ToolbarButtonComponent
} from '@jupyterlab/apputils';

import { CommandRegistry } from '@lumino/commands';

import { showDialog, Dialog } from '@jupyterlab/apputils';

import { ITranslator, nullTranslator } from '@jupyterlab/translation';

import { ISignal, Signal } from '@lumino/signaling';

import { CommandIDs } from './common';

import { INotebookTracker } from '@jupyterlab/notebook';

import {
  caretDownIcon,
  caretRightIcon,
  searchIcon,
  addIcon,
  Collapse
} from '@jupyterlab/ui-components';

import React from 'react';

import { gsIcon } from './common';

import { IVariableInspector, VariableInspector } from './variableinspector';

import { GSVariable } from './gsvariable';

import { GraphManager } from './graphmanager';

import { GraphOpComponent } from './graph';

import 'bootstrap/dist/css/bootstrap.css';

import { Widget } from '@lumino/widgets';

/**
 * Abstract class for variable inspector.
 *
 * Any widget inherits this class could interactive with the kernel.
 */
export abstract class IVariableInspectorWidget
  extends ReactWidget
  implements IVariableInspector
{
  set handler(handler: VariableInspector.IInspectable | null) {
    if (this._handler === handler) {
      return;
    }
    // remove old subscriptions
    if (this._handler) {
      this._handler.inspected.disconnect(this.onInspectorUpdate, this);
      this._handler.disposed.disconnect(this.onHandlerDisposed, this);
    }
    this._handler = handler;
    // subscriptions
    if (this._handler) {
      this._handler.inspected.connect(this.onInspectorUpdate, this);
      this._handler.disposed.connect(this.onHandlerDisposed, this);
      this._handler.performInspection();
    }
  }

  get handler(): VariableInspector.IInspectable | null {
    return this._handler;
  }

  get notebook(): INotebookTracker | null {
    return this._notebook;
  }

  set notebook(nb: INotebookTracker | null) {
    this._notebook = nb;
  }

  protected abstract onInspectorUpdate(
    sender: any,
    args: VariableInspector.IVariableInspectorUpdate
  ): void;

  protected abstract onHandlerDisposed(sender: any, args: void): void;

  private _notebook: INotebookTracker | null = null;
  private _handler: VariableInspector.IInspectable | null = null;
}

/**
 * Icons with custom styling bound.
 */
const caretDownIconStyled = caretDownIcon.bindprops({
  height: 'auto',
  width: '20px'
});
const caretRightIconStyled = caretRightIcon.bindprops({
  height: 'auto',
  width: '20px'
});

/**
 * The namespace for collapsible section statics.
 */
export namespace CollapsibleSection {
  /**
   * React properties for collapsible section component.
   */
  export interface IProperties {
    /**
     * The header string for section list.
     */
    header: string;

    /**
     * Whether the view will be expanded or collapsed initially, defaults to open.
     */
    isOpen?: boolean;

    /**
     * Handle collapse event.
     */
    onCollapse?: (isOpen: boolean) => void;

    /**
     * Any additional elements to add to the header.
     */
    headerElements?: React.ReactNode;

    /**
     * Tooltip for collapsible section
     */
    tooltip?: string;

    /**
     * If true, the section will be collapsed and will not respond
     * to open or close actions.
     */
    disabled?: boolean;

    /**
     * If true, the section will be opened if not disabled.
     */
    forceOpen?: boolean;
  }

  /**
   * React state for collapsible section component.
   */
  export interface IState {
    /**
     * Whether the section is expanded or collapsed.
     */
    isOpen: boolean;
  }
}

export class CollapsibleSection extends React.Component<
  CollapsibleSection.IProperties,
  CollapsibleSection.IState
> {
  constructor(props: CollapsibleSection.IProperties) {
    super(props);
    this.state = {
      isOpen: props.isOpen ? true : false
    };
  }

  /**
   * Render the collapsible section using the virtual DOM.
   */
  render(): React.ReactNode {
    let icon = this.state.isOpen ? caretDownIconStyled : caretRightIconStyled;
    let isOpen = this.state.isOpen;
    let className = 'jp-gsSidebar-section-headerText';

    if (this.props.disabled) {
      icon = caretRightIconStyled;
      isOpen = false;
      className = 'jp-gsSidebar-section-headerTextDisabled';
    }

    return (
      <>
        <div className="jp-gsSidebar-section-header">
          <ToolbarButtonComponent
            icon={icon}
            onClick={this.handleCollapse.bind(this)}
          />
          <span
            className={className}
            onContextMenu={this.onContextMenu.bind(this)}
            onClick={this.handleClick.bind(this)}
            title={this.props.tooltip}
          >
            {this.props.header}
          </span>
          {!this.props.disabled && this.props.headerElements}
        </div>
        <Collapse isOpen={isOpen}>{this.props.children}</Collapse>
      </>
    );
  }

  handleCollapse(): void {
    this.setState(
      {
        isOpen: !this.state.isOpen
      },
      () => {
        if (this.props.onCollapse) {
          this.props.onCollapse(this.state.isOpen);
        }
      }
    );
  }

  handleClick(): void {
    // no-op
  }

  onContextMenu(): void {
    // no-op
  }

  UNSAFE_componentWillReceiveProps(
    nextProps: CollapsibleSection.IProperties
  ): void {
    if (nextProps.forceOpen) {
      this.setState({ isOpen: true });
    }
  }
}

/**
 * The widget for operate graph.
 */
export class GraphOpWidget extends IVariableInspectorWidget {
  /**
   * Constructs a new GraphOpWidget.
   */
  constructor(
    meta: { [name: string]: any },
    commands: CommandRegistry,
    translator?: ITranslator
  ) {
    super();
    this.commands = commands;
    this.translator = translator || nullTranslator;
    this._meta = meta;

    // todo, restore after refresh browser
    this._graphManager = new GraphManager({});

    const trans = this.translator.load('jupyterlab');
    this.id = trans.__('gs-graphop-widget' + '(' + this._meta['sess'] + ')');
    this.title.label = trans.__(
      'Graph Schema ' + '(' + this._meta['sess'] + ')'
    );
    this.title.icon = gsIcon;
    this.title.closable = true;
  }

  get meta(): { [name: string]: any } {
    return this._meta;
  }

  get runnningChanged(): ISignal<GraphOpWidget, void> {
    return this._runningChanged;
  }

  get graphManager(): GraphManager {
    return this._graphManager;
  }

  /**
   * Handle variable update signals.
   */
  protected onInspectorUpdate(
    sender: any,
    args: VariableInspector.IVariableInspectorUpdate
  ): void {
    // no-op
  }

  /**
   * Handle handler disposed signals.
   */
  protected onHandlerDisposed(sender: any, args: void): void {
    // no-op
  }

  render() {
    return (
      <GraphOpComponent
        commands={this.commands}
        translator={this.translator}
        widget={this}
        signal={this._runningChanged}
      />
    );
  }

  public translator: ITranslator;
  protected commands: CommandRegistry;

  // current meta info: {
  //  'session': <session_variable_name>
  // }
  private _meta: { [name: string]: any } = {};
  private _runningChanged = new Signal<this, void>(this);

  private _graphManager: GraphManager;
}

/**
 * The namespace for graphscope sidebar component statics.
 */
export namespace GSSidebarComponents {
  /**
   * React properties for graphscope sidebar component.
   */
  export interface IProperties {
    /**
     * Command Registry.
     */
    commands: CommandRegistry;

    /**
     * The graphscope sidebar widget.
     */
    widget: SidebarWidget;

    /**
     * Signal to render dom tree.
     */
    signal: ISignal<SidebarWidget, void>;

    /**
     *  Jupyterlab translator.
     */
    translator?: ITranslator;
  }

  export interface IState {}
}

function SectionItem(props: {
  translator: ITranslator;
  item: GSVariable.IAppOrGraphVariable;
}) {
  const trans = props.translator.load('jupyterlab');

  let className = 'jp-gsSidebar-sectionItemLabel';

  const state = props.item.state;
  if (state !== 'True') {
    className = 'jp-gsSidebar-sectionItemDisabled';
  }

  return (
    <li className="jp-gsSidebar-sectionItem">
      <span
        className={className}
        title={'graphscope ' + props.item.type}
        onClick={() => {
          console.log('click event: click on ', props.item.name);
        }}
      >
        {props.item.name}
      </span>
      <ToolbarButtonComponent
        className="jp-gsSidebar-sectionItemShutdown"
        icon={searchIcon}
        onClick={() => {
          const body = document.createElement('div');
          let content = props.item.content.replace(/\\n/g, '<br/>');
          content = content.replace(/\\t/g, '&emsp;');
          body.innerHTML = content;
          showDialog({
            title: trans.__(props.item.name),
            body: new Widget({ node: body }),
            // body: trans.__(props.item.content),
            buttons: [Dialog.okButton()]
          }).catch(e => console.log(e));
        }}
        tooltip="detail"
      />
    </li>
  );
}

function SectionListView(props: {
  translator: ITranslator;
  items: GSVariable.IAppOrGraphVariable[];
}) {
  return (
    <div className="jp-gsSidebar-section-content">
      <ul className="jp-gsSidebar-sectionList">
        {props.items.map((item, i) => {
          return <SectionItem translator={props.translator} item={item} />;
        })}
      </ul>
    </div>
  );
}

/**
 * React component of sidebar.
 */
class SidebarComponent extends React.Component<
  GSSidebarComponents.IProperties,
  GSSidebarComponents.IState
> {
  constructor(props: GSSidebarComponents.IProperties) {
    super(props);
  }

  render() {
    const trans = this.props.translator.load('jupyterlab');

    return (
      <>
        <div className="jp-gsSidebar-header">
          <span className="jp-gsSidebar-headerText">List of Resources</span>
          <ToolbarButtonComponent
            icon={addIcon}
            onClick={() => {
              console.log('click event: create a new session.');
            }}
            tooltip={trans.__('Create a new session')}
          />
        </div>

        <UseSignal signal={this.props.signal}>
          {() => {
            const elements: React.ReactElement<any>[] = [];
            const contents: any[] = [];

            this.props.widget.payload.map((sess, i) => {
              let disabled = false;
              if (sess.state === 'closed' || sess.state === 'disconnected') {
                disabled = true;
              }

              contents.push(
                <CollapsibleSection
                  key={trans.__('session section')}
                  header={trans.__(sess.name)}
                  tooltip={sess.content}
                  isOpen={true}
                  disabled={disabled}
                  headerElements={
                    <ToolbarButtonComponent
                      icon={addIcon}
                      onClick={() => {
                        this.props.commands.execute(CommandIDs.open, {
                          sess: sess.name
                        });
                      }}
                      tooltip="Create a new graph"
                    />
                  }
                >
                  <SectionListView
                    translator={this.props.translator}
                    items={sess.items}
                  />
                </CollapsibleSection>
              );
            });

            elements.push(
              <div className="jp-gsSidebar-content">{contents}</div>
            );

            return elements;
          }}
        </UseSignal>
      </>
    );
  }
}

/**
 * The widget for graphscope sidebar.
 */
export class SidebarWidget extends IVariableInspectorWidget {
  /**
   * Constructs a new GSSideBarWidget.
   */
  constructor(commands: CommandRegistry, translator?: ITranslator) {
    super();
    this.commands = commands;
    this.translator = translator || nullTranslator;

    const trans = this.translator.load('jupyterlab');

    this.id = trans.__('gs-sidebar-widget');
    this.title.caption = trans.__('GraphScope Jypyterlab Extension');
    this.title.icon = gsIcon;
    this.title.closable = true;

    this.addClass('.jp-gsSidebar-widget');
  }

  dispose(): void {
    if (!this.isDisposed) {
      this.handler = null;
      super.dispose();
    }
  }

  /**
   * Handle variable update signals.
   */
  protected onInspectorUpdate(
    sender: any,
    args: VariableInspector.IVariableInspectorUpdate
  ): void {
    if (!this.isAttached) {
      return;
    }

    const sessions = new Map<string, GSVariable.ISessionVariable>();

    // handle `session`
    args.payload.forEach(v => {
      if (v.type === 'session') {
        sessions.set(v.props.session_id, {
          name: v.name,
          content: v.content,
          state: v.props.state,
          items: []
        });
      }
    });

    // handle `graph`
    args.payload.forEach(v => {
      if (v.type === 'graph') {
        const session_id = v.props.session_id;
        if (sessions.has(session_id)) {
          const session = sessions.get(session_id);
          session.items.push({
            name: v.name,
            content: v.content,
            type: 'graph',
            state: v.props.state
          });
        }
      }
    });

    this._payload = [];
    for (const value of sessions.values()) {
      this._payload.push(value);
    }

    this._runningChanged.emit(void 0);
  }

  /**
   * Handle handler disposed signals.
   */
  protected onHandlerDisposed(sender: any, args: void): void {
    this.handler = null;
  }

  get runningChanged(): ISignal<SidebarWidget, void> {
    return this._runningChanged;
  }

  get payload(): GSVariable.ISessionVariable[] {
    return this._payload;
  }

  protected render(): JSX.Element {
    return (
      <SidebarComponent
        commands={this.commands}
        translator={this.translator}
        widget={this}
        signal={this._runningChanged}
      />
    );
  }

  public translator: ITranslator;
  protected commands: CommandRegistry;

  private _payload: GSVariable.ISessionVariable[] = [];
  private _runningChanged = new Signal<this, void>(this);
}
