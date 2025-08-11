import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, Clock, AlertCircle, User } from "lucide-react";

export function InvitePage() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const [inviteStatus, setInviteStatus] = useState<'loading' | 'valid' | 'expired' | 'invalid' | 'activated'>('loading');
  const [inviteData, setInviteData] = useState<any>(null);

  // Extract token from URL
  const token = location.split('/invite/')[1];

  useEffect(() => {
    if (!token) {
      setInviteStatus('invalid');
      return;
    }

    validateInvite();
  }, [token]);

  const validateInvite = async () => {
    try {
      const response = await fetch(`/api/invite/${token}`);
      const data = await response.json();
      setInviteData(data);
      
      if (data.isExpired) {
        setInviteStatus('expired');
      } else if (data.isActivated) {
        setInviteStatus('activated');
      } else {
        setInviteStatus('valid');
      }
    } catch (error) {
      setInviteStatus('invalid');
    }
  };

  const handleAcceptInvite = async () => {
    try {
      const response = await fetch(`/api/invite/${token}/accept`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        toast({
          title: "Convite aceito!",
          description: "Sua conta foi ativada. Faça login para continuar.",
        });
        
        // Redirect to login
        window.location.href = '/api/login';
      } else {
        throw new Error('Failed to accept invite');
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao aceitar o convite. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'dev': return 'Desenvolvedor';
      case 'administrador': return 'Administrador';
      case 'gerente': return 'Gerente';
      case 'vendedor': return 'Vendedor';
      default: return role;
    }
  };

  if (inviteStatus === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Verificando convite...</p>
        </div>
      </div>
    );
  }

  if (inviteStatus === 'invalid') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Convite Inválido</h1>
          <p className="text-gray-600 mb-6">
            O link de convite que você acessou não é válido ou não existe.
          </p>
          <Button 
            onClick={() => setLocation('/')}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Voltar ao Início
          </Button>
        </div>
      </div>
    );
  }

  if (inviteStatus === 'expired') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <Clock className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Convite Expirado</h1>
          <p className="text-gray-600 mb-6">
            Este convite expirou. Entre em contato com o administrador para receber um novo convite.
          </p>
          <Button 
            onClick={() => setLocation('/')}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Voltar ao Início
          </Button>
        </div>
      </div>
    );
  }

  if (inviteStatus === 'activated') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Conta Já Ativada</h1>
          <p className="text-gray-600 mb-6">
            Esta conta já foi ativada. Faça login para acessar o sistema.
          </p>
          <Button 
            onClick={() => window.location.href = '/api/login'}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Fazer Login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
        <div className="text-center mb-6">
          <User className="w-16 h-16 text-blue-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Bem-vindo!</h1>
          <p className="text-gray-600">
            Você foi convidado para participar do sistema de vendas WhatsApp.
          </p>
        </div>

        {inviteData && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="font-medium text-blue-800 mb-2">Detalhes do Convite</h3>
            <div className="space-y-1 text-sm text-blue-700">
              <p><strong>Nome:</strong> {inviteData.firstName} {inviteData.lastName}</p>
              <p><strong>Email:</strong> {inviteData.email}</p>
              <p><strong>Cargo:</strong> {getRoleLabel(inviteData.role)}</p>
              <p><strong>Expira em:</strong> {new Date(inviteData.inviteExpiresAt).toLocaleString('pt-BR')}</p>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <Button 
            onClick={handleAcceptInvite}
            className="w-full bg-green-600 hover:bg-green-700"
          >
            Aceitar Convite e Ativar Conta
          </Button>
          
          <Button 
            onClick={() => setLocation('/')}
            variant="outline"
            className="w-full"
          >
            Cancelar
          </Button>
        </div>

        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            <strong>Importante:</strong> Após aceitar o convite, você fará login usando sua conta Replit.
          </p>
        </div>
      </div>
    </div>
  );
}