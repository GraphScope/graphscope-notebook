import { GSVariable } from './gsvariable';
import { isJsonString } from './common';

/**
 * Manager class to operate graph schema.
 */
export class GraphManager {
  constructor(options: GraphManager.IOptions) {}

  generateCode(
    sess: string,
    name: string,
    oid_type: string,
    directed: boolean,
    generate_eid: boolean
  ): string {
    const py_directed = directed ? 'True' : 'False';
    const py_generate_eid = generate_eid ? 'True' : 'False';

    let code = `
from graphscope.framework.loader import Loader
    `;

    // vertices
    code += `
${name}_vertices = {
    `;
    if (this._vertices.size > 0) {
      for (const [l, v] of this._vertices) {
        let idField = v.idField;
        if (isNaN(Number(idField))) {
          idField = `"${idField}"`;
        }
        code += `
    "${l}": (
        ${this._generate_loader(
          v.location,
          v.headerRow,
          v.delimiter,
          v.extraParamsSwitch,
          v.extraParams
        )},
        ${this._generate_property_list(
          v.selectAllProperties,
          v.propertiesData
        )},
        ${idField}
    ),
        `;
      }
    }
    code += `
}
    `;

    // edges
    code += `
${name}_edges = {
    `;
    if (this._edges.size > 0) {
      for (const [l, edges] of this._edges) {
        code += `
    "${l}": [`;
        // handel sub label
        for (const e of edges) {
          let srcIdField = e.srcField;
          let dstIdField = e.dstField;
          if (isNaN(Number(srcIdField))) {
            srcIdField = `"${srcIdField}"`;
          }
          if (isNaN(Number(dstIdField))) {
            dstIdField = `"${dstIdField}"`;
          }
          code += `
        (
            ${this._generate_loader(
              e.location,
              e.headerRow,
              e.delimiter,
              e.extraParamsSwitch,
              e.extraParams
            )},
            ${this._generate_property_list(
              e.selectAllProperties,
              e.propertiesData
            )},
            (${srcIdField}, "${e.srcLabel}"),
            (${dstIdField}, "${e.dstLabel}"),
        ),
          `;
        }
        code += `
    ],
        `;
      }
    }
    code += `
}
    `;

    // session load from
    code += `
${name} = ${sess}.load_from(${name}_edges, ${name}_vertices, oid_type="${oid_type}", directed=${py_directed}, generate_eid=${py_generate_eid})`;
    return code;
  }

  addVertex(v: GSVariable.IVertex): void {
    if (this._vertices.has(v.label)) {
      throw new Error(`Vertex label '${v.label}' exists in current graph.`);
    }
    this._vertices.set(v.label, v);
  }

  editVertex(v: GSVariable.IVertex): void {
    this._vertices.set(v.label, v);
  }

  addEdge(ne: GSVariable.IEdge): void {
    if (this._edges.has(ne.label)) {
      for (const e of this._edges.get(ne.label)) {
        if (ne.srcLabel === e.srcLabel && ne.dstLabel === e.dstLabel) {
          throw new Error(
            `Edge Label '${ne.label}(${ne.srcLabel} => ${ne.dstLabel})' exists in current graph.`
          );
        }
      }
      this._edges.get(ne.label).push(ne);
    } else {
      this._edges.set(ne.label, [ne]);
    }
  }

  editEdge(ne: GSVariable.IEdge): void {
    const edges = this._edges.get(ne.label);
    // get sub label edge
    let oe: GSVariable.IEdge;
    for (const e of edges) {
      if (ne.srcLabel === e.srcLabel && ne.dstLabel === e.dstLabel) {
        oe = e;
      }
    }
    const index = edges.indexOf(oe);
    edges[index] = ne;
  }

  deleteVertex(v: GSVariable.IVertex): void {
    this.vertices.delete(v.label);
  }

  deleteEdge(ne: GSVariable.IEdge): void {
    const edges = this._edges.get(ne.label);
    // get sub label edge
    let oe: GSVariable.IEdge;
    for (const e of edges) {
      if (ne.srcLabel === e.srcLabel && ne.dstLabel === e.dstLabel) {
        oe = e;
      }
    }
    const index = edges.indexOf(oe);
    if (index > -1) {
      edges.splice(index, 1);
      if (edges === undefined || edges.length === 0) {
        this._edges.delete(ne.label);
      }
    }
  }

  get vertices(): Map<string, GSVariable.IVertex> {
    return this._vertices;
  }

  get edges(): Map<string, GSVariable.IEdge[]> {
    return this._edges;
  }

  _generate_property_list(
    selectAllProperties: boolean,
    properties: GSVariable.IProperty[]
  ): string {
    if (selectAllProperties) {
      // None means select all properties in graphscope.
      return "None";
    }

    let py_property_list = '[';
    if (properties !== undefined) {
      properties.forEach(p => {
        if (p !== undefined) {
          if (p.type === 'auto') {
            py_property_list += `'${p.name}', `;
          } else {
            py_property_list += `('${p.name}', '${p.type}'), `;
          }
        }
      });
    }
    py_property_list += ']';
    return py_property_list;
  }

  _generate_loader(
    location: string,
    header_row: boolean,
    delimiter: string,
    extraParamsSwitch: boolean,
    extraParams: GSVariable.IExtraParams[]
  ): string {
    const py_header_row = header_row ? 'True' : 'False';
    if (delimiter === '\t') {
      delimiter = '\\t';
    }
    let loader = 'Loader(';
    loader += `"${location}", header_row=${py_header_row}, delimiter="${delimiter}"`;
    if (extraParamsSwitch && extraParams !== undefined) {
      for (const p of extraParams) {
        if (p !== undefined && p.key !== undefined && p.value !== undefined) {
          if (isJsonString(p.value)) {
            loader += `, ${p.key}=${p.value}`;
          } else {
            loader += `, ${p.key}="${p.value}"`;
          }
        }
      }
    }
    loader += ')';
    return loader;
  }

  // mapping of vlabel => vertex
  private _vertices = new Map<string, GSVariable.IVertex>();
  // mapping of elabel => edges, which has different sub label
  private _edges = new Map<string, GSVariable.IEdge[]>();
}

/**
 * GraphManager Options
 */
export namespace GraphManager {
  export interface IOptions {}
}
