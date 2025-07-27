import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { User } from "@shared/schema";

export function UsersTab() {
  const { toast } = useToast();

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ['/api/users'],
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

  if (isLoading) {
    return (
      <div className="p-4 flex justify-center">
        <div className="w-6 h-6 border-2 border-whatsapp border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold text-text-primary">Gerenciar Usuários</h3>
          <Button 
            size="sm"
            className="bg-whatsapp hover:bg-whatsapp-hover text-white"
          >
            <i className="fas fa-plus mr-1"></i> Novo
          </Button>
        </div>

        <div className="space-y-3">
          {users.map((user) => (
            <div key={user.id} className="border border-border-light rounded-lg p-3">
              <div className="flex items-center gap-3 mb-2">
                {user.profileImageUrl ? (
                  <img
                    src={user.profileImageUrl}
                    alt={`${user.firstName} ${user.lastName}`}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                    <i className="fas fa-user text-gray-400"></i>
                  </div>
                )}
                <div className="flex-1">
                  <div className="font-semibold text-text-primary">
                    {user.firstName} {user.lastName}
                  </div>
                  <div className="text-sm text-text-secondary">
                    {user.role === 'admin' ? 'Administrador' : 'Vendedor'}
                    {user.role === 'seller' && (user.permissions as any)?.senior && ' Senior'}
                  </div>
                </div>
                <div className={`w-3 h-3 rounded-full ${
                  user.isActive ? 'bg-whatsapp animate-pulse' : 'bg-gray-300'
                }`}></div>
              </div>

              <div className="text-xs text-text-secondary mb-2">Permissões:</div>
              <div className="flex flex-wrap gap-2 text-xs">
                <label className="flex items-center gap-1">
                  <Checkbox
                    checked={(user.permissions as any)?.viewStock || false}
                    onCheckedChange={(checked) => 
                      handlePermissionChange(user.id, 'viewStock', checked as boolean)
                    }
                  />
                  <span>Ver Estoque</span>
                </label>
                <label className="flex items-center gap-1">
                  <Checkbox
                    checked={(user.permissions as any)?.editProducts || false}
                    onCheckedChange={(checked) => 
                      handlePermissionChange(user.id, 'editProducts', checked as boolean)
                    }
                  />
                  <span>Editar Produtos</span>
                </label>
                <label className="flex items-center gap-1">
                  <Checkbox
                    checked={(user.permissions as any)?.viewReports || false}
                    onCheckedChange={(checked) => 
                      handlePermissionChange(user.id, 'viewReports', checked as boolean)
                    }
                  />
                  <span>Relatórios</span>
                </label>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
