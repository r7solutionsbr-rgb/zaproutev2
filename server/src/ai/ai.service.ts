import { Injectable, Logger } from '@nestjs/common';
import { GoogleGenerativeAI } from "@google/generative-ai";
import axios from 'axios';
import { PrismaService } from '../prisma.service';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private genAI: GoogleGenerativeAI;

  constructor(private prisma: PrismaService) {
    const apiKey = process.env.API_KEY?.trim();
    if (apiKey) {
        this.genAI = new GoogleGenerativeAI(apiKey);
    } else {
        this.logger.warn('⚠️ API_KEY do Gemini não configurada!');
    }
  }

  async interpretText(text: string): Promise<any> {
    return this.askGemini(text);
  }

  async interpretAudio(audioUrl: string): Promise<any> {
    try {
        this.logger.log(`🎧 Baixando áudio: ${audioUrl}`);
        const response = await axios.get(audioUrl, { responseType: 'arraybuffer' });
        const audioBase64 = Buffer.from(response.data).toString('base64');
        return this.askGemini("Analise este áudio do motorista.", undefined, { mimeType: "audio/ogg", data: audioBase64 });
    } catch (error) {
        this.logger.error('Erro ao processar áudio', error);
        return { action: 'UNKNOWN', error: 'Falha no download do áudio' };
    }
  }

  async interpretImage(imageUrl: string, caption: string = ''): Promise<any> {
    try {
        this.logger.log(`📷 Baixando imagem: ${imageUrl}`);
        const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
        const imageBase64 = Buffer.from(response.data).toString('base64');
        const mimeType = response.headers['content-type'] || 'image/jpeg';

        return this.askGemini(
            `Analise esta imagem (comprovante/ocorrência). Legenda: "${caption}"`, 
            undefined, 
            { mimeType, data: imageBase64 }
        );
    } catch (error) {
        this.logger.error('Erro ao processar imagem', error);
        return { action: 'UNKNOWN', error: 'Falha no download da imagem' };
    }
  }

  private async askGemini(
      context: string, 
      _unused?: string, 
      mediaData?: { mimeType: string, data: string }
  ): Promise<any> {
    if (!this.genAI) {
      this.logger.error('❌ Gemini não configurado - API_KEY ausente');
      return { action: 'UNKNOWN', error: 'Gemini não disponível' };
    }

    // 1. Buscar exemplos aprendidos no banco (Memória do Bot)
    let learningContext = '';
    try {
        const examples = await this.prisma.aiLearning.findMany({
            where: { isActive: true },
            take: 50, // Limite para não estourar tokens
            orderBy: { createdAt: 'desc' }
        });
        
        if (examples.length > 0) {
            learningContext = `
              EXEMPLOS APRENDIDOS (Use estes casos como referência absoluta):
              ${examples.map(e => `- A frase "${e.phrase}" significa intenção ${e.intent}`).join('\n')}
            `;
        }
    } catch (error) {
        this.logger.warn('Falha ao buscar aprendizado da IA (tabela existe?)', error);
    }

    const modelsToTry = ['gemini-2.0-flash', 'gemini-flash-latest', 'gemini-1.5-flash'];

    for (const modelName of modelsToTry) {
        try {
            const model = this.genAI.getGenerativeModel({ model: modelName });
            
            const prompt = `
              Você é um assistente logístico chamado ZapRoute.
              Sua função é extrair a INTENÇÃO e DADOS da mensagem do motorista.

              ${learningContext}

              COMANDOS E REGRAS:
              1. INICIO: Iniciar rota. (Ex: "Saindo", "Iniciando")
              2. ENTREGA: Sucesso. (Ex: "Entreguei a 1020", Foto de comprovante)
              3. FALHA: Problema. (Ex: "Fechado", "Devolução", "Não atende")
              4. PAUSA: Parada temporária. (Ex: "Vou almoçar", "Parada pra café", "Abastecer")
              5. RETOMADA: Voltar ao trabalho. (Ex: "Voltei do almoço", "Seguindo rota")
              6. RESUMO: Pedido de status. (Ex: "O que falta?", "Resumo", "Quantas faltam?")
              7. ATRASO: Aviso de demora. (Ex: "Vou atrasar 10 min", "Trânsito parado")
              8. NAVEGACAO: Pedir rota GPS. (Ex: "Me leva na próxima", "Manda a localização", "Como chego lá?")
              9. CONTATO: Pedir telefone. (Ex: "Manda o zap do cliente", "Cliente não atende", "Qual o numero dele?")
              10. DESFAZER: Corrigir erro. (Ex: "Baixei errado", "Desfaz a última", "Não entreguei ainda")
              11. DETALHES: Perguntar dados da nota. (Ex: "Quem é o vendedor?", "Quais os produtos?", "Qual o valor?")
              12. AJUDA: Pedido de ajuda.
              13. SAUDACAO: Cumprimentos. (Ex: "Bom dia", "Boa tarde", "Oi", "Opa")
              14. FINALIZAR: Encerrar o dia/rota manualmente. (Ex: "Terminei por hoje", "Finalizar rota", "Encerrar", "Acabei tudo")
              15. VENDEDOR: Pedir contato comercial. (Ex: "Quem vendeu essa nota?", "Preciso falar com o vendedor", "Qual o vendedor desse cliente?")
              16. SUPERVISOR: Pedir ajuda da base. (Ex: "Preciso falar com o chefe", "Me passa o numero do supervisor", "Ligar para a base", "Emergência com a gestão")
              17. LISTAR: Ver nomes dos próximos. (Ex: "Quem são os próximos?", "Lista de clientes", "Quais faltam?", "Me manda a lista")
              18. SINISTRO: Acidente ou problema grave. (Ex: "Bati o carro", "Fui roubado", "Pneu furou", "Acidente na via", "Quebrou o caminhão")
              15. OUTRO: Conversa fiada ou assuntos não relacionados à logística.

              SAÍDA JSON (Sem markdown):
              {
                "action": "INICIO" | "ENTREGA" | "FALHA" | "PAUSA" | "RETOMADA" | "RESUMO" | "ATRASO" | "NAVEGACAO" | "CONTATO" | "DESFAZER" | "DETALHES" | "AJUDA" | "SAUDACAO" | "FINALIZAR" | "VENDEDOR" | "SUPERVISOR" | "LISTAR" | "SINISTRO" | "OUTRO" | "UNKNOWN",
                "identifier": "numero nota ou nome cliente",
                "reason": "motivo, tempo de atraso ou detalhe"
              }
            `;

            const parts: any[] = [{ text: prompt }];

            if (mediaData) {
                parts.push({ inlineData: mediaData });
            }
            
            parts.push({ text: `\nContexto/Mensagem: "${context}"` });

            const result = await model.generateContent({ contents: [{ role: 'user', parts }] });
            const responseText = result.response.text();
            
            this.logger.log(`✅ IA (${modelName}): ${responseText.substring(0, 100)}...`);
            
            const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
            return JSON.parse(cleanJson);

        } catch (error: any) {
            const errorStr = error?.toString() || '';
            const status = error?.status;
            
            if (status === 403 || errorStr.includes('403')) {
                this.logger.error(`❌ IA (${modelName}): API key inválida/vazada`);
                return { action: 'UNKNOWN', error: 'API key inválida' };
            }
            
            if (status === 404 || errorStr.includes('404')) {
                this.logger.warn(`⚠️ Modelo ${modelName} não disponível, tentando próximo...`);
                continue;
            }
            
            this.logger.error(`❌ Erro na IA (${modelName}): ${error?.message || error}`);
        }
    }
    
    this.logger.error('❌ Todos os modelos falharam - retornando UNKNOWN');
    return { action: 'UNKNOWN', error: 'IA indisponível' };
  }
}