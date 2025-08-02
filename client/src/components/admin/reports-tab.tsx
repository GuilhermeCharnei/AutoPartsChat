import { useQuery } from "@tanstack/react-query";
import { TrendingUp, Package, MessageCircle, Users } from "lucide-react";
import { Product, Conversation, Order } from "@shared/schema";

export function ReportsTab() {

  const { data: stats } = useQuery<{ totalSales: number }>({
    queryKey: ['/api/dashboard/stats'],
  });

  const { data: recentOrders = [] } = useQuery<Order[]>({
    queryKey: ['/api/orders'],
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['/api/products'],
  });

  const { data: conversations = [] } = useQuery<Conversation[]>({
    queryKey: ['/api/conversations'],
  });

  const lowStockProducts = products.filter(p => p.stock < 10);
  const activeConversations = conversations.filter(c => c.status === 'active');

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-medium text-gray-900">Relatórios e Análises</h3>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center">
            <TrendingUp className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Vendas Total</p>
              <p className="text-2xl font-bold text-gray-900">
                R$ {stats?.totalSales?.toLocaleString() || '0'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center">
            <Package className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Produtos Cadastrados</p>
              <p className="text-2xl font-bold text-gray-900">{products.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center">
            <MessageCircle className="h-8 w-8 text-purple-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Conversas Ativas</p>
              <p className="text-2xl font-bold text-gray-900">{activeConversations.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center">
            <Users className="h-8 w-8 text-orange-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pedidos Hoje</p>
              <p className="text-2xl font-bold text-gray-900">{recentOrders.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow border">
          <div className="px-6 py-4 border-b">
            <h4 className="text-lg font-medium text-gray-900">Pedidos Recentes</h4>
          </div>
          <div className="p-6">
            {recentOrders.length > 0 ? (
              <div className="space-y-4">
                {recentOrders.slice(0, 5).map((order: any, index: number) => (
                  <div key={order.id} className="flex justify-between items-center py-2 border-b last:border-b-0">
                    <div>
                      <p className="font-medium text-gray-900">Pedido #{order.id}</p>
                      <p className="text-sm text-gray-500">Cliente: {order.customerName}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-green-600">R$ {order.total}</p>
                      <p className="text-sm text-gray-500">{order.status}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">Nenhum pedido encontrado</p>
            )}
          </div>
        </div>

        {/* Low Stock Alert */}
        <div className="bg-white rounded-lg shadow border">
          <div className="px-6 py-4 border-b">
            <h4 className="text-lg font-medium text-gray-900">Produtos com Estoque Baixo</h4>
          </div>
          <div className="p-6">
            {lowStockProducts.length > 0 ? (
              <div className="space-y-4">
                {lowStockProducts.slice(0, 5).map((product: any, index: number) => (
                  <div key={product.id} className="flex justify-between items-center py-2 border-b last:border-b-0">
                    <div>
                      <p className="font-medium text-gray-900">{product.name}</p>
                      <p className="text-sm text-gray-500">{product.category}</p>
                    </div>
                    <div className="text-right">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                        {product.stock} unidades
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">Todos os produtos com estoque adequado</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}