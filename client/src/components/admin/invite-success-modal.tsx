import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { X, Copy, Mail, Clock, CheckCircle } from "lucide-react";

interface InviteSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  inviteData: {
    email: string;
    firstName: string;
    lastName: string;
    inviteLink: string;
    expiresAt: string;
    role: string;
  } | null;
}

export function InviteSuccessModal({ isOpen, onClose, inviteData }: InviteSuccessModalProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const handleCopyLink = async () => {
    if (!inviteData?.inviteLink) return;
    
    try {
      await navigator.clipboard.writeText(inviteData.inviteLink);
      setCopied(true);
      toast({
        title: "Link copiado!",
        description: "O link de convite foi copiado para a área de transferência.",
      });
      setTimeout(() => setCopied(false), 3000);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao copiar o link.",
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

  if (!isOpen || !inviteData) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-green-700 flex items-center">
            <CheckCircle className="w-5 h-5 mr-2" />
            Usuário Criado com Sucesso!
          </h3>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
        
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h4 className="font-medium text-green-800 mb-2">Detalhes do Convite</h4>
            <div className="space-y-2 text-sm text-green-700">
              <p><strong>Nome:</strong> {inviteData.firstName} {inviteData.lastName}</p>
              <p><strong>Email:</strong> {inviteData.email}</p>
              <p><strong>Cargo:</strong> {getRoleLabel(inviteData.role)}</p>
              <p className="flex items-center">
                <Clock className="w-4 h-4 mr-1" />
                <strong>Expira em:</strong> {new Date(inviteData.expiresAt).toLocaleString('pt-BR')}
              </p>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-800 mb-2 flex items-center">
              <Mail className="w-4 h-4 mr-2" />
              Link de Ativação
            </h4>
            <p className="text-sm text-blue-700 mb-3">
              Envie este link para o usuário ativar sua conta:
            </p>
            
            <div className="flex items-center space-x-2">
              <Input
                value={inviteData.inviteLink}
                readOnly
                className="text-xs bg-white"
              />
              <Button
                onClick={handleCopyLink}
                variant="outline"
                size="sm"
                className={`${copied ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}
              >
                {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="font-medium text-yellow-800 mb-2">⚠️ Importante</h4>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>• O usuário deve clicar no link para ativar sua conta</li>
              <li>• Após ativar, ele fará login via Replit Auth</li>
              <li>• O link expira em 7 dias</li>
              <li>• Envie o link por email ou WhatsApp</li>
            </ul>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              onClick={onClose}
              className="bg-green-600 hover:bg-green-700"
            >
              Entendi
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}