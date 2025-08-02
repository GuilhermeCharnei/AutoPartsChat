import { useState } from 'react';
import * as React from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { 
  MessageCircle, 
  Bot, 
  Settings, 
  Key, 
  Phone, 
  TestTube,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';

export function WhatsAppSetupTab() {
  const { toast } = useToast();
  const [activeSection, setActiveSection] = useState<'api' | 'bot' | 'messages'>('api');

  const { data: config, isLoading } = useQuery({
    queryKey: ['/api/admin/whatsapp-config'],
  });

  const [apiConfig, setApiConfig] = useState({
    phoneNumberId: '',
    accessToken: '',
    verifyToken: '',
    webhookUrl: '',
    businessAccountId: '',
    appId: '',
    appSecret: ''
  });

  const [botConfig, setBotConfig] = useState({
    botName: 'AutoBot',
    welcomeMessage: 'Olá! Bem-vindo à nossa loja de autopeças! Como posso ajudá-lo hoje?',
    botEnabled: true,
    autoResponse: true,
    workingHours: {
      enabled: false,
      start: '08:00',
      end: '18:00'
    },
    fallbackMessage: 'Desculpe, não entendi sua mensagem. Um atendente humano irá responder em breve.'
  });

  const [messageTemplates, setMessageTemplates] = useState({
    orderConfirmation: 'Seu pedido #{orderNumber} foi confirmado! Total: R$ {total}',
    shippingUpdate: 'Seu pedido #{orderNumber} foi enviado! Código de rastreamento: {trackingCode}',
    stockAlert: 'O produto {productName} que você consultou voltou ao estoque!',
    priceAlert: 'Oferta especial! {productName} com {discount}% de desconto por tempo limitado!'
  });

  // Carregar dados quando disponíveis
  React.useEffect(() => {
    if (config) {
      setApiConfig(prev => ({ ...prev, ...(config as any).api }));
      setBotConfig(prev => ({ ...prev, ...(config as any).bot }));
      setMessageTemplates(prev => ({ ...prev, ...(config as any).templates }));
    }
  }, [config]);

  const saveConfigMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest('/api/admin/whatsapp-config', 'PUT', data);
    },
    onSuccess: () => {
      toast({
        title: "Configuração salva",
        description: "As configurações do WhatsApp foram atualizadas.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/whatsapp-config'] });
    },
    onError: () => {
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar as configurações.",
        variant: "destructive",
      });
    },
  });

  const testConnectionMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('/api/admin/whatsapp-test', 'POST', apiConfig);
    },
    onSuccess: (data) => {
      toast({
        title: "Conexão bem-sucedida",
        description: "A API do WhatsApp está funcionando corretamente.",
      });
    },
    onError: () => {
      toast({
        title: "Falha na conexão",
        description: "Verifique suas credenciais da API do WhatsApp.",
        variant: "destructive",
      });
    },
  });

  const handleSaveConfig = () => {
    const fullConfig = {
      api: apiConfig,
      bot: botConfig,
      templates: messageTemplates
    };
    saveConfigMutation.mutate(fullConfig);
  };

  const handleTestConnection = () => {
    testConnectionMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-6 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <MessageCircle className="w-7 h-7 text-green-600" />
                Configuração WhatsApp API
              </h2>
              <p className="text-gray-600 mt-1">Configure a integração com WhatsApp Business API</p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleTestConnection}
                variant="outline"
                disabled={testConnectionMutation.isPending}
              >
                <TestTube className="w-4 h-4 mr-2" />
                {testConnectionMutation.isPending ? "Testando..." : "Testar Conexão"}
              </Button>
              <Button
                onClick={handleSaveConfig}
                className="bg-green-600 hover:bg-green-700"
                disabled={saveConfigMutation.isPending}
              >
                {saveConfigMutation.isPending ? "Salvando..." : "Salvar Configurações"}
              </Button>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              <button
                onClick={() => setActiveSection('api')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeSection === 'api'
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Key className="w-4 h-4 mr-2 inline" />
                API Configuration
              </button>
              <button
                onClick={() => setActiveSection('bot')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeSection === 'bot'
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Bot className="w-4 h-4 mr-2 inline" />
                Bot Settings
              </button>
              <button
                onClick={() => setActiveSection('messages')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeSection === 'messages'
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <MessageCircle className="w-4 h-4 mr-2 inline" />
                Message Templates
              </button>
            </nav>
          </div>

          {/* API Configuration */}
          {activeSection === 'api' && (
            <div className="p-6">
              <div className="space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-blue-900">Como obter as credenciais</h4>
                      <p className="text-sm text-blue-700 mt-1">
                        1. Acesse o Meta for Developers<br/>
                        2. Crie um app Business<br/>
                        3. Configure o WhatsApp Business API<br/>
                        4. Copie as credenciais abaixo
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="phoneNumberId">Phone Number ID</Label>
                    <Input
                      id="phoneNumberId"
                      value={apiConfig.phoneNumberId}
                      onChange={(e) => setApiConfig(prev => ({ ...prev, phoneNumberId: e.target.value }))}
                      placeholder="1234567890123456"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="businessAccountId">Business Account ID</Label>
                    <Input
                      id="businessAccountId"
                      value={apiConfig.businessAccountId}
                      onChange={(e) => setApiConfig(prev => ({ ...prev, businessAccountId: e.target.value }))}
                      placeholder="1234567890123456"
                      className="mt-1"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="accessToken">Access Token</Label>
                    <Input
                      id="accessToken"
                      type="password"
                      value={apiConfig.accessToken}
                      onChange={(e) => setApiConfig(prev => ({ ...prev, accessToken: e.target.value }))}
                      placeholder="EAAxxxxxxxxxxxxxxx"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="appId">App ID</Label>
                    <Input
                      id="appId"
                      value={apiConfig.appId}
                      onChange={(e) => setApiConfig(prev => ({ ...prev, appId: e.target.value }))}
                      placeholder="123456789012345"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="appSecret">App Secret</Label>
                    <Input
                      id="appSecret"
                      type="password"
                      value={apiConfig.appSecret}
                      onChange={(e) => setApiConfig(prev => ({ ...prev, appSecret: e.target.value }))}
                      placeholder="xxxxxxxxxxxxxxxx"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="verifyToken">Verify Token</Label>
                    <Input
                      id="verifyToken"
                      value={apiConfig.verifyToken}
                      onChange={(e) => setApiConfig(prev => ({ ...prev, verifyToken: e.target.value }))}
                      placeholder="meu_token_verificacao"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="webhookUrl">Webhook URL</Label>
                    <Input
                      id="webhookUrl"
                      value={apiConfig.webhookUrl}
                      onChange={(e) => setApiConfig(prev => ({ ...prev, webhookUrl: e.target.value }))}
                      placeholder="https://meusite.com/webhook"
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Bot Settings */}
          {activeSection === 'bot' && (
            <div className="p-6">
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="botName">Nome do Bot</Label>
                    <Input
                      id="botName"
                      value={botConfig.botName}
                      onChange={(e) => setBotConfig(prev => ({ ...prev, botName: e.target.value }))}
                      className="mt-1"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="botEnabled"
                      checked={botConfig.botEnabled}
                      onCheckedChange={(checked) => setBotConfig(prev => ({ ...prev, botEnabled: checked }))}
                    />
                    <Label htmlFor="botEnabled">Bot Ativo</Label>
                  </div>
                </div>

                <div>
                  <Label htmlFor="welcomeMessage">Mensagem de Boas-vindas</Label>
                  <Textarea
                    id="welcomeMessage"
                    value={botConfig.welcomeMessage}
                    onChange={(e) => setBotConfig(prev => ({ ...prev, welcomeMessage: e.target.value }))}
                    rows={3}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="fallbackMessage">Mensagem de Fallback</Label>
                  <Textarea
                    id="fallbackMessage"
                    value={botConfig.fallbackMessage}
                    onChange={(e) => setBotConfig(prev => ({ ...prev, fallbackMessage: e.target.value }))}
                    rows={2}
                    className="mt-1"
                  />
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-4">
                    <Switch
                      id="workingHours"
                      checked={botConfig.workingHours.enabled}
                      onCheckedChange={(checked) => setBotConfig(prev => ({ 
                        ...prev, 
                        workingHours: { ...prev.workingHours, enabled: checked }
                      }))}
                    />
                    <Label htmlFor="workingHours">Horário de Funcionamento</Label>
                  </div>
                  {botConfig.workingHours.enabled && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="startTime">Início</Label>
                        <Input
                          id="startTime"
                          type="time"
                          value={botConfig.workingHours.start}
                          onChange={(e) => setBotConfig(prev => ({ 
                            ...prev, 
                            workingHours: { ...prev.workingHours, start: e.target.value }
                          }))}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="endTime">Fim</Label>
                        <Input
                          id="endTime"
                          type="time"
                          value={botConfig.workingHours.end}
                          onChange={(e) => setBotConfig(prev => ({ 
                            ...prev, 
                            workingHours: { ...prev.workingHours, end: e.target.value }
                          }))}
                          className="mt-1"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Message Templates */}
          {activeSection === 'messages' && (
            <div className="p-6">
              <div className="space-y-6">
                <div>
                  <Label htmlFor="orderConfirmation">Confirmação de Pedido</Label>
                  <Textarea
                    id="orderConfirmation"
                    value={messageTemplates.orderConfirmation}
                    onChange={(e) => setMessageTemplates(prev => ({ ...prev, orderConfirmation: e.target.value }))}
                    rows={2}
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Variáveis: {'{orderNumber}'}, {'{total}'}
                  </p>
                </div>

                <div>
                  <Label htmlFor="shippingUpdate">Atualização de Envio</Label>
                  <Textarea
                    id="shippingUpdate"
                    value={messageTemplates.shippingUpdate}
                    onChange={(e) => setMessageTemplates(prev => ({ ...prev, shippingUpdate: e.target.value }))}
                    rows={2}
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Variáveis: {'{orderNumber}'}, {'{trackingCode}'}
                  </p>
                </div>

                <div>
                  <Label htmlFor="stockAlert">Alerta de Estoque</Label>
                  <Textarea
                    id="stockAlert"
                    value={messageTemplates.stockAlert}
                    onChange={(e) => setMessageTemplates(prev => ({ ...prev, stockAlert: e.target.value }))}
                    rows={2}
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Variáveis: {'{productName}'}
                  </p>
                </div>

                <div>
                  <Label htmlFor="priceAlert">Alerta de Preço</Label>
                  <Textarea
                    id="priceAlert"
                    value={messageTemplates.priceAlert}
                    onChange={(e) => setMessageTemplates(prev => ({ ...prev, priceAlert: e.target.value }))}
                    rows={2}
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Variáveis: {'{productName}'}, {'{discount}'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}