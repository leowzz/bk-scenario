import React from "react";
import { Handle, Position } from "reactflow";

import { getNodeBrief, nodeTypes } from "../editor/nodeMeta";

function clipBrief(text, maxLen = 60) {
  if (!text) return "";
  const normalized = String(text).replace(/\s+/g, " ").trim();
  if (!normalized) return "";
  if (normalized.length <= maxLen) return normalized;
  return `${normalized.slice(0, maxLen - 1)}…`;
}

export function RuleNode({ data }) {
  const meta = data?.meta || {};
  const typeMeta = nodeTypes[meta.type] || { label: meta.type || "NODE", color: "#64748b" };
  const brief = clipBrief(getNodeBrief(meta));

  return (
    <div className="rule-flow-node" style={{ "--node-accent": typeMeta.color }}>
      <Handle type="target" position={Position.Top} className="rule-flow-handle" />
      <div className="rule-flow-node-type">{typeMeta.label}</div>
      <div className="rule-flow-node-id">{meta.id}</div>
      {brief && <div className="rule-flow-node-brief" title={getNodeBrief(meta)}>{brief}</div>}
      <Handle type="source" position={Position.Bottom} className="rule-flow-handle" />
    </div>
  );
}

