export const COPY = {
  title: "全屋三维装修",
  banner:
    "模型示意，非效果图 · 尺寸待现场复核 · 层高 2.70 m、窗高为假定 · 吊顶造型未建模 · 日光为阴天天光，未模拟直射阳光",
  stages: { L0: "L0 现状清空", L1: "L1 软装", L2: "L2 表面", L3: "L3 定制" },
  stageDisabled: "本方案最高 L2",
  light: { day: "白天", night: "夜晚" },
  views: {
    "L-entry": "客厅 · 入户看",
    "L-hall": "客厅 · 过道看",
    E: "玄关",
    A: "卧室 A",
    B: "卧室 B",
    C: "卧室 C",
    K: "厨房",
    Bath: "卫生间",
    orbit: "鸟瞰",
    walk: "漫游",
  },
  softNote: "软装细化（拼贴板未列）",
  aoOff: "环境光遮蔽已按帧耗时关闭",
} as const;
