import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface BusinessKnowledge {
  companyName: string;
  businessType: string;
  specialties: string[];
  commonProducts: string[];
  workingHours: string;
  policies: string[];
  promotions: string[];
}

export interface ChatContext {
  customerName?: string;
  conversationHistory: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
  }>;
  currentProducts?: any[];
  customerPreferences?: string[];
}

export class AIBotService {
  private businessKnowledge: BusinessKnowledge;

  constructor(businessKnowledge?: BusinessKnowledge) {
    this.businessKnowledge = businessKnowledge || {
      companyName: "AutoPeças Brasil",
      businessType: "Distribuidora de autopeças",
      specialties: ["Peças originais", "Peças nacionais", "Filtros", "Óleos", "Pneus", "Baterias"],
      commonProducts: ["Filtro de óleo", "Pastilha de freio", "Amortecedor", "Correia dentada", "Vela de ignição"],
      workingHours: "Segunda a Sexta: 8h às 18h, Sábado: 8h às 12h",
      policies: [
        "Garantia de 90 dias em peças nacionais",
        "Garantia de 1 ano em peças originais",
        "Entrega grátis para pedidos acima de R$ 200",
        "Troca garantida em caso de peça errada"
      ],
      promotions: [],
    };
  }

  updateBusinessKnowledge(knowledge: Partial<BusinessKnowledge>) {
    this.businessKnowledge = { ...this.businessKnowledge, ...knowledge };
  }

  private buildSystemPrompt(): string {
    return `Você é um assistente especializado em autopeças da ${this.businessKnowledge.companyName}, uma ${this.businessKnowledge.businessType}.

INFORMAÇÕES SOBRE A EMPRESA:
- Especialidades: ${this.businessKnowledge.specialties.join(", ")}
- Produtos mais comuns: ${this.businessKnowledge.commonProducts.join(", ")}
- Horário de funcionamento: ${this.businessKnowledge.workingHours}
- Políticas: ${this.businessKnowledge.policies.join(" | ")}
${this.businessKnowledge.promotions.length > 0 ? `- Promoções ativas: ${this.businessKnowledge.promotions.join(" | ")}` : ""}

INSTRUÇÕES:
1. Seja sempre cordial, profissional e prestativo
2. Use linguagem brasileira natural e acessível
3. Ajude com identificação de peças, compatibilidade, preços e pedidos
4. Sempre pergunte sobre o veículo (marca, modelo, ano) para dar recomendações precisas
5. Ofereça alternativas quando a peça procurada não estiver disponível
6. Mencione garantias e políticas quando relevante
7. Se não souber algo específico, seja honesto e ofereça transferir para um vendedor humano
8. Para pedidos, colete: peça desejada, quantidade, dados do veículo, endereço de entrega
9. Seja proativo em sugerir peças relacionadas (kit completo, por exemplo)
10. Use emojis brasileiros ocasionalmente para ser mais amigável 🚗

Responda sempre de forma útil e focada no atendimento ao cliente de autopeças.`;
  }

  async generateResponse(
    userMessage: string,
    context: ChatContext,
    availableProducts?: any[]
  ): Promise<string> {
    try {
      const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        {
          role: "system",
          content: this.buildSystemPrompt()
        }
      ];

      // Adicionar contexto de produtos disponíveis se fornecido
      if (availableProducts && availableProducts.length > 0) {
        const productsContext = `PRODUTOS DISPONÍVEIS EM ESTOQUE:
${availableProducts.map(p => `- ${p.name} (${p.brand}) - R$ ${p.price} - Estoque: ${p.stock} unidades`).join("\n")}`;
        
        messages.push({
          role: "system",
          content: productsContext
        });
      }

      // Adicionar histórico da conversa (últimas 10 mensagens para não exceder limite)
      const recentHistory = context.conversationHistory.slice(-10);
      recentHistory.forEach(msg => {
        messages.push({
          role: msg.role,
          content: msg.content
        });
      });

      // Adicionar mensagem atual do usuário
      messages.push({
        role: "user",
        content: userMessage
      });

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages,
        max_tokens: 500,
        temperature: 0.7,
        presence_penalty: 0.1,
        frequency_penalty: 0.1,
      });

      return response.choices[0].message.content || "Desculpe, não consegui processar sua mensagem. Posso transferir você para um de nossos vendedores?";
    } catch (error) {
      console.error("Erro na API OpenAI:", error);
      return "Desculpe, estou com problemas técnicos no momento. Vou transferir você para um vendedor humano que pode te ajudar melhor! 😊";
    }
  }

  async analyzeIntent(message: string): Promise<{
    intent: 'greeting' | 'product_search' | 'price_inquiry' | 'order' | 'complaint' | 'general_info' | 'transfer_request';
    confidence: number;
    extractedInfo?: {
      productName?: string;
      vehicleBrand?: string;
      vehicleModel?: string;
      vehicleYear?: string;
    };
  }> {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `Analise a intenção do cliente em uma loja de autopeças e extraia informações relevantes.

Classifique a intenção como:
- greeting: saudações, cumprimentos
- product_search: procurando peças específicas
- price_inquiry: perguntando preços
- order: quer fazer um pedido
- complaint: reclamações ou problemas
- general_info: informações gerais (horário, endereço, etc)
- transfer_request: quer falar com vendedor humano

Extraia também: nome da peça, marca/modelo/ano do veículo se mencionados.

Responda em JSON: { "intent": "...", "confidence": 0.0-1.0, "extractedInfo": {...} }`
          },
          {
            role: "user",
            content: message
          }
        ],
        response_format: { type: "json_object" },
        max_tokens: 200,
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      return {
        intent: result.intent || 'general_info',
        confidence: Math.max(0, Math.min(1, result.confidence || 0.5)),
        extractedInfo: result.extractedInfo || {}
      };
    } catch (error) {
      console.error("Erro na análise de intenção:", error);
      return {
        intent: 'general_info',
        confidence: 0.3
      };
    }
  }

  async recommendProducts(vehicleInfo: { brand: string; model: string; year: string }, products: any[]): Promise<any[]> {
    try {
      const vehicleContext = `Veículo: ${vehicleInfo.brand} ${vehicleInfo.model} ${vehicleInfo.year}`;
      const productsContext = products.map(p => 
        `${p.name} - ${p.brand} - Compatível: ${p.vehicleModel || 'Universal'} - R$ ${p.price}`
      ).join('\n');

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `Você é um especialista em autopeças. Recomende até 5 produtos mais adequados para o veículo especificado.
            
Considere:
- Compatibilidade com o veículo
- Itens de manutenção preventiva comum
- Peças que costumam ser trocadas juntas
- Produtos mais vendidos para esse tipo de veículo

Responda apenas com os nomes dos produtos recomendados, um por linha.`
          },
          {
            role: "user",
            content: `${vehicleContext}\n\nProdutos disponíveis:\n${productsContext}`
          }
        ],
        max_tokens: 300,
      });

      const recommendedNames = response.choices[0].message.content?.split('\n').filter(name => name.trim()) || [];
      
      return products.filter(product => 
        recommendedNames.some(name => 
          product.name.toLowerCase().includes(name.toLowerCase().trim()) ||
          name.toLowerCase().includes(product.name.toLowerCase())
        )
      ).slice(0, 5);
    } catch (error) {
      console.error("Erro nas recomendações:", error);
      return products.slice(0, 5); // Fallback: primeiros 5 produtos
    }
  }
}

export const aiBot = new AIBotService();