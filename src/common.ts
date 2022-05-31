import { LabIcon } from '@jupyterlab/ui-components';

import graphscopeIconStr from '../style/graphscope.svg';

/**
 * CommandIDs
 */
export namespace CommandIDs {
  export const open = 'gs-graph-schema:open';
}

/**
 * Icon
 */
const gsIcon = new LabIcon({
  name: 'graphscope:icon',
  svgstr: graphscopeIconStr
});
export { gsIcon };

/**
 * Palette Category
 */
const PALETTE_CATEGORY = 'graphscope';
export { PALETTE_CATEGORY };

/**
 * Namespace
 */
const NAMESPACE = 'graphscope';
export { NAMESPACE };

/**
 * Utils function
 */
export function isJsonString(str: string): boolean {
  str = str.replace(/'/g, '"');

  if (JSON.stringify(str) === '{}') {
    return false
  } else {
    try {
      if (Object.prototype.toString.call(JSON.parse(str)) === '[object Object]') {
        return true
      } else {
        return false
      }
    } catch (e) {
      return false
    }
  }
}
