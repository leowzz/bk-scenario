import React, { useEffect, useMemo, useState } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  useEdgesState,
  useNodesState,
} from "reactflow";
import "reactflow/dist/style.css";

const API_BASE = "/api";

const nodeTypes = {
  sql: { label: "SQL", color: "#2A7EFB" },
  log: { label: "LOG", color: "#2CB67D" },
  store: { label: "STORE", color: "#F4A259" },
};

function updateNodeLabel(node) {
  const meta = node.data.meta;
  const title = meta.type.toUpperCase();
  let detail = "";
  if (meta.type === "sql") detail = meta.config?.sql || "";
  if (meta.type === "log") detail = meta.config?.log_message || "";
  if (meta.type === "store") detail = meta.config?.store_key || "";
  const clipped = detail ? detail.slice(0, 40) : "";
  return `${title}\n${meta.id}${clipped ? `\n${clipped}` : ""}`;
}

const emptyRule = {
  id: null,
  name: "",
  description: "",
  nodes: [],
  edges: [],
};

function fetchJson(url, options) {
  return fetch(url, options).then((res) => res.json());
}

function toFlowNodes(nodes) {
  return nodes.map((n) => {
    const meta = { ...n, id: n.id };
    return {
      id: n.id,
      type: "default",
      data: { label: "", meta },
      position: { x: n.position_x, y: n.position_y },
      style: {
        border: `2px solid ${nodeTypes[n.type]?.color || "#444"}`,
        padding: 10,
        borderRadius: 10,
        fontSize: 12,
        whiteSpace: "pre-wrap",
      },
    };
  }).map((node) => ({ ...node, data: { ...node.data, label: updateNodeLabel(node) } }));
}

function toFlowEdges(edges) {
  return edges.map((e) => ({
    id: `e-${e.source_node}-${e.target_node}`,
    source: e.source_node,
    target: e.target_node,
    type: "smoothstep",
  }));
}

function fromFlowNodes(nodes, ruleId) {
  return nodes.map((n) => ({
    node_id: n.id,
    rule_id: ruleId,
    type: n.data.meta.type,
    position_x: n.position.x,
    position_y: n.position.y,
    config: n.data.meta.config || {},
  }));
}

function fromFlowEdges(edges, ruleId) {
  return edges.map((e) => ({
    rule_id: ruleId,
    source_node: e.source,
    target_node: e.target,
  }));
}

function Sidebar({ rules, onCreate, onSelect, onReload, selectedId }) {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");

  return (
    <div className="sidebar">
      <div className="section">
        <div className="section-title">规则列表</div>
        <button className="btn" onClick={onReload}>刷新</button>
        <div className="rule-list">
          {rules.map((r) => (
            <div
              key={r.id}
              className={`rule-item ${selectedId === r.id ? "active" : ""}`}
              onClick={() => onSelect(r.id)}
            >
              <div className="rule-name">{r.name}</div>
              <div className="rule-desc">{r.description || "暂无描述"}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="section">
        <div className="section-title">新建规则</div>
        <input
          className="input"
          placeholder="规则名"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <textarea
          className="input"
          placeholder="描述"
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
        />
        <button
          className="btn primary"
          onClick={() => {
            onCreate(name, desc);
            setName("");
            setDesc("");
          }}
        >
          创建
        </button>
      </div>
    </div>
  );
}

function NodeEditor({ node, onChange }) {
  if (!node) return <div className="panel-empty">选择一个节点</div>;

  const meta = node.data.meta;
  const config = meta.config || {};

  return (
    <div className="panel">
      <div className="panel-title">节点配置</div>
      <div className="field">
        <label>节点 ID</label>
        <input className="input" value={meta.id} disabled />
      </div>
      <div className="field">
        <label>类型</label>
        <select
          className="input"
          value={meta.type}
          onChange={(e) =>
            onChange({
              ...meta,
              type: e.target.value,
              config: {},
            })
          }
        >
          {Object.keys(nodeTypes).map((t) => (
            <option key={t} value={t}>
              {nodeTypes[t].label}
            </option>
          ))}
        </select>
      </div>
      {meta.type === "sql" && (
        <div className="field">
          <label>SQL 模板</label>
          <textarea
            className="input"
            value={config.sql || ""}
            onChange={(e) =>
              onChange({
                ...meta,
                config: { ...config, sql: e.target.value },
              })
            }
          />
        </div>
      )}
      {meta.type === "log" && (
        <div className="field">
          <label>日志模板</label>
          <textarea
            className="input"
            value={config.log_message || ""}
            onChange={(e) =>
              onChange({
                ...meta,
                config: { ...config, log_message: e.target.value },
              })
            }
          />
        </div>
      )}
      {meta.type === "store" && (
        <>
          <div className="field">
            <label>存储 Key</label>
            <input
              className="input"
              value={config.store_key || ""}
              onChange={(e) =>
                onChange({
                  ...meta,
                  config: { ...config, store_key: e.target.value },
                })
              }
            />
          </div>
          <div className="field">
            <label>存储 Value</label>
            <textarea
              className="input"
              value={config.store_value || ""}
              onChange={(e) =>
                onChange({
                  ...meta,
                  config: { ...config, store_value: e.target.value },
                })
              }
            />
          </div>
        </>
      )}
    </div>
  );
}

function GlobalsPanel({ globals, onSave, onDelete }) {
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");

  return (
    <div className="panel">
      <div className="panel-title">全局变量</div>
      <div className="globals-list">
        {globals.map((g) => (
          <div key={g.key} className="globals-item">
            <div className="globals-key">{g.key}</div>
            <div className="globals-value">{g.value}</div>
            <button className="btn ghost" onClick={() => onDelete(g.key)}>
              删除
            </button>
          </div>
        ))}
      </div>
      <div className="field">
        <label>新增变量</label>
        <input
          className="input"
          placeholder="key"
          value={newKey}
          onChange={(e) => setNewKey(e.target.value)}
        />
        <input
          className="input"
          placeholder="value"
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
        />
        <button
          className="btn primary"
          onClick={() => {
            if (!newKey) return;
            onSave({ key: newKey, value: newValue, type: "string" });
            setNewKey("");
            setNewValue("");
          }}
        >
          保存
        </button>
      </div>
    </div>
  );
}

function ExecutionPanel({ ruleId }) {
  const [executions, setExecutions] = useState([]);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    if (!ruleId) return;
    fetchJson(`${API_BASE}/executions/${ruleId}`).then(setExecutions);
  }, [ruleId]);

  async function loadExecution(execId) {
    const data = await fetchJson(`${API_BASE}/execution/${execId}`);
    setSelected(data);
  }

  return (
    <div className="panel">
      <div className="panel-title">执行记录</div>
      <div className="exec-list">
        {executions.map((e) => (
          <div key={e.execution_id} className="exec-item" onClick={() => loadExecution(e.execution_id)}>
            <div className="exec-id">{e.execution_id}</div>
            <div className={`exec-status ${e.status}`}>{e.status}</div>
          </div>
        ))}
      </div>
      {selected && (
        <div className="exec-detail">
          <div className="exec-title">{selected.execution_id}</div>
          <div className="exec-steps">
            {selected.steps.map((s, idx) => (
              <div key={`${s.node_id}-${idx}`} className="exec-step">
                <div className="exec-step-head">
                  <span>{s.node_id}</span>
                  <span>{s.action_type}</span>
                  <span className={`exec-status ${s.status}`}>{s.status}</span>
                </div>
                <div className="exec-step-body">{s.content}</div>
                {s.output && <div className="exec-step-output">{s.output}</div>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [rules, setRules] = useState([]);
  const [currentRule, setCurrentRule] = useState(emptyRule);
  const [globals, setGlobals] = useState([]);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNodeId, setSelectedNodeId] = useState(null);

  const selectedNode = useMemo(() => nodes.find((n) => n.id === selectedNodeId), [nodes, selectedNodeId]);

  async function loadRules() {
    const data = await fetchJson(`${API_BASE}/rules`);
    setRules(data);
  }

  async function loadGlobals() {
    const data = await fetchJson(`${API_BASE}/globals`);
    setGlobals(data);
  }

  async function loadRule(ruleId) {
    const data = await fetchJson(`${API_BASE}/rules/${ruleId}`);
    setCurrentRule(data);
    setNodes(toFlowNodes(data.nodes));
    setEdges(toFlowEdges(data.edges));
  }

  async function createRule(name, description) {
    if (!name) return;
    const rule = await fetchJson(`${API_BASE}/rules`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description }),
    });
    await loadRules();
    await loadRule(rule.id);
  }

  async function saveGraph() {
    if (!currentRule.id) return;
    await fetchJson(`${API_BASE}/rules/${currentRule.id}/graph`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nodes: fromFlowNodes(nodes, currentRule.id),
        edges: fromFlowEdges(edges, currentRule.id),
      }),
    });
  }

  async function runRule() {
    if (!currentRule.id) return;
    const globalsMap = globals.reduce((acc, item) => {
      acc[item.key] = item.value;
      return acc;
    }, {});
    await fetchJson(`${API_BASE}/execute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rule_id: currentRule.id, variables: globalsMap }),
    });
  }

  async function saveGlobal(entry) {
    await fetchJson(`${API_BASE}/globals`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(entry),
    });
    await loadGlobals();
  }

  async function deleteGlobal(key) {
    await fetchJson(`${API_BASE}/globals/${key}`, { method: "DELETE" });
    await loadGlobals();
  }

  useEffect(() => {
    loadRules();
    loadGlobals();
  }, []);

  return (
    <div className="app">
      <Sidebar
        rules={rules}
        onCreate={createRule}
        onSelect={loadRule}
        onReload={loadRules}
        selectedId={currentRule.id}
      />
      <div className="canvas">
        <div className="toolbar">
          <button
            className="btn primary"
            onClick={() => {
              const id = `node_${nodes.length + 1}`;
              setNodes((prev) => {
              const nextNode = {
                id,
                position: { x: 100 + prev.length * 40, y: 100 + prev.length * 40 },
                data: { label: "", meta: { id, type: "sql", config: { sql: "" } } },
              };
              return [...prev, { ...nextNode, data: { ...nextNode.data, label: updateNodeLabel(nextNode) } }];
            });
            }}
          >
            + SQL
          </button>
          <button
            className="btn"
            onClick={() => {
              const id = `node_${nodes.length + 1}`;
              setNodes((prev) => {
                const nextNode = {
                  id,
                  position: { x: 120 + prev.length * 40, y: 140 + prev.length * 40 },
                  data: { label: "", meta: { id, type: "log", config: { log_message: "" } } },
                };
                return [...prev, { ...nextNode, data: { ...nextNode.data, label: updateNodeLabel(nextNode) } }];
              });
            }}
          >
            + LOG
          </button>
          <button
            className="btn"
            onClick={() => {
              const id = `node_${nodes.length + 1}`;
              setNodes((prev) => {
                const nextNode = {
                  id,
                  position: { x: 140 + prev.length * 40, y: 180 + prev.length * 40 },
                  data: { label: "", meta: { id, type: "store", config: { store_key: "", store_value: "" } } },
                };
                return [...prev, { ...nextNode, data: { ...nextNode.data, label: updateNodeLabel(nextNode) } }];
              });
            }}
          >
            + STORE
          </button>
          <button className="btn ghost" onClick={saveGraph}>保存图</button>
          <button className="btn primary" onClick={runRule}>运行</button>
        </div>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={(conn) => setEdges((eds) => addEdge({ ...conn, type: "smoothstep" }, eds))}
          onNodeClick={(_, node) => setSelectedNodeId(node.id)}
          fitView
        >
          <Background gap={16} color="#1b1b1d" />
          <Controls />
          <MiniMap />
        </ReactFlow>
      </div>
      <div className="right-panel">
        <NodeEditor
          node={selectedNode}
          onChange={(meta) => {
            setNodes((nds) =>
              nds.map((n) => {
                if (n.id !== selectedNode.id) return n;
                const nextNode = {
                  ...n,
                  data: {
                    ...n.data,
                    meta,
                  },
                  style: {
                    ...n.style,
                    border: `2px solid ${nodeTypes[meta.type]?.color || "#444"}`,
                  },
                };
                return { ...nextNode, data: { ...nextNode.data, label: updateNodeLabel(nextNode) } };
              })
            );
          }}
        />
        <GlobalsPanel globals={globals} onSave={saveGlobal} onDelete={deleteGlobal} />
        <ExecutionPanel ruleId={currentRule.id} />
      </div>
    </div>
  );
}
