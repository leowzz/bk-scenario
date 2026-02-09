import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Save, CheckCircle2, AlertCircle, Loader2, Database } from "lucide-react";
import { API_BASE, fetchJson } from "../utils/api";

export default function Settings() {
    const [configs, setConfigs] = useState({
        "db_config.redis_dsn": "",
        "db_config.mysql_dsn": ""
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState({});
    const [testResults, setTestResults] = useState({});
    const [toast, setToast] = useState(null);

    useEffect(() => {
        loadConfigs();
    }, []);

    async function loadConfigs() {
        try {
            const data = await fetchJson(`${API_BASE}/globals`);
            const loadedConfigs = { ...configs };
            data.forEach(item => {
                if (loadedConfigs.hasOwnProperty(item.key)) {
                    loadedConfigs[item.key] = item.value;
                }
            });
            setConfigs(loadedConfigs);
        } catch (error) {
            showToast("error", "Failed to load settings");
        } finally {
            setLoading(false);
        }
    }

    function handleChange(key, value) {
        setConfigs(prev => ({ ...prev, [key]: value }));
        setTestResults(prev => {
            const next = { ...prev };
            delete next[key];
            return next;
        });
    }

    async function handleSave() {
        setSaving(true);
        try {
            for (const [key, value] of Object.entries(configs)) {
                await fetchJson(`${API_BASE}/globals`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        key,
                        value,
                        type: "string",
                        description: key.includes("redis") ? "Redis Connection String" : "MySQL Connection String"
                    })
                });
            }
            showToast("success", "Settings saved successfully");
        } catch (error) {
            showToast("error", `Failed to save: ${error.message}`);
        } finally {
            setSaving(false);
        }
    }

    async function handleTest(type, key) {
        const dsn = configs[key];
        if (!dsn) {
            showToast("error", "Please enter a connection string first");
            return;
        }

        setTesting(prev => ({ ...prev, [key]: true }));
        setTestResults(prev => {
            const next = { ...prev };
            delete next[key];
            return next;
        });

        try {
            const result = await fetchJson(`${API_BASE}/test-connection`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ type, dsn })
            });

            setTestResults(prev => ({ ...prev, [key]: result }));
        } catch (error) {
            setTestResults(prev => ({ ...prev, [key]: { status: "failed", error: error.message } }));
        } finally {
            setTesting(prev => ({ ...prev, [key]: false }));
        }
    }

    function showToast(type, message) {
        setToast({ type, message });
        setTimeout(() => setToast(null), 3000);
    }

    return (
        <div className="home-container">  {/* Reusing home-container for max-width */}
            <div className="home-header">
                <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                    <Link to="/" className="btn-icon">
                        <ArrowLeft size={20} />
                    </Link>
                    <h1 className="logo-title" style={{ fontSize: '20px' }}>Settings</h1>
                </div>
                <button className="btn primary" onClick={handleSave} disabled={saving}>
                    {saving ? <Loader2 size={16} className="spin" /> : <Save size={16} />}
                    Save Changes
                </button>
            </div>

            <div style={{ maxWidth: "800px", margin: "0 auto" }}>
                {loading ? (
                    <div className="loading-state">Loading settings...</div>
                ) : (
                    <div className="card">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid var(--border-muted)' }}>
                            <Database size={20} className="text-muted" />
                            <h3 style={{ margin: 0, border: 'none', padding: 0 }}>Database Connections</h3>
                        </div>

                        {/* Redis Config */}
                        <div className="form-group">
                            <label>Redis Connection</label>
                            <div className="input-group">
                                <input
                                    type="text"
                                    className="input"
                                    placeholder="redis://localhost:6379/0"
                                    value={configs["db_config.redis_dsn"]}
                                    onChange={(e) => handleChange("db_config.redis_dsn", e.target.value)}
                                />
                                <button
                                    className="btn"
                                    onClick={() => handleTest("redis", "db_config.redis_dsn")}
                                    disabled={testing["db_config.redis_dsn"] || !configs["db_config.redis_dsn"]}
                                >
                                    {testing["db_config.redis_dsn"] ? <Loader2 size={16} className="spin" /> : "Test"}
                                </button>
                            </div>
                            {testResults["db_config.redis_dsn"] && (
                                <div className={`message ${testResults["db_config.redis_dsn"].status === "success" ? "success" : "error"}`}>
                                    {testResults["db_config.redis_dsn"].status === "success" ? (
                                        <><CheckCircle2 size={16} /> Connection successful</>
                                    ) : (
                                        <><AlertCircle size={16} /> {testResults["db_config.redis_dsn"].error || "Connection failed"}</>
                                    )}
                                </div>
                            )}
                            <small className="help-text">
                                Standard Redis URL format. Example: <code>redis://:password@localhost:6379/0</code>
                            </small>
                        </div>

                        {/* MySQL Config */}
                        <div className="form-group" style={{ marginBottom: 0 }}>
                            <label>MySQL Connection</label>
                            <div className="input-group">
                                <input
                                    type="text"
                                    className="input"
                                    placeholder="mysql+pymysql://user:pass@localhost:3306/db"
                                    value={configs["db_config.mysql_dsn"]}
                                    onChange={(e) => handleChange("db_config.mysql_dsn", e.target.value)}
                                />
                                <button
                                    className="btn"
                                    onClick={() => handleTest("mysql", "db_config.mysql_dsn")}
                                    disabled={testing["db_config.mysql_dsn"] || !configs["db_config.mysql_dsn"]}
                                >
                                    {testing["db_config.mysql_dsn"] ? <Loader2 size={16} className="spin" /> : "Test"}
                                </button>
                            </div>
                            {testResults["db_config.mysql_dsn"] && (
                                <div className={`message ${testResults["db_config.mysql_dsn"].status === "success" ? "success" : "error"}`}>
                                    {testResults["db_config.mysql_dsn"].status === "success" ? (
                                        <><CheckCircle2 size={16} /> Connection successful</>
                                    ) : (
                                        <><AlertCircle size={16} /> {testResults["db_config.mysql_dsn"].error || "Connection failed"}</>
                                    )}
                                </div>
                            )}
                            <small className="help-text">
                                SQLAlchemy style DSN. Example: <code>mysql+pymysql://user:password@localhost:3306/dbname</code>
                            </small>
                        </div>
                    </div>
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
