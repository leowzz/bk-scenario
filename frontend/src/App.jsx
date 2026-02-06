import React, { useEffect, useMemo, useState } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  useEdgesState,
  useNodesState,
} from "reactflow";
import "reactflow/dist/style.css";

import { NodeEditor } from "./components/NodeEditor";
import { shouldMarkDirtyFromEdgeChanges, shouldMarkDirtyFromNodeChanges, reselectRuleAfterReload } from "./editor/graphState";
import { nodeTypes, updateNodeLabel } from "./editor/nodeMeta";

const API_BASE = "/api";

const emptyRule = {
  id: null,
  name: "",
  description: "",
  nodes: [],
  edges: [],
};

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  const text = await response.text();
  const data = text ? JSON.parse(text) : {};
  if (!response.ok) {
    const detail = data?.detail || data?.message || `Request failed: ${response.status}`;
    throw new Error(typeof detail === "string" ? detail : JSON.stringify(detail));
  }
  return data;
}

function toFlowNodes(nodes) {
  return nodes
    .map((node) => {
      const meta = { ...node, id: node.id };
      return {
        id: node.id,
        type: "default",
        data: { label: "", meta },
        position: { x: node.position_x, y: node.position_y },
        style: {
          border: `2px solid ${nodeTypes[node.type]?.color || "#444"}`,
          padding: 10,
          borderRadius: 10,
          fontSize: 12,
          whiteSpace: "pre-wrap",
        },
      };
    })
    .map((node) => ({ ...node, data: { ...node.data, label: updateNodeLabel(node) } }));
}

function toFlowEdges(edges) {
  return edges.map((edge) => ({
    id: `e-${edge.source_node}-${edge.target_node}`,
    source: edge.source_node,
    target: edge.target_node,
    type: "smoothstep",
  }));
}

function fromFlowNodes(nodes, ruleId) {
  return nodes.map((node) => ({
    node_id: node.id,
    rule_id: ruleId,
    type: node.data.meta.type,
    position_x: node.position.x,
    position_y: node.position.y,
    config: node.data.meta.config || {},
  }));
}

function fromFlowEdges(edges, ruleId) {
  return edges.map((edge) => ({
    rule_id: ruleId,
    source_node: edge.source,
    target_node: edge.target,
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
          {rules.map((rule) => (
            <div
              key={rule.id}
              className={`rule-item ${selectedId === rule.id ? "active" : ""}`}
              onClick={() => onSelect(rule.id)}
            >
              <div className="rule-name">{rule.name}</div>
              <div className="rule-desc">{rule.description || "暂无描述"}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="section">
        <div className="section-title">新建规则</div>
        <input className="input" placeholder="规则名" value={name} onChange={(e) => setName(e.target.value)} />
        <textarea className="input" placeholder="描述" value={desc} onChange={(e) => setDesc(e.target.value)} />
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

function GlobalsPanel({ globals, onSave, onDelete }) {
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");

  return (
    <div className="panel">
      <div className="panel-title">全局变量</div>
      <div className="globals-list">
        {globals.map((globalVar) => (
          <div key={globalVar.key} className="globals-item">
            <div className="globals-key">{globalVar.key}</div>
            <div className="globals-value">{globalVar.value}</div>
            <button className="btn ghost" onClick={() => onDelete(globalVar.key)}>
              删除
            </button>
          </div>
        ))}
      </div>
      <div className="field">
        <label>新增变量</label>
        <input className="input" placeholder="key" value={newKey} onChange={(e) => setNewKey(e.target.value)} />
        <input className="input" placeholder="value" value={newValue} onChange={(e) => setNewValue(e.target.value)} />
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

function ExecutionPanel({ ruleId, refreshToken, autoOpenExecutionId }) {
  const [executions, setExecutions] = useState([]);
  const [selectedExecution, setSelectedExecution] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  async function loadExecutionList() {
    if (!ruleId) {
      setExecutions([]);
      setSelectedExecution(null);
      return;
    }
    try {
      setErrorMessage("");
      const data = await fetchJson(`${API_BASE}/executions/${ruleId}`);
      setExecutions(data);
    } catch (error) {
      setErrorMessage(error.message || "加载执行记录失败");
    }
  }

  async function loadExecution(executionId) {
    try {
      setErrorMessage("");
      const data = await fetchJson(`${API_BASE}/execution/${executionId}`);
      setSelectedExecution(data);
    } catch (error) {
      setErrorMessage(error.message || "加载执行详情失败");
    }
  }

  useEffect(() => {
    loadExecutionList();
  }, [ruleId, refreshToken]);

  useEffect(() => {
    if (autoOpenExecutionId) {
      loadExecution(autoOpenExecutionId);
    }
  }, [autoOpenExecutionId]);

  return (
    <div className="panel">
      <div className="panel-title">执行记录</div>
      {errorMessage && <div className="status-error">{errorMessage}</div>}
      <div className="exec-list">
        {executions.map((execution) => (
          <div key={execution.execution_id} className="exec-item" onClick={() => loadExecution(execution.execution_id)}>
            <div className="exec-id">{execution.execution_id}</div>
            <div className={`exec-status ${execution.status}`}>{execution.status}</div>
          </div>
        ))}
      </div>
      {selectedExecution && (
        <div className="exec-detail">
          <div className="exec-title">{selectedExecution.execution_id}</div>
          <div className={`exec-status ${selectedExecution.status}`}>{selectedExecution.status}</div>
          {selectedExecution.error && <div className="status-error">错误: {selectedExecution.error}</div>}
          {!selectedExecution.error && selectedExecution.result_summary && selectedExecution.status === "failed" && (
            <div className="status-error">错误: {selectedExecution.result_summary}</div>
          )}
          {selectedExecution.result_summary && selectedExecution.status !== "failed" && (
            <div className="status-note">结果: {selectedExecution.result_summary}</div>
          )}
          <div className="exec-steps">
            {selectedExecution.steps.map((step, index) => (
              <div key={`${step.node_id}-${index}`} className="exec-step">
                <div className="exec-step-head">
                  <span>{step.node_id}</span>
                  <span>{step.action_type}</span>
                  <span className={`exec-status ${step.status}`}>{step.status}</span>
                </div>
                <div className="exec-step-body">{step.content}</div>
                {step.output && <div className="exec-step-output">{step.output}</div>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function getSaveButtonLabel({ isSavingGraph, isGraphDirty, graphSavedHint }) {
  if (isSavingGraph) return "保存中...";
  if (isGraphDirty) return "保存图";
  if (graphSavedHint) return "已保存";
  return "保存图";
}

export default function App() {
  const [rules, setRules] = useState([]);
  const [selectedRuleId, setSelectedRuleId] = useState(null);
  const [currentRule, setCurrentRule] = useState(emptyRule);
  const [globals, setGlobals] = useState([]);
  const [nodes, setNodes] = useNodesState([]);
  const [edges, setEdges] = useEdgesState([]);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [isGraphDirty, setIsGraphDirty] = useState(false);
  const [isSavingGraph, setIsSavingGraph] = useState(false);
  const [graphSaveError, setGraphSaveError] = useState("");
  const [graphSavedHint, setGraphSavedHint] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [runError, setRunError] = useState("");
  const [executionRefreshToken, setExecutionRefreshToken] = useState(0);
  const [autoOpenExecutionId, setAutoOpenExecutionId] = useState(null);
  const [nodeTestState, setNodeTestState] = useState({
    isLoading: false,
    error: "",
    result: null,
  });

  const selectedNode = useMemo(() => nodes.find((node) => node.id === selectedNodeId), [nodes, selectedNodeId]);

  function clearSavedHintSoon() {
    setGraphSavedHint(true);
    window.setTimeout(() => setGraphSavedHint(false), 1200);
  }

  async function loadRules(preservedRuleId = selectedRuleId) {
    const data = await fetchJson(`${API_BASE}/rules`);
    setRules(data);
    const nextRuleId = reselectRuleAfterReload(data, preservedRuleId);
    if (!nextRuleId) {
      setSelectedRuleId(null);
      setCurrentRule(emptyRule);
      setNodes([]);
      setEdges([]);
      setSelectedNodeId(null);
      setIsGraphDirty(false);
      return;
    }
    if (nextRuleId !== selectedRuleId || !currentRule.id) {
      await loadRule(nextRuleId);
    }
  }

  async function loadGlobals() {
    const data = await fetchJson(`${API_BASE}/globals`);
    setGlobals(data);
  }

  async function loadRule(ruleId) {
    const data = await fetchJson(`${API_BASE}/rules/${ruleId}`);
    setSelectedRuleId(ruleId);
    setCurrentRule(data);
    setNodes(toFlowNodes(data.nodes));
    setEdges(toFlowEdges(data.edges));
    setSelectedNodeId(null);
    setIsGraphDirty(false);
    setGraphSaveError("");
    setGraphSavedHint(false);
    setRunError("");
    setNodeTestState({ isLoading: false, error: "", result: null });
  }

  async function createRule(name, description) {
    if (!name) return;
    const rule = await fetchJson(`${API_BASE}/rules`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description }),
    });
    await loadRules(rule.id);
    await loadRule(rule.id);
  }

  async function saveGraph() {
    if (!currentRule.id || isSavingGraph || !isGraphDirty) return;
    setIsSavingGraph(true);
    setGraphSaveError("");
    try {
      await fetchJson(`${API_BASE}/rules/${currentRule.id}/graph`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nodes: fromFlowNodes(nodes, currentRule.id),
          edges: fromFlowEdges(edges, currentRule.id),
        }),
      });
      setIsGraphDirty(false);
      clearSavedHintSoon();
    } catch (error) {
      setGraphSaveError(error.message || "保存失败");
    } finally {
      setIsSavingGraph(false);
    }
  }

  async function runRule() {
    if (!currentRule.id || isRunning) return;
    const globalsMap = globals.reduce((acc, item) => {
      acc[item.key] = item.value;
      return acc;
    }, {});

    setIsRunning(true);
    setRunError("");
    try {
      const result = await fetchJson(`${API_BASE}/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rule_id: currentRule.id, variables: globalsMap }),
      });
      setExecutionRefreshToken((prev) => prev + 1);
      if (result.execution_id) {
        setAutoOpenExecutionId(result.execution_id);
      }
      if (result.status === "failed") {
        setRunError(result.error || "执行失败");
      }
    } catch (error) {
      setRunError(error.message || "运行失败");
    } finally {
      setIsRunning(false);
    }
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

  async function testCurrentNode(meta) {
    const globalsMap = globals.reduce((acc, item) => {
      acc[item.key] = item.value;
      return acc;
    }, {});

    setNodeTestState({ isLoading: true, error: "", result: null });
    try {
      const result = await fetchJson(`${API_BASE}/node-test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          node: {
            id: meta.id,
            type: meta.type,
            config: meta.config || {},
          },
          variables: globalsMap,
        }),
      });
      if (result.status === "failed") {
        setNodeTestState({
          isLoading: false,
          error: result.error || "节点测试失败",
          result,
        });
      } else {
        setNodeTestState({ isLoading: false, error: "", result });
      }
    } catch (error) {
      setNodeTestState({
        isLoading: false,
        error: error.message || "节点测试失败",
        result: null,
      });
    }
  }

  useEffect(() => {
    async function bootstrap() {
      await loadRules();
      await loadGlobals();
    }
    bootstrap();
  }, []);

  useEffect(() => {
    setNodeTestState({ isLoading: false, error: "", result: null });
  }, [selectedNodeId]);

  function handleNodesChange(changes) {
    if (shouldMarkDirtyFromNodeChanges(changes)) {
      setIsGraphDirty(true);
      setGraphSaveError("");
      setGraphSavedHint(false);
    }
    setNodes((nds) => applyNodeChanges(changes, nds));
  }

  function handleEdgesChange(changes) {
    if (shouldMarkDirtyFromEdgeChanges(changes)) {
      setIsGraphDirty(true);
      setGraphSaveError("");
      setGraphSavedHint(false);
    }
    setEdges((eds) => applyEdgeChanges(changes, eds));
  }

  function addNode(type) {
    const id = `node_${nodes.length + 1}`;
    const positionMap = {
      sql: { x: 100 + nodes.length * 40, y: 100 + nodes.length * 40 },
      log: { x: 120 + nodes.length * 40, y: 140 + nodes.length * 40 },
      store: { x: 140 + nodes.length * 40, y: 180 + nodes.length * 40 },
    };
    const configMap = {
      sql: { sql: "" },
      log: { log_message: "" },
      store: { store_key: "", store_value: "" },
    };
    setNodes((prev) => {
      const nextNode = {
        id,
        position: positionMap[type],
        data: { label: "", meta: { id, type, config: configMap[type] } },
      };
      return [...prev, { ...nextNode, data: { ...nextNode.data, label: updateNodeLabel(nextNode) } }];
    });
    setIsGraphDirty(true);
    setGraphSaveError("");
    setGraphSavedHint(false);
  }

  const saveButtonLabel = getSaveButtonLabel({ isSavingGraph, isGraphDirty, graphSavedHint });
  const saveDisabled = isSavingGraph || !currentRule.id || !isGraphDirty;

  return (
    <div className="app">
      <Sidebar
        rules={rules}
        onCreate={createRule}
        onSelect={loadRule}
        onReload={() => loadRules(selectedRuleId)}
        selectedId={selectedRuleId}
      />
      <div className="canvas">
        <div className="toolbar">
          <button className="btn primary" onClick={() => addNode("sql")}>+ SQL</button>
          <button className="btn" onClick={() => addNode("log")}>+ LOG</button>
          <button className="btn" onClick={() => addNode("store")}>+ STORE</button>
          <button className="btn ghost" onClick={saveGraph} disabled={saveDisabled}>{saveButtonLabel}</button>
          <button className="btn primary" onClick={runRule} disabled={!currentRule.id || isRunning}>
            {isRunning ? "运行中..." : "运行"}
          </button>
        </div>
        {(graphSaveError || runError) && (
          <div className="toolbar-status">
            {graphSaveError && <div className="status-error">保存失败: {graphSaveError}</div>}
            {runError && <div className="status-error">运行失败: {runError}</div>}
          </div>
        )}
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={handleNodesChange}
          onEdgesChange={handleEdgesChange}
          onConnect={(conn) => {
            setEdges((eds) => addEdge({ ...conn, type: "smoothstep" }, eds));
            setIsGraphDirty(true);
            setGraphSaveError("");
            setGraphSavedHint(false);
          }}
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
            if (!selectedNode) return;
            setNodes((nds) =>
              nds.map((node) => {
                if (node.id !== selectedNode.id) return node;
                const nextNode = {
                  ...node,
                  data: {
                    ...node.data,
                    meta,
                  },
                  style: {
                    ...node.style,
                    border: `2px solid ${nodeTypes[meta.type]?.color || "#444"}`,
                  },
                };
                return { ...nextNode, data: { ...nextNode.data, label: updateNodeLabel(nextNode) } };
              })
            );
            setIsGraphDirty(true);
            setGraphSaveError("");
            setGraphSavedHint(false);
            setNodeTestState({ isLoading: false, error: "", result: null });
          }}
          onTest={testCurrentNode}
          nodeTestState={nodeTestState}
        />
        <GlobalsPanel globals={globals} onSave={saveGlobal} onDelete={deleteGlobal} />
        <ExecutionPanel
          ruleId={currentRule.id}
          refreshToken={executionRefreshToken}
          autoOpenExecutionId={autoOpenExecutionId}
        />
      </div>
    </div>
  );
}
