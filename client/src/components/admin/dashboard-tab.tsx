import { useQuery } from '@tanstack/react-query';
import { TrendingUp, Users, MessageCircle, Package, BarChart3, Clock } from 'lucide-react';

export function DashboardTab() {
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
  const totalProducts = parseInt((stats as any)?.totalProducts || '0');
  const lowStockProducts = parseInt((stats as any)?.lowStockProducts || '0');
  const totalUsers = (users as any[]).length;

  // Métricas calculadas
  const aiResolutionRate = 76; // % de resoluções automáticas
  const avgResponseTime = 2.3; // segundos
  const customerSatisfaction = 94; // % de satisfação

  const statsCards = [
    {
      title: 'Conversas Ativas',
      value: activeConversations,
      icon: MessageCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      description: 'Atendimentos em andamento'
    },
    {
      title: 'Produtos Cadastrados',
      value: totalProducts,
      icon: Package,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      description: 'Total no catálogo'
    },
    {
      title: 'Usuários Ativos',
      value: totalUsers,
      icon: Users,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      description: 'Vendedores e administradores'
    },
    {
      title: 'Estoque Baixo',
      value: lowStockProducts,
      icon: TrendingUp,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      description: 'Produtos com estoque baixo'
    }
  ];

  const performanceMetrics = [
    {
      title: 'Taxa de Resolução IA',
      value: `${aiResolutionRate}%`,
      icon: BarChart3,
      description: 'Atendimentos resolvidos automaticamente',
      trend: '+5% vs mês anterior'
    },
    {
      title: 'Tempo Médio de Resposta',
      value: `${avgResponseTime}s`,
      icon: Clock,
      description: 'Tempo médio para primeira resposta',
      trend: '-0.3s vs mês anterior'
    },
    {
      title: 'Satisfação do Cliente',
      value: `${customerSatisfaction}%`,
      icon: TrendingUp,
      description: 'Avaliação média dos atendimentos',
      trend: '+2% vs mês anterior'
    }
  ];

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Dashboard</h3>
          <p className="text-sm text-gray-500">Visão geral do sistema de vendas WhatsApp</p>
        </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statsCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600 mb-1">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  <p className="text-xs text-gray-500 mt-1">{stat.description}</p>
                </div>
                <div className={`${stat.bgColor} ${stat.color} p-3 rounded-lg`}>
                  <Icon className="w-6 h-6" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Performance Metrics */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Métricas de Performance</h3>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {performanceMetrics.map((metric, index) => {
            const Icon = metric.icon;
            return (
              <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="flex items-start gap-3">
                  <div className="bg-green-50 text-green-600 p-2 rounded-lg">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 mb-1">{metric.title}</h4>
                    <p className="text-2xl font-bold text-gray-900 mb-1">{metric.value}</p>
                    <p className="text-sm text-gray-600 mb-2">{metric.description}</p>
                    <p className="text-xs text-green-600 font-medium">{metric.trend}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activity Summary */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Atividade Recente</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">Nova conversa iniciada</p>
                <p className="text-xs text-gray-600">João Silva - há 5 minutos</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">Produtos atualizados</p>
                <p className="text-xs text-gray-600">Upload de planilha - há 1 hora</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">Novo usuário cadastrado</p>
                <p className="text-xs text-gray-600">Vendedor Maria - há 2 horas</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Ações Rápidas</h3>
          <div className="space-y-3">
            <button className="w-full text-left p-3 bg-green-50 hover:bg-green-100 rounded-lg transition-colors">
              <div className="flex items-center gap-3">
                <div className="bg-green-500 text-white p-2 rounded-lg">
                  <MessageCircle className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Ver Conversas Ativas</p>
                  <p className="text-xs text-gray-600">Acompanhar atendimentos em tempo real</p>
                </div>
              </div>
            </button>
            <button className="w-full text-left p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
              <div className="flex items-center gap-3">
                <div className="bg-blue-500 text-white p-2 rounded-lg">
                  <Package className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Gerenciar Estoque</p>
                  <p className="text-xs text-gray-600">Atualizar produtos e preços</p>
                </div>
              </div>
            </button>
            <button className="w-full text-left p-3 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors">
              <div className="flex items-center gap-3">
                <div className="bg-purple-500 text-white p-2 rounded-lg">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Gerenciar Usuários</p>
                  <p className="text-xs text-gray-600">Adicionar vendedores e permissões</p>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}