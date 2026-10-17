declare module "virtual:present-board" {
  export const CROPS: Record<
    string,
    { name: string; take: string; img: number | string | null; w: number; h: number; palette: { hex: string; lab: [number, number, number]; share: number }[]; src: string }
  >;
  export const FACTS: {
    schemes: Record<
      string,
      {
        retained: Record<string, { neutral: boolean; hex?: string; dE?: number; near?: string; fits?: boolean; keep: boolean }>;
        dims: { room: string; text: string; value: number; line: [number, number, number, number] }[];
      }
    >;
  };
}
