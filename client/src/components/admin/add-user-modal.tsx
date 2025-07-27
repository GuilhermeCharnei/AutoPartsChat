import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { X } from "lucide-react";

interface AddUserModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AddUserModal({ isOpen, onClose }: AddUserModalProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    role: 'seller',
    permissions: {
      viewStock: false,
      editProducts: false,
      viewReports: false,
      manageUsers: false,
      transferChats: false
    }
  });

  const addUserMutation = useMutation({
    mutationFn: async (userData: any) => {
      await apiRequest('POST', '/api/users', userData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({
        title: "Sucesso",
        description: "Usuário criado com sucesso!",
      });
      onClose();
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        role: 'seller',
        permissions: {
          viewStock: false,
          editProducts: false,
          viewReports: false,
          manageUsers: false,
          transferChats: false
        }
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao criar usuário",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addUserMutation.mutate(formData);
  };

  const handlePermissionChange = (permission: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [permission]: checked
      }
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Adicionar Usuário</h3>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName">Nome *</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                required
              />
            </div>
            <div>
              <Label htmlFor="lastName">Sobrenome *</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              required
            />
          </div>

          <div>
            <Label htmlFor="role">Função</Label>
            <Select
              value={formData.role}
              onValueChange={(value) => setFormData(prev => ({ ...prev, role: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Administrador</SelectItem>
                <SelectItem value="seller">Vendedor</SelectItem>
                <SelectItem value="manager">Gerente</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-sm font-medium mb-3 block">Permissões</Label>
            <div className="space-y-2">
              <label className="flex items-center space-x-2">
                <Checkbox
                  checked={formData.permissions.viewStock}
                  onCheckedChange={(checked) => handlePermissionChange('viewStock', checked as boolean)}
                />
                <span className="text-sm">Ver Estoque</span>
              </label>
              <label className="flex items-center space-x-2">
                <Checkbox
                  checked={formData.permissions.editProducts}
                  onCheckedChange={(checked) => handlePermissionChange('editProducts', checked as boolean)}
                />
                <span className="text-sm">Editar Produtos</span>
              </label>
              <label className="flex items-center space-x-2">
                <Checkbox
                  checked={formData.permissions.viewReports}
                  onCheckedChange={(checked) => handlePermissionChange('viewReports', checked as boolean)}
                />
                <span className="text-sm">Ver Relatórios</span>
              </label>
              <label className="flex items-center space-x-2">
                <Checkbox
                  checked={formData.permissions.manageUsers}
                  onCheckedChange={(checked) => handlePermissionChange('manageUsers', checked as boolean)}
                />
                <span className="text-sm">Gerenciar Usuários</span>
              </label>
              <label className="flex items-center space-x-2">
                <Checkbox
                  checked={formData.permissions.transferChats}
                  onCheckedChange={(checked) => handlePermissionChange('transferChats', checked as boolean)}
                />
                <span className="text-sm">Transferir Chats</span>
              </label>
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={addUserMutation.isPending}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              {addUserMutation.isPending ? 'Criando...' : 'Criar Usuário'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}