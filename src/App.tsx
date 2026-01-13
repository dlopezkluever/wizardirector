import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useAuthStore } from "@/lib/stores/auth-store";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { Auth } from "@/pages/Auth";
import { Dashboard } from "@/pages/Dashboard";
import { ProjectView } from "@/pages/ProjectView";
import StyleCapsuleLibrary from "@/pages/StyleCapsuleLibrary";
import { MainLayout } from "@/components/layout/MainLayout";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Auth initializer component
function AuthInitializer() {
  const { initialize } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  return null;
}

// Dashboard wrapper component with navigation
function DashboardWrapper() {
  const navigate = useNavigate();

  const handleProjectSelect = (projectId: string) => {
    navigate(`/projects/${projectId}`);
  };

  const handleNewProject = () => {
    // TODO: Implement new project creation modal/flow
    console.log('New project clicked - TODO: implement creation flow');
  };

  return (
    <MainLayout>
      <Dashboard
        onProjectSelect={handleProjectSelect}
        onNewProject={handleNewProject}
      />
    </MainLayout>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthInitializer />
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/auth" element={<Auth />} />

          {/* Protected routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardWrapper />
              </ProtectedRoute>
            }
          />
          <Route
            path="/projects/:projectId"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <ProjectView />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/style-capsules"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <StyleCapsuleLibrary />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          {/* Redirect root to dashboard for authenticated users, auth for others */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          {/* Catch-all route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
