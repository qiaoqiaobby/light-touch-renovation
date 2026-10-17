import { Brief } from "./chapters/Brief";
import { Cover } from "./chapters/Cover";
import { Site } from "./chapters/Site";
import { useChapterObserver, useFigureObserver } from "./observe";
import { Rail } from "./Rail";

const SECTIONS = [
  { id: "cover", el: <Cover key="cover" /> },
  { id: "brief", el: <Brief key="brief" /> },
  { id: "site", el: <Site key="site" /> },
];

export function App() {
  useChapterObserver();
  useFigureObserver();
  return (
    <div className="shell">
      <Rail ids={SECTIONS.map((s) => s.id)} />
      <main className="main">{SECTIONS.map((s) => s.el)}</main>
    </div>
  );
}
