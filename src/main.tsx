import { StrictMode, useEffect, useState, type ComponentType } from "react";
import { createRoot } from "react-dom/client";
import { Hud } from "./floorplan/App";
import "./styles.css";

function Home() {
  const [Stage, setStage] = useState<ComponentType | null>(null);
  useEffect(() => {
    let dead = false;
    void import("./floorplan/stage").then((mod) => {
      if (!dead) setStage(() => mod.Stage);
    });
    return () => {
      dead = true;
    };
  }, []);
  return (
    <div className="relative h-dvh overflow-hidden bg-paper text-ink">
      <div className="absolute inset-0 touch-none bg-paper">{Stage ? <Stage /> : null}</div>
      <Hud />
    </div>
  );
}

const root = document.getElementById("root");
if (!root) throw new Error("missing #root");
createRoot(root).render(
  <StrictMode>
    <Home />
  </StrictMode>,
);
