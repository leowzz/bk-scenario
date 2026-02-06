import React from "react";

import { nodeTypes } from "../editor/nodeMeta";

export function NodeEditor({ node, onChange, onTest, nodeTestState }) {
  if (!node) return <div className="panel-empty">选择一个节点</div>;

  const meta = node.data.meta;
  const config = meta.config || {};
  const testResult = nodeTestState?.result;
  const testError = nodeTestState?.error;
  const isTesting = Boolean(nodeTestState?.isLoading);

  return (
    <div className="panel">
      <div className="panel-title">节点配置</div>
      <div className="field">
        <label htmlFor="node-id-input">节点 ID</label>
        <input id="node-id-input" className="input" value={meta.id} disabled />
      </div>
      <div className="field">
        <label htmlFor="node-type-select">类型</label>
        <select
          id="node-type-select"
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
      {meta.type === "sql" && (
        <div className="field">
          <label htmlFor="node-sql-template">SQL 模板</label>
          <textarea
            id="node-sql-template"
            className="input"
            value={config.sql || ""}
            onChange={(e) =>
              onChange({
                ...meta,
                config: { ...config, sql: e.target.value },
              })
            }
          />
        </div>
      )}
      {meta.type === "log" && (
        <div className="field">
          <label htmlFor="node-log-template">日志模板</label>
          <textarea
            id="node-log-template"
            className="input"
            value={config.log_message || ""}
            onChange={(e) =>
              onChange({
                ...meta,
                config: { ...config, log_message: e.target.value },
              })
            }
          />
        </div>
      )}
      {meta.type === "store" && (
        <>
          <div className="field">
            <label htmlFor="node-store-key">存储 Key</label>
            <input
              id="node-store-key"
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
            <label htmlFor="node-store-value">存储 Value</label>
            <textarea
              id="node-store-value"
              className="input"
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
      <div className="field">
        <button className="btn" onClick={() => onTest(meta)} disabled={isTesting}>
          {isTesting ? "测试中..." : "测试当前节点"}
        </button>
      </div>
      {testError && <div className="status-error">测试失败: {testError}</div>}
      {testResult && !testError && (
        <div className="status-note">
          <div>类型: {testResult.action_type}</div>
          {testResult.content && <div>内容: {testResult.content}</div>}
          {typeof testResult.output === "string" && <div>输出: {testResult.output}</div>}
          {typeof testResult.output === "object" && testResult.output && (
            <div>输出: {JSON.stringify(testResult.output)}</div>
          )}
        </div>
      )}
    </div>
  );
}
