/**
 * Languages Model
 */
export namespace Languages {
  export type LanguageModel = {
    initScript: string;
    queryCommand: string;
    // deleteCommand: string;
  };
}

/**
 * Code template for languages, only support python3 kernel now.
 */
export abstract class Languages {
  /**
   * Init script for ipython(python3) kernel
   */
  static py_init_script = `
import json
import sys

from IPython import get_ipython
from IPython.core.magics.namespace import NamespaceMagics


_gs_jupyterlab_nms = NamespaceMagics()
_gs_jupyterlab_Jupyter = get_ipython()
_gs_jupyterlab_nms.shell = _gs_jupyterlab_Jupyter.kernel.shell


def _gs_jupyterlab_getcontentof(x):
    try:
      content = str(x)
      if len(content) > 500:
          return content[:500] + " ..."
      else:
          return content
    except:
      return ""

def _gs_jupyterlab_inspect_variable():
    if 'graphscope' not in sys.modules:
        return ""

    def _is_gs_session(v):
        if isinstance(v, graphscope.Session):
            return True
        return False

    def _is_gs_graph(v):
        if isinstance(v, graphscope.Graph) or isinstance(v, graphscope.nx.Graph):
            return True
        return False

    def _belongs_to_gs(_v):
        v = eval(_v)
        if _is_gs_session(v) or _is_gs_graph(v):
            return True
        return False

    def _parse(_v):
        v = eval(_v)
        rlt = {
            "name": _v,
            "content": str(_gs_jupyterlab_getcontentof(v)),
        }

        if _is_gs_session(v):
            rlt["type"] = "session"
            rlt["props"] = {
                "session_id": v.session_id,
                "state": v.info["status"],
            }
        elif _is_gs_graph(v):
            rlt["type"] = "graph"
            rlt["props"] = {
                "session_id": v.session_id,
                "state": str(v.loaded()),
            }
        return rlt

    values = _gs_jupyterlab_nms.who_ls()
    gs_variable_dict_list = [
        _parse(_v) for _v in values if _belongs_to_gs(_v)
    ]

    # handle default session
    if graphscope.has_default_session():
        _sess = graphscope.get_default_session()
        gs_variable_dict_list.append(
          {
            "name": "Default Session",
            "content": str(_gs_jupyterlab_getcontentof(_sess)),
            "type": "session",
            "props": {
              "session_id": _sess.session_id,
              "state": _sess.info["status"]
            }
          }
        )

    return json.dumps(gs_variable_dict_list)

def _gs_jupyterlab_delete_variable(x):
    exec("del %s" % x, globals())
`;

  /**
   * Select scripts according to the different languages.
   */
  static scripts: { [lang: string]: Languages.LanguageModel } = {
    python3: {
      initScript: Languages.py_init_script,
      queryCommand: '_gs_jupyterlab_inspect_variable()'
      // deleteCommand: '_gs_jupyterlab_delete_variable',
    },
    python2: {
      initScript: Languages.py_init_script,
      queryCommand: '_gs_jupyterlab_inspect_variable()'
      // deleteCommand: '_gs_jupyterlab_delete_variable',
    },
    python: {
      initScript: Languages.py_init_script,
      queryCommand: '_gs_jupyterlab_inspect_variable()'
      // deleteCommand: '_gs_jupyterlab_delete_variable',
    }
  };

  public static getScript(lang: string): Promise<Languages.LanguageModel> {
    return new Promise((resolve, reject) => {
      if (lang in Languages.scripts) {
        resolve(Languages.scripts[lang]);
      } else {
        reject('Language ' + lang + ' not supported yet!');
      }
    });
  }
}
