import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { X, Search, Plus, Package, Copy, Minus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Product {
  id: number;
  codigo: string;
  name: string;
  price: string;
  stock: number;
  categoria: string;
}

interface SelectedProduct extends Product {
  quantity: number;
}

interface ProductSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddProducts: (products: SelectedProduct[]) => void;
}

export function ProductSelectionModal({ 
  isOpen, 
  onClose, 
  onAddProducts 
}: ProductSelectionModalProps) {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProducts, setSelectedProducts] = useState<Map<number, SelectedProduct>>(new Map());

  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: ['/api/products'],
    enabled: isOpen,
  });

  const filteredProducts = products.filter((product: Product) =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.categoria.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleProductToggle = (product: Product, checked: boolean) => {
    const newSelected = new Map(selectedProducts);
    
    if (checked) {
      newSelected.set(product.id, { ...product, quantity: 1 });
    } else {
      newSelected.delete(product.id);
    }
    
    setSelectedProducts(newSelected);
  };

  const handleQuantityChange = (productId: number, quantity: number) => {
    const newSelected = new Map(selectedProducts);
    const product = newSelected.get(productId);
    
    if (product) {
      newSelected.set(productId, { ...product, quantity: Math.max(1, quantity) });
      setSelectedProducts(newSelected);
    }
  };

  const handleSelectAll = () => {
    if (selectedProducts.size === filteredProducts.length) {
      // Deselect all
      setSelectedProducts(new Map());
    } else {
      // Select all filtered products
      const newSelected = new Map();
      filteredProducts.forEach(product => {
        newSelected.set(product.id, { ...product, quantity: 1 });
      });
      setSelectedProducts(newSelected);
    }
  };

  const handleAddProducts = () => {
    if (selectedProducts.size === 0) {
      toast({
        title: "Erro",
        description: "Selecione pelo menos um produto",
        variant: "destructive",
      });
      return;
    }

    // Validate stock for all selected products
    const invalidProducts = Array.from(selectedProducts.values()).filter(
      product => product.quantity > product.stock
    );

    if (invalidProducts.length > 0) {
      toast({
        title: "Erro",
        description: `Estoque insuficiente para: ${invalidProducts.map(p => p.name).join(', ')}`,
        variant: "destructive",
      });
      return;
    }

    onAddProducts(Array.from(selectedProducts.values()));

    toast({
      title: "Produtos Adicionados!",
      description: `${selectedProducts.size} produto(s) adicionado(s) ao pedido`,
    });

    setSelectedProducts(new Map());
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

        {/* Search and Select All */}
        <div className="p-3 sm:p-6 border-b space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar por nome, código ou categoria..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 text-sm sm:text-base"
            />
          </div>
          
          {filteredProducts.length > 0 && (
            <div className="flex items-center space-x-2">
              <Checkbox
                id="select-all"
                checked={selectedProducts.size === filteredProducts.length && filteredProducts.length > 0}
                onCheckedChange={handleSelectAll}
                data-testid="checkbox-select-all"
              />
              <Label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
                Selecionar todos ({filteredProducts.length} produtos)
              </Label>
            </div>
          )}
        </div>

        {/* Products List */}
        <div className="flex-1 overflow-y-auto">
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
            <div className="divide-y divide-gray-200">
              {filteredProducts.map((product: Product) => {
                const isSelected = selectedProducts.has(product.id);
                const selectedProduct = selectedProducts.get(product.id);
                
                return (
                  <div 
                    key={product.id}
                    className={`p-3 sm:p-4 hover:bg-gray-50 transition-colors ${
                      isSelected ? 'bg-green-50 border-l-4 border-green-500' : ''
                    }`}
                    data-testid={`product-item-${product.id}`}
                  >
                    <div className="flex items-start space-x-3">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) => handleProductToggle(product, checked as boolean)}
                        className="mt-1"
                        data-testid={`checkbox-product-${product.id}`}
                      />
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="text-sm font-medium text-gray-900 line-clamp-2">
                              {product.name}
                            </h4>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">
                                {product.codigo}
                              </Badge>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyProductCode(product.codigo)}
                                className="h-5 w-5 p-0 hover:bg-green-100"
                                title="Copiar código"
                                data-testid={`button-copy-${product.id}`}
                              >
                                <Copy className="h-3 w-3 text-gray-500" />
                              </Button>
                              <Badge variant="secondary" className="text-xs">
                                {product.categoria}
                              </Badge>
                            </div>
                          </div>
                          
                          <div className="text-right ml-4">
                            <p className="text-sm font-semibold text-green-600">
                              R$ {parseFloat(product.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                            <div className="flex items-center justify-end gap-2 mt-1">
                              <span className="text-xs text-gray-500">
                                Estoque: {product.stock}
                              </span>
                              <div className={`h-2 w-2 rounded-full ${
                                product.stock > 10 ? 'bg-green-500' : 
                                product.stock > 0 ? 'bg-yellow-500' : 'bg-red-500'
                              }`} />
                            </div>
                          </div>
                        </div>
                        
                        {isSelected && (
                          <div className="mt-3 flex items-center space-x-3">
                            <Label htmlFor={`quantity-${product.id}`} className="text-sm font-medium">
                              Quantidade:
                            </Label>
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleQuantityChange(product.id, (selectedProduct?.quantity || 1) - 1)}
                                disabled={(selectedProduct?.quantity || 1) <= 1}
                                className="h-7 w-7 p-0"
                                data-testid={`button-decrease-${product.id}`}
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <Input
                                id={`quantity-${product.id}`}
                                type="number"
                                min="1"
                                max={product.stock}
                                value={selectedProduct?.quantity || 1}
                                onChange={(e) => handleQuantityChange(product.id, parseInt(e.target.value) || 1)}
                                className="w-16 h-7 text-center text-sm"
                                data-testid={`input-quantity-${product.id}`}
                              />
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleQuantityChange(product.id, (selectedProduct?.quantity || 1) + 1)}
                                disabled={(selectedProduct?.quantity || 1) >= product.stock}
                                className="h-7 w-7 p-0"
                                data-testid={`button-increase-${product.id}`}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                            <span className="text-xs text-gray-500">
                              Max: {product.stock}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Selected Products Summary and Actions */}
        {selectedProducts.size > 0 && (
          <div className="border-t p-3 sm:p-6 bg-gray-50">
            <div className="mb-3 sm:mb-4">
              <p className="font-medium text-sm sm:text-base">
                {selectedProducts.size} produto(s) selecionado(s)
              </p>
              <div className="text-xs sm:text-sm text-gray-500 space-y-1 max-h-20 overflow-y-auto">
                {Array.from(selectedProducts.values()).map(product => (
                  <div key={product.id} className="flex justify-between">
                    <span>{product.quantity}x {product.name}</span>
                    <span>R$ {(parseFloat(product.price) * product.quantity).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                ))}
              </div>
              <div className="mt-2 pt-2 border-t border-gray-200">
                <p className="font-semibold text-sm text-green-600">
                  Total: R$ {Array.from(selectedProducts.values())
                    .reduce((total, product) => total + (parseFloat(product.price) * product.quantity), 0)
                    .toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => setSelectedProducts(new Map())}
                className="flex-1 sm:flex-none text-sm"
                data-testid="button-clear-selection"
              >
                Limpar Seleção
              </Button>
              <Button 
                onClick={handleAddProducts}
                className="bg-green-600 hover:bg-green-700 flex-1 sm:flex-none text-sm"
                data-testid="button-add-products"
              >
                <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Adicionar ao Pedido</span>
                <span className="sm:hidden">Adicionar</span>
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}