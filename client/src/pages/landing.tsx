import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function Landing() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-whatsapp-bg">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center gap-6">
            <div className="w-16 h-16 bg-whatsapp rounded-full flex items-center justify-center">
              <i className="fas fa-comments text-2xl text-white"></i>
            </div>
            
            <div className="text-center">
              <h1 className="text-2xl font-bold text-text-primary mb-2">
                Sistema de Vendas WhatsApp
              </h1>
              <p className="text-text-secondary">
                Autopeças Brasil - Automação de Vendas
              </p>
            </div>

            <div className="w-full space-y-3">
              <Button 
                onClick={() => window.location.href = '/api/login'}
                className="w-full bg-whatsapp hover:bg-whatsapp-hover text-white"
              >
                <i className="fas fa-sign-in-alt mr-2"></i>
                Entrar no Sistema
              </Button>
              
              <p className="text-xs text-text-secondary text-center">
                Faça login para acessar o painel de vendas e chat
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
