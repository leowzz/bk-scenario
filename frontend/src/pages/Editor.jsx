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
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Save, Play, Plus, Trash2, RefreshCw } from "lucide-react";

import { NodeEditor } from "../components/NodeEditor";
import { ThemeToggle } from "../components/ThemeToggle";
import { shouldMarkDirtyFromEdgeChanges, shouldMarkDirtyFromNodeChanges, reselectRuleAfterReload } from "../editor/graphState";
import { nodeTypes, updateNodeLabel } from "../editor/nodeMeta";
import { API_BASE, fetchJson } from "../utils/api";

const emptyRule = {
    id: null,
    name: "",
    description: "",
    nodes: [],
    edges: [],
};

// --- Helper Functions (Moved from App.jsx) ---
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

// --- Inner Components ---

function Sidebar({ rules, onCreate, onSelect, onReload, selectedId }) {
    const [name, setName] = useState("");
    const [desc, setDesc] = useState("");
    const navigate = useNavigate();

    return (
        <div className="sidebar">
            <div className="sidebar-header">
                <Link to="/" className="btn-icon">
                    <ArrowLeft size={20} />
                </Link>
                <div className="sidebar-title" style={{ flex: 1 }}>Rules</div>
                <ThemeToggle className="btn-icon-sm" />
            </div>

            <div className="sidebar-section">
                <div className="section-title">
                    <span>All Rules</span>
                    <button className="btn-icon-sm" onClick={onReload} title="Refresh">
                        <RefreshCw size={14} />
                    </button>
                </div>
                <div className="rule-list">
                    {rules.map((rule) => (
                        <div
                            key={rule.id}
                            className={`rule-item ${selectedId == rule.id ? "active" : ""}`}
                            onClick={() => onSelect(rule.id)}
                        >
                            <div className="rule-name">{rule.name}</div>
                            {rule.id == selectedId && rule.description && (
                                <div className="rule-desc">{rule.description}</div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            <div className="sidebar-section">
                <div className="section-title">New Rule</div>
                <div className="new-rule-form">
                    <input className="input" placeholder="Rule Name" value={name} onChange={(e) => setName(e.target.value)} />
                    <textarea className="input" placeholder="Description" rows={2} value={desc} onChange={(e) => setDesc(e.target.value)} />
                    <button
                        className="btn primary full-width"
                        disabled={!name}
                        onClick={() => {
                            onCreate(name, desc);
                            setName("");
                            setDesc("");
                        }}
                    >
                        <Plus size={16} /> Create
                    </button>
                </div>
            </div>
        </div>
    );
}

function GlobalsPanel({ globals, onSave, onDelete }) {
    const [newKey, setNewKey] = useState("");
    const [newValue, setNewValue] = useState("");

    return (
        <div className="panel">
            <div className="panel-title">Global Variables</div>
            <div className="globals-list">
                {globals.map((globalVar) => (
                    <div key={globalVar.key} className="globals-item">
                        <div className="globals-info">
                            <div className="globals-key">{globalVar.key}</div>
                            <div className="globals-value">{globalVar.value}</div>
                        </div>
                        <button className="btn-icon-danger" onClick={() => onDelete(globalVar.key)}>
                            <Trash2 size={14} />
                        </button>
                    </div>
                ))}
            </div>
            <div className="field-group">
                <label>Add Variable</label>
                <div className="input-row">
                    <input className="input" placeholder="key" value={newKey} onChange={(e) => setNewKey(e.target.value)} />
                    <input className="input" placeholder="value" value={newValue} onChange={(e) => setNewValue(e.target.value)} />
                </div>
                <button
                    className="btn primary mt-2"
                    disabled={!newKey}
                    onClick={() => {
                        if (!newKey) return;
                        onSave({ key: newKey, value: newValue, type: "string" });
                        setNewKey("");
                        setNewValue("");
                    }}
                >
                    Save Variable
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
            setErrorMessage(error.message || "Failed to load executions");
        }
    }

    async function loadExecution(executionId) {
        try {
            setErrorMessage("");
            const data = await fetchJson(`${API_BASE}/execution/${executionId}`);
            setSelectedExecution(data);
        } catch (error) {
            setErrorMessage(error.message || "Failed to load execution detail");
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
            <div className="panel-title">Execution History</div>
            {errorMessage && <div className="status-error">{errorMessage}</div>}
            <div className="exec-list">
                {executions.map((execution) => (
                    <div
                        key={execution.execution_id}
                        className={`exec-item ${selectedExecution?.execution_id === execution.execution_id ? 'active' : ''}`}
                        onClick={() => loadExecution(execution.execution_id)}
                    >
                        <div className="exec-id">#{execution.execution_id}</div>
                        <div className={`exec-status-badge ${execution.status}`}>{execution.status}</div>
                    </div>
                ))}
            </div>
            {selectedExecution && (
                <div className="exec-detail">
                    <div className="exec-detail-header">
                        <span className="exec-title">#{selectedExecution.execution_id}</span>
                        <span className={`exec-status-badge ${selectedExecution.status}`}>{selectedExecution.status}</span>
                    </div>

                    {selectedExecution.error && <div className="status-error">Error: {selectedExecution.error}</div>}
                    {!selectedExecution.error && selectedExecution.result_summary && selectedExecution.status === "failed" && (
                        <div className="status-error">Error: {selectedExecution.result_summary}</div>
                    )}
                    {selectedExecution.result_summary && selectedExecution.status !== "failed" && (
                        <div className="status-note">Result: {selectedExecution.result_summary}</div>
                    )}
                    <div className="exec-steps">
                        {selectedExecution.steps.map((step, index) => (
                            <div key={`${step.node_id}-${index}`} className="exec-step">
                                <div className="exec-step-head">
                                    <span className="step-node">{step.node_id}</span>
                                    <span className="step-type">{step.action_type}</span>
                                    <span className={`step-status ${step.status}`}>{step.status}</span>
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

// --- Main Editor Component ---

export default function Editor() {
    const { ruleId } = useParams();
    const navigate = useNavigate();

    const [rules, setRules] = useState([]);
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

    // Load initial data
    useEffect(() => {
        async function bootstrap() {
            await loadRulesList();
            await loadGlobals();
        }
        bootstrap();
    }, []);

    // Handle URL ruleId change
    useEffect(() => {
        if (ruleId) {
            // If we have a ruleId, load that specific rule
            loadRule(ruleId);
        } else {
            // No ID, reset to empty
            setCurrentRule(emptyRule);
            setNodes([]);
            setEdges([]);
            setSelectedNodeId(null);
            setIsGraphDirty(false);
        }
    }, [ruleId]);


    async function loadRulesList() {
        const data = await fetchJson(`${API_BASE}/rules`);
        setRules(data);
    }

    async function loadGlobals() {
        const data = await fetchJson(`${API_BASE}/globals`);
        setGlobals(data);
    }

    async function loadRule(id) {
        if (!id) return;
        try {
            const data = await fetchJson(`${API_BASE}/rules/${id}`);
            setCurrentRule(data);
            setNodes(toFlowNodes(data.nodes));
            setEdges(toFlowEdges(data.edges));
            setSelectedNodeId(null);
            setIsGraphDirty(false);
            setGraphSaveError("");
            setGraphSavedHint(false);
            setRunError("");
            setNodeTestState({ isLoading: false, error: "", result: null });
        } catch (e) {
            console.error("Failed to load rule", e);
            // If 404, maybe navigate back to editor root?
        }
    }

    // Called when clicking a rule in sidebar
    function handleSelectRule(id) {
        navigate(`/editor/${id}`);
    }

    async function createRule(name, description) {
        if (!name) return;
        const rule = await fetchJson(`${API_BASE}/rules`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, description }),
        });
        await loadRulesList();
        navigate(`/editor/${rule.id}`);
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
            setGraphSaveError(error.message || "Save failed");
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
                setRunError(result.error || "Execution failed");
            }
        } catch (error) {
            setRunError(error.message || "Execution error");
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
                    error: result.error || "Test failed",
                    result,
                });
            } else {
                setNodeTestState({ isLoading: false, error: "", result });
            }
        } catch (error) {
            setNodeTestState({
                isLoading: false,
                error: error.message || "Test failed",
                result: null,
            });
        }
    }

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

    const saveButtonLabel = useMemo(() => {
        if (isSavingGraph) return "Saving...";
        if (isGraphDirty) return "Save Graph";
        if (graphSavedHint) return "Saved";
        return "Save Graph";
    }, [isSavingGraph, isGraphDirty, graphSavedHint]);

    const saveDisabled = isSavingGraph || !currentRule.id || !isGraphDirty;

    return (
        <div className="app editor-layout">
            <Sidebar
                rules={rules}
                onCreate={createRule}
                onSelect={handleSelectRule}
                onReload={loadRulesList}
                selectedId={ruleId}
            />

            {/* If no rule selected, show a placeholder or just the canvas blank */}
            <div className="canvas">
                {currentRule.id ? (
                    <>
                        <div className="toolbar">
                            <button className="btn primary" onClick={() => addNode("sql")}>+ SQL</button>
                            <button className="btn" onClick={() => addNode("log")}>+ LOG</button>
                            <button className="btn" onClick={() => addNode("store")}>+ STORE</button>
                            <div className="divider"></div>
                            <button className="btn ghost" onClick={saveGraph} disabled={saveDisabled}>
                                <Save size={16} /> {saveButtonLabel}
                            </button>
                            <button className="btn primary" onClick={runRule} disabled={!currentRule.id || isRunning}>
                                {isRunning ? <span className="spinner-sm"></span> : <Play size={16} />}
                                {isRunning ? " Running..." : " Run"}
                            </button>
                        </div>
                        {(graphSaveError || runError) && (
                            <div className="toolbar-status">
                                {graphSaveError && <div className="status-error">Save Error: {graphSaveError}</div>}
                                {runError && <div className="status-error">Run Error: {runError}</div>}
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
                    </>
                ) : (
                    <div className="empty-state-canvas">
                        <h3>Select or create a rule to start editing</h3>
                    </div>
                )}
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
