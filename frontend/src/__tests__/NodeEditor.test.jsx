import { fireEvent, render, screen } from "@testing-library/react";

import { NodeEditor } from "../components/NodeEditor";

function buildNode(meta = {}) {
  return {
    id: "node_1",
    data: {
      meta: {
        id: "node_1",
        type: "sql",
        config: { sql: "select * from t" },
        ...meta,
      },
    },
  };
}

describe("NodeEditor", () => {
  it("renders empty placeholder when no node selected", () => {
    render(<NodeEditor node={null} onChange={() => {}} />);
    expect(screen.getByText("选择一个节点")).toBeInTheDocument();
  });

  it("emits sql config update when editing sql template", () => {
    const onChange = vi.fn();
    render(<NodeEditor node={buildNode()} onChange={onChange} />);

    const textbox = screen.getByLabelText("SQL 模板");
    fireEvent.change(textbox, { target: { value: "select 1" } });

    expect(onChange).toHaveBeenCalled();
    const lastCallArg = onChange.mock.calls.at(-1)[0];
    expect(lastCallArg.config.sql).toBe("select 1");
    expect(lastCallArg.type).toBe("sql");
  });

  it("resets config when node type changes", () => {
    const onChange = vi.fn();
    render(<NodeEditor node={buildNode()} onChange={onChange} />);

    const select = screen.getByLabelText("类型");
    fireEvent.change(select, { target: { value: "log" } });

    const lastCallArg = onChange.mock.calls.at(-1)[0];
    expect(lastCallArg.type).toBe("log");
    expect(lastCallArg.config).toEqual({});
  });

  it("calls onTest when clicking test button", () => {
    const onTest = vi.fn();
    render(<NodeEditor node={buildNode()} onChange={() => {}} onTest={onTest} nodeTestState={{ isLoading: false, error: "", result: null }} />);

    fireEvent.click(screen.getByRole("button", { name: "测试当前节点" }));
    expect(onTest).toHaveBeenCalledTimes(1);
    expect(onTest.mock.calls[0][0].id).toBe("node_1");
  });
});
