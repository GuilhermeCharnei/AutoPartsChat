import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Product } from "@shared/schema";
import { 
  Upload, 
  Search, 
  Package, 
  AlertTriangle, 
  TrendingUp, 
  Plus,
  Edit,
  Trash2,
  Settings,
  Filter,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  Copy,
  Check
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

interface ColumnConfig {
  key: keyof Product | 'actions';
  label: string;
  visible: boolean;
  mobileVisible: boolean;
}

const defaultColumns: ColumnConfig[] = [
  { key: 'codigo', label: 'Código', visible: true, mobileVisible: true },
  { key: 'name', label: 'Produto', visible: true, mobileVisible: true },
  { key: 'category', label: 'Categoria', visible: true, mobileVisible: false },
  { key: 'brand', label: 'Marca', visible: true, mobileVisible: false },
  { key: 'price', label: 'Preço', visible: true, mobileVisible: true },
  { key: 'stock', label: 'Estoque', visible: true, mobileVisible: true },
  { key: 'description', label: 'Descrição', visible: false, mobileVisible: false },
  { key: 'actions', label: 'Ações', visible: true, mobileVisible: true },
];

export function InventoryMobile() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [columns, setColumns] = useState<ColumnConfig[]>(defaultColumns);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('cards');
  const [sortBy, setSortBy] = useState<keyof Product>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [expandedCard, setExpandedCard] = useState<number | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

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
        title: "Upload concluído!",
        description: `${data.imported || 0} produtos importados, ${data.updated || 0} atualizados`,
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

  const deleteProductMutation = useMutation({
    mutationFn: async (productId: number) => {
      const response = await fetch(`/api/products/${productId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Delete failed');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      toast({
        title: "Produto removido",
        description: "Produto removido com sucesso",
      });
    },
  });

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedCode(text);
      toast({
        title: "Código copiado!",
        description: `Código ${text} copiado para área de transferência`,
        duration: 2000
      });
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (err) {
      toast({
        title: "Erro ao copiar",
        description: "Não foi possível copiar o código",
        variant: "destructive"
      });
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      uploadExcelMutation.mutate(file);
    }
  };

  const toggleColumnVisibility = (columnKey: string, isMobile: boolean = false) => {
    setColumns(prev => prev.map(col => 
      col.key === columnKey 
        ? { ...col, [isMobile ? 'mobileVisible' : 'visible']: !col[isMobile ? 'mobileVisible' : 'visible'] }
        : col
    ));
  };

  const visibleColumns = columns.filter(col => 
    window.innerWidth < 768 ? col.mobileVisible : col.visible
  );

  const filteredProducts = products.filter(product =>
    (product.codigo || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (product.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (product.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (product.category || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (product.brand || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    const aValue = a[sortBy] || '';
    const bValue = b[sortBy] || '';
    
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
    }
    
    const comparison = String(aValue).localeCompare(String(bValue), 'pt-BR');
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  const getStockStatus = (stock: number | null) => {
    const stockValue = stock || 0;
    if (stockValue < 5) return { label: 'Crítico', color: 'destructive' };
    if (stockValue < 20) return { label: 'Baixo', color: 'warning' };
    return { label: 'OK', color: 'success' };
  };

  const lowStockProducts = products.filter(p => (p.stock || 0) < 5);

  if (isLoading) {
    return (
      <div className="p-4 flex justify-center">
        <div className="w-6 h-6 border-2 border-whatsapp border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-2 md:p-6 space-y-4 md:space-y-6">
      {/* Header Mobile/Desktop */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h3 className="text-lg md:text-xl font-medium text-gray-900">Gerenciar Estoque</h3>
        <div className="flex flex-wrap gap-2">
          <Button 
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="bg-whatsapp hover:bg-whatsapp-hover text-white text-xs md:text-sm"
            disabled={uploadExcelMutation.isPending}
          >
            <Upload className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
            {uploadExcelMutation.isPending ? 'Processando...' : 'Importar Excel'}
          </Button>
          
          {/* Column Visibility Settings */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="text-xs md:text-sm">
                <Settings className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                Colunas
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Colunas Visíveis</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {columns.filter(col => col.key !== 'actions').map((column) => (
                <DropdownMenuCheckboxItem
                  key={column.key}
                  className="capitalize"
                  checked={window.innerWidth < 768 ? column.mobileVisible : column.visible}
                  onCheckedChange={() => toggleColumnVisibility(column.key, window.innerWidth < 768)}
                >
                  {column.label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* View Mode Toggle (Mobile) */}
          <div className="md:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="text-xs">
                  <Eye className="w-3 h-3 mr-1" />
                  {viewMode === 'cards' ? 'Cards' : 'Tabela'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setViewMode('cards')}>
                  <Package className="w-4 h-4 mr-2" />
                  Cards
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setViewMode('table')}>
                  <Filter className="w-4 h-4 mr-2" />
                  Tabela
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFileUpload}
          className="hidden"
        />
      </div>

      {/* Stats Cards - Mobile Responsive */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-4">
        <Card className="p-2 md:p-4">
          <CardContent className="p-0">
            <div className="flex items-center space-x-2">
              <Package className="w-4 h-4 md:w-6 md:h-6 text-blue-600" />
              <div>
                <p className="text-xs md:text-sm text-gray-500">Total</p>
                <p className="text-sm md:text-xl font-bold text-gray-900">
                  {(stats as any)?.totalProducts || products.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="p-2 md:p-4">
          <CardContent className="p-0">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 md:w-6 md:h-6 text-orange-600" />
              <div>
                <p className="text-xs md:text-sm text-gray-500">Baixo</p>
                <p className="text-sm md:text-xl font-bold text-orange-600">
                  {lowStockProducts.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="p-2 md:p-4 col-span-2 md:col-span-1">
          <CardContent className="p-0">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 md:w-6 md:h-6 text-green-600" />
              <div>
                <p className="text-xs md:text-sm text-gray-500">Valor Total</p>
                <p className="text-sm md:text-xl font-bold text-gray-900">
                  R$ {products.reduce((sum, p) => sum + (Number(p.price) * Number(p.stock)), 0).toLocaleString('pt-BR')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Sort */}
      <div className="flex flex-col sm:flex-row gap-2 md:gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Buscar produtos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 text-sm"
          />
        </div>
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="text-xs md:text-sm">
                <Filter className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                Ordenar: {columns.find(c => c.key === sortBy)?.label}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {columns.filter(col => col.key !== 'actions' && col.key !== 'description').map((column) => (
                <DropdownMenuItem
                  key={column.key}
                  onClick={() => setSortBy(column.key as keyof Product)}
                >
                  {column.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="text-xs md:text-sm"
          >
            {sortOrder === 'asc' ? <ChevronUp className="w-3 h-3 md:w-4 md:h-4" /> : <ChevronDown className="w-3 h-3 md:w-4 md:h-4" />}
          </Button>
        </div>
      </div>

      {/* Products Display */}
      {viewMode === 'cards' || window.innerWidth < 768 ? (
        /* Card View - Mobile Friendly */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          {sortedProducts.map((product) => {
            const status = getStockStatus(product.stock);
            const isExpanded = expandedCard === product.id;
            
            return (
              <Card key={product.id} className="overflow-hidden">
                <CardContent className="p-3 md:p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded text-gray-600">
                          {product.codigo}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(product.codigo || '')}
                          className="h-6 w-6 p-0 hover:bg-green-100"
                          title="Copiar código"
                        >
                          {copiedCode === product.codigo ? (
                            <Check className="w-3 h-3 text-green-600" />
                          ) : (
                            <Copy className="w-3 h-3 text-gray-500" />
                          )}
                        </Button>
                      </div>
                      <h4 className="font-medium text-sm md:text-base text-gray-900 line-clamp-2">
                        {product.name}
                      </h4>
                    </div>
                    <div className="flex gap-1 ml-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setExpandedCard(isExpanded ? null : product.id)}
                        className="h-6 w-6 p-0"
                      >
                        {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs md:text-sm text-gray-500">Preço:</span>
                      <span className="font-semibold text-sm md:text-base">
                        R$ {Number(product.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-xs md:text-sm text-gray-500">Estoque:</span>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm md:text-base">{product.stock || 0}</span>
                        <Badge variant={status.color as any} className="text-xs">
                          {status.label}
                        </Badge>
                      </div>
                    </div>
                    
                    {product.category && (
                      <div className="flex justify-between items-center">
                        <span className="text-xs md:text-sm text-gray-500">Categoria:</span>
                        <span className="text-xs md:text-sm">{product.category}</span>
                      </div>
                    )}
                  </div>
                  
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t space-y-2">
                      {product.brand && (
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-500">Marca:</span>
                          <span className="text-xs">{product.brand}</span>
                        </div>
                      )}
                      {product.description && (
                        <div>
                          <span className="text-xs text-gray-500">Descrição:</span>
                          <p className="text-xs mt-1 text-gray-700">{product.description}</p>
                        </div>
                      )}
                      <div className="flex gap-2 pt-2">
                        <Button variant="outline" size="sm" className="flex-1 text-xs">
                          <Edit className="w-3 h-3 mr-1" />
                          Editar
                        </Button>
                        <Button 
                          variant="destructive" 
                          size="sm" 
                          className="flex-1 text-xs"
                          onClick={() => deleteProductMutation.mutate(product.id)}
                        >
                          <Trash2 className="w-3 h-3 mr-1" />
                          Remover
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        /* Table View - Desktop */
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    {visibleColumns.map((column) => (
                      <th key={column.key} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {column.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sortedProducts.map((product) => {
                    const status = getStockStatus(product.stock);
                    
                    return (
                      <tr key={product.id} className="hover:bg-gray-50">
                        {visibleColumns.map((column) => (
                          <td key={column.key} className="px-4 py-4 whitespace-nowrap text-sm">
                            {column.key === 'codigo' && (
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                                  {product.codigo}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => copyToClipboard(product.codigo || '')}
                                  className="h-6 w-6 p-0 hover:bg-green-100"
                                  title="Copiar código"
                                >
                                  {copiedCode === product.codigo ? (
                                    <Check className="w-3 h-3 text-green-600" />
                                  ) : (
                                    <Copy className="w-3 h-3 text-gray-500" />
                                  )}
                                </Button>
                              </div>
                            )}
                            {column.key === 'name' && (
                              <div>
                                <div className="font-medium text-gray-900">{product.name}</div>
                                {product.description && (
                                  <div className="text-xs text-gray-500 truncate max-w-xs">{product.description}</div>
                                )}
                              </div>
                            )}
                            {column.key === 'category' && (product.category || '-')}
                            {column.key === 'brand' && (product.brand || '-')}
                            {column.key === 'price' && (
                              `R$ ${Number(product.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                            )}
                            {column.key === 'stock' && (
                              <div className="flex items-center gap-2">
                                <span>{product.stock || 0}</span>
                                <Badge variant={status.color as any} className="text-xs">
                                  {status.label}
                                </Badge>
                              </div>
                            )}
                            {column.key === 'description' && (
                              <div className="max-w-xs truncate">{product.description || '-'}</div>
                            )}
                            {column.key === 'actions' && (
                              <div className="flex gap-2">
                                <Button variant="outline" size="sm">
                                  <Edit className="w-3 h-3" />
                                </Button>
                                <Button 
                                  variant="destructive" 
                                  size="sm"
                                  onClick={() => deleteProductMutation.mutate(product.id)}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            )}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {filteredProducts.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum produto encontrado</h3>
            <p className="text-gray-500">
              {searchTerm ? 'Tente ajustar sua busca' : 'Importe produtos usando um arquivo Excel'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}