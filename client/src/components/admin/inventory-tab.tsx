import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Product } from "@shared/schema";
import { useRef } from "react";

export function InventoryTab() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: ['/api/products'],
  });

  const { data: stats } = useQuery({
    queryKey: ['/api/dashboard/stats'],
  });

  const uploadExcelMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch('/api/products/upload-excel', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Upload failed');
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      toast({
        title: "Upload concluído",
        description: `${data.created} produtos adicionados, ${data.errors} erros`,
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Falha ao processar arquivo Excel",
        variant: "destructive",
      });
    },
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      uploadExcelMutation.mutate(file);
    }
  };

  const lowStockProducts = products.filter(p => p.stock < 5);

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
          <h3 className="font-semibold text-text-primary">Gerenciar Estoque</h3>
          <Button 
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="bg-whatsapp hover:bg-whatsapp-hover text-white"
            disabled={uploadExcelMutation.isPending}
          >
            <i className="fas fa-upload mr-1"></i> 
            {uploadExcelMutation.isPending ? 'Processando...' : 'Excel'}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>

        {/* Upload Area */}
        <div 
          className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center mb-4 hover:border-whatsapp cursor-pointer"
          onClick={() => fileInputRef.current?.click()}
        >
          <i className="fas fa-file-excel text-2xl text-gray-400 mb-2"></i>
          <p className="text-sm text-text-secondary">Arraste a planilha Excel aqui ou clique para selecionar</p>
          <p className="text-xs text-text-secondary mt-1">Formato: .xlsx, .xls</p>
        </div>

        {/* Stock Overview */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-whatsapp-light p-3 rounded-lg">
            <div className="text-sm text-text-secondary">Total de Produtos</div>
            <div className="text-xl font-bold text-text-primary">
              {(stats as any)?.totalProducts || products.length}
            </div>
          </div>
          <div className="bg-red-50 p-3 rounded-lg">
            <div className="text-sm text-text-secondary">Estoque Baixo</div>
            <div className="text-xl font-bold text-red-600">
              {(stats as any)?.lowStockProducts || lowStockProducts.length}
            </div>
          </div>
        </div>

        {/* Recent Products */}
        <div className="space-y-2">
          <h4 className="font-semibold text-text-primary text-sm">Produtos Recentes</h4>
          <div className="space-y-2">
            {products.slice(0, 5).map((product) => (
              <div 
                key={product.id} 
                className={`flex items-center gap-3 p-2 rounded ${
                  product.stock < 5 ? 'bg-red-50' : 'bg-gray-50'
                }`}
              >
                <div className={`w-8 h-8 rounded flex items-center justify-center ${
                  product.stock < 5 ? 'bg-red-200' : 'bg-gray-200'
                }`}>
                  {product.stock < 5 ? (
                    <i className="fas fa-exclamation-triangle text-xs text-red-600"></i>
                  ) : (
                    <i className="fas fa-cog text-xs"></i>
                  )}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium">{product.name}</div>
                  <div className={`text-xs ${
                    product.stock < 5 ? 'text-red-600' : 'text-text-secondary'
                  }`}>
                    R$ {product.price} • Estoque: {product.stock}
                    {product.stock < 5 && ' (Baixo!)'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
