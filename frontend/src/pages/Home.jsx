import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Play, Edit, Plus, Settings, AlertCircle, CheckCircle2 } from "lucide-react";
import { ThemeToggle } from "../components/ThemeToggle";
import { API_BASE, fetchJson } from "../utils/api";

export default function Home() {
    const [rules, setRules] = useState([]);
    const [loading, setLoading] = useState(true);
    const [executingRuleId, setExecutingRuleId] = useState(null);
    const [lastResults, setLastResults] = useState({});
    const [toast, setToast] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        loadRules();
    }, []);

    async function loadRules() {
        try {
            const data = await fetchJson(`${API_BASE}/rules`);
            setRules(data);
        } catch (error) {
            console.error("Failed to load rules:", error);
        } finally {
            setLoading(false);
        }
    }

    async function runRule(e, rule) {
        e.preventDefault();
        e.stopPropagation();
        if (executingRuleId) return;

        setExecutingRuleId(rule.id);
        // Reset last result for this rule
        setLastResults(prev => {
            const next = { ...prev };
            delete next[rule.id];
            return next;
        });

        try {
            const globals = await fetchJson(`${API_BASE}/globals`);
            const globalsMap = globals.reduce((acc, item) => {
                acc[item.key] = item.value;
                return acc;
            }, {});

            const result = await fetchJson(`${API_BASE}/execute`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ rule_id: rule.id, variables: globalsMap }),
            });

            if (result.status === "failed") {
                showToast("error", `execution failed: ${result.error || "Unknown error"}`);
                setLastResults(prev => ({ ...prev, [rule.id]: { status: 'failed', error: result.error } }));
            } else {
                showToast("success", "Execution started successfully");
                // For demo purposes, we assume success if started, or maybe we track it?
                // The API returns execution_id.
                setLastResults(prev => ({ ...prev, [rule.id]: { status: 'success', id: result.execution_id } }));
            }
        } catch (error) {
            showToast("error", `execution error: ${error.message}`);
            setLastResults(prev => ({ ...prev, [rule.id]: { status: 'failed', error: error.message } }));
        } finally {
            setExecutingRuleId(null);
        }
    }

    function showToast(type, message) {
        setToast({ type, message });
        setTimeout(() => setToast(null), 3000);
    }

    return (
        <div className="home-container">
            <div className="home-header">
                <h1 className="logo-title">Scenario Pro</h1>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <ThemeToggle />
                    <Link to="/editor" className="btn primary">
                        <Plus size={16} /> New Rule
                    </Link>
                </div>
            </div>

            <div className="rules-grid">
                {loading ? (
                    <div className="loading-state">Loading scenarios...</div>
                ) : !Array.isArray(rules) || rules.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">📂</div>
                        <h3>No rules found</h3>
                        <p>Create your first automation rule to get started.</p>
                        <Link to="/editor" className="btn primary mt-4">Create Rule</Link>
                    </div>
                ) : (
                    rules.map((rule) => {
                        const result = lastResults[rule.id];
                        return (
                            <div key={rule.id} className="rule-card" onClick={() => navigate(`/editor/${rule.id}`)}>
                                <div className="rule-info-section">
                                    <div className="rule-card-header">
                                        <div className="rule-icon">⚡️</div>
                                        <div className="rule-info">
                                            <h3>{rule.name}</h3>
                                            <p>{rule.description || "No description provided."}</p>
                                        </div>
                                    </div>
                                    <div className="rule-card-actions">
                                        <Link to={`/editor/${rule.id}`} className="btn" onClick={(e) => e.stopPropagation()}>
                                            <Edit size={16} /> Edit Rule
                                        </Link>
                                    </div>
                                </div>
                                <div className="rule-action-section">
                                    <button
                                        className="btn-big-run"
                                        onClick={(e) => runRule(e, rule)}
                                        disabled={executingRuleId === rule.id}
                                    >
                                        {executingRuleId === rule.id ? (
                                            <span className="spinner-sm"></span>
                                        ) : (
                                            <Play size={24} fill="currentColor" />
                                        )}
                                        {executingRuleId === rule.id ? "Running..." : "Run"}
                                    </button>
                                    {result && (
                                        <div className="run-result">
                                            {result.status === 'success' && <span className="run-success">Success</span>}
                                            {result.status === 'failed' && <span className="run-failed">Failed</span>}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
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
