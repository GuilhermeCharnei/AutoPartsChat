import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { X, UserCheck } from "lucide-react";
import { User } from "@shared/schema";

interface ChatTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversationId: number;
  currentAssignee?: string;
}

export function ChatTransferModal({ isOpen, onClose, conversationId, currentAssignee }: ChatTransferModalProps) {
  const { toast } = useToast();
  const [selectedSeller, setSelectedSeller] = useState("");

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['/api/users'],
  });

  const transferMutation = useMutation({
    mutationFn: async (sellerId: string) => {
      const response = await fetch(`/api/conversations/${conversationId}/assign`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sellerId }),
      });
      if (!response.ok) {
        throw new Error('Transfer failed');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
      toast({
        title: "Sucesso",
        description: "Conversa transferida com sucesso!",
      });
      onClose();
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao transferir conversa",
        variant: "destructive",
      });
    },
  });

  const handleTransfer = () => {
    if (!selectedSeller) {
      toast({
        title: "Erro",
        description: "Selecione um vendedor",
        variant: "destructive",
      });
      return;
    }
    transferMutation.mutate(selectedSeller);
  };

  const availableSellers = users.filter(user => 
    (user.role === 'vendedor' || user.role === 'seller') && user.isActive && user.id !== currentAssignee
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Transferir Conversa</h3>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="seller">Transferir para:</Label>
            <Select value={selectedSeller} onValueChange={setSelectedSeller}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um vendedor" />
              </SelectTrigger>
              <SelectContent>
                {availableSellers.map((seller) => (
                  <SelectItem key={seller.id} value={seller.id}>
                    <div className="flex items-center gap-2">
                      {seller.profileImageUrl && (
                        <img 
                          src={seller.profileImageUrl} 
                          alt={seller.firstName || 'Usuario'} 
                          className="w-6 h-6 rounded-full"
                        />
                      )}
                      <span>{seller.firstName} {seller.lastName} ({seller.email})</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {availableSellers.length === 0 && (
            <p className="text-sm text-gray-500">
              Nenhum vendedor disponível para transferência.
            </p>
          )}

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
              onClick={handleTransfer}
              disabled={transferMutation.isPending || !selectedSeller}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              <UserCheck className="w-4 h-4 mr-2" />
              {transferMutation.isPending ? 'Transferindo...' : 'Transferir'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}