import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bot, MessageSquare, Package, Clock, TestTube, Settings, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface BotSettings {
  id?: number;
  welcomeMessage: string;
  paymentMethods: string[];
  businessHours: {
    monday: { open: string; close: string; };
    tuesday: { open: string; close: string; };
    wednesday: { open: string; close: string; };
    thursday: { open: string; close: string; };
    friday: { open: string; close: string; };
    saturday: { open: string; close: string; };
    sunday: { open: string; close: string; };
  };
  companyInfo: {
    name: string;
    address: string;
    phone: string;
    email: string;
  };
  isActive?: boolean;
}

export function BotTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [testMessage, setTestMessage] = useState('Olá! Preciso de ajuda com filtros de óleo.');
  const [testResponse, setTestResponse] = useState('');
  const [isTestingBot, setIsTestingBot] = useState(false);

  const { data: botSettings, isLoading } = useQuery<BotSettings>({
    queryKey: ['/api/bot/settings'],
  });

  const { data: inventory } = useQuery({
    queryKey: ['/api/bot/inventory'],
  });

  const updateBotMutation = useMutation({
    mutationFn: (settings: Partial<BotSettings>) => apiRequest('/api/bot/settings', 'POST', settings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bot/settings'] });
      toast({
        title: "Configurações salvas",
        description: "As configurações do bot foram atualizadas com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao salvar",
        description: error.message || "Não foi possível salvar as configurações.",
        variant: "destructive",
      });
    },
  });

  const testBotMutation = useMutation({
    mutationFn: (message: string) => apiRequest('/api/bot/chat', 'POST', { message }),
    onSuccess: (response: any) => {
      setTestResponse(response.message || 'Resposta do bot não disponível');
      setIsTestingBot(false);
    },
    onError: (error: any) => {
      toast({
        title: "Erro no teste",
        description: error.message || "Não foi possível testar o bot.",
        variant: "destructive",
      });
      setIsTestingBot(false);
    },
  });

  const [formData, setFormData] = useState<BotSettings>({
    welcomeMessage: '',
    paymentMethods: [],
    businessHours: {
      monday: { open: '08:00', close: '18:00' },
      tuesday: { open: '08:00', close: '18:00' },
      wednesday: { open: '08:00', close: '18:00' },
      thursday: { open: '08:00', close: '18:00' },
      friday: { open: '08:00', close: '18:00' },
      saturday: { open: '08:00', close: '16:00' },
      sunday: { open: 'closed', close: 'closed' }
    },
    companyInfo: {
      name: '',
      address: '',
      phone: '',
      email: ''
    }
  });

  React.useEffect(() => {
    if (botSettings) {
      setFormData(botSettings);
    }
  }, [botSettings]);

  const handleSaveSettings = () => {
    updateBotMutation.mutate(formData);
  };

  const handleTestBot = () => {
    if (!testMessage.trim()) return;
    setIsTestingBot(true);
    testBotMutation.mutate(testMessage);
  };

  const paymentMethodOptions = [
    { key: 'PIX', label: 'PIX' },
    { key: 'Cartão de Crédito', label: 'Cartão de Crédito' },
    { key: 'Cartão de Débito', label: 'Cartão de Débito' },
    { key: 'Dinheiro', label: 'Dinheiro' },
    { key: 'Transferência', label: 'Transferência Bancária' },
    { key: 'Boleto', label: 'Boleto' }
  ];

  const togglePaymentMethod = (method: string) => {
    const currentMethods = formData.paymentMethods || [];
    if (currentMethods.includes(method)) {
      setFormData({
        ...formData,
        paymentMethods: currentMethods.filter(m => m !== method)
      });
    } else {
      setFormData({
        ...formData,
        paymentMethods: [...currentMethods, method]
      });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center p-8">
          <div className="text-gray-500">Carregando configurações do bot...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Bot Status Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status do Bot</CardTitle>
            <Bot className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Badge className="bg-green-500">Ativo</Badge>
              <span className="text-sm text-gray-500">Online e funcionando</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Produtos no Estoque</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Array.isArray(inventory) ? inventory.length : 0}</div>
            <p className="text-xs text-muted-foreground">
              produtos disponíveis para consulta
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Última Atualização</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">Agora</div>
            <p className="text-xs text-muted-foreground">
              sincronização em tempo real
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="settings" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="settings">
            <Settings className="h-4 w-4 mr-2" />
            Configurações
          </TabsTrigger>
          <TabsTrigger value="test">
            <TestTube className="h-4 w-4 mr-2" />
            Testar Bot
          </TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="space-y-6">
          {/* Welcome Message */}
          <Card>
            <CardHeader>
              <CardTitle>Mensagem de Boas-vindas</CardTitle>
              <CardDescription>
                Esta mensagem será enviada quando um novo cliente iniciar uma conversa
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={formData.welcomeMessage}
                onChange={(e) => setFormData({ ...formData, welcomeMessage: e.target.value })}
                placeholder="Digite a mensagem de boas-vindas..."
                rows={4}
                className="resize-none"
              />
            </CardContent>
          </Card>

          {/* Payment Methods */}
          <Card>
            <CardHeader>
              <CardTitle>Formas de Pagamento Aceitas</CardTitle>
              <CardDescription>
                Selecione as formas de pagamento que sua loja aceita
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {paymentMethodOptions.map((option) => (
                  <div key={option.key} className="flex items-center space-x-2">
                    <Switch
                      checked={formData.paymentMethods?.includes(option.key) || false}
                      onCheckedChange={() => togglePaymentMethod(option.key)}
                    />
                    <Label>{option.label}</Label>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Business Hours */}
          <Card>
            <CardHeader>
              <CardTitle>Horário de Funcionamento</CardTitle>
              <CardDescription>
                Configure os horários de atendimento da sua loja
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(formData.businessHours).map(([day, hours]) => {
                  const dayNames: Record<string, string> = {
                    monday: 'Segunda-feira',
                    tuesday: 'Terça-feira',
                    wednesday: 'Quarta-feira',
                    thursday: 'Quinta-feira',
                    friday: 'Sexta-feira',
                    saturday: 'Sábado',
                    sunday: 'Domingo'
                  };

                  return (
                    <div key={day} className="flex items-center space-x-4">
                      <Label className="w-28">{dayNames[day]}</Label>
                      <Input
                        type="time"
                        value={hours.open}
                        onChange={(e) => setFormData({
                          ...formData,
                          businessHours: {
                            ...formData.businessHours,
                            [day]: { ...hours, open: e.target.value }
                          }
                        })}
                        className="w-32"
                        disabled={hours.open === 'closed'}
                      />
                      <span>às</span>
                      <Input
                        type="time"
                        value={hours.close}
                        onChange={(e) => setFormData({
                          ...formData,
                          businessHours: {
                            ...formData.businessHours,
                            [day]: { ...hours, close: e.target.value }
                          }
                        })}
                        className="w-32"
                        disabled={hours.close === 'closed'}
                      />
                      <Switch
                        checked={hours.open !== 'closed'}
                        onCheckedChange={(checked) => setFormData({
                          ...formData,
                          businessHours: {
                            ...formData.businessHours,
                            [day]: checked 
                              ? { open: '08:00', close: '18:00' }
                              : { open: 'closed', close: 'closed' }
                          }
                        })}
                      />
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Company Info */}
          <Card>
            <CardHeader>
              <CardTitle>Informações da Empresa</CardTitle>
              <CardDescription>
                Dados da empresa que o bot pode fornecer aos clientes
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="company-name">Nome da Empresa</Label>
                  <Input
                    id="company-name"
                    value={formData.companyInfo.name}
                    onChange={(e) => setFormData({
                      ...formData,
                      companyInfo: { ...formData.companyInfo, name: e.target.value }
                    })}
                    placeholder="AutoPeças Brasil"
                  />
                </div>
                <div>
                  <Label htmlFor="company-phone">Telefone</Label>
                  <Input
                    id="company-phone"
                    value={formData.companyInfo.phone}
                    onChange={(e) => setFormData({
                      ...formData,
                      companyInfo: { ...formData.companyInfo, phone: e.target.value }
                    })}
                    placeholder="(11) 99999-9999"
                  />
                </div>
                <div>
                  <Label htmlFor="company-email">Email</Label>
                  <Input
                    id="company-email"
                    type="email"
                    value={formData.companyInfo.email}
                    onChange={(e) => setFormData({
                      ...formData,
                      companyInfo: { ...formData.companyInfo, email: e.target.value }
                    })}
                    placeholder="contato@autopecasbrasil.com"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="company-address">Endereço</Label>
                <Input
                  id="company-address"
                  value={formData.companyInfo.address}
                  onChange={(e) => setFormData({
                    ...formData,
                    companyInfo: { ...formData.companyInfo, address: e.target.value }
                  })}
                  placeholder="Rua das Peças, 123 - Centro"
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button 
              onClick={handleSaveSettings}
              disabled={updateBotMutation.isPending}
            >
              <Save className="h-4 w-4 mr-2" />
              {updateBotMutation.isPending ? 'Salvando...' : 'Salvar Configurações'}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="test" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Testar Bot de Atendimento</CardTitle>
              <CardDescription>
                Digite uma mensagem para testar como o bot responderia a um cliente
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="test-message">Mensagem do Cliente</Label>
                <Textarea
                  id="test-message"
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  placeholder="Digite aqui uma mensagem como se fosse um cliente..."
                  rows={3}
                />
              </div>
              
              <Button 
                onClick={handleTestBot}
                disabled={isTestingBot || !testMessage.trim()}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                {isTestingBot ? 'Testando...' : 'Enviar Teste'}
              </Button>

              {testResponse && (
                <div className="mt-4 p-4 border rounded-lg bg-gray-50">
                  <Label className="text-sm font-medium">Resposta do Bot:</Label>
                  <div className="mt-2 text-sm whitespace-pre-wrap">
                    {testResponse}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Bot Knowledge Display */}
          <Card>
            <CardHeader>
              <CardTitle>Conhecimento do Bot</CardTitle>
              <CardDescription>
                O bot tem acesso às seguintes informações em tempo real
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">✅ Informações Disponíveis</Label>
                  <ul className="text-sm text-gray-600 mt-2 space-y-1">
                    <li>• Todo o inventário de produtos</li>
                    <li>• Preços atualizados</li>
                    <li>• Estoque em tempo real</li>
                    <li>• Códigos e descrições</li>
                    <li>• Aplicações de veículos</li>
                    <li>• Formas de pagamento</li>
                    <li>• Horário de funcionamento</li>
                  </ul>
                </div>
                <div>
                  <Label className="text-sm font-medium">🤖 Capacidades do Bot</Label>
                  <ul className="text-sm text-gray-600 mt-2 space-y-1">
                    <li>• Consulta de produtos por código</li>
                    <li>• Busca por categoria/tipo</li>
                    <li>• Informações de preço e estoque</li>
                    <li>• Orientação para pedidos</li>
                    <li>• Informações de pagamento</li>
                    <li>• Horários de atendimento</li>
                    <li>• Transferência para vendedor</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}