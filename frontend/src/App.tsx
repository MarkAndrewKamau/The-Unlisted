import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AppProvider } from "./context/AppContext";
import { Shell } from "./components/layout/Shell";
import { Dashboard } from "./pages/Dashboard";
import { Candidates } from "./pages/Candidates";
import { Top50 } from "./pages/Top50";
import { Profile } from "./pages/Profile";
import { Outreach } from "./pages/Outreach";
import { Docs } from "./pages/Docs";

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Shell />}>
            <Route index element={<Dashboard />} />
            <Route path="candidates" element={<Candidates />} />
            <Route path="top-50" element={<Top50 />} />
            <Route path="profiles/:slug" element={<Profile />} />
            <Route path="outreach" element={<Outreach />} />
            <Route path="docs" element={<Docs />} />
            <Route path="docs/:slug" element={<Docs />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}
