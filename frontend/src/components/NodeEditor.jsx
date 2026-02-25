import React, { useEffect, useState } from "react";
import { X, Trash2, Play } from "lucide-react";
import { nodeTypes } from "../editor/nodeMeta";
import { API_BASE, fetchJson, getDefaultProjectId } from "../utils/api";

export function NodeEditor({ node, onChange, onTest, nodeTestState, onClose, onDelete }) {
  const [connections, setConnections] = useState([]);

  useEffect(() => {
    loadConnections();
  }, []);

  async function loadConnections() {
    try {
      const projectId = await getDefaultProjectId();
      const data = await fetchJson(`${API_BASE}/projects/${projectId}/connectors`);
      setConnections(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to load connections:", error);
    }
  }

  if (!node) return null;

  const meta = node.data.meta;
  const config = meta.config || {};
  const testResult = nodeTestState?.result;
  const testError = nodeTestState?.error;
  const isTesting = Boolean(nodeTestState?.isLoading);

  // Prevent click propagation to avoid closing the modal when clicking inside
  const handleContentClick = (e) => {
    e.stopPropagation();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={handleContentClick}>
        <div className="modal-header">
          <div className="modal-title">Configure Node</div>
          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            <button
              className="btn-delete-circle"
              onClick={() => onDelete(meta.id)}
              title="Delete Node"
            >
              <Trash2 size={16} />
            </button>
            <button className="btn-close-circle" onClick={onClose} title="Close">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="modal-body">
          <div className="form-grid">
            <div className="field">
              <label>Node ID</label>
              <input className="input" value={meta.id} disabled style={{ opacity: 0.7, background: 'var(--bg-app)' }} />
            </div>

            <div className="field">
              <label>Type</label>
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
                {Object.keys(nodeTypes).map((type) => (
                  <option key={type} value={type}>
                    {nodeTypes[type].label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {meta.type === "sql" && (
            <>
              <div className="field">
                <label>Connection Alias</label>
                <select
                  className="input"
                  value={config.connector || ""}
                  onChange={(e) =>
                    onChange({
                      ...meta,
                      config: { ...config, connector: e.target.value },
                    })
                  }
                >
                  <option value="">-- Select MySQL alias --</option>
                  {connections
                    .filter((conn) => conn.type === "mysql")
                    .map((conn) => (
                    <option key={conn.id} value={conn.name}>
                      {conn.name}
                    </option>
                  ))}
                </select>
                {connections.filter((conn) => conn.type === "mysql").length === 0 && (
                  <small className="help-text">
                    No mysql aliases found. Go to Settings - Connection Management.
                  </small>
                )}
              </div>
              <div className="field">
                <label>Connection Alias (manual)</label>
                <input
                  className="input"
                  placeholder="mysql_main"
                  value={config.connector || ""}
                  onChange={(e) =>
                    onChange({
                      ...meta,
                      config: { ...config, connector: e.target.value },
                    })
                  }
                />
              </div>
              <div className="field">
                <label>SQL Template</label>
                <textarea
                  className="input"
                  rows={5}
                  value={config.sql || ""}
                  onChange={(e) =>
                    onChange({
                      ...meta,
                      config: { ...config, sql: e.target.value },
                    })
                  }
                  placeholder="SELECT * FROM table..."
                />
              </div>
            </>
          )}

          {meta.type === "log" && (
            <div className="field">
              <label>Log Message</label>
              <textarea
                className="input"
                rows={3}
                value={config.log_message || ""}
                onChange={(e) =>
                  onChange({
                    ...meta,
                    config: { ...config, log_message: e.target.value },
                  })
                }
                placeholder="Log message content..."
              />
            </div>
          )}

          {meta.type === "store" && (
            <>
              <div className="field">
                <label>Scope</label>
                <select
                  className="input"
                  value={config.scope || "rule"}
                  onChange={(e) =>
                    onChange({
                      ...meta,
                      config: { ...config, scope: e.target.value },
                    })
                  }
                >
                  <option value="rule">rule</option>
                  <option value="project">project</option>
                </select>
              </div>
              <div className="field">
                <label>Storage Key</label>
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
                <label>Storage Value</label>
                <textarea
                  className="input"
                  rows={3}
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

          {meta.type === "load" && (
            <>
              <div className="field">
                <label>Scope</label>
                <select
                  className="input"
                  value={config.scope || "rule"}
                  onChange={(e) =>
                    onChange({
                      ...meta,
                      config: { ...config, scope: e.target.value },
                    })
                  }
                >
                  <option value="rule">rule</option>
                  <option value="project">project</option>
                </select>
              </div>
              <div className="field">
                <label>Storage Key</label>
                <input
                  className="input"
                  value={config.key || ""}
                  onChange={(e) =>
                    onChange({
                      ...meta,
                      config: { ...config, key: e.target.value },
                    })
                  }
                />
              </div>
              <div className="field">
                <label>Assign To Variable</label>
                <input
                  className="input"
                  value={config.assign_to || ""}
                  onChange={(e) =>
                    onChange({
                      ...meta,
                      config: { ...config, assign_to: e.target.value },
                    })
                  }
                />
              </div>
            </>
          )}

          {meta.type === "python" && (
            <>
              <div className="field">
                <label>Python Script</label>
                <textarea
                  className="input"
                  rows={6}
                  value={config.script || ""}
                  onChange={(e) =>
                    onChange({
                      ...meta,
                      config: { ...config, script: e.target.value },
                    })
                  }
                />
              </div>
              <div className="field">
                <label>Assign Result To Variable</label>
                <input
                  className="input"
                  placeholder="e.g. my_result (optional)"
                  value={config.assign_to || ""}
                  onChange={(e) =>
                    onChange({
                      ...meta,
                      config: { ...config, assign_to: e.target.value },
                    })
                  }
                />
              </div>
              <div className="field">
                <label>Timeout (sec)</label>
                <input
                  className="input"
                  type="number"
                  min="1"
                  value={config.timeout_sec ?? 10}
                  onChange={(e) =>
                    onChange({
                      ...meta,
                      config: { ...config, timeout_sec: Number(e.target.value) || 10 },
                    })
                  }
                />
              </div>
            </>
          )}

          {meta.type === "shell" && (
            <>
              <div className="field">
                <label>Shell Command</label>
                <textarea
                  className="input"
                  rows={4}
                  value={config.command || ""}
                  onChange={(e) =>
                    onChange({
                      ...meta,
                      config: { ...config, command: e.target.value },
                    })
                  }
                />
              </div>
              <div className="field">
                <label>Timeout (sec)</label>
                <input
                  className="input"
                  type="number"
                  min="1"
                  value={config.timeout_sec ?? 10}
                  onChange={(e) =>
                    onChange({
                      ...meta,
                      config: { ...config, timeout_sec: Number(e.target.value) || 10 },
                    })
                  }
                />
              </div>
            </>
          )}

          {(testError || testResult) && (
            <div className="mt-4">
              {testError && <div className="status-error">Test Failed: {testError}</div>}
              {testResult && !testError && (
                <div className="status-note">
                  <div><strong>Type:</strong> {testResult.action_type}</div>
                  {testResult.content && <div><strong>Content:</strong> {testResult.content}</div>}
                  {testResult.output !== undefined && testResult.output !== null && (
                    <div className="mt-2">
                      <strong>Output:</strong>
                      {/* SQL: 表格渲染 */}
                      {testResult.action_type === "sql" && Array.isArray(testResult.output) ? (
                        testResult.output.length === 0 ? (
                          <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px" }}>No rows returned</div>
                        ) : (
                          <div style={{ overflowX: "auto", marginTop: "4px" }}>
                            <table style={{ fontSize: "11px", borderCollapse: "collapse", width: "100%" }}>
                              <thead>
                                <tr>
                                  {Object.keys(testResult.output[0]).map((col) => (
                                    <th key={col} style={{ padding: "2px 6px", borderBottom: "1px solid var(--border)", textAlign: "left" }}>{col}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {testResult.output.slice(0, 50).map((row, i) => (
                                  <tr key={i}>
                                    {Object.values(row).map((val, j) => (
                                      <td key={j} style={{ padding: "2px 6px", borderBottom: "1px solid var(--border-subtle)", fontFamily: "monospace" }}>
                                        {val === null ? <span style={{ opacity: 0.4 }}>null</span> : String(val)}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            {testResult.output.length > 50 && (
                              <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>
                                Showing 50 of {testResult.output.length} rows
                              </div>
                            )}
                          </div>
                        )
                      ) : testResult.action_type === "shell" && testResult.output && typeof testResult.output === "object" ? (
                        /* Shell: stdout/stderr 分区渲染 */
                        <div style={{ marginTop: "4px" }}>
                          {testResult.output.stdout && (
                            <div>
                              <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>stdout</span>
                              <pre style={{ margin: "2px 0 6px", fontSize: "11px", overflow: "auto" }}>{testResult.output.stdout}</pre>
                            </div>
                          )}
                          {testResult.output.stderr && (
                            <div>
                              <span style={{ fontSize: "10px", color: "var(--color-error)" }}>stderr</span>
                              <pre style={{ margin: "2px 0", fontSize: "11px", overflow: "auto", color: "var(--color-error)" }}>{testResult.output.stderr}</pre>
                            </div>
                          )}
                          <div style={{ fontSize: "10px", color: "var(--text-muted)" }}>
                            exit code: {testResult.output.returncode}
                          </div>
                        </div>
                      ) : (
                        /* 通用: JSON / 字符串 */
                        <pre style={{ margin: "4px 0", fontSize: "11px", overflow: "auto" }}>
                          {typeof testResult.output === "object"
                            ? JSON.stringify(testResult.output, null, 2)
                            : testResult.output}
                        </pre>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn" onClick={() => onTest(meta)} disabled={isTesting}>
            {isTesting ? <span className="spinner-sm"></span> : <Play size={14} />}
            {isTesting ? " Testing..." : " Test Node"}
          </button>
          <button className="btn primary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
