import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { Sidebar } from "./components/layout/Sidebar";
import { Topbar } from "./components/layout/Topbar";
import { Dashboard } from "./pages/Dashboard";
import { Drafts } from "./pages/Drafts";
import { Published } from "./pages/Published";
import { Analytics } from "./pages/Analytics";
import { ScrollArea } from "./components/ui/scroll-area";

function App() {
  return (
    <Router>
      <div className="flex h-screen bg-zinc-950 text-zinc-50 overflow-hidden font-inter">
        <Sidebar />
        <div className="flex-1 flex flex-col pl-[220px]">
          <Topbar />
          <ScrollArea className="flex-1">
            <main className="p-8 pb-12 max-w-7xl mx-auto w-full">
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/drafts" element={<Drafts />} />
                <Route path="/published" element={<Published />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </main>
          </ScrollArea>
        </div>
      </div>
    </Router>
  );
}

export default App;
