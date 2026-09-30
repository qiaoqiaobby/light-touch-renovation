// 场景材质 tokens：只用于 3D 场景与材料样板色块，不用于 UI 控件（DESIGN.md 第 7 节）
// color 取自对应真实材料的常见色相；rough 为 PBR 粗糙度；emissive 仅用于光源与投影画面

export const MATERIALS = {
  // 硬装（保留）
  tile:          { name: '抛光地砖（保留）', color: '#d8d7d3', rough: 0.22 },
  sill:          { name: '飘窗台面石材（保留）', color: '#e9e7e2', rough: 0.35 },
  glass:         { name: '窗玻璃', color: '#cfdde6', rough: 0.05, opacity: 0.25 },
  doorWhite:     { name: '白色套装门（保留）', color: '#efeee9', rough: 0.6 },
  doorEntry:     { name: '入户门（保留）', color: '#5a3424', rough: 0.55 },
  doorGlass:     { name: '厨房玻璃推拉门（保留）', color: '#c9d3d6', rough: 0.1, opacity: 0.45 },
  acWhite:       { name: '空调柜机（保留）', color: '#f1f1ef', rough: 0.4 },

  // 现状（上一任住户，2026-09 VR）
  wallCool:      { name: '冷白墙面', color: '#f1f2f3', rough: 0.9 },
  wallBlue:      { name: '蓝色护墙板', color: '#7f9ec3', rough: 0.7 },
  tealCurtain:   { name: '蓝绿色窗帘', color: '#5f8391', rough: 0.95 },
  sofaGrey:      { name: '灰色布艺沙发', color: '#7b7e83', rough: 0.95 },
  floralCover:   { name: '花布沙发罩', color: '#e4e1d8', rough: 0.95 },
  whiteTop:      { name: '白色岩板台面', color: '#f3f3f1', rough: 0.3 },
  blackLeg:      { name: '黑色实木腿', color: '#232323', rough: 0.6 },
  redWood:       { name: '红棕木饰面柜', color: '#7a3f24', rough: 0.55 },
  fridgeWhite:   { name: '白色冰箱', color: '#f4f4f2', rough: 0.35 },
  tvBlack:       { name: '电视屏幕', color: '#141414', rough: 0.15 },
  plasticWhite:  { name: '白色塑料', color: '#ecebe8', rough: 0.5 },
  ledCool:       { name: '冷白吸顶灯', color: '#ffffff', rough: 0.5, emissive: '#eef4ff' },

  // 方案通用
  wallWarm:      { name: '暖白乳胶漆', color: '#eeebe5', rough: 0.92 },
  screen:        { name: '投影幕布', color: '#f5f5f3', rough: 0.9 },
  projection:    { name: '投影画面', color: '#1c2430', rough: 1, emissive: '#9fb2c8' },
  device:        { name: '投影仪', color: '#2e2e2e', rough: 0.5 },
  charcoal:      { name: '炭黑金属', color: '#3a3836', rough: 0.5 },
  lampWarm:      { name: '暖光灯罩（2700K）', color: '#f3e6cf', rough: 0.8, emissive: '#ffcf94' },
  yogaMat:       { name: '瑜伽垫', color: '#8b8a84', rough: 0.95 },

  // 方案一「减」
  oakLight:      { name: '浅橡木', color: '#c7a67c', rough: 0.7 },
  linenOat:      { name: '燕麦色亚麻', color: '#d6ccba', rough: 0.95 },
  woolRug:       { name: '本色羊毛地毯', color: '#cfc6b5', rough: 1 },

  // 方案二「分」
  oakSmoked:     { name: '烟熏橡木', color: '#735a43', rough: 0.7 },
  linenTaupe:    { name: '灰褐亚麻', color: '#a59a8a', rough: 0.95 },
  juteRug:       { name: '黄麻地毯', color: '#b8a585', rough: 1 },
  paperShade:    { name: '纸灯罩', color: '#efe7d8', rough: 0.85, emissive: '#ffd29c' },

  // 方案三「空」
  plaster:       { name: '灰泥涂层墙面', color: '#d8cdbd', rough: 0.98 },
  cedar:         { name: '杉木', color: '#b39472', rough: 0.75 },
  linenIvory:    { name: '米白亚麻', color: '#e8e1d3', rough: 0.95 },
  washi:         { name: '和纸灯', color: '#f2ead9', rough: 0.85, emissive: '#ffd6a3' },
  rushMat:       { name: '蔺草地垫', color: '#bdb38c', rough: 1 },
};
