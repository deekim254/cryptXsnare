
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthWrapper } from "./components/auth/AuthWrapper";
import Dashboard from "./pages/Dashboard";
import SiemDashboard from "./pages/SiemDashboard";
import Alerts from "./pages/Alerts";
import Cases from "./pages/Cases";
import CaseDetail from "./pages/CaseDetail";
import UrlAnalysis from "./pages/UrlAnalysis";
import EmailInspection from "./pages/EmailInspection";
import NetworkMonitoring from "./pages/NetworkMonitoring";
import Reconnaissance from "./pages/Reconnaissance";
import Threats from "./pages/Threats";
import FileAnalysis from "./pages/FileAnalysis";
import Analytics from "./pages/Analytics";
import AutomatedResponse from "./pages/AutomatedResponse";
import ThreatIntelligence from "./pages/ThreatIntelligence";
import Settings from "./pages/Settings";
import Reports from "./pages/Reports";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/" element={
            <AuthWrapper>
              <Dashboard />
            </AuthWrapper>
          } />
          <Route path="/alerts" element={
            <AuthWrapper>
              <Alerts />
            </AuthWrapper>
          } />
          <Route path="/cases" element={
            <AuthWrapper>
              <Cases />
            </AuthWrapper>
          } />
          <Route path="/cases/:id" element={
            <AuthWrapper>
              <CaseDetail />
            </AuthWrapper>
          } />
          <Route path="/url-analysis" element={
            <AuthWrapper>
              <UrlAnalysis />
            </AuthWrapper>
          } />
          <Route path="/email-inspection" element={
            <AuthWrapper>
              <EmailInspection />
            </AuthWrapper>
          } />
          <Route path="/network-monitoring" element={
            <AuthWrapper>
              <NetworkMonitoring />
            </AuthWrapper>
          } />
          <Route path="/reconnaissance" element={
            <AuthWrapper>
              <Reconnaissance />
            </AuthWrapper>
          } />
          <Route path="/siem-dashboard" element={
            <AuthWrapper>
              <SiemDashboard />
            </AuthWrapper>
          } />
          <Route path="/reports" element={
            <AuthWrapper>
              <Reports />
            </AuthWrapper>
          } />
          <Route path="/threats" element={
            <AuthWrapper>
              <Threats />
            </AuthWrapper>
          } />
          <Route path="/file-analysis" element={
            <AuthWrapper>
              <FileAnalysis />
            </AuthWrapper>
          } />
          <Route path="/analytics" element={
            <AuthWrapper>
              <Analytics />
            </AuthWrapper>
          } />
          <Route path="/automated-response" element={
            <AuthWrapper>
              <AutomatedResponse />
            </AuthWrapper>
          } />
          <Route path="/threat-intelligence" element={
            <AuthWrapper>
              <ThreatIntelligence />
            </AuthWrapper>
          } />
          <Route path="/settings" element={
            <AuthWrapper>
              <Settings />
            </AuthWrapper>
          } />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
