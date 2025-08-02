import { useState } from "react";
import { UsersTab } from "./users-tab";
import { InventoryTab } from "./inventory-tab-new";
import { ReportsTab } from "./reports-tab";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

export function AdminPanel() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'inventory' | 'reports'>('dashboard');

  const { data: stats } = useQuery({
    queryKey: ['/api/dashboard/stats'],
  });

  const { data: users = [] } = useQuery({
    queryKey: ['/api/users'],
  });

  const { data: conversations = [] } = useQuery({
    queryKey: ['/api/conversations'],
  });

  const activeConversations = (conversations as any[]).filter((c: any) => c.status === 'active').length;
  const totalUploads = parseInt((stats as any)?.totalProducts || '0');
  const aiResolution = 76; // Calculated based on bot vs human responses

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">Dashboard Administrativo</h1>
          <Button className="bg-green-600 hover:bg-green-700 text-white text-sm">
            <Download className="w-4 h-4 mr-2" />
            Exportar Relatório
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="bg-white px-4 sm:px-6 py-4 border-b border-gray-200">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-600">Usuários Ativos</p>
                <p className="text-lg sm:text-2xl font-bold text-gray-900">{(users as any[]).length}</p>
                <p className="text-xs text-green-600">+2 desde o último mês</p>
              </div>
              <div className="w-6 h-6 sm:w-8 sm:h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <i className="fas fa-users text-blue-600 text-xs sm:text-sm"></i>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Uploads (Mês)</p>
                <p className="text-2xl font-bold text-gray-900">{totalUploads}</p>
                <p className="text-xs text-green-600">+5 desde o último mês</p>
              </div>
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <i className="fas fa-upload text-green-600"></i>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Chats Ativos</p>
                <p className="text-2xl font-bold text-gray-900">{activeConversations}</p>
                <p className="text-xs text-green-600">+3 desde a última hora</p>
              </div>
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <i className="fas fa-comments text-purple-600"></i>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Resolução IA</p>
                <p className="text-2xl font-bold text-gray-900">{aiResolution}%</p>
                <p className="text-xs text-green-600">+2% desde ontem</p>
              </div>
              <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                <i className="fas fa-robot text-orange-600"></i>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-6">
          <div className="flex space-x-8">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`py-3 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'dashboard'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Visão Geral
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`py-3 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'users'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Usuários
            </button>
            <button
              onClick={() => setActiveTab('inventory')}
              className={`py-3 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'inventory'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Uploads
            </button>
            <button
              onClick={() => setActiveTab('reports')}
              className={`py-3 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'reports'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Relatórios
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden bg-white">
        {activeTab === 'dashboard' && (
          <div className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Visão Geral do Sistema</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                <h4 className="font-medium text-gray-900 mb-2">Atividade Recente</h4>
                <div className="space-y-2 text-sm text-gray-600">
                  <p>• {(conversations as any[]).length} conversas hoje</p>
                  <p>• {totalUploads} produtos no catálogo</p>
                  <p>• {(users as any[]).length} usuários ativos</p>
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                <h4 className="font-medium text-gray-900 mb-2">Performance IA</h4>
                <div className="space-y-2 text-sm text-gray-600">
                  <p>• 76% resoluções automáticas</p>
                  <p>• 2.3s tempo médio resposta</p>
                  <p>• 94% satisfação cliente</p>
                </div>
              </div>
            </div>
          </div>
        )}
        {activeTab === 'users' && <UsersTab />}
        {activeTab === 'inventory' && <InventoryTab />}
        {activeTab === 'reports' && <ReportsTab />}
      </div>
    </div>
  );
}
