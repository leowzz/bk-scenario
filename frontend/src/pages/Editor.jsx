import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Save, Play, Plus, Trash2, RefreshCw } from "lucide-react";

import { NodeEditor } from "../components/NodeEditor";
import { ThemeToggle } from "../components/ThemeToggle";
import { nodeTypes } from "../editor/nodeMeta";
import { API_BASE, fetchJson } from "../utils/api";

const emptyRule = {
    id: null,
    name: "",
    description: "",
    steps: [],
};

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
    const [steps, setSteps] = useState([]);
    const [selectedStepId, setSelectedStepId] = useState(null);

    const [isStepsDirty, setIsStepsDirty] = useState(false);
    const [isSavingSteps, setIsSavingSteps] = useState(false);
    const [stepsSaveError, setStepsSaveError] = useState("");
    const [stepsSavedHint, setStepsSavedHint] = useState(false);

    const [isRunning, setIsRunning] = useState(false);
    const [runError, setRunError] = useState("");
    const [executionRefreshToken, setExecutionRefreshToken] = useState(0);
    const [autoOpenExecutionId, setAutoOpenExecutionId] = useState(null);

    const [nodeTestState, setNodeTestState] = useState({
        isLoading: false,
        error: "",
        result: null,
    });
    const [nodeTestStore, setNodeTestStore] = useState({});

    const selectedStep = useMemo(() => steps.find((step) => step.id === selectedStepId), [steps, selectedStepId]);

    function clearSavedHintSoon() {
        setStepsSavedHint(true);
        window.setTimeout(() => setStepsSavedHint(false), 1200);
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
            setSteps([]);
            setSelectedStepId(null);
            setIsStepsDirty(false);
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
            const nextSteps = Array.isArray(data.steps) ? data.steps : [];
            setSteps(nextSteps);
            setSelectedStepId(null);
            setIsStepsDirty(false);
            setStepsSaveError("");
            setStepsSavedHint(false);
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

    async function runRule() {
        if (!currentRule.id || isRunning) return;

        // Auto-save if dirty
        if (isStepsDirty) {
            const success = await saveSteps();
            if (!success) {
                setRunError("Auto-save failed, aborting run");
                return;
            }
        }

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

    useEffect(() => {
        setNodeTestState({ isLoading: false, error: "", result: null });
    }, [selectedStepId]);

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
        const nextStep = { id, rule_id: currentRule.id, type, order_index: steps.length, config: configMap[type] };
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
        setSelectedStepId(null);
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
                            <button className="btn primary" onClick={() => addStep("mysql")}>+ MySQL</button>
                            <button className="btn" onClick={() => addStep("redis")}>+ Redis</button>
                            <button className="btn" onClick={() => addStep("log")}>+ LOG</button>
                            <button className="btn" onClick={() => addStep("store")}>+ STORE</button>
                            <button className="btn" onClick={() => addStep("load")}>+ LOAD</button>
                            <button className="btn" onClick={() => addStep("python")}>+ PYTHON</button>
                            <button className="btn" onClick={() => addStep("shell")}>+ SHELL</button>
                            <div className="divider"></div>
                            <button className="btn ghost" onClick={saveSteps} disabled={saveDisabled}>
                                <Save size={16} /> {saveButtonLabel}
                            </button>
                            <button className="btn primary" onClick={runRule} disabled={!currentRule.id || isRunning}>
                                {isRunning ? <span className="spinner-sm"></span> : <Play size={16} />}
                                {isRunning ? " Running..." : " Run"}
                            </button>
                        </div>
                        {(stepsSaveError || runError) && (
                            <div className="toolbar-status">
                                {stepsSaveError && <div className="status-error">Save Error: {stepsSaveError}</div>}
                                {runError && <div className="status-error">Run Error: {runError}</div>}
                            </div>
                        )}
                        <div className="steps-list">
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

                {selectedStep && (
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
                        onTest={testCurrentNode}
                        nodeTestState={nodeTestState}
                        testStore={nodeTestStore}
                        onTestStoreChange={setNodeTestStore}
                        onClose={() => setSelectedStepId(null)}
                        onDelete={deleteStep}
                    />
                )}
            </div>

            <div className="right-panel">
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
