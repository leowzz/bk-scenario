export const API_BASE = "/api";
let defaultProjectCache = null;

export async function fetchJson(url, options) {
    const response = await fetch(url, options);
    const text = await response.text();
    const data = text ? JSON.parse(text) : {};
    if (!response.ok) {
        const detail = data?.detail || data?.message || `Request failed: ${response.status}`;
        throw new Error(typeof detail === "string" ? detail : JSON.stringify(detail));
    }
    return data;
}

export async function getDefaultProject() {
    if (defaultProjectCache) return defaultProjectCache;
    const projects = await fetchJson(`${API_BASE}/projects`);
    if (!Array.isArray(projects) || projects.length === 0) {
        throw new Error("No projects found");
    }
    const fallback = projects[0];
    const selected = projects.find((project) => project.name === "default") || fallback;
    defaultProjectCache = selected;
    return selected;
}

export async function getDefaultProjectId() {
    const project = await getDefaultProject();
    return project.id;
}
