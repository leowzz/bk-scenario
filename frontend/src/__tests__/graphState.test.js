import { reselectRuleAfterReload, shouldMarkDirtyFromEdgeChanges, shouldMarkDirtyFromNodeChanges } from "../editor/graphState";

describe("graphState", () => {
  it("keeps selected rule when still exists", () => {
    const rules = [{ id: 1 }, { id: 2 }];
    expect(reselectRuleAfterReload(rules, 2)).toBe(2);
  });

  it("falls back to first rule when selected rule no longer exists", () => {
    const rules = [{ id: 3 }, { id: 4 }];
    expect(reselectRuleAfterReload(rules, 9)).toBe(3);
  });

  it("returns null for empty rules", () => {
    expect(reselectRuleAfterReload([], 1)).toBeNull();
  });

  it("marks node changes dirty except pure select", () => {
    expect(shouldMarkDirtyFromNodeChanges([{ type: "select", selected: true }])).toBe(false);
    expect(shouldMarkDirtyFromNodeChanges([{ type: "position" }])).toBe(true);
  });

  it("marks edge changes dirty except pure select", () => {
    expect(shouldMarkDirtyFromEdgeChanges([{ type: "select", selected: true }])).toBe(false);
    expect(shouldMarkDirtyFromEdgeChanges([{ type: "remove" }])).toBe(true);
  });
});
