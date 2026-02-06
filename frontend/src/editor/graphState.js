export function reselectRuleAfterReload(rules, currentRuleId) {
  if (!Array.isArray(rules) || rules.length === 0) {
    return null;
  }
  if (currentRuleId != null && rules.some((rule) => rule.id === currentRuleId)) {
    return currentRuleId;
  }
  return rules[0].id;
}

export function shouldMarkDirtyFromNodeChanges(changes) {
  if (!Array.isArray(changes)) return false;
  return changes.some((change) => change.type !== "select");
}

export function shouldMarkDirtyFromEdgeChanges(changes) {
  if (!Array.isArray(changes)) return false;
  return changes.some((change) => change.type !== "select");
}
