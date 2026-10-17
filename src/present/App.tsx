import { Appendix } from "./chapters/Appendix";
import { Brief } from "./chapters/Brief";
import { Compare } from "./chapters/Compare";
import { Cover } from "./chapters/Cover";
import { Ladder } from "./chapters/Ladder";
import { Layouts } from "./chapters/Layouts";
import { Open } from "./chapters/Open";
import { Pick } from "./chapters/Pick";
import { Site } from "./chapters/Site";
import { Styles } from "./chapters/Styles";
import { CHAPTERS } from "./content";
import { useChapterObserver, useFigureObserver } from "./observe";
import { Rail } from "./Rail";

export function App() {
  useChapterObserver();
  useFigureObserver();
  return (
    <div className="shell">
      <Rail ids={CHAPTERS.map((c) => c.id)} />
      <main className="main">
        <Cover />
        <Brief />
        <Site />
        <Pick />
        <Layouts />
        <Styles />
        <Compare />
        <Ladder />
        <Open />
        <Appendix />
      </main>
    </div>
  );
}
