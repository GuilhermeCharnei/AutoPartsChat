import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { X, CheckCircle, Package } from "lucide-react";

interface FinalizeOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversationId: number;
  customerName: string;
  items: Array<{
    productId: number;
    productName: string;
    quantity: number;
    price: string;
  }>;
}

export function FinalizeOrderModal({ 
  isOpen, 
  onClose, 
  conversationId, 
  customerName, 
  items 
}: FinalizeOrderModalProps) {
  const { toast } = useToast();
  const [customerPhone, setCustomerPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("dinheiro");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [notes, setNotes] = useState("");

  const totalAmount = items.reduce((sum, item) => 
    sum + (parseFloat(item.price) * item.quantity), 0
  );

  const finalizeOrderMutation = useMutation({
    mutationFn: async () => {
      const orderData = {
        conversationId,
        customerName,
        customerPhone,
        items: items.map(item => ({
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          price: item.price,
        })),
        totalAmount: totalAmount.toString(),
        paymentMethod,
        deliveryAddress,
        notes,
        status: 'confirmed',
        paymentStatus: paymentMethod === 'pix' ? 'pending' : 'paid'
      };

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      });

      if (!response.ok) {
        throw new Error('Failed to create order');
      }

      return response.json();
    },
    onSuccess: (order) => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      
      // Update stock for ordered items
      items.forEach(item => {
        queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      });

      toast({
        title: "Pedido Finalizado!",
        description: `Pedido #${order.id} criado com sucesso para ${customerName}`,
      });
      onClose();
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao finalizar pedido",
        variant: "destructive",
      });
    },
  });

  const handleFinalize = () => {
    if (!customerPhone.trim()) {
      toast({
        title: "Erro",
        description: "Telefone do cliente é obrigatório",
        variant: "destructive",
      });
      return;
    }

    if (!deliveryAddress.trim()) {
      toast({
        title: "Erro", 
        description: "Endereço de entrega é obrigatório",
        variant: "destructive",
      });
      return;
    }

    finalizeOrderMutation.mutate();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Package className="w-5 h-5" />
            Finalizar Pedido - {customerName}
          </h3>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="space-y-6">
          {/* Order Summary */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium mb-3">Resumo do Pedido</h4>
            <div className="space-y-2">
              {items.map((item, index) => (
                <div key={index} className="flex justify-between items-center">
                  <div>
                    <span className="font-medium">{item.productName}</span>
                    <span className="text-gray-500 ml-2">x{item.quantity}</span>
                  </div>
                  <span className="font-medium">
                    R$ {(parseFloat(item.price) * item.quantity).toFixed(2)}
                  </span>
                </div>
              ))}
              <div className="border-t pt-2 mt-2">
                <div className="flex justify-between items-center font-bold text-lg">
                  <span>Total:</span>
                  <span className="text-green-600">R$ {totalAmount.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Customer Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="customerPhone">Telefone do Cliente *</Label>
              <Input
                id="customerPhone"
                type="tel"
                placeholder="(11) 99999-9999"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="paymentMethod">Forma de Pagamento</Label>
              <select
                id="paymentMethod"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              >
                <option value="dinheiro">Dinheiro</option>
                <option value="cartao">Cartão</option>
                <option value="pix">PIX</option>
                <option value="transferencia">Transferência</option>
              </select>
            </div>
          </div>

          <div>
            <Label htmlFor="deliveryAddress">Endereço de Entrega *</Label>
            <Textarea
              id="deliveryAddress"
              placeholder="Rua, número, bairro, cidade, CEP..."
              value={deliveryAddress}
              onChange={(e) => setDeliveryAddress(e.target.value)}
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              placeholder="Informações adicionais sobre o pedido..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
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
              onClick={handleFinalize}
              disabled={finalizeOrderMutation.isPending}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              {finalizeOrderMutation.isPending ? 'Finalizando...' : 'Finalizar Pedido'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}