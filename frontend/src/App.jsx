import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Editor from "./pages/Editor";
import Settings from "./pages/Settings";
import Connections from "./pages/Connections";
import { ThemeProvider } from "./context/ThemeContext";

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/editor" element={<Editor />} />
          <Route path="/editor/:ruleId" element={<Editor />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/settings/connections" element={<Connections />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}
