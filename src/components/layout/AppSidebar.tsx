import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Shield,
  Link,
  Mail,
  Network,
  Search,
  AlertTriangle,
  Settings,
  Home,
  LogOut,
  FileText,
  BarChart3,
  Zap,
  Brain,
  FolderOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation, Link as RouterLink } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { DEMO_MODE } from "@/lib/mockAuth";

const menuItems = [
  { title: "Dashboard", icon: Home, path: "/" },
  { title: "Alerts", icon: AlertTriangle, path: "/alerts" },
  { title: "Cases", icon: FolderOpen, path: "/cases" },
  { title: "URL Analysis", icon: Link, path: "/url-analysis" },
  { title: "Email Inspection", icon: Mail, path: "/email-inspection" },
  { title: "Network Monitoring", icon: Network, path: "/network-monitoring" },
  { title: "Reconnaissance", icon: Search, path: "/reconnaissance" },
  { title: "🛡️ SIEM Dashboard", icon: Shield, path: "/siem-dashboard" },
  { title: "Threats", icon: Shield, path: "/threats" },
  { title: "File Analysis", icon: FileText, path: "/file-analysis" },
  { title: "Analytics", icon: BarChart3, path: "/analytics" },
  { title: "Automated Response", icon: Zap, path: "/automated-response" },
  { title: "Threat Intelligence", icon: Brain, path: "/threat-intelligence" },
  { title: "Settings", icon: Settings, path: "/settings" },
];

export function AppSidebar() {
  const location = useLocation();
  const { toast } = useToast();
  const { isMobile, setOpenMobile } = useSidebar();

  const handleSignOut = async () => {
    if (DEMO_MODE) {
      toast({ title: "Demo mode — no sign out needed", description: "Set VITE_DEMO_MODE=false to use real auth" });
      return;
    }
    try {
      await supabase.auth.signOut();
      toast({ title: "Signed out successfully" });
    } catch (error) {
      toast({ title: "Error signing out", description: "Please try again", variant: "destructive" });
    }
  };

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarHeader className="p-6">
        <div className="flex items-center gap-2">
          <Shield className="h-8 w-8 text-sidebar-primary" />
          <div>
            <h1 className="text-xl font-bold text-sidebar-foreground">CrytiXSnare</h1>
            <p className="text-sm text-sidebar-foreground/70">Stealthy, encrypted analysis</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarMenu>
          {menuItems.map((item) => (
            <SidebarMenuItem key={item.path}>
              <SidebarMenuButton 
                asChild 
                isActive={location.pathname === item.path}
                className="w-full justify-start"
                onClick={() => {
                  // Close sidebar on mobile when navigating
                  if (isMobile) {
                    setOpenMobile(false);
                  }
                }}
              >
                <RouterLink to={item.path} className="flex items-center gap-3">
                  <item.icon className="h-4 w-4" />
                  <span>{item.title}</span>
                </RouterLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="p-4">
        <Button 
          variant="outline" 
          onClick={handleSignOut}
          className="w-full justify-start gap-2"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}