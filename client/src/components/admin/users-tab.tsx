import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { User } from "@shared/schema";
import { AddUserModal } from "./add-user-modal";
import { EditUserModal } from "./edit-user-modal";
import { PromoteUserModal } from "./promote-user-modal";
import { Search, User as UserIcon, UserPlus, Edit, Trash2, Link, Copy, Clock, CheckCircle } from "lucide-react";

export function UsersTab() {
  const { toast } = useToast();
  const [showAddUser, setShowAddUser] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [promotingUser, setPromotingUser] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [resendingInvite, setResendingInvite] = useState<string | null>(null);
  const [deactivatingUser, setDeactivatingUser] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ['/api/users'],
  });



  // Filtrar usuários baseado na busca e status
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'active' && user.isActive !== false) ||
                         (statusFilter === 'inactive' && user.isActive === false);
    
    return matchesSearch && matchesStatus;
  });

  const updatePermissionsMutation = useMutation({
    mutationFn: async ({ userId, permissions }: { userId: string; permissions: any }) => {
      await apiRequest('PATCH', `/api/users/${userId}/permissions`, { permissions });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({
        title: "Sucesso",
        description: "Permissões atualizadas com sucesso!",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Falha ao atualizar permissões",
        variant: "destructive",
      });
    },
  });

  const handlePermissionChange = (userId: string, permission: string, checked: boolean) => {
    const user = users.find(u => u.id === userId);
    if (user) {
      const newPermissions = {
        ...(user.permissions || {}),
        [permission]: checked,
      };
      updatePermissionsMutation.mutate({ userId, permissions: newPermissions });
    }
  };

  // Mutation para deletar usuário
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      return await apiRequest('DELETE', `/api/users/${userId}`);
    },
    onSuccess: () => {
      toast({
        title: "Sucesso!",
        description: "Usuário removido com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao remover usuário.",
        variant: "destructive",
      });
    },
  });

  // Mutation para promover usuário
  const promoteUserMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      return await apiRequest('PATCH', `/api/users/${userId}/promote`, { role });
    },
    onSuccess: () => {
      toast({
        title: "Sucesso!",
        description: "Usuário promovido a administrador.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao promover usuário.",
        variant: "destructive",
      });
    },
  });

  // Mutation para reenviar convite
  const resendInviteMutation = useMutation({
    mutationFn: async (userId: string) => {
      return await apiRequest('POST', `/api/users/${userId}/resend-invite`);
    },
    onSuccess: (data: any) => {
      toast({
        title: "Convite reenviado!",
        description: `Novo link de convite gerado. Link copiado para a área de transferência.`,
      });
      // Copiar link automaticamente
      if (data.inviteLink) {
        navigator.clipboard.writeText(data.inviteLink);
      }
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      setResendingInvite(null);
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao reenviar convite.",
        variant: "destructive",
      });
      setResendingInvite(null);
    },
  });

  // Mutation para desativar/ativar usuário
  const toggleUserStatusMutation = useMutation({
    mutationFn: async ({ userId, isActive }: { userId: string; isActive: boolean }) => {
      return await apiRequest('PATCH', `/api/users/${userId}/status`, { isActive });
    },
    onSuccess: (_, variables) => {
      toast({
        title: "Sucesso!",
        description: variables.isActive ? "Usuário ativado com sucesso." : "Usuário desativado com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      setDeactivatingUser(null);
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao alterar status do usuário.",
        variant: "destructive",
      });
      setDeactivatingUser(null);
    },
  });

  const handleDeleteUser = (userId: string) => {
    if (confirm('Tem certeza que deseja remover este usuário?')) {
      deleteUserMutation.mutate(userId);
    }
  };

  const handlePromoteUser = (user: User) => {
    setPromotingUser(user);
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
  };

  const handleResendInvite = (userId: string) => {
    setResendingInvite(userId);
    resendInviteMutation.mutate(userId);
  };

  const handleCopyInviteLink = async (user: User) => {
    if (user.inviteToken) {
      const baseUrl = window.location.origin;
      const inviteLink = `${baseUrl}/invite/${user.inviteToken}`;
      
      try {
        await navigator.clipboard.writeText(inviteLink);
        toast({
          title: "Link copiado!",
          description: "O link de convite foi copiado para a área de transferência.",
        });
      } catch (error) {
        toast({
          title: "Erro",
          description: "Falha ao copiar o link.",
          variant: "destructive",
        });
      }
    }
  };

  const isInviteExpired = (user: User) => {
    if (!user.inviteExpiresAt) return false;
    return new Date(user.inviteExpiresAt) < new Date();
  };

  const handleToggleUserStatus = (userId: string, currentStatus: boolean) => {
    const action = currentStatus ? 'desativar' : 'ativar';
    if (confirm(`Tem certeza que deseja ${action} este usuário?`)) {
      setDeactivatingUser(userId);
      toggleUserStatusMutation.mutate({ userId, isActive: !currentStatus });
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 flex justify-center">
        <div className="w-6 h-6 border-2 border-whatsapp border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Lista de Usuários</h3>
        
        {/* Search Bar */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4 flex-1">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                type="text"
                placeholder="Buscar usuário por nome ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Todos</option>
                <option value="active">Ativos</option>
                <option value="inactive">Desativados</option>
              </select>
            </div>
          </div>
          <div className="flex space-x-2 ml-4">
            <Button 
              onClick={async () => {
                try {
                  await apiRequest('POST', '/api/auth/temp-login', {
                    email: "guilherme.charnei@gmail.com",
                    role: "dev", 
                    name: "Guilherme Charnei"
                  });
                  queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
                  queryClient.invalidateQueries({ queryKey: ['/api/users'] });
                  toast({
                    title: "Login DEV",
                    description: "Logado como desenvolvedor para teste",
                  });
                } catch (error) {
                  toast({
                    title: "Erro",
                    description: "Falha no login temporário",
                    variant: "destructive",
                  });
                }
              }}
              variant="outline"
              className="bg-purple-100 text-purple-700 border-purple-300 hover:bg-purple-200"
            >
              Login DEV
            </Button>
            <Button 
              onClick={() => setShowAddUser(true)}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Novo Usuário
            </Button>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Nome
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Função
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredUsers.map((user, index) => (
              <tr key={user.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    {user.profileImageUrl ? (
                      <img
                        src={user.profileImageUrl}
                        alt={`${user.firstName} ${user.lastName}`}
                        className="w-8 h-8 rounded-full object-cover mr-3"
                      />
                    ) : (
                      <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center mr-3">
                        <UserIcon className="w-4 h-4 text-gray-400" />
                      </div>
                    )}
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {user.firstName} {user.lastName}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {user.email}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    user.role === 'dev' ? 'bg-purple-100 text-purple-800' :
                    user.role === 'administrador' ? 'bg-blue-100 text-blue-800' :
                    user.role === 'gerente' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {user.role === 'dev' ? 'DEV' : 
                     user.role === 'administrador' ? 'Admin' :
                     user.role === 'gerente' ? 'Gerente' :
                     'Vendedor'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {user.isInvitePending ? (
                    <div className="flex items-center">
                      {isInviteExpired(user) ? (
                        <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                          <Clock className="w-3 h-3 mr-1" />
                          Expirado
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                          <Clock className="w-3 h-3 mr-1" />
                          Aguardando
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
                      user.isActive === false 
                        ? 'bg-gray-100 text-gray-800' 
                        : 'bg-green-100 text-green-800'
                    }`}>
                      <CheckCircle className="w-3 h-3 mr-1" />
                      {user.isActive === false ? 'Desativado' : 'Ativo'}
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center space-x-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-blue-600 border-blue-300 hover:bg-blue-50"
                      onClick={() => handleEditUser(user)}
                    >
                      <Edit className="w-3 h-3 mr-1" />
                      Editar
                    </Button>
                    
                    {/* Mostrar botões de convite apenas para usuários pendentes */}
                    {user.isInvitePending && (
                      <>
                        {user.inviteToken && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-purple-600 border-purple-300 hover:bg-purple-50"
                            onClick={() => handleCopyInviteLink(user)}
                            title="Copiar link de convite"
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-orange-600 border-orange-300 hover:bg-orange-50"
                          onClick={() => handleResendInvite(user.id)}
                          disabled={resendingInvite === user.id}
                          title={isInviteExpired(user) ? "Reenviar convite (expirado)" : "Reenviar convite"}
                        >
                          <Link className="w-3 h-3" />
                        </Button>
                      </>
                    )}
                    
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-green-600 border-green-300 hover:bg-green-50"
                      onClick={() => handlePromoteUser(user)}
                    >
                      Promover
                    </Button>
                    
                    {/* Botão para ativar/desativar usuário */}
                    {!user.isInvitePending && (
                      <Button
                        size="sm"
                        variant="outline"
                        className={user.isActive === false 
                          ? "text-green-600 border-green-300 hover:bg-green-50" 
                          : "text-orange-600 border-orange-300 hover:bg-orange-50"
                        }
                        onClick={() => handleToggleUserStatus(user.id, user.isActive !== false)}
                        disabled={deactivatingUser === user.id}
                        title={user.isActive === false ? "Ativar usuário" : "Desativar usuário"}
                      >
                        {user.isActive === false ? 'Ativar' : 'Desativar'}
                      </Button>
                    )}
                    
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600 border-red-300 hover:bg-red-50"
                      onClick={() => handleDeleteUser(user.id)}
                      disabled={deleteUserMutation.isPending}
                      title="Remover permanentemente"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AddUserModal 
        isOpen={showAddUser} 
        onClose={() => setShowAddUser(false)} 
      />
      
      {editingUser && (
        <EditUserModal 
          user={editingUser}
          isOpen={!!editingUser} 
          onClose={() => setEditingUser(null)} 
        />
      )}

      <PromoteUserModal 
        isOpen={!!promotingUser}
        onClose={() => setPromotingUser(null)}
        user={promotingUser}
      />
    </div>
  );
}
