export const nodeTypes = {
  mysql: { label: "MySQL", color: "#2A7EFB" },
  redis: { label: "Redis", color: "#D97706" },
  log: { label: "LOG", color: "#2CB67D" },
  store: { label: "STORE", color: "#F4A259" },
  load: { label: "LOAD", color: "#8E7DF2" },
  python: { label: "PYTHON", color: "#F2C94C" },
  shell: { label: "SHELL", color: "#EB5757" },
};

export function getNodeBrief(meta) {
  if (!meta) return "";
  if (meta.type === "sql" || meta.type === "mysql") return meta.config?.sql || "";
  if (meta.type === "redis") return meta.config?.command || "";
  if (meta.type === "log") return meta.config?.log_message || "";
  if (meta.type === "store") return meta.config?.store_key || "";
  if (meta.type === "load") return `${meta.config?.scope || "rule"}:${meta.config?.key || ""}`;
  if (meta.type === "python") return meta.config?.script || "";
  if (meta.type === "shell") return meta.config?.command || "";
  return "";
}

export function updateNodeLabel(node) {
  const meta = node.data.meta;
  const title = meta.type.toUpperCase();
  const clipped = getNodeBrief(meta).slice(0, 40);
  return `${title}\n${meta.id}${clipped ? `\n${clipped}` : ""}`;
}
