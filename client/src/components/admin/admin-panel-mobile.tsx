import { useState } from "react";
import { 
  LayoutDashboard, 
  MessageCircle, 
  Users, 
  Package, 
  BarChart3,
  Menu,
  X,
  Settings,
  Shield,
  User,
  Sparkles
} from "lucide-react";
import { UsersTab } from "./users-tab";
import { InventoryMobile as InventoryTab } from "./inventory-mobile";
import { ReportsTab } from "./reports-tab";
import { ActiveConversationsTab } from "./active-conversations-tab";
import { DashboardTab } from "./dashboard-tab";
import { ProfileSettingsTab } from "./profile-settings-tab";
import { WhatsAppSetupTab } from "./whatsapp-setup-tab";
import { PermissionsTab } from "./permissions-tab";
import { OpenAIConfigTab } from "./openai-config-tab";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { usePermissions } from "@/hooks/usePermissions";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";

export function AdminPanelMobile() {
  const { canAccess, role } = usePermissions();
  
  // Set initial tab based on permissions
  const getInitialTab = () => {
    if (canAccess.canViewDashboard) return 'dashboard';
    return 'profile';
  };
  
  const [activeTab, setActiveTab] = useState<'dashboard' | 'conversations' | 'users' | 'inventory' | 'reports' | 'profile' | 'whatsapp' | 'openai' | 'permissions'>(getInitialTab() as any);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const { data: conversations = [] } = useQuery({
    queryKey: ['/api/conversations'],
  });

  const activeConversations = (conversations as any[]).filter((c: any) => c.status === 'active').length;

  // Filter menu items based on permissions
  const allMenuItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      badge: null,
      show: canAccess.canViewDashboard
    },
    {
      id: 'conversations',
      label: 'Conversas',
      icon: MessageCircle,
      badge: activeConversations > 0 ? activeConversations : null,
      show: canAccess.canViewDashboard
    },
    {
      id: 'users',
      label: 'Usuários',
      icon: Users,
      badge: null,
      show: canAccess.showUsersTab
    },
    {
      id: 'inventory',
      label: 'Estoque',
      icon: Package,
      badge: null,
      show: canAccess.showInventoryTab
    },
    {
      id: 'reports',
      label: 'Relatórios',
      icon: BarChart3,
      badge: null,
      show: canAccess.showReportsTab
    },
    {
      id: 'profile',
      label: 'Perfil',
      icon: User,
      badge: null,
      show: true
    },
    {
      id: 'whatsapp',
      label: 'WhatsApp API',
      icon: MessageCircle,
      badge: null,
      show: canAccess.showWhatsAppTab
    },
    {
      id: 'openai',
      label: 'OpenAI Config',
      icon: Sparkles,
      badge: null,
      show: canAccess.showOpenAITab
    },
    {
      id: 'permissions',
      label: 'Permissões',
      icon: Shield,
      badge: null,
      show: canAccess.showPermissionsTab
    },
  ];

  const visibleMenuItems = allMenuItems.filter(item => item.show);

  const getPageTitle = () => {
    const item = allMenuItems.find(item => item.id === activeTab);
    return item ? item.label : 'Dashboard';
  };

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId as any);
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg md:text-xl font-bold text-gray-900 truncate">
            {getPageTitle()}
          </h1>
          
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm" className="p-2">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80 p-0">
              <div className="flex flex-col h-full">
                {/* Menu Header */}
                <div className="p-4 border-b bg-whatsapp">
                  <h2 className="text-lg font-semibold text-white">Admin Panel</h2>
                  <p className="text-sm text-green-100 mt-1">
                    Sistema AutoPeças Brasil
                  </p>
                </div>

                {/* Menu Items */}
                <nav className="flex-1 p-4">
                  <ul className="space-y-2">
                    {visibleMenuItems.map((item) => {
                      const Icon = item.icon;
                      const isActive = activeTab === item.id;

                      return (
                        <li key={item.id}>
                          <button
                            onClick={() => handleTabChange(item.id)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all duration-200 ${
                              isActive
                                ? 'bg-whatsapp text-white shadow-md'
                                : 'text-gray-700 hover:bg-gray-100'
                            }`}
                          >
                            <Icon className={`w-5 h-5 flex-shrink-0 ${
                              isActive ? 'text-white' : 'text-gray-500'
                            }`} />
                            <span className="font-medium flex-1">{item.label}</span>
                            {item.badge && (
                              <span className={`text-xs px-2 py-1 rounded-full ${
                                isActive 
                                  ? 'bg-white text-whatsapp'
                                  : 'bg-red-500 text-white'
                              }`}>
                                {item.badge}
                              </span>
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </nav>

                {/* Menu Footer */}
                <div className="p-4 border-t bg-gray-50">
                  <div className="text-xs text-gray-500 text-center">
                    <p>Logado como: <span className="font-medium">{role}</span></p>
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Content Area */}
      <div className="p-0">
        {activeTab === 'dashboard' && <DashboardTab />}
        {activeTab === 'conversations' && <ActiveConversationsTab />}
        {activeTab === 'users' && <UsersTab />}
        {activeTab === 'inventory' && <InventoryTab />}
        {activeTab === 'reports' && <ReportsTab />}
        {activeTab === 'profile' && <ProfileSettingsTab />}
        {activeTab === 'whatsapp' && <WhatsAppSetupTab />}
        {activeTab === 'openai' && <OpenAIConfigTab />}
        {activeTab === 'permissions' && <PermissionsTab />}
      </div>
    </div>
  );
}