import { useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, Lock, Building } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';

// Test users for each role
const testUsers = {
  'dev@autopecas.com': { password: 'dev123', role: 'dev', name: 'Desenvolvedor Sistema' },
  'admin@autopecas.com': { password: 'admin123', role: 'administrador', name: 'Administrador Geral' },
  'gerente@autopecas.com': { password: 'gerente123', role: 'gerente', name: 'Gerente de Vendas' },
  'vendedor@autopecas.com': { password: 'vendedor123', role: 'vendedor', name: 'Vendedor' }
};

export default function TempLogin() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Check if credentials match test users
      const user = testUsers[email as keyof typeof testUsers];
      
      if (!user || user.password !== password) {
        toast({
          title: "Erro de login",
          description: "Email ou senha incorretos. Use as credenciais de demonstração.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      // Simulate login by creating a temporary session
      const response = await fetch('/api/auth/temp-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          role: user.role,
          name: user.name
        }),
      });

      if (response.ok) {
        // Invalidate auth cache to trigger re-fetch
        await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
        
        toast({
          title: "Login realizado com sucesso!",
          description: `Bem-vindo, ${user.name}`,
        });
        
        // Force a small delay to ensure the query has time to update
        setTimeout(() => {
          setLocation('/');
        }, 100);
      } else {
        throw new Error('Falha no login');
      }
    } catch (error) {
      toast({
        title: "Erro no servidor",
        description: "Tente novamente em alguns instantes.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const quickLogin = (testEmail: string) => {
    const user = testUsers[testEmail as keyof typeof testUsers];
    setEmail(testEmail);
    setPassword(user.password);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-slate-800/50 border-slate-600 backdrop-blur-sm">
        <CardHeader className="text-center pb-6">
          <div className="mx-auto mb-4 w-16 h-16 bg-slate-600 rounded-xl flex items-center justify-center">
            <svg className="w-8 h-8 text-blue-400" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C13.1 2 14 2.9 14 4V6H18C19.1 6 20 6.9 20 8V20C20 21.1 19.1 22 18 22H6C4.9 22 4 21.1 4 20V8C4 6.9 4.9 6 6 6H10V4C10 2.9 10.9 2 12 2M12 4V6H12V4M6 8V20H18V8H6M8 10H16V12H8V10M8 14H13V16H8V14Z"/>
            </svg>
          </div>
          <CardTitle className="text-2xl font-bold text-white">
            AutoPeças Brasil
          </CardTitle>
          <CardDescription className="text-slate-300">
            Sistema de Vendas WhatsApp
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-200">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400"
                  placeholder="admin@autopecas.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-200">Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400"
                  placeholder="••••••"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              disabled={isLoading}
            >
              {isLoading ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>

          <div className="mt-6 p-4 bg-slate-700/30 rounded-lg border border-slate-600">
            <h3 className="text-sm font-medium text-slate-200 mb-3">
              Usuários de teste:
            </h3>
            <div className="space-y-2 text-xs text-slate-300">
              <div className="space-y-1">
                <button
                  onClick={() => quickLogin('dev@autopecas.com')}
                  className="block w-full text-left hover:text-blue-300 transition-colors"
                >
                  <div className="font-medium">DEV: dev@autopecas.com</div>
                  <div className="text-slate-400">Senha: dev123</div>
                </button>
              </div>
              <div className="space-y-1">
                <button
                  onClick={() => quickLogin('admin@autopecas.com')}
                  className="block w-full text-left hover:text-blue-300 transition-colors"
                >
                  <div className="font-medium">ADMIN: admin@autopecas.com</div>
                  <div className="text-slate-400">Senha: admin123</div>
                </button>
              </div>
              <div className="space-y-1">
                <button
                  onClick={() => quickLogin('gerente@autopecas.com')}
                  className="block w-full text-left hover:text-blue-300 transition-colors"
                >
                  <div className="font-medium">GERENTE: gerente@autopecas.com</div>
                  <div className="text-slate-400">Senha: gerente123</div>
                </button>
              </div>
              <div className="space-y-1">
                <button
                  onClick={() => quickLogin('vendedor@autopecas.com')}
                  className="block w-full text-left hover:text-blue-300 transition-colors"
                >
                  <div className="font-medium">VENDEDOR: vendedor@autopecas.com</div>
                  <div className="text-slate-400">Senha: vendedor123</div>
                </button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}