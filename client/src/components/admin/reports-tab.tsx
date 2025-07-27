import { useQuery } from "@tanstack/react-query";
import { User, Order } from "@shared/schema";

export function ReportsTab() {
  const { data: stats } = useQuery({
    queryKey: ['/api/dashboard/stats'],
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['/api/users'],
  });

  const { data: orders = [] } = useQuery<Order[]>({
    queryKey: ['/api/orders'],
  });

  // Calculate today's sales by seller
  const today = new Date().toISOString().split('T')[0];
  const todayOrders = orders.filter(order => 
    order.createdAt && order.createdAt.toString().startsWith(today)
  );

  const salesBySeller = users.map(user => {
    const userSales = todayOrders
      .filter(order => order.sellerId === user.id)
      .reduce((total, order) => total + parseFloat(order.totalAmount), 0);
    
    return {
      user,
      sales: userSales,
    };
  }).sort((a, b) => b.sales - a.sales);

  return (
    <div className="h-full overflow-y-auto scrollbar-thin">
      <div className="p-4">
        <h3 className="font-semibold text-text-primary mb-4">Relatórios de Vendas</h3>
        
        {/* KPI Cards */}
        <div className="grid grid-cols-1 gap-3 mb-4">
          <div className="bg-whatsapp text-white p-3 rounded-lg">
            <div className="text-sm opacity-90">Vendas Hoje</div>
            <div className="text-xl font-bold">
              R$ {(stats as any)?.todaySales?.toFixed(2) || '0,00'}
            </div>
            <div className="text-xs opacity-75">+12% vs ontem</div>
          </div>
          <div className="bg-blue-500 text-white p-3 rounded-lg">
            <div className="text-sm opacity-90">Conversas Ativas</div>
            <div className="text-xl font-bold">{(stats as any)?.activeConversations || 0}</div>
            <div className="text-xs opacity-75">Em atendimento</div>
          </div>
          <div className="bg-purple-500 text-white p-3 rounded-lg">
            <div className="text-sm opacity-90">Taxa Conversão</div>
            <div className="text-xl font-bold">68%</div>
            <div className="text-xs opacity-75">+5% vs semana</div>
          </div>
        </div>

        {/* Sales by Seller */}
        <div className="space-y-2">
          <h4 className="font-semibold text-text-primary text-sm">Vendas por Vendedor (Hoje)</h4>
          <div className="space-y-2">
            {salesBySeller.map(({ user, sales }) => (
              <div key={user.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <div className="flex items-center gap-2">
                  {user.profileImageUrl ? (
                    <img
                      src={user.profileImageUrl}
                      alt={`${user.firstName} ${user.lastName}`}
                      className="w-6 h-6 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center">
                      <i className="fas fa-user text-xs text-gray-400"></i>
                    </div>
                  )}
                  <span className="text-sm">{user.firstName} {user.lastName}</span>
                </div>
                <div className="text-sm font-semibold text-whatsapp">
                  R$ {sales.toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
