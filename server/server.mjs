import express from "express";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

// In-memory store (ephemeral)
const store = { todos: [] };

// Minimal sanitation
const clamp = (s) => s.trim().slice(0, 200);

const server = new McpServer({ name: "todo-server", version: "1.0.0" });

// ---- Load built component JS (from ../web/dist) ----
const TODO_JS = readFileSync(new URL("../web/dist/component.js", import.meta.url), "utf8");

// ---- Register UI resource (Apps SDK template) ----
server.registerResource(
  "todo-widget",
  "ui://widget/todo.html",
  z.object({}),
  async () => ({
    contents: [
      {
        uri: "ui://widget/todo.html",
        mimeType: "text/html+skybridge",
        text: `
<div id="todo-root"></div>
<script type="module">
${TODO_JS}
</script>
        `.trim(),
        _meta: {
          "openai/widgetDescription": "Interactive to-do list: add, toggle, delete tasks.",
          "openai/widgetCSP": { connect_domains: [], resource_domains: [] },
          "openai/widgetPrefersBorder": true
        }
      }
    ]
  })
);

// ---- Primary tool that renders the component ----
server.registerTool(
  "todos_app",
  {
    title: "Open To-Do app",
    description: "Display current tasks",
    _meta: {
      "openai/outputTemplate": "ui://widget/todo.html",
      "openai/toolInvocation/invoking": "Loading your tasks…",
      "openai/toolInvocation/invoked": "Loaded tasks",
      "openai/widgetAccessible": true
    }
  },
  async () => {
    return {
      structuredContent: { todos: store.todos },
      content: [{ type: "text", text: "To-Do app ready." }]
    };
  }
);

// ---- Component-initiated tools ----
server.registerTool(
  "todo_add",
  {
    title: "Add todo",
    description: "Add a to-do item",
    _meta: { "openai/outputTemplate": "ui://widget/todo.html", "openai/widgetAccessible": true },
    
  },
  async ({ text }) => {
    store.todos.unshift({ id: randomUUID(), text: clamp(text), done: false });
    return { structuredContent: { todos: store.todos } };
  }
);

server.registerTool(
  "todo_toggle",
  {
    title: "Toggle todo",
    description: "Toggle done/undone",
    _meta: { "openai/outputTemplate": "ui://widget/todo.html", "openai/widgetAccessible": true },
    
  },
  async ({ id }) => {
    const t = store.todos.find((x) => x.id === id);
    if (t) t.done = !t.done;
    return { structuredContent: { todos: store.todos } };
  }
);

server.registerTool(
  "todo_delete",
  {
    title: "Delete todo",
    description: "Remove a task",
    _meta: { "openai/outputTemplate": "ui://widget/todo.html", "openai/widgetAccessible": true },
    
  },
  async ({ id }) => {
    const i = store.todos.findIndex((x) => x.id === id);
    if (i >= 0) store.todos.splice(i, 1);
    return { structuredContent: { todos: store.todos } };
  }
);

// ---- Streamable HTTP transport over Express ----
const app = express();
app.use(express.json());

app.post("/mcp", async (req, res) => {
  const transport = new StreamableHTTPServerTransport({
    enableJsonResponse: true
  });
  res.on("close", () => transport.close());
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
});

const port = parseInt(process.env.PORT || "3000", 10);
app.listen(port, () => {
  console.log(`MCP server running on http://localhost:${port}/mcp`);
});
