import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";

type Todo = { id: string; text: string; done: boolean };

declare global {
  interface Window {
    openai: any; // Apps SDK host API
  }
}
const SET_GLOBALS_EVENT_TYPE = "openai:set_globals";

function useToolOutput<T = any>() {
  const [data, setData] = useState<T | null>(() => (window as any).openai?.toolOutput ?? null);
  useEffect(() => {
    const handler = () => {
      setData((window as any).openai?.toolOutput ?? null);
    };
    window.addEventListener(SET_GLOBALS_EVENT_TYPE as any, handler as any, { passive: true } as any);
    return () => window.removeEventListener(SET_GLOBALS_EVENT_TYPE as any, handler as any);
  }, []);
  return data;
}

function App() {
  const toolOutput = useToolOutput<{ todos: Todo[] }>();
  const [input, setInput] = useState("");
  const todos = useMemo(() => toolOutput?.todos ?? [], [toolOutput]);

  async function refresh() {
    await (window as any).openai.callTool("todos_app", {}); // hydrates new toolOutput
  }
  async function addTodo(e?: React.FormEvent) {
    e?.preventDefault();
    const text = input.trim();
    if (!text) return;
    await (window as any).openai.callTool("todo_add", { text });
    setInput("");
    await refresh();
  }
  async function toggle(id: string) {
    await (window as any).openai.callTool("todo_toggle", { id });
    await refresh();
  }
  async function remove(id: string) {
    await (window as any).openai.callTool("todo_delete", { id });
    await refresh();
  }

  return (
    <div style={{ fontFamily: "ui-sans-serif, system-ui", padding: 12 }}>
      <h2 style={{ margin: "8px 0" }}>To-Do</h2>
      <form onSubmit={addTodo} style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Add a task…"
          style={{ flex: 1, padding: 8, borderRadius: 8, border: "1px solid #ccc" }}
        />
        <button type="submit" style={{ padding: "8px 12px", borderRadius: 8 }}>
          Add
        </button>
      </form>

      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {todos.map((t) => (
          <li key={t.id} style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "8px 6px", borderBottom: "1px solid #eee"
          }}>
            <input type="checkbox" checked={t.done} onChange={() => toggle(t.id)} />
            <span style={{ flex: 1, textDecoration: t.done ? "line-through" : "none" }}>
              {t.text}
            </span>
            <button onClick={() => remove(t.id)} style={{ borderRadius: 8 }}>Delete</button>
          </li>
        ))}
        {todos.length === 0 && <li style={{ color: "#777" }}>No tasks yet.</li>}
      </ul>

      <div style={{ marginTop: 12 }}>
        <button onClick={() => (window as any).openai.requestDisplayMode({ mode: "fullscreen" })}>
          Fullscreen
        </button>
      </div>
    </div>
  );
}

const rootEl = document.getElementById("todo-root")!;
createRoot(rootEl).render(<App />);
