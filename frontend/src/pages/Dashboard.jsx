import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Save, Play, Plus, Trash2, RefreshCw, Settings, CheckCircle2, AlertCircle } from "lucide-react";

import { NodeEditor } from "../components/NodeEditor";
import { ThemeToggle } from "../components/ThemeToggle";
import { nodeTypes } from "../editor/nodeMeta";
import { API_BASE, fetchJson, getDefaultProjectId } from "../utils/api";

const emptyRule = {
    id: null,
    name: "",
    description: "",
    steps: [],
};

function Sidebar({ rules, onCreate, onSelect, onReload, selectedId, onRun, executingRuleId, lastResults }) {
    const [name, setName] = useState("");
    const [desc, setDesc] = useState("");

    return (
        <div className="sidebar" style={{ width: "300px" }}>
            <div className="sidebar-header">
                <div className="logo-title" style={{ fontSize: "18px", flex: 1 }}>Scenario Pro</div>
                <ThemeToggle className="btn-icon-sm" />
                <Link to="/settings" className="btn-icon-sm" title="Settings">
                    <Settings size={16} />
                </Link>
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

            <div className="sidebar-section" style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", paddingBottom: 0, borderBottom: "none" }}>
                <div className="section-title">
                    <span>Rules</span>
                    <button className="btn-icon-sm" onClick={onReload} title="Refresh">
                        <RefreshCw size={14} />
                    </button>
                </div>
                <div className="rule-list" style={{ flex: 1, maxHeight: "none", paddingBottom: "16px" }}>
                    {rules.length === 0 ? (
                        <div style={{ padding: "20px", textAlign: "center", color: "var(--text-muted)", fontSize: "13px" }}>
                            No rules found.
                        </div>
                    ) : (
                        rules.map((rule) => {
                            const result = lastResults[rule.id];
                            const isExecuting = executingRuleId === rule.id;
                            const isActive = selectedId == rule.id;
                            return (
                                <div
                                    key={rule.id}
                                    className={`rule-item ${isActive ? "active" : ""}`}
                                    onClick={() => onSelect(rule.id)}
                                    style={{ display: "flex", flexDirection: "column", gap: "8px", padding: "12px", border: "1px solid var(--border-muted)", marginBottom: "8px" }}
                                >
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                        <div>
                                            <div className="rule-name" style={{ fontSize: "14px" }}>{rule.name}</div>
                                            <div className="rule-desc" style={{ whiteSpace: "normal" }}>{rule.description}</div>
                                        </div>
                                    </div>
                                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "4px" }}>
                                        <div style={{ fontSize: "11px" }}>
                                            {result?.status === 'success' && <span style={{ color: "var(--success)" }}>● Success</span>}
                                            {result?.status === 'failed' && <span style={{ color: "var(--error)" }}>● Failed</span>}
                                        </div>
                                        <button
                                            className="btn primary"
                                            style={{ padding: "4px 12px", fontSize: "12px" }}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onRun(rule);
                                            }}
                                            disabled={isExecuting}
                                        >
                                            {isExecuting ? <span className="spinner-sm"></span> : <Play size={12} />}
                                            {isExecuting ? " Running" : " Run"}
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}

function GlobalsPanel({ globals, onSave, onDelete }) {
    const [newKey, setNewKey] = useState("");
    const [newValue, setNewValue] = useState("");

    return (
        <div className="panel" style={{ border: "none", padding: 0, background: "transparent" }}>
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
            <div className="field-group" style={{ marginTop: "16px" }}>
                <label style={{ fontSize: "12px", fontWeight: 500, color: "var(--text-muted)", marginBottom: "8px", display: "block" }}>Add Variable</label>
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
        <div className="panel" style={{ border: "none", padding: 0, background: "transparent" }}>
            {errorMessage && <div className="status-error">{errorMessage}</div>}
            <div className="exec-list" style={{ maxHeight: "250px" }}>
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
                                {(step.action_type === "sql" || step.action_type === "mysql") && step.step_data?.metadata?.statement_results?.length > 0 && (
                                    <div className="exec-step-statement-results statement-results-in-order">
                                        {step.step_data.metadata.statement_results.map((sr, idx) => (
                                            <div key={idx} className="statement-result-item">
                                                <div className="result-meta-row statement-row">
                                                    <span className="result-caption">#{sr.index}</span>
                                                    <span className="result-caption">影响行数: {sr.rowcount}</span>
                                                </div>
                                                <pre className="result-pre result-pre-muted result-pre-snippet">{sr.sql}</pre>
                                                {sr.rows && sr.rows.length > 0 && (
                                                    <div className="result-table-wrap mt-2">
                                                        <table className="result-table">
                                                            <thead>
                                                                <tr>
                                                                    {Object.keys(sr.rows[0]).map((col) => (
                                                                        <th key={col}>{col}</th>
                                                                    ))}
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {sr.rows.slice(0, 50).map((row, i) => (
                                                                    <tr key={i}>
                                                                        {Object.values(row).map((val, j) => (
                                                                            <td key={j}>
                                                                                {val === null ? <span className="result-null">null</span> : String(val)}
                                                                            </td>
                                                                        ))}
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                        {sr.rows.length > 50 && (
                                                            <div className="result-caption">Showing 50 of {sr.rows.length} rows</div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {step.output && <div className="exec-step-output">{step.output}</div>}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

export default function Dashboard() {
    const { ruleId } = useParams();
    const navigate = useNavigate();

    const [rules, setRules] = useState([]);
    const [currentRule, setCurrentRule] = useState(emptyRule);
    const [globals, setGlobals] = useState([]);
    const [steps, setSteps] = useState([]);
    const [selectedStepId, setSelectedStepId] = useState(null);

    const [isStepsDirty, setIsStepsDirty] = useState(false);
    const [isSavingSteps, setIsSavingSteps] = useState(false);
    const [stepsSaveError, setStepsSaveError] = useState("");
    const [stepsSavedHint, setStepsSavedHint] = useState(false);

    const [executingRuleId, setExecutingRuleId] = useState(null);
    const [lastResults, setLastResults] = useState({});
    const [executionRefreshToken, setExecutionRefreshToken] = useState(0);
    const [autoOpenExecutionId, setAutoOpenExecutionId] = useState(null);

    const [nodeTestState, setNodeTestState] = useState({
        isLoading: false,
        error: "",
        result: null,
    });
    const [nodeTestStore, setNodeTestStore] = useState({});

    const [toast, setToast] = useState(null);

    // Right panel tabs: "config", "variables", "executions"
    const [activeTab, setActiveTab] = useState("variables");

    const selectedStep = useMemo(() => steps.find((step) => step.id === selectedStepId), [steps, selectedStepId]);

    function clearSavedHintSoon() {
        setStepsSavedHint(true);
        window.setTimeout(() => setStepsSavedHint(false), 1200);
    }

    function showToast(type, message) {
        setToast({ type, message });
        setTimeout(() => setToast(null), 3000);
    }

    useEffect(() => {
        async function bootstrap() {
            await loadRulesList();
            await loadGlobals();
        }
        bootstrap();
    }, []);

    useEffect(() => {
        if (ruleId) {
            loadRule(ruleId);
        } else {
            setCurrentRule(emptyRule);
            setSteps([]);
            setSelectedStepId(null);
            setIsStepsDirty(false);
            if (activeTab === "config" || activeTab === "executions") {
                setActiveTab("variables");
            }
        }
    }, [ruleId]);

    useEffect(() => {
        if (selectedStepId) {
            setActiveTab("config");
            setNodeTestState({ isLoading: false, error: "", result: null });
        } else if (activeTab === "config") {
            setActiveTab("variables");
        }
    }, [selectedStepId]);

    async function loadRulesList() {
        const data = await fetchJson(`${API_BASE}/rules`);
        setRules(Array.isArray(data) ? data : []);
    }

    async function loadGlobals() {
        const data = await fetchJson(`${API_BASE}/globals`);
        setGlobals(Array.isArray(data) ? data : []);
    }

    async function loadRule(id) {
        if (!id) return;
        try {
            const data = await fetchJson(`${API_BASE}/rules/${id}`);
            setCurrentRule(data);
            const nextSteps = Array.isArray(data.steps) ? data.steps : [];
            setSteps(nextSteps);
            setSelectedStepId(null);
            setIsStepsDirty(false);
            setStepsSaveError("");
            setStepsSavedHint(false);
        } catch (e) {
            console.error("Failed to load rule", e);
        }
    }

    function handleSelectRule(id) {
        navigate(`/${id}`);
    }

    async function createRule(name, description) {
        if (!name) return;
        const rule = await fetchJson(`${API_BASE}/rules`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, description }),
        });
        await loadRulesList();
        navigate(`/${rule.id}`);
    }

    async function saveSteps() {
        if (!currentRule.id || isSavingSteps || !isStepsDirty) return;
        setIsSavingSteps(true);
        setStepsSaveError("");
        try {
            await fetchJson(`${API_BASE}/rules/${currentRule.id}/steps`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    steps: steps.map((step, index) => ({
                        node_id: step.id,
                        rule_id: currentRule.id,
                        type: step.type,
                        order_index: index,
                        config: step.config || {},
                    })),
                }),
            });
            setIsStepsDirty(false);
            clearSavedHintSoon();
            return true;
        } catch (error) {
            setStepsSaveError(error.message || "Save failed");
            return false;
        } finally {
            setIsSavingSteps(false);
        }
    }

    async function runRule(rule) {
        if (executingRuleId) return;

        // Auto-save if dirty and running current rule
        if (rule.id === currentRule.id && isStepsDirty) {
            const success = await saveSteps();
            if (!success) {
                showToast("error", "Auto-save failed, aborting run");
                return;
            }
        }

        setExecutingRuleId(rule.id);
        setLastResults(prev => {
            const next = { ...prev };
            delete next[rule.id];
            return next;
        });

        try {
            const globalsMap = globals.reduce((acc, item) => {
                acc[item.key] = item.value;
                return acc;
            }, {});

            const result = await fetchJson(`${API_BASE}/execute`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ rule_id: rule.id, variables: globalsMap }),
            });

            if (rule.id === currentRule.id) {
                setExecutionRefreshToken((prev) => prev + 1);
                if (result.execution_id) {
                    setAutoOpenExecutionId(result.execution_id);
                    setActiveTab("executions");
                }
            }

            if (result.status === "failed") {
                showToast("error", `execution failed: ${result.error || "Unknown error"}`);
                setLastResults(prev => ({ ...prev, [rule.id]: { status: 'failed', error: result.error } }));
            } else {
                showToast("success", "Execution completed");
                setLastResults(prev => ({ ...prev, [rule.id]: { status: 'success', id: result.execution_id } }));
            }
        } catch (error) {
            showToast("error", `execution error: ${error.message}`);
            setLastResults(prev => ({ ...prev, [rule.id]: { status: 'failed', error: error.message } }));
        } finally {
            setExecutingRuleId(null);
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
                    store: nodeTestStore,
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

    async function handleNodeTest(meta) {
        await testCurrentNode(meta);
        if (isStepsDirty) {
            await saveSteps();
        }
    }

    function addStep(type) {
        const id = `step_${steps.length + 1}`;
        const configMap = {
            sql: { sql: "" },
            log: { log_message: "" },
            store: { store_key: "", store_value: "" },
            load: { scope: "rule", key: "", assign_to: "loaded_value" },
            python: { script: "result = vars.get('value')", timeout_sec: 10 },
            shell: { command: "echo hello", timeout_sec: 10 },
        };
        const nextStep = { id, rule_id: currentRule.id, type, order_index: steps.length, config: configMap[type] || {} };
        setSteps((prev) => [...prev, nextStep]);
        setSelectedStepId(id);
        setIsStepsDirty(true);
        setStepsSaveError("");
        setStepsSavedHint(false);
    }

    const saveButtonLabel = useMemo(() => {
        if (isSavingSteps) return "Saving...";
        if (isStepsDirty) return "Save Steps";
        if (stepsSavedHint) return "Saved";
        return "Save Steps";
    }, [isSavingSteps, isStepsDirty, stepsSavedHint]);

    const saveDisabled = isSavingSteps || !currentRule.id || !isStepsDirty;

    function deleteStep(stepId) {
        if (!stepId) return;
        setSteps((prev) => {
            const filtered = prev.filter((s) => s.id !== stepId);
            return filtered.map((s, index) => ({ ...s, order_index: index }));
        });
        if (selectedStepId === stepId) {
            setSelectedStepId(null);
        }
        setIsStepsDirty(true);
        setStepsSaveError("");
        setStepsSavedHint(false);
    }

    function moveStep(stepId, delta) {
        setSteps((prev) => {
            const index = prev.findIndex((s) => s.id === stepId);
            if (index === -1) return prev;
            const targetIndex = index + delta;
            if (targetIndex < 0 || targetIndex >= prev.length) return prev;
            const next = [...prev];
            const [item] = next.splice(index, 1);
            next.splice(targetIndex, 0, item);
            return next.map((s, idx) => ({ ...s, order_index: idx }));
        });
        setIsStepsDirty(true);
        setStepsSaveError("");
        setStepsSavedHint(false);
    }

    return (
        <div className="app editor-layout" style={{ gridTemplateColumns: "300px 1fr 400px" }}>
            <Sidebar
                rules={rules}
                onCreate={createRule}
                onSelect={handleSelectRule}
                onReload={loadRulesList}
                selectedId={ruleId}
                onRun={runRule}
                executingRuleId={executingRuleId}
                lastResults={lastResults}
            />

            <div className="canvas">
                {currentRule.id ? (
                    <>
                        <div className="toolbar" style={{ position: "static", borderRadius: 0, borderLeft: "none", borderRight: "none", borderTop: "none", display: "flex", justifyContent: "space-between", padding: "12px 16px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <h2 style={{ margin: 0, fontSize: "16px" }}>{currentRule.name}</h2>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <button className="btn ghost" onClick={saveSteps} disabled={saveDisabled}>
                                    <Save size={16} /> {saveButtonLabel}
                                </button>
                                <button className="btn primary" onClick={() => runRule(currentRule)} disabled={executingRuleId === currentRule.id}>
                                    {executingRuleId === currentRule.id ? <span className="spinner-sm"></span> : <Play size={16} />}
                                    {executingRuleId === currentRule.id ? " Running..." : " Run"}
                                </button>
                            </div>
                        </div>
                        <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border-muted)", display: "flex", gap: "8px", flexWrap: "wrap", background: "var(--bg-panel)" }}>
                            <button className="btn" onClick={() => addStep("mysql")}>+ MySQL</button>
                            <button className="btn" onClick={() => addStep("redis")}>+ Redis</button>
                            <button className="btn" onClick={() => addStep("log")}>+ LOG</button>
                            <button className="btn" onClick={() => addStep("store")}>+ STORE</button>
                            <button className="btn" onClick={() => addStep("load")}>+ LOAD</button>
                            <button className="btn" onClick={() => addStep("python")}>+ PYTHON</button>
                            <button className="btn" onClick={() => addStep("shell")}>+ SHELL</button>
                        </div>
                        {(stepsSaveError) && (
                            <div style={{ padding: "12px 16px 0" }}>
                                <div className="status-error" style={{ marginBottom: 0 }}>Save Error: {stepsSaveError}</div>
                            </div>
                        )}
                        <div className="steps-list" style={{ marginTop: 0 }}>
                            {steps.length === 0 && (
                                <div className="empty-state-canvas">
                                    <h3>No steps yet. Add a step to get started.</h3>
                                </div>
                            )}
                            {steps.map((step, index) => {
                                const typeMeta = nodeTypes[step.type] || { label: step.type.toUpperCase() };
                                const isActive = step.id === selectedStepId;
                                return (
                                    <div
                                        key={step.id}
                                        className={`step-item ${isActive ? "active" : ""}`}
                                        onClick={() => setSelectedStepId(step.id)}
                                    >
                                        <div className="step-index">{index + 1}</div>
                                        <div className="step-main">
                                            <div className="step-title">
                                                <span className="step-type-pill">{typeMeta.label}</span>
                                                <span className="step-id">{step.id}</span>
                                            </div>
                                        </div>
                                        <div className="step-actions">
                                            <button
                                                className="btn-icon-sm"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    moveStep(step.id, -1);
                                                }}
                                                disabled={index === 0}
                                                title="Move up"
                                            >
                                                ↑
                                            </button>
                                            <button
                                                className="btn-icon-sm"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    moveStep(step.id, 1);
                                                }}
                                                disabled={index === steps.length - 1}
                                                title="Move down"
                                            >
                                                ↓
                                            </button>
                                            <button
                                                className="btn-icon-danger"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    deleteStep(step.id);
                                                }}
                                                title="Delete step"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </>
                ) : (
                    <div className="empty-state-canvas">
                        <h3>Select or create a rule to start editing</h3>
                    </div>
                )}
            </div>

            <div className="right-panel" style={{ padding: 0, gap: 0 }}>
                <div style={{ display: "flex", borderBottom: "1px solid var(--border-muted)", background: "var(--bg-panel)" }}>
                    <button
                        style={{ flex: 1, padding: "12px", borderBottom: activeTab === "config" ? "2px solid var(--primary)" : "2px solid transparent", color: activeTab === "config" ? "var(--primary)" : "var(--text-muted)", fontWeight: 500 }}
                        onClick={() => setActiveTab("config")}
                    >
                        Node Config
                    </button>
                    <button
                        style={{ flex: 1, padding: "12px", borderBottom: activeTab === "variables" ? "2px solid var(--primary)" : "2px solid transparent", color: activeTab === "variables" ? "var(--primary)" : "var(--text-muted)", fontWeight: 500 }}
                        onClick={() => setActiveTab("variables")}
                    >
                        Variables
                    </button>
                    <button
                        style={{ flex: 1, padding: "12px", borderBottom: activeTab === "executions" ? "2px solid var(--primary)" : "2px solid transparent", color: activeTab === "executions" ? "var(--primary)" : "var(--text-muted)", fontWeight: 500 }}
                        onClick={() => setActiveTab("executions")}
                    >
                        Executions
                    </button>
                </div>
                <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
                    {activeTab === "config" && (
                        selectedStep ? (
                            <div className="panel" style={{ border: "none", padding: 0, background: "transparent" }}>
                                <div style={{ marginBottom: "16px", paddingBottom: "12px", borderBottom: "1px solid var(--border-muted)" }}>
                                    <div style={{ fontSize: "14px", fontWeight: 600 }}>Node: {selectedStep.id}</div>
                                </div>
                                <NodeEditor
                                    node={{
                                        data: { meta: { id: selectedStep.id, type: selectedStep.type, config: selectedStep.config || {} } },
                                    }}
                                    onChange={(meta) => {
                                        setSteps((prev) =>
                                            prev.map((step) =>
                                                step.id === selectedStep.id ? { ...step, type: meta.type, config: meta.config || {} } : step
                                            )
                                        );
                                        setIsStepsDirty(true);
                                        setStepsSaveError("");
                                        setStepsSavedHint(false);
                                        setNodeTestState({ isLoading: false, error: "", result: null });
                                    }}
                                    onTest={handleNodeTest}
                                    nodeTestState={nodeTestState}
                                    testStore={nodeTestStore}
                                    onTestStoreChange={setNodeTestStore}
                                />
                            </div>
                        ) : (
                            <div style={{ color: "var(--text-muted)", fontSize: "13px", textAlign: "center", marginTop: "40px" }}>
                                Select a step to configure
                            </div>
                        )
                    )}
                    {activeTab === "variables" && (
                        <GlobalsPanel globals={globals} onSave={saveGlobal} onDelete={deleteGlobal} />
                    )}
                    {activeTab === "executions" && (
                        <ExecutionPanel
                            ruleId={currentRule.id}
                            refreshToken={executionRefreshToken}
                            autoOpenExecutionId={autoOpenExecutionId}
                        />
                    )}
                </div>
            </div>

            {toast && (
                <div className={`toast toast-${toast.type}`}>
                    {toast.type === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                    <span>{toast.message}</span>
                </div>
            )}
        </div>
    );
}
