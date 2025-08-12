import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { X, Search, Plus, Package, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Product {
  id: number;
  codigo: string;
  name: string;
  price: string;
  stock: number;
  categoria: string;
}

interface ProductSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddProduct: (product: Product & { quantity: number }) => void;
}

export function ProductSelectionModal({ 
  isOpen, 
  onClose, 
  onAddProduct 
}: ProductSelectionModalProps) {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);

  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: ['/api/products'],
    enabled: isOpen,
  });

  const filteredProducts = products.filter((product: Product) =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.categoria.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddProduct = () => {
    if (!selectedProduct) {
      toast({
        title: "Erro",
        description: "Selecione um produto",
        variant: "destructive",
      });
      return;
    }

    if (quantity < 1) {
      toast({
        title: "Erro",
        description: "Quantidade deve ser maior que 0",
        variant: "destructive",
      });
      return;
    }

    if (quantity > selectedProduct.stock) {
      toast({
        title: "Erro",
        description: `Estoque insuficiente. Disponível: ${selectedProduct.stock}`,
        variant: "destructive",
      });
      return;
    }

    onAddProduct({
      ...selectedProduct,
      quantity
    });

    toast({
      title: "Produto Adicionado!",
      description: `${quantity}x ${selectedProduct.name} adicionado ao pedido`,
    });

    setSelectedProduct(null);
    setQuantity(1);
    onClose();
  };

  const copyProductCode = (codigo: string) => {
    navigator.clipboard.writeText(codigo);
    toast({
      title: "Código Copiado!",
      description: `Código ${codigo} copiado para área de transferência`,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[95vh] sm:max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-3 sm:p-6 border-b">
          <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2">
            <Package className="w-4 h-4 sm:w-5 sm:h-5" />
            Selecionar Produto
          </h3>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Search */}
        <div className="p-3 sm:p-6 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar por nome, código ou categoria..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 text-sm sm:text-base"
            />
          </div>
        </div>

        {/* Products List */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6">
          {isLoading ? (
            <div className="text-center py-8">
              <Package className="h-8 w-8 sm:h-12 sm:w-12 mx-auto mb-4 opacity-50" />
              <p className="text-sm sm:text-base">Carregando produtos...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-8 w-8 sm:h-12 sm:w-12 mx-auto mb-4 opacity-50" />
              <p className="text-gray-500 text-sm sm:text-base">Nenhum produto encontrado</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {filteredProducts.map((product: Product) => (
                <Card 
                  key={product.id}
                  className={`cursor-pointer transition-all ${
                    selectedProduct?.id === product.id 
                      ? 'ring-2 ring-green-500 border-green-500' 
                      : 'hover:shadow-lg'
                  }`}
                  onClick={() => setSelectedProduct(product)}
                >
                  <CardHeader className="pb-2 sm:pb-3 p-3 sm:p-6">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-xs sm:text-sm font-medium line-clamp-2">
                        {product.name}
                      </CardTitle>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          copyProductCode(product.codigo);
                        }}
                        className="h-5 w-5 sm:h-6 sm:w-6 p-0"
                      >
                        <Copy className="h-2 w-2 sm:h-3 sm:w-3" />
                      </Button>
                    </div>
                    <CardDescription className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                      <Badge variant="outline" className="text-xs w-fit">
                        {product.codigo}
                      </Badge>
                      <Badge variant="secondary" className="text-xs w-fit">
                        {product.categoria}
                      </Badge>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0 p-3 sm:p-6">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm sm:text-lg font-semibold text-green-600">
                          R$ {parseFloat(product.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                        <p className="text-xs sm:text-sm text-gray-500">
                          Estoque: {product.stock}
                        </p>
                      </div>
                      <div className={`h-2 w-2 sm:h-3 sm:w-3 rounded-full ${
                        product.stock > 10 ? 'bg-green-500' : 
                        product.stock > 0 ? 'bg-yellow-500' : 'bg-red-500'
                      }`} />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Selected Product Actions */}
        {selectedProduct && (
          <div className="border-t p-3 sm:p-6 bg-gray-50">
            <div className="mb-3 sm:mb-4">
              <p className="font-medium text-sm sm:text-base">{selectedProduct.name}</p>
              <p className="text-xs sm:text-sm text-gray-500">
                R$ {parseFloat(selectedProduct.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} - 
                Estoque: {selectedProduct.stock}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3 sm:gap-4">
              <div className="flex-1 sm:max-w-32">
                <Label htmlFor="quantity" className="text-sm">Quantidade</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  max={selectedProduct.stock}
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="text-sm"
                />
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setSelectedProduct(null)}
                  className="flex-1 sm:flex-none text-sm"
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={handleAddProduct}
                  className="bg-green-600 hover:bg-green-700 flex-1 sm:flex-none text-sm"
                >
                  <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Adicionar ao Pedido</span>
                  <span className="sm:hidden">Adicionar</span>
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}