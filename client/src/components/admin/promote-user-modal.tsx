import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { X } from "lucide-react";
import { User } from "@shared/schema";

interface PromoteUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
}

export function PromoteUserModal({ isOpen, onClose, user }: PromoteUserModalProps) {
  const { toast } = useToast();
  const [selectedRole, setSelectedRole] = useState('');

  // Get current user to check permissions
  const { data: currentUser } = useQuery({
    queryKey: ['/api/auth/user'],
    enabled: isOpen,
  });

  const promoteUserMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      return await apiRequest('PATCH', `/api/users/${userId}/promote`, { role });
    },
    onSuccess: () => {
      toast({
        title: "Sucesso!",
        description: "Usuário promovido com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      onClose();
      setSelectedRole('');
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || "Falha ao promover usuário.";
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole || !user) return;
    
    promoteUserMutation.mutate({ userId: user.id, role: selectedRole });
  };

  // Determine available roles based on current user permissions
  const getAvailableRoles = () => {
    const roles = [];
    
    // Everyone can promote to Vendedor
    roles.push({ value: 'vendedor', label: 'Vendedor' });
    
    // Gerente and above can promote to Gerente
    if ((currentUser as any)?.role === 'gerente' || 
        (currentUser as any)?.role === 'administrador' || 
        (currentUser as any)?.role === 'dev') {
      roles.push({ value: 'gerente', label: 'Gerente' });
    }
    
    // Admin and DEV can promote to Admin
    if ((currentUser as any)?.role === 'administrador' || 
        (currentUser as any)?.role === 'dev') {
      roles.push({ value: 'administrador', label: 'Administrador' });
    }
    
    // Only DEV can promote to DEV
    if ((currentUser as any)?.role === 'dev' && 
        (currentUser as any)?.permissions?.canCreateDev) {
      roles.push({ value: 'dev', label: 'Desenvolvedor' });
    }
    
    return roles;
  };

  if (!isOpen || !user) return null;

  const availableRoles = getAvailableRoles();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Promover Usuário</h3>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
        
        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-2">
            Promovendo: <strong>{user.firstName} {user.lastName}</strong>
          </p>
          <p className="text-sm text-gray-600">
            Cargo atual: <strong>
              {user.role === 'dev' ? 'Desenvolvedor' :
               user.role === 'administrador' ? 'Administrador' :
               user.role === 'gerente' ? 'Gerente' :
               'Vendedor'}
            </strong>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="role">Novo Cargo</Label>
            <Select
              value={selectedRole}
              onValueChange={setSelectedRole}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o novo cargo" />
              </SelectTrigger>
              <SelectContent>
                {availableRoles.map(role => (
                  <SelectItem 
                    key={role.value} 
                    value={role.value}
                    disabled={role.value === user.role}
                  >
                    {role.label}
                    {role.value === user.role && ' (atual)'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={promoteUserMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={!selectedRole || promoteUserMutation.isPending || selectedRole === user.role}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {promoteUserMutation.isPending ? 'Promovendo...' : 'Promover'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}