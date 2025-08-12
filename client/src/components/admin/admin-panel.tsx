import { useState } from "react";
import { 
  LayoutDashboard, 
  MessageCircle, 
  Users, 
  Package, 
  BarChart3,
  ChevronLeft,
  ChevronRight,
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
import { SalesTab } from "./sales-tab";
import { BotTab } from "./bot-tab";
import { AdminPanelMobile } from "./admin-panel-mobile";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { usePermissions } from "@/hooks/usePermissions";

export function AdminPanel() {
  // Check if it's mobile and use mobile component
  if (typeof window !== 'undefined' && window.innerWidth < 768) {
    return <AdminPanelMobile />;
  }
  const { canAccess, role } = usePermissions();
  
  // Set initial tab based on permissions
  const getInitialTab = () => {
    // Always start with dashboard for better user experience
    // Users can navigate to their profile when needed
    if (canAccess.canViewDashboard) return 'dashboard';
    return 'profile';
  };
  
  const [activeTab, setActiveTab] = useState<'dashboard' | 'conversations' | 'sales' | 'bot' | 'users' | 'inventory' | 'reports' | 'profile' | 'whatsapp' | 'openai' | 'permissions'>(getInitialTab());
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

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
      label: 'Conversas Ativas',
      icon: MessageCircle,
      badge: activeConversations > 0 ? activeConversations : null,
      show: canAccess.canViewDashboard
    },
    {
      id: 'sales',
      label: 'Vendas',
      icon: BarChart3,
      badge: null,
      show: canAccess.canViewDashboard
    },
    {
      id: 'bot',
      label: 'Bot',
      icon: Sparkles,
      badge: null,
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
      label: 'Inventário',
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
      show: true // Everyone can access their profile
    },
    {
      id: 'whatsapp',
      label: 'WhatsApp API',
      icon: Settings,
      badge: null,
      show: canAccess.showApiConfigTab
    },
    {
      id: 'openai',
      label: 'OpenAI API',
      icon: Sparkles,
      badge: null,
      show: canAccess.showApiConfigTab
    },
    {
      id: 'permissions',
      label: 'Permissões',
      icon: Shield,
      badge: null,
      show: canAccess.showUsersTab
    }
  ];

  const menuItems = allMenuItems.filter(item => item.show !== false);

  const getPageTitle = () => {
    switch (activeTab) {
      case 'dashboard': return 'Dashboard';
      case 'conversations': return 'Conversas Ativas';
      case 'sales': return 'Vendas e Faturamento';
      case 'bot': return 'Configuração do Bot';
      case 'users': return 'Gerenciar Usuários';
      case 'inventory': return 'Gerenciar Inventário';
      case 'reports': return 'Relatórios e Analytics';
      case 'profile': return 'Configurações do Perfil';
      case 'whatsapp': return 'Configuração WhatsApp API';
      case 'openai': return 'Configuração OpenAI API';
      case 'permissions': return 'Gerenciamento de Permissões';
      default: return 'Dashboard';
    }
  };

  return (
    <div className="h-full flex bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <div className={`bg-white border-r border-gray-200 flex-shrink-0 transition-all duration-300 ${
        sidebarCollapsed ? 'w-16' : 'w-64'
      }`}>
        <div className="h-full flex flex-col">
          {/* Sidebar Header */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              {!sidebarCollapsed && (
                <h2 className="text-lg font-semibold text-gray-900">Admin Panel</h2>
              )}
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
              >
                {sidebarCollapsed ? (
                  <ChevronRight className="w-5 h-5 text-gray-500" />
                ) : (
                  <ChevronLeft className="w-5 h-5 text-gray-500" />
                )}
              </button>
            </div>
          </div>

          {/* Navigation Menu */}
          <nav className="flex-1 p-4">
            <ul className="space-y-2">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                
                return (
                  <li key={item.id}>
                    <button
                      onClick={() => setActiveTab(item.id as any)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                        isActive
                          ? 'bg-green-50 text-green-700 border border-green-200'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <Icon className={`w-5 h-5 flex-shrink-0 ${
                        isActive ? 'text-green-600' : 'text-gray-500'
                      }`} />
                      {!sidebarCollapsed && (
                        <>
                          <span className="font-medium">{item.label}</span>
                          {item.badge && (
                            <span className="ml-auto bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                              {item.badge}
                            </span>
                          )}
                        </>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Main Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{getPageTitle()}</h1>
              <p className="text-sm text-gray-600 mt-1">
                Gerencie e monitore o sistema de vendas WhatsApp
              </p>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="p-6">
            {activeTab === 'dashboard' && <DashboardTab />}
            {activeTab === 'conversations' && <ActiveConversationsTab />}
            {activeTab === 'sales' && <SalesTab />}
            {activeTab === 'bot' && <BotTab />}
            {activeTab === 'users' && <UsersTab />}
            {activeTab === 'inventory' && <InventoryTab />}
            {activeTab === 'reports' && <ReportsTab />}
            {activeTab === 'profile' && <ProfileSettingsTab />}
            {activeTab === 'whatsapp' && <WhatsAppSetupTab />}
            {activeTab === 'openai' && <OpenAIConfigTab />}
            {activeTab === 'permissions' && <PermissionsTab />}
          </div>
        </div>
      </div>
    </div>
  );
}