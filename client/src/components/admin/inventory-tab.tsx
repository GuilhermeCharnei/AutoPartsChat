import { useRef, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Product } from "@shared/schema";
import { Upload, Search, Package, AlertTriangle, TrendingUp } from "lucide-react";

export function InventoryTab() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [searchTerm, setSearchTerm] = useState("");

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
  
  // Filtrar produtos baseado na busca
  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="p-4 flex justify-center">
        <div className="w-6 h-6 border-2 border-whatsapp border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-medium text-gray-900">Gerenciar Estoque</h3>
        <Button 
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          className="bg-green-600 hover:bg-green-700 text-white"
          disabled={uploadExcelMutation.isPending}
        >
          <Upload className="w-4 h-4 mr-2" />
          {uploadExcelMutation.isPending ? 'Processando...' : 'Importar Excel'}
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
        className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center mb-6 hover:border-green-500 cursor-pointer"
        onClick={() => fileInputRef.current?.click()}
      >
        <Package className="w-8 h-8 text-gray-400 mx-auto mb-2" />
        <p className="text-sm text-gray-500">Arraste a planilha Excel aqui ou clique para selecionar</p>
        <p className="text-xs text-gray-400 mt-1">Formato: .xlsx, .xls</p>
      </div>

      {/* Stock Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow border p-4">
          <div className="flex items-center">
            <Package className="w-8 h-8 text-blue-600" />
            <div className="ml-3">
              <p className="text-sm text-gray-500">Total de Produtos</p>
              <p className="text-xl font-bold text-gray-900">
                {(stats as any)?.totalProducts || products.length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow border p-4">
          <div className="flex items-center">
            <AlertTriangle className="w-8 h-8 text-orange-600" />
            <div className="ml-3">
              <p className="text-sm text-gray-500">Estoque Baixo</p>
              <p className="text-xl font-bold text-orange-600">
                {(stats as any)?.lowStockProducts || lowStockProducts.length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow border p-4">
          <div className="flex items-center">
            <TrendingUp className="w-8 h-8 text-green-600" />
            <div className="ml-3">
              <p className="text-sm text-gray-500">Valor Total</p>
              <p className="text-xl font-bold text-gray-900">
                R$ {products.reduce((sum, p) => sum + (Number(p.price) * Number(p.stock)), 0).toLocaleString('pt-BR')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Products Table */}
      <div className="bg-white rounded-lg shadow border">
        <div className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <h4 className="text-lg font-medium text-gray-900">Lista de Produtos</h4>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                type="text"
                placeholder="Buscar produtos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Produto
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Categoria
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Preço
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estoque
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredProducts.map((product, index) => (
                <tr key={product.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{product.name}</div>
                      <div className="text-sm text-gray-500">{product.description}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {product.category || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    R$ {Number(product.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {product.stock} unidades
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      product.stock < 5 
                        ? 'bg-red-100 text-red-800'
                        : product.stock < 20
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {product.stock < 5 ? 'Estoque Baixo' : product.stock < 20 ? 'Atenção' : 'OK'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredProducts.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              Nenhum produto encontrado
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
