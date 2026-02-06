import React, { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
    const [theme, setTheme] = useState(() => {
        // Default to 'light' if not set
        return localStorage.getItem("theme") || "light";
    });

    useEffect(() => {
        // Sync with localStorage
        localStorage.setItem("theme", theme);
        // Sync with DOM
        document.documentElement.setAttribute("data-theme", theme);

        // Optional: Sync ReactFlow style overrrides if needed, but CSS variables handle most
    }, [theme]);

    const toggleTheme = () => {
        setTheme((prev) => (prev === "light" ? "dark" : "light"));
    };

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    return useContext(ThemeContext);
}
