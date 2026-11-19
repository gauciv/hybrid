import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import Product from "./product/Product.tsx";

// The product is the default. The developer lab (hybrid tests, benchmarks) lives at /#lab.
const isLab = location.hash === "#lab";

createRoot(document.getElementById("root")!).render(<StrictMode>{isLab ? <App /> : <Product />}</StrictMode>);
