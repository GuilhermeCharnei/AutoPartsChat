import { useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function LogoutButton() {
  const [, setLocation] = useLocation();
  const [isLogging, setIsLogging] = useState(false);
  const { toast } = useToast();

  const handleLogout = async () => {
    setIsLogging(true);
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        toast({
          title: "Logout realizado",
          description: "Você foi desconectado com sucesso.",
        });
        // Redirect to login page
        window.location.href = '/login';
      } else {
        throw new Error('Falha no logout');
      }
    } catch (error) {
      toast({
        title: "Erro no logout",
        description: "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLogging(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleLogout}
      disabled={isLogging}
      className="text-slate-300 hover:text-white hover:bg-slate-700"
    >
      <LogOut className="w-4 h-4 mr-2" />
      {isLogging ? 'Saindo...' : 'Sair'}
    </Button>
  );
}