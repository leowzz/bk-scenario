export const API_BASE = "/api";

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
