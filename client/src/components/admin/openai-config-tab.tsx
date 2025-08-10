import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Sparkles, AlertTriangle, CheckCircle } from "lucide-react";

export function OpenAIConfigTab() {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);

  const { data: config, isLoading } = useQuery({
    queryKey: ['/api/admin/openai-config'],
  });

  const updateConfigMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('/api/admin/openai-config', 'PUT', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/openai-config'] });
      setIsEditing(false);
      toast({
        title: "Configuração atualizada",
        description: "As configurações da OpenAI foram salvas com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Falha ao atualizar configurações da OpenAI",
        variant: "destructive",
      });
    },
  });

  const testConfigMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('/api/chat/ai-test', 'POST', {
        message: 'Teste de conexão com a OpenAI API',
        botConfig: config
      });
    },
    onSuccess: (data: any) => {
      toast({
        title: "Teste de API concluído",
        description: `Resposta: ${data.response?.substring(0, 100) || 'Teste realizado com sucesso'}...`,
      });
    },
    onError: () => {
      toast({
        title: "Erro no teste",
        description: "Falha ao testar a API da OpenAI. Verifique sua chave API.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const configData = {
      apiKey: formData.get('apiKey'),
      model: formData.get('model'),
      maxTokens: parseInt(formData.get('maxTokens') as string),
      temperature: parseFloat(formData.get('temperature') as string),
      systemPrompt: formData.get('systemPrompt'),
      isActive: formData.get('isActive') === 'true',
    };

    updateConfigMutation.mutate(configData);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Sparkles className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p>Carregando configurações...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-medium text-gray-900">Configuração OpenAI API</h3>
        <div className="flex gap-2">
          <Button
            onClick={() => testConfigMutation.mutate()}
            disabled={testConfigMutation.isPending || !(config as any)?.isActive}
            variant="outline"
            size="sm"
          >
            {testConfigMutation.isPending ? "Testando..." : "Testar API"}
          </Button>
          <Button
            onClick={() => setIsEditing(!isEditing)}
            variant={isEditing ? "outline" : "default"}
            size="sm"
            className="bg-green-600 hover:bg-green-700"
          >
            {isEditing ? "Cancelar" : "Editar"}
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow border">
        <div className="px-6 py-4 border-b">
          <h4 className="text-lg font-medium text-gray-900">Configurações da API</h4>
          <p className="text-sm text-gray-500 mt-1">Configure sua chave API da OpenAI e parâmetros do modelo</p>
        </div>
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="apiKey">Chave da API OpenAI</Label>
                <Input
                  id="apiKey"
                  name="apiKey"
                  type="password"
                  defaultValue={(config as any)?.apiKey || ''}
                  placeholder="sk-..."
                  disabled={!isEditing}
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  Sua chave API será criptografada e mantida segura
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="model">Modelo</Label>
                <Select name="model" defaultValue={(config as any)?.model || 'gpt-4o'} disabled={!isEditing}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um modelo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gpt-4o">GPT-4o (Recomendado)</SelectItem>
                    <SelectItem value="gpt-4">GPT-4</SelectItem>
                    <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxTokens">Máximo de Tokens</Label>
                <Input
                  id="maxTokens"
                  name="maxTokens"
                  type="number"
                  min="100"
                  max="4000"
                  defaultValue={(config as any)?.maxTokens || 1000}
                  disabled={!isEditing}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="temperature">Temperatura</Label>
                <Input
                  id="temperature"
                  name="temperature"
                  type="number"
                  min="0"
                  max="2"
                  step="0.1"
                  defaultValue={(config as any)?.temperature || 0.7}
                  disabled={!isEditing}
                />
                <p className="text-xs text-muted-foreground">
                  0 = mais focado, 2 = mais criativo
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="systemPrompt">Prompt do Sistema</Label>
              <Textarea
                id="systemPrompt"
                name="systemPrompt"
                rows={4}
                defaultValue={(config as any)?.systemPrompt || 'Você é um assistente especializado em autopeças.'}
                placeholder="Define como a IA deve se comportar..."
                disabled={!isEditing}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Switch
                  id="isActive"
                  name="isActive"
                  defaultChecked={(config as any)?.isActive || false}
                  disabled={!isEditing}
                />
                <input type="hidden" name="isActive" value={(config as any)?.isActive ? 'true' : 'false'} />
                <Label htmlFor="isActive">API Ativa</Label>
              </div>

              {isEditing && (
                <Button type="submit" disabled={updateConfigMutation.isPending}>
                  {updateConfigMutation.isPending ? "Salvando..." : "Salvar Configurações"}
                </Button>
              )}
            </div>
          </form>
        </div>
      </div>

      {/* Status Card */}
      <div className={`mt-6 rounded-lg border p-4 ${
        (config as any)?.isActive 
          ? 'border-green-200 bg-green-50' 
          : 'border-orange-200 bg-orange-50'
      }`}>
        <div className="flex items-center gap-2">
          {(config as any)?.isActive ? (
            <CheckCircle className="h-5 w-5 text-green-600" />
          ) : (
            <AlertTriangle className="h-5 w-5 text-orange-600" />
          )}
          <span className={
            (config as any)?.isActive 
              ? 'text-green-800' 
              : 'text-orange-800'
          }>
            {(config as any)?.isActive 
              ? 'API da OpenAI está ativa e configurada'
              : 'API da OpenAI está inativa'
            }
          </span>
        </div>
      </div>
    </div>
  );
}