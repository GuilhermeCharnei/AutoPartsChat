import { useState } from "react";
import { UsersTab } from "./users-tab";
import { InventoryTab } from "./inventory-tab";
import { ReportsTab } from "./reports-tab";

export function AdminPanel() {
  const [activeTab, setActiveTab] = useState<'users' | 'inventory' | 'reports'>('users');

  const tabs = [
    { id: 'users' as const, label: 'Usuários', icon: 'fas fa-users' },
    { id: 'inventory' as const, label: 'Estoque', icon: 'fas fa-box' },
    { id: 'reports' as const, label: 'Relatórios', icon: 'fas fa-chart-bar' },
  ];

  return (
    <div className="w-80 bg-white border-r border-border-light flex flex-col">
      {/* Admin Panel Header */}
      <div className="bg-whatsapp-panel p-4 border-b border-border-light">
        <h2 className="text-lg font-semibold text-text-primary mb-3">Painel Administrativo</h2>
        <div className="flex gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1 rounded text-sm transition-colors ${
                activeTab === tab.id
                  ? 'bg-whatsapp text-white'
                  : 'bg-gray-200 text-text-primary hover:bg-gray-300'
              }`}
            >
              <i className={`${tab.icon} mr-1`}></i>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content Area */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'users' && <UsersTab />}
        {activeTab === 'inventory' && <InventoryTab />}
        {activeTab === 'reports' && <ReportsTab />}
      </div>
    </div>
  );
}
