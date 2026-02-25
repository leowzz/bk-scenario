import React, { useEffect, useState } from "react";
import { Plus, Trash2, Loader2, CheckCircle2, AlertCircle, PlugZap } from "lucide-react";
import { API_BASE, fetchJson, getDefaultProjectId } from "../utils/api";
import { SettingsLayout } from "../components/SettingsLayout";

const emptyForm = {
  name: "",
  type: "mysql",
  dsn: "",
};

export default function Connections() {
  const [projectId, setProjectId] = useState(null);
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [savingMap, setSavingMap] = useState({});
  const [deletingMap, setDeletingMap] = useState({});
  const [testingMap, setTestingMap] = useState({});
  const [testResults, setTestResults] = useState({});
  const [drafts, setDrafts] = useState({});
  const [form, setForm] = useState(emptyForm);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    bootstrap();
  }, []);

  async function bootstrap() {
    try {
      const pid = await getDefaultProjectId();
      setProjectId(pid);
      await loadConnections(pid);
    } catch (error) {
      showToast("error", error.message || "Failed to load project");
    } finally {
      setLoading(false);
    }
  }

  async function loadConnections(pid = projectId) {
    if (!pid) return;
    const items = await fetchJson(`${API_BASE}/projects/${pid}/connectors`);
    setConnections(items);
    setDrafts((prev) => {
      const next = { ...prev };
      items.forEach((item) => {
        next[item.id] = next[item.id] || { name: item.name, type: item.type, dsn: "" };
      });
      return next;
    });
  }

  function showToast(type, message) {
    setToast({ type, message });
    window.setTimeout(() => setToast(null), 3000);
  }

  function updateDraft(id, field, value) {
    setDrafts((prev) => ({
      ...prev,
      [id]: {
        ...(prev[id] || {}),
        [field]: value,
      },
    }));
  }

  async function createConnection() {
    if (!projectId) return;
    if (!form.name || !form.dsn) {
      showToast("error", "Alias and DSN are required");
      return;
    }

    setCreating(true);
    try {
      await fetchJson(`${API_BASE}/projects/${projectId}/connectors`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          type: form.type,
          config: { dsn: form.dsn },
        }),
      });
      setForm(emptyForm);
      await loadConnections();
      showToast("success", "Connection created");
    } catch (error) {
      showToast("error", error.message || "Create failed");
    } finally {
      setCreating(false);
    }
  }

  async function saveConnection(item) {
    const draft = drafts[item.id] || { name: item.name, type: item.type, dsn: "" };
    setSavingMap((prev) => ({ ...prev, [item.id]: true }));
    try {
      await fetchJson(`${API_BASE}/projects/${projectId}/connectors/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: draft.name,
          config: draft.dsn ? { dsn: draft.dsn } : undefined,
        }),
      });
      await loadConnections();
      showToast("success", "Connection updated");
      updateDraft(item.id, "dsn", "");
    } catch (error) {
      showToast("error", error.message || "Update failed");
    } finally {
      setSavingMap((prev) => ({ ...prev, [item.id]: false }));
    }
  }

  async function deleteConnection(item) {
    setDeletingMap((prev) => ({ ...prev, [item.id]: true }));
    try {
      await fetchJson(`${API_BASE}/projects/${projectId}/connectors/${item.id}`, {
        method: "DELETE",
      });
      await loadConnections();
      showToast("success", "Connection deleted");
    } catch (error) {
      showToast("error", error.message || "Delete failed");
    } finally {
      setDeletingMap((prev) => ({ ...prev, [item.id]: false }));
    }
  }

  async function testConnection(type, key, dsn) {
    if (!dsn) {
      showToast("error", "Please enter DSN first");
      return;
    }
    setTestingMap((prev) => ({ ...prev, [key]: true }));
    setTestResults((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });

    try {
      const result = await fetchJson(`${API_BASE}/test-connection`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, dsn }),
      });
      setTestResults((prev) => ({ ...prev, [key]: result }));
    } catch (error) {
      setTestResults((prev) => ({ ...prev, [key]: { status: "failed", error: error.message } }));
    } finally {
      setTestingMap((prev) => ({ ...prev, [key]: false }));
    }
  }

  return (
    <SettingsLayout title="Connections">
      <div className="settings-stack">
        <div className="card">
          <div className="settings-card-head">
            <PlugZap size={20} className="text-muted" />
            <h3 className="settings-card-title">Add Connection</h3>
          </div>
          <div className="settings-grid settings-grid-conn-create">
            <div className="field">
              <label>Alias</label>
              <input
                className="input"
                placeholder="mysql_main"
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="field">
              <label>Type</label>
              <select
                className="input"
                value={form.type}
                onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value }))}
              >
                <option value="mysql">mysql</option>
                <option value="redis">redis</option>
              </select>
            </div>
            <div className="field">
              <label>DSN</label>
              <input
                className="input"
                placeholder={form.type === "mysql" ? "mysql+pymysql://user:pass@host:3306/db" : "redis://:password@host:6379/0"}
                value={form.dsn}
                onChange={(e) => setForm((prev) => ({ ...prev, dsn: e.target.value }))}
              />
            </div>
            <div className="field settings-action">
              <button
                className="btn"
                onClick={() => testConnection(form.type, "new", form.dsn)}
                disabled={testingMap.new || !form.dsn}
              >
                {testingMap.new ? <Loader2 size={16} className="spin" /> : "Test"}
              </button>
            </div>
            <div className="field settings-action">
              <button className="btn primary" onClick={createConnection} disabled={creating}>
                {creating ? <Loader2 size={16} className="spin" /> : <Plus size={16} />} Create
              </button>
            </div>
          </div>
          {testResults.new && (
            <div className={`message ${testResults.new.status === "success" ? "success" : "error"}`}>
              {testResults.new.status === "success" ? (
                <><CheckCircle2 size={16} /> Connection successful</>
              ) : (
                <><AlertCircle size={16} /> {testResults.new.error || "Connection failed"}</>
              )}
            </div>
          )}
        </div>

        <div className="card">
          <h3 className="settings-section-title">Configured Connections</h3>
          <p className="settings-card-desc" style={{ marginBottom: "12px" }}>
            DSN is not returned by API. Enter a new DSN only when rotating credentials.
          </p>

          {loading ? (
            <div className="loading-state">Loading connections...</div>
          ) : connections.length === 0 ? (
            <div className="empty-state">
              <h3>No connections yet</h3>
              <p>Create one above and then select it by alias in SQL nodes.</p>
            </div>
          ) : (
            <div className="settings-list">
              {connections.map((item) => {
                const draft = drafts[item.id] || { name: item.name, type: item.type, dsn: "" };
                const testKey = `item-${item.id}`;
                const result = testResults[testKey];
                return (
                  <div key={item.id} className="panel settings-panel">
                    <div className="settings-grid settings-grid-conn-item">
                      <div className="field">
                        <label>Alias</label>
                        <input
                          className="input"
                          value={draft.name}
                          onChange={(e) => updateDraft(item.id, "name", e.target.value)}
                        />
                      </div>
                      <div className="field">
                        <label>Type</label>
                        <input className="input" value={item.type} disabled />
                      </div>
                      <div className="field">
                        <label>New DSN (optional)</label>
                        <input
                          className="input"
                          placeholder="Leave empty to keep current DSN"
                          value={draft.dsn}
                          onChange={(e) => updateDraft(item.id, "dsn", e.target.value)}
                        />
                      </div>
                      <div className="field settings-action">
                        <button
                          className="btn"
                          onClick={() => testConnection(item.type, testKey, draft.dsn)}
                          disabled={testingMap[testKey] || !draft.dsn}
                        >
                          {testingMap[testKey] ? <Loader2 size={16} className="spin" /> : "Test"}
                        </button>
                      </div>
                      <div className="field settings-action">
                        <button className="btn primary" onClick={() => saveConnection(item)} disabled={savingMap[item.id]}>
                          {savingMap[item.id] ? <Loader2 size={16} className="spin" /> : "Save"}
                        </button>
                      </div>
                      <div className="field settings-action">
                        <button className="btn" onClick={() => deleteConnection(item)} disabled={deletingMap[item.id]}>
                          {deletingMap[item.id] ? <Loader2 size={16} className="spin" /> : <Trash2 size={16} />}
                        </button>
                      </div>
                    </div>
                    {result && (
                      <div className={`message ${result.status === "success" ? "success" : "error"}`}>
                        {result.status === "success" ? (
                          <><CheckCircle2 size={16} /> Connection successful</>
                        ) : (
                          <><AlertCircle size={16} /> {result.error || "Connection failed"}</>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
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
