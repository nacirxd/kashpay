import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Proteção contra tradutores automáticos/extensões do navegador que alteram o DOM
// e fazem o React falhar com "NotFoundError: removeChild / insertBefore".
if (typeof Node === "function" && Node.prototype) {
  const originalRemoveChild = Node.prototype.removeChild;
  Node.prototype.removeChild = function <T extends Node>(this: Node, child: T): T {
    if (child.parentNode !== this) {
      if (child.parentNode) child.parentNode.removeChild(child);
      return child;
    }
    return originalRemoveChild.call(this, child) as T;
  };
  const originalInsertBefore = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function <T extends Node>(this: Node, newNode: T, ref: Node | null): T {
    if (ref && ref.parentNode !== this) {
      return originalInsertBefore.call(this, newNode, null) as T;
    }
    return originalInsertBefore.call(this, newNode, ref) as T;
  };
}

createRoot(document.getElementById("root")!).render(<App />);
