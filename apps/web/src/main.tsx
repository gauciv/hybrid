import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import Product from "./product/Product.tsx";

// The product is the default. The developer lab (hybrid tests, benchmarks) lives at /#lab.
// /#demo, /#demo-en and /#demo-lab load the demo autopilot (films the real app; see src/demo/autopilot.ts).
// Filming: remember the demo scene for this tab, so a plain refresh brings the autopilot back.
let hash = location.hash;
try {
  if (/^#demo(-en|-lab)?$/.test(hash)) sessionStorage.setItem("k-demo", hash);
  else if (!hash && sessionStorage.getItem("k-demo")) {
    hash = sessionStorage.getItem("k-demo")!;
    history.replaceState(null, "", location.pathname + location.search + hash);
  }
} catch {
  /* storage blocked: the #demo URL still works */
}
const demo = /^#demo(-en|-lab)?$/.test(hash);
const isLab = hash === "#lab" || hash === "#demo-lab";

createRoot(document.getElementById("root")!).render(<StrictMode>{isLab ? <App /> : <Product />}</StrictMode>);

if (demo) void import("./demo/autopilot").then((m) => m.mount(hash));
// Typing another #demo… URL only changes the hash, which doesn't reload the page: reload so the right scene loads.
addEventListener("hashchange", () => /^#demo(-en|-lab)?$/.test(location.hash) && location.reload());
