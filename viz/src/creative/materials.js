// 页面二材质 tokens：在第一组基础材质上增加带程序纹理的材料（DESIGN.md 第 7 节：只用于 3D 场景与材料样板）
// tex 描述运行时生成的纹理：kind 为纹理类型，tile 为一个纹理周期对应的真实尺寸（mm），accent 为纹理的次要色
// sheen 用于织物；emissive 用于灯带与投影画面
import { MATERIALS as BASE } from '../materials.js';

export const MATERIALS = {
  ...BASE,
  tileGloss:   { name: '抛光地砖（保留）', color: '#d9d7d2', rough: 0.18, tex: { kind: 'tile', tile: 800, accent: '#c9c6bf' } },
  limeWhite:   { name: '石灰白涂料墙面', color: '#ece8e0', rough: 0.95, tex: { kind: 'plaster', tile: 1200, accent: '#dcd6cb' } },
  limeClay:    { name: '土色灰泥投影墙', color: '#d6cab8', rough: 0.97, tex: { kind: 'plaster', tile: 1200, accent: '#c7b9a4' } },
  oakPale:     { name: '浅橡木平板（无把手）', color: '#cdb08a', rough: 0.62, tex: { kind: 'wood', tile: 900, accent: '#b8966c' } },
  walnutIn:    { name: '胡桃木内衬', color: '#5b4331', rough: 0.6, tex: { kind: 'wood', tile: 700, accent: '#473324' } },
  hinoki:      { name: '桧木色实木边框', color: '#d8bf95', rough: 0.6, tex: { kind: 'wood', tile: 800, accent: '#c4a676' } },
  tatami:      { name: '蔺草席面', color: '#c2b98f', rough: 0.9, tex: { kind: 'tatami', tile: 900, accent: '#ab9f73' } },
  yakisugi:    { name: '烧杉饰面', color: '#2b2724', rough: 0.85, tex: { kind: 'yakisugi', tile: 600, accent: '#433b35' } },
  linenSand:   { name: '沙色亚麻', color: '#d9cfbd', rough: 0.95, sheen: 0.6, tex: { kind: 'linen', tile: 200, accent: '#c9bea9' } },
  linenStone:  { name: '石灰色亚麻', color: '#b3ab9e', rough: 0.95, sheen: 0.6, tex: { kind: 'linen', tile: 200, accent: '#a1998b' } },
  woolLow:     { name: '本色短绒羊毛地毯', color: '#cfc7b8', rough: 1, sheen: 0.4, tex: { kind: 'wool', tile: 600, accent: '#c0b7a6' } },
  steelBlack:  { name: '黑色钢件', color: '#262626', rough: 0.45, metal: 0.6 },
  ledStrip:    { name: '暗藏灯带（2700K）', color: '#f5e9d6', rough: 0.5, emissive: '#ffd9a8' },
  washiLamp:   { name: '和纸灯罩', color: '#f2ead9', rough: 0.85, emissive: '#ffd6a3' },
};
