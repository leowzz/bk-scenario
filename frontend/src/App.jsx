import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Settings from "./pages/Settings";
import Connections from "./pages/Connections";
import { ThemeProvider } from "./context/ThemeContext";

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/:ruleId" element={<Dashboard />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/settings/connections" element={<Connections />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}
