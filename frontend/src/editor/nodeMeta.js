export const nodeTypes = {
  sql: { label: "SQL", color: "#2A7EFB" },
  log: { label: "LOG", color: "#2CB67D" },
  store: { label: "STORE", color: "#F4A259" },
};

export function updateNodeLabel(node) {
  const meta = node.data.meta;
  const title = meta.type.toUpperCase();
  let detail = "";
  if (meta.type === "sql") detail = meta.config?.sql || "";
  if (meta.type === "log") detail = meta.config?.log_message || "";
  if (meta.type === "store") detail = meta.config?.store_key || "";
  const clipped = detail ? detail.slice(0, 40) : "";
  return `${title}\n${meta.id}${clipped ? `\n${clipped}` : ""}`;
}
