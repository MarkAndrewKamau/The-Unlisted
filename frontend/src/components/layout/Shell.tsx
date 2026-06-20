import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { MobileTabBar } from "./MobileTabBar";
import { Toaster } from "../ui/Toaster";

export function Shell() {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="min-w-0 flex-1 overflow-x-hidden pb-16 md:pb-0">
          <Outlet />
        </main>
      </div>
      <MobileTabBar />
      <Toaster />
    </div>
  );
}
