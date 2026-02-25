export const nodeTypes = {
  sql: { label: "SQL", color: "#2A7EFB" },
  log: { label: "LOG", color: "#2CB67D" },
  store: { label: "STORE", color: "#F4A259" },
  load: { label: "LOAD", color: "#8E7DF2" },
  python: { label: "PYTHON", color: "#F2C94C" },
  shell: { label: "SHELL", color: "#EB5757" },
};

export function updateNodeLabel(node) {
  const meta = node.data.meta;
  const title = meta.type.toUpperCase();
  let detail = "";
  if (meta.type === "sql") detail = meta.config?.sql || "";
  if (meta.type === "log") detail = meta.config?.log_message || "";
  if (meta.type === "store") detail = meta.config?.store_key || "";
  if (meta.type === "load") detail = `${meta.config?.scope || "rule"}:${meta.config?.key || ""}`;
  if (meta.type === "python") detail = meta.config?.script || "";
  if (meta.type === "shell") detail = meta.config?.command || "";
  const clipped = detail ? detail.slice(0, 40) : "";
  return `${title}\n${meta.id}${clipped ? `\n${clipped}` : ""}`;
}
