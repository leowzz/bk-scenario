import React from "react";
import { X, Trash2, Play } from "lucide-react";
import { nodeTypes } from "../editor/nodeMeta";

export function NodeEditor({ node, onChange, onTest, nodeTestState, onClose, onDelete }) {
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

          {(testError || testResult) && (
            <div className="mt-4">
              {testError && <div className="status-error">Test Failed: {testError}</div>}
              {testResult && !testError && (
                <div className="status-note">
                  <div><strong>Type:</strong> {testResult.action_type}</div>
                  {testResult.content && <div><strong>Content:</strong> {testResult.content}</div>}
                  {testResult.output && (
                    <div className="mt-2">
                      <strong>Output:</strong>
                      <pre style={{ margin: "4px 0", fontSize: "11px", overflow: "auto" }}>
                        {typeof testResult.output === "object"
                          ? JSON.stringify(testResult.output, null, 2)
                          : testResult.output}
                      </pre>
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
