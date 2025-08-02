import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { 
  Shield, 
  Users, 
  Settings, 
  Eye, 
  Edit, 
  Trash2, 
  Plus,
  UserCheck,
  UserX,
  Crown
} from 'lucide-react';

interface Permission {
  id: string;
  name: string;
  description: string;
  category: string;
}

interface UserPermission {
  userId: string;
  permissionId: string;
  granted: boolean;
}

export function PermissionsTab() {
  const { toast } = useToast();
  const [selectedUserId, setSelectedUserId] = useState<string>('');

  const { data: users = [] } = useQuery({
    queryKey: ['/api/users'],
  });

  const { data: permissions = [] } = useQuery({
    queryKey: ['/api/admin/permissions'],
  });

  const { data: userPermissions = [] } = useQuery({
    queryKey: ['/api/admin/user-permissions', selectedUserId],
    enabled: !!selectedUserId,
  });

  const updatePermissionMutation = useMutation({
    mutationFn: async (data: { userId: string; permissionId: string; granted: boolean }) => {
      return await apiRequest('/api/admin/user-permissions', 'PUT', data);
    },
    onSuccess: () => {
      toast({
        title: "Permissão atualizada",
        description: "As permissões do usuário foram atualizadas.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/user-permissions'] });
    },
    onError: () => {
      toast({
        title: "Erro ao atualizar",
        description: "Não foi possível atualizar as permissões.",
        variant: "destructive",
      });
    },
  });

  const promoteToAdminMutation = useMutation({
    mutationFn: async (userId: string) => {
      return await apiRequest(`/api/admin/users/${userId}/promote`, 'POST');
    },
    onSuccess: () => {
      toast({
        title: "Usuário promovido",
        description: "O usuário agora tem privilégios de administrador.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
    },
    onError: () => {
      toast({
        title: "Erro na promoção",
        description: "Não foi possível promover o usuário.",
        variant: "destructive",
      });
    },
  });

  const demoteFromAdminMutation = useMutation({
    mutationFn: async (userId: string) => {
      return await apiRequest(`/api/admin/users/${userId}/demote`, 'POST');
    },
    onSuccess: () => {
      toast({
        title: "Privilégios removidos",
        description: "O usuário não é mais administrador.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
    },
    onError: () => {
      toast({
        title: "Erro na remoção",
        description: "Não foi possível remover os privilégios.",
        variant: "destructive",
      });
    },
  });

  // Permissões padrão do sistema
  const defaultPermissions: Permission[] = [
    // Dashboard
    { id: 'dashboard.view', name: 'Ver Dashboard', description: 'Visualizar métricas e estatísticas', category: 'Dashboard' },
    { id: 'dashboard.export', name: 'Exportar Relatórios', description: 'Baixar relatórios em Excel/PDF', category: 'Dashboard' },
    
    // Conversas
    { id: 'conversations.view', name: 'Ver Conversas', description: 'Visualizar todas as conversas', category: 'Conversas' },
    { id: 'conversations.respond', name: 'Responder Conversas', description: 'Enviar mensagens aos clientes', category: 'Conversas' },
    { id: 'conversations.close', name: 'Fechar Conversas', description: 'Finalizar atendimentos', category: 'Conversas' },
    { id: 'conversations.assign', name: 'Atribuir Conversas', description: 'Designar conversas para vendedores', category: 'Conversas' },
    
    // Produtos
    { id: 'products.view', name: 'Ver Produtos', description: 'Visualizar catálogo de produtos', category: 'Produtos' },
    { id: 'products.create', name: 'Criar Produtos', description: 'Adicionar novos produtos', category: 'Produtos' },
    { id: 'products.edit', name: 'Editar Produtos', description: 'Modificar informações dos produtos', category: 'Produtos' },
    { id: 'products.delete', name: 'Excluir Produtos', description: 'Remover produtos do catálogo', category: 'Produtos' },
    { id: 'products.import', name: 'Importar Produtos', description: 'Upload de planilhas Excel', category: 'Produtos' },
    
    // Usuários
    { id: 'users.view', name: 'Ver Usuários', description: 'Visualizar lista de usuários', category: 'Usuários' },
    { id: 'users.create', name: 'Criar Usuários', description: 'Adicionar novos vendedores', category: 'Usuários' },
    { id: 'users.edit', name: 'Editar Usuários', description: 'Modificar dados dos usuários', category: 'Usuários' },
    { id: 'users.delete', name: 'Excluir Usuários', description: 'Remover usuários do sistema', category: 'Usuários' },
    { id: 'users.permissions', name: 'Gerenciar Permissões', description: 'Alterar permissões de usuários', category: 'Usuários' },
    
    // Configurações
    { id: 'settings.whatsapp', name: 'Config. WhatsApp', description: 'Configurar API do WhatsApp', category: 'Configurações' },
    { id: 'settings.company', name: 'Config. Empresa', description: 'Alterar dados da empresa', category: 'Configurações' },
    { id: 'settings.bot', name: 'Config. Bot', description: 'Configurar comportamento do bot', category: 'Configurações' },
    
    // Relatórios
    { id: 'reports.sales', name: 'Relatórios de Vendas', description: 'Ver relatórios de vendas', category: 'Relatórios' },
    { id: 'reports.performance', name: 'Performance', description: 'Ver métricas de desempenho', category: 'Relatórios' },
    { id: 'reports.customers', name: 'Relatórios de Clientes', description: 'Análise de clientes', category: 'Relatórios' },
  ];

  const handlePermissionToggle = (permissionId: string, granted: boolean) => {
    if (!selectedUserId) return;
    
    updatePermissionMutation.mutate({
      userId: selectedUserId,
      permissionId,
      granted
    });
  };

  const handlePromoteUser = (userId: string) => {
    promoteToAdminMutation.mutate(userId);
  };

  const handleDemoteUser = (userId: string) => {
    demoteFromAdminMutation.mutate(userId);
  };

  const isPermissionGranted = (permissionId: string) => {
    return (userPermissions as UserPermission[]).some((up: UserPermission) => 
      up.permissionId === permissionId && up.granted
    );
  };

  const selectedUser = (users as any[]).find((u: any) => u.id === selectedUserId);
  const isSelectedUserAdmin = selectedUser?.role === 'admin';

  // Agrupar permissões por categoria
  const groupedPermissions = defaultPermissions.reduce((acc, permission) => {
    if (!acc[permission.category]) {
      acc[permission.category] = [];
    }
    acc[permission.category].push(permission);
    return acc;
  }, {} as Record<string, Permission[]>);

  return (
    <div className="h-full overflow-y-auto p-6 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Shield className="w-7 h-7 text-green-600" />
                Gerenciamento de Permissões
              </h2>
              <p className="text-gray-600 mt-1">Controle as permissões e privilégios dos usuários</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Lista de Usuários */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Users className="w-5 h-5" />
                Usuários
              </h3>
            </div>
            <div className="p-4">
              <div className="space-y-2">
                {(users as any[]).map((user: any) => (
                  <div
                    key={user.id}
                    onClick={() => setSelectedUserId(user.id)}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedUserId === user.id
                        ? 'bg-green-50 border border-green-200'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                        {user.profileImageUrl ? (
                          <img 
                            src={user.profileImageUrl} 
                            alt="" 
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          <Users className="w-4 h-4 text-gray-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">
                          {user.firstName} {user.lastName}
                        </p>
                        <p className="text-sm text-gray-500 truncate">{user.email}</p>
                      </div>
                      {user.role === 'admin' && (
                        <Crown className="w-4 h-4 text-yellow-500" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Permissões do Usuário Selecionado */}
          <div className="lg:col-span-2">
            {selectedUserId ? (
              <div className="space-y-6">
                {/* Ações do Usuário */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {selectedUser?.firstName} {selectedUser?.lastName}
                      </h3>
                      <p className="text-sm text-gray-500">{selectedUser?.email}</p>
                    </div>
                    <div className="flex gap-2">
                      {isSelectedUserAdmin ? (
                        <Button
                          onClick={() => handleDemoteUser(selectedUserId)}
                          variant="outline"
                          size="sm"
                          disabled={demoteFromAdminMutation.isPending}
                        >
                          <UserX className="w-4 h-4 mr-2" />
                          Remover Admin
                        </Button>
                      ) : (
                        <Button
                          onClick={() => handlePromoteUser(selectedUserId)}
                          size="sm"
                          className="bg-yellow-600 hover:bg-yellow-700"
                          disabled={promoteToAdminMutation.isPending}
                        >
                          <Crown className="w-4 h-4 mr-2" />
                          Tornar Admin
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  {isSelectedUserAdmin && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                      <p className="text-sm text-yellow-800">
                        Este usuário é administrador e tem acesso total ao sistema.
                      </p>
                    </div>
                  )}
                </div>

                {/* Permissões por Categoria */}
                {!isSelectedUserAdmin && (
                  <div className="space-y-4">
                    {Object.entries(groupedPermissions).map(([category, permissions]) => (
                      <div key={category} className="bg-white rounded-lg shadow-sm border border-gray-200">
                        <div className="p-4 border-b border-gray-200">
                          <h4 className="font-medium text-gray-900">{category}</h4>
                        </div>
                        <div className="p-4">
                          <div className="space-y-3">
                            {permissions.map((permission) => (
                              <div key={permission.id} className="flex items-center justify-between">
                                <div className="flex-1">
                                  <p className="font-medium text-gray-900">{permission.name}</p>
                                  <p className="text-sm text-gray-500">{permission.description}</p>
                                </div>
                                <Switch
                                  checked={isPermissionGranted(permission.id)}
                                  onCheckedChange={(checked) => handlePermissionToggle(permission.id, checked)}
                                  disabled={updatePermissionMutation.isPending}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="font-medium text-gray-900 mb-2">Selecione um usuário</h3>
                <p className="text-gray-500">
                  Escolha um usuário da lista para gerenciar suas permissões
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}