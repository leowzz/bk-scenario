import React, { useEffect, useState } from "react";
import { Plus, Save, Settings2, Trash2, CheckCircle2, AlertCircle } from "lucide-react";
import { API_BASE, fetchJson } from "../utils/api";
import { SettingsLayout } from "../components/SettingsLayout";

export default function Settings() {
    const [loading, setLoading] = useState(true);
    const [items, setItems] = useState([]);
    const [drafts, setDrafts] = useState({});
    const [newKey, setNewKey] = useState("");
    const [newValue, setNewValue] = useState("");
    const [savingMap, setSavingMap] = useState({});
    const [deletingMap, setDeletingMap] = useState({});
    const [creating, setCreating] = useState(false);
    const [toast, setToast] = useState(null);
    const [sqlTimeout, setSqlTimeout] = useState(10);
    const [savingTimeout, setSavingTimeout] = useState(false);

    useEffect(() => {
        loadGlobals();
    }, []);

    async function loadGlobals() {
        try {
            const data = await fetchJson(`${API_BASE}/globals`);
            const all = Array.isArray(data) ? data : [];
            // 过滤掉系统内置 key，不在全局变量列表中显示
            setItems(all.filter((item) => !item.key.startsWith("__")));
            setDrafts((prev) => {
                const next = { ...prev };
                all.forEach((item) => {
                    next[item.key] = item.value || "";
                });
                return next;
            });
            const timeoutItem = all.find((item) => item.key === "__sql_timeout__");
            if (timeoutItem) setSqlTimeout(Number(timeoutItem.value) || 10);
        } catch (error) {
            showToast("error", error.message || "加载全局变量失败");
        } finally {
            setLoading(false);
        }
    }

    function showToast(type, message) {
        setToast({ type, message });
        window.setTimeout(() => setToast(null), 3000);
    }

    async function saveGlobal(key) {
        setSavingMap((prev) => ({ ...prev, [key]: true }));
        try {
            await fetchJson(`${API_BASE}/globals`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    key,
                    value: drafts[key] ?? "",
                    type: "string",
                }),
            });
            await loadGlobals();
            showToast("success", `变量 ${key} 已保存`);
        } catch (error) {
            showToast("error", error.message || "保存失败");
        } finally {
            setSavingMap((prev) => ({ ...prev, [key]: false }));
        }
    }

    async function createGlobal() {
        if (!newKey) {
            showToast("error", "请输入变量名");
            return;
        }
        setCreating(true);
        try {
            await fetchJson(`${API_BASE}/globals`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    key: newKey,
                    value: newValue,
                    type: "string",
                }),
            });
            setNewKey("");
            setNewValue("");
            await loadGlobals();
            showToast("success", "全局变量已创建");
        } catch (error) {
            showToast("error", error.message || "创建失败");
        } finally {
            setCreating(false);
        }
    }

    async function deleteGlobal(key) {
        setDeletingMap((prev) => ({ ...prev, [key]: true }));
        try {
            await fetchJson(`${API_BASE}/globals/${encodeURIComponent(key)}`, { method: "DELETE" });
            await loadGlobals();
            showToast("success", `变量 ${key} 已删除`);
        } catch (error) {
            showToast("error", error.message || "删除失败");
        } finally {
            setDeletingMap((prev) => ({ ...prev, [key]: false }));
        }
    }

    async function saveSqlTimeout() {
        setSavingTimeout(true);
        try {
            await fetchJson(`${API_BASE}/globals`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ key: "__sql_timeout__", value: String(sqlTimeout), type: "string" }),
            });
            showToast("success", "SQL 超时设置已保存");
        } catch (error) {
            showToast("error", error.message || "保存失败");
        } finally {
            setSavingTimeout(false);
        }
    }

    return (
        <SettingsLayout title="Settings">
            <div className="settings-stack">
                {loading ? (
                    <div className="loading-state">Loading settings...</div>
                ) : (
                    <div className="card">
                        <div className="settings-card-head">
                            <Settings2 size={20} className="text-muted" />
                            <h3 className="settings-card-title">全局变量配置</h3>
                        </div>

                        <div className="settings-list">
                            {items.length === 0 ? (
                                <div className="empty-state" style={{ padding: "16px 0", margin: 0 }}>
                                    <p>暂无全局变量</p>
                                </div>
                            ) : (
                                items.map((item) => (
                                    <div key={item.key} className="panel settings-panel">
                                        <div className="settings-grid settings-grid-globals">
                                            <div className="field">
                                                <label>Key</label>
                                                <input className="input" value={item.key} disabled />
                                            </div>
                                            <div className="field">
                                                <label>Value</label>
                                                <input
                                                    className="input"
                                                    value={drafts[item.key] ?? ""}
                                                    onChange={(e) =>
                                                        setDrafts((prev) => ({ ...prev, [item.key]: e.target.value }))
                                                    }
                                                />
                                            </div>
                                            <div className="field settings-action">
                                                <button
                                                    className="btn primary"
                                                    onClick={() => saveGlobal(item.key)}
                                                    disabled={savingMap[item.key]}
                                                >
                                                    <Save size={14} />
                                                    {savingMap[item.key] ? "Saving..." : "保存"}
                                                </button>
                                            </div>
                                            <div className="field settings-action">
                                                <button
                                                    className="btn"
                                                    onClick={() => deleteGlobal(item.key)}
                                                    disabled={deletingMap[item.key]}
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}

                            <div className="panel settings-panel">
                                <div>
                                    <h3 className="settings-section-title">新增变量</h3>
                                </div>
                                <div className="settings-grid settings-grid-global-create">
                                    <div className="field">
                                        <label>Key</label>
                                        <input
                                            className="input"
                                            placeholder="例如: env"
                                            value={newKey}
                                            onChange={(e) => setNewKey(e.target.value)}
                                        />
                                    </div>
                                    <div className="field">
                                        <label>Value</label>
                                        <input
                                            className="input"
                                            placeholder="例如: prod"
                                            value={newValue}
                                            onChange={(e) => setNewValue(e.target.value)}
                                        />
                                    </div>
                                    <div className="field settings-action">
                                        <button className="btn primary" onClick={createGlobal} disabled={creating}>
                                            <Plus size={14} />
                                            {creating ? "Creating..." : "创建"}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}\n
                {/* 执行设置 */}
                {!loading && (
                    <div className="card">
                        <div className="settings-card-head">
                            <Settings2 size={20} className="text-muted" />
                            <h3 className="settings-card-title">执行设置</h3>
                        </div>
                        <div className="panel settings-panel">
                            <div className="settings-grid settings-grid-globals">
                                <div className="field">
                                    <label>SQL 执行超时（秒）</label>
                                    <input
                                        className="input"
                                        type="number"
                                        min="1"
                                        max="300"
                                        value={sqlTimeout}
                                        onChange={(e) => setSqlTimeout(Number(e.target.value) || 10)}
                                    />
                                </div>
                                <div className="field settings-action">
                                    <button className="btn primary" onClick={saveSqlTimeout} disabled={savingTimeout}>
                                        <Save size={14} />
                                        {savingTimeout ? "Saving..." : "保存"}
                                    </button>
                                </div>
                            </div>
                            <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>
                                默认 10 秒。超时后 SQL 节点报错，防止慢查询阻塞执行流程。
                            </div>
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
        </SettingsLayout>
    );
}
