import React, { useEffect, useState } from "react";
import { X, Trash2, Play } from "lucide-react";
import { nodeTypes } from "../editor/nodeMeta";
import { API_BASE, fetchJson, getDefaultProjectId } from "../utils/api";

export function NodeEditor({ node, onChange, onTest, nodeTestState, onClose, onDone, onDelete, testStore = {}, onTestStoreChange }) {
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
          <div className="modal-title">
            Configure Node: {meta.id}
          </div>
          <div className="modal-header-actions">
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
            {(meta.type === "sql" || meta.type === "mysql" || meta.type === "redis") && (
              <div className="field">
                <label>{meta.type === "redis" ? "Redis Connection Alias" : "MySQL Connection Alias"}</label>
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
                  <option value="">
                    {meta.type === "redis" ? "-- Select Redis alias --" : "-- Select MySQL alias --"}
                  </option>
                  {connections
                    .filter((conn) => conn.type === (meta.type === "redis" ? "redis" : "mysql"))
                    .map((conn) => (
                      <option key={conn.id} value={conn.name}>
                        {conn.name}
                      </option>
                    ))}
                </select>
                {connections.filter((conn) => conn.type === (meta.type === "redis" ? "redis" : "mysql")).length === 0 && (
                  <small className="help-text">
                    No {meta.type === "redis" ? "redis" : "mysql"} aliases found. Go to Settings - Connection Management.
                  </small>
                )}
              </div>
            )}
          </div>
          <p className="help-text" style={{ marginTop: 4, marginBottom: 8 }}>
            All text fields support Jinja2 templates, e.g. <code>{`{{ now() }}`}</code>, <code>{`{{ today() }}`}</code>, <code>{`{{ vars.xxx }}`}</code>.
          </p>

          {(meta.type === "sql" || meta.type === "mysql") && (
            <>
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

          {meta.type === "redis" && (
            <>
              <div className="field">
                <label>Redis Command</label>
                <textarea
                  className="input"
                  rows={3}
                  value={config.command || ""}
                  onChange={(e) =>
                    onChange({
                      ...meta,
                      config: { ...config, command: e.target.value },
                    })
                  }
                  placeholder="e.g. GET my_key"
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
            <div className="node-test-result">
              {testError && <div className="status-error">Test Failed: {testError}</div>}
              {testResult && !testError && (
                <div className="status-note">
                  <div><strong>Type:</strong> {testResult.action_type}</div>
                  {testResult.content && !["sql", "mysql"].includes(testResult.action_type) && (
                    <div><strong>Content:</strong> {testResult.content}</div>
                  )}
                  {testResult.output !== undefined && testResult.output !== null && (
                    <div className="mt-2">
                      <strong>Output:</strong>
                      {/* MySQL: 渲染后的 SQL */}
                      {(testResult.action_type === "sql" || testResult.action_type === "mysql") && (testResult.rendered ?? testResult.metadata?.rendered_sql) && (
                        <div className="result-block">
                          <div className="result-meta-row">
                            <span className="result-caption">rendered SQL</span>
                            {testResult.metadata?.elapsed_ms !== undefined && (
                              <span className="result-caption">
                                耗时 {testResult.metadata.elapsed_ms} ms · 超时阈值 {testResult.metadata.timeout_sec}s
                              </span>
                            )}
                          </div>
                          <pre className="result-pre result-pre-muted">
                            {testResult.rendered ?? testResult.metadata?.rendered_sql}
                          </pre>
                        </div>
                      )}
                      {/* MySQL: 按语句顺序展示——每条先展示影响行数，有查询结果则立即展示该条结果表 */}
                      {(testResult.action_type === "sql" || testResult.action_type === "mysql") && testResult.metadata?.statement_results?.length > 0 && (
                        <div className="result-block statement-results-in-order">
                          {testResult.metadata.statement_results.map((sr, idx) => (
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
                      {/* Redis: 渲染后的命令 */}
                      {testResult.action_type === "redis" && (testResult.rendered ?? testResult.metadata?.command) && (
                        <div className="result-block">
                          <span className="result-caption">rendered command</span>
                          <pre className="result-pre result-pre-muted">
                            {testResult.rendered ?? testResult.metadata?.command}
                          </pre>
                        </div>
                      )}
                      {/* MySQL: 表格渲染（仅当 output 为行数据时，非 statement_results） */}
                      {(testResult.action_type === "sql" || testResult.action_type === "mysql") && Array.isArray(testResult.output) && (testResult.output.length === 0 || !("index" in (testResult.output[0] || {}))) ? (
                        testResult.output.length === 0 ? (
                          <div className="result-empty">No rows returned</div>
                        ) : (
                          <div className="result-table-wrap">
                            <table className="result-table">
                              <thead>
                                <tr>
                                  {Object.keys(testResult.output[0]).map((col) => (
                                    <th key={col}>{col}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {testResult.output.slice(0, 50).map((row, i) => (
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
                            {testResult.output.length > 50 && (
                              <div className="result-caption">
                                Showing 50 of {testResult.output.length} rows
                              </div>
                            )}
                          </div>
                        )
                      ) : testResult.action_type === "shell" && testResult.output && typeof testResult.output === "object" ? (
                        /* Shell: stdout/stderr 分区渲染 */
                        <div className="result-shell-block">
                          {testResult.output.stdout && (
                            <div>
                              <span className="result-caption">stdout</span>
                              <pre className="result-pre">{testResult.output.stdout}</pre>
                            </div>
                          )}
                          {testResult.output.stderr && (
                            <div>
                              <span className="result-caption result-caption-error">stderr</span>
                              <pre className="result-pre result-pre-error">{testResult.output.stderr}</pre>
                            </div>
                          )}
                          <div className="result-caption">
                            exit code: {testResult.output.returncode}
                          </div>
                        </div>
                      ) : (
                        /* 通用: JSON / 字符串（SQL 节点且有 statement_results 时不再重复 JSON） */
                        (["sql", "mysql"].includes(testResult.action_type) && testResult.metadata?.statement_results?.length > 0) ? null : (
                          <pre className="result-pre">
                            {typeof testResult.output === "object"
                              ? JSON.stringify(testResult.output, null, 2)
                              : testResult.output}
                          </pre>
                        )
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* store 测试变量输入区 */}
        {onTestStoreChange && (
          <div className="modal-body modal-subsection">
            <div className="test-store-title">
              Test Store Variables <span style={{ opacity: 0.6 }}>（用于 {"{{ store.key }}"} 模板渲染）</span>
            </div>
            {Object.entries(testStore).map(([k, v]) => (
              <div key={k} className="test-store-row">
                <input
                  className="input test-store-key"
                  value={k}
                  placeholder="key"
                  onChange={(e) => {
                    const next = { ...testStore };
                    const val = next[k];
                    delete next[k];
                    next[e.target.value] = val;
                    onTestStoreChange(next);
                  }}
                />
                <input
                  className="input test-store-value"
                  value={v}
                  placeholder="value"
                  onChange={(e) => onTestStoreChange({ ...testStore, [k]: e.target.value })}
                />
                <button
                  className="btn test-store-remove"
                  onClick={() => {
                    const next = { ...testStore };
                    delete next[k];
                    onTestStoreChange(next);
                  }}
                >✕</button>
              </div>
            ))}
            <button
              className="btn test-store-add"
              onClick={() => onTestStoreChange({ ...testStore, "": "" })}
            >+ Add</button>
          </div>
        )}

        <div className="modal-footer">
          <button className="btn" onClick={() => onTest(meta)} disabled={isTesting}>
            {isTesting ? <span className="spinner-sm"></span> : <Play size={14} />}
            {isTesting ? " Testing..." : " Test Node"}
          </button>
          <button className="btn primary" onClick={onDone || onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
