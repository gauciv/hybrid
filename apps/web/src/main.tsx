import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import Product from "./product/Product.tsx";

// The product is the default. The developer lab (hybrid tests, benchmarks) lives at /#lab.
// /#demo, /#demo-en and /#demo-lab load the demo autopilot (films the real app; see src/demo/autopilot.ts).
const hash = location.hash;
const demo = /^#demo(-en|-lab)?$/.test(hash);
const isLab = hash === "#lab" || hash === "#demo-lab";

createRoot(document.getElementById("root")!).render(<StrictMode>{isLab ? <App /> : <Product />}</StrictMode>);

if (demo) void import("./demo/autopilot").then((m) => m.mount(hash));
