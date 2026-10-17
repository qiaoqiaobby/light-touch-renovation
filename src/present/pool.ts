/** 页面用的盲选池实例。规则在 pick.ts（纯函数，present-lint 也用它）。 */
import { SCHEMES } from "./data";
import { pickPool } from "./pick";

export const POOL = pickPool(SCHEMES);
