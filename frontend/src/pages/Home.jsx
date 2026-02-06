import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Play, Edit, Plus, Settings, AlertCircle, CheckCircle2 } from "lucide-react";
import { API_BASE, fetchJson } from "../utils/api";

export default function Home() {
    const [rules, setRules] = useState([]);
    const [loading, setLoading] = useState(true);
    const [executingRuleId, setExecutingRuleId] = useState(null);
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
        try {
            // First fetch globals to pass them in (similar to App.jsx logic)
            // In a real app, backend might handle default globals, but following existing logic:
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
            } else {
                showToast("success", "Execution started successfully");
            }
        } catch (error) {
            showToast("error", `execution error: ${error.message}`);
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
                <Link to="/editor" className="btn primary">
                    <Plus size={16} /> New Rule
                </Link>
            </div>

            <div className="rules-grid">
                {loading ? (
                    <div className="loading-state">Loading scenarios...</div>
                ) : rules.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">📂</div>
                        <h3>No rules found</h3>
                        <p>Create your first automation rule to get started.</p>
                        <Link to="/editor" className="btn primary mt-4">Create Rule</Link>
                    </div>
                ) : (
                    rules.map((rule) => (
                        <div key={rule.id} className="rule-card" onClick={() => navigate(`/editor/${rule.id}`)}>
                            <div className="rule-card-header">
                                <div className="rule-icon">⚡️</div>
                                <div className="rule-info">
                                    <h3>{rule.name}</h3>
                                    <p>{rule.description || "No description provided."}</p>
                                </div>
                            </div>
                            <div className="rule-card-actions">
                                <button
                                    className="btn-icon-text"
                                    onClick={(e) => runRule(e, rule)}
                                    disabled={executingRuleId === rule.id}
                                >
                                    {executingRuleId === rule.id ? (
                                        <span className="spinner-sm"></span>
                                    ) : (
                                        <Play size={16} fill="currentColor" />
                                    )}
                                    Run
                                </button>
                                <Link to={`/editor/${rule.id}`} className="btn-icon">
                                    <Edit size={16} />
                                </Link>
                            </div>
                        </div>
                    ))
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
