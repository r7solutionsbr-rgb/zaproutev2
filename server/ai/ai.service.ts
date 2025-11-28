import { Injectable, Logger } from '@nestjs/common';
import { GoogleGenerativeAI } from "@google/generative-ai";
import axios from 'axios';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private genAI: GoogleGenerativeAI;

  constructor() {
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
    if (!this.genAI) return { action: 'UNKNOWN' };

    const modelsToTry = ['gemini-2.0-flash', 'gemini-flash-latest', 'gemini-1.5-flash'];

    for (const modelName of modelsToTry) {
        try {
            const model = this.genAI.getGenerativeModel({ model: modelName });
            
            const prompt = `
              Você é um assistente logístico chamado ZapRoute.
              Sua função é extrair a INTENÇÃO e DADOS da mensagem do motorista.

              COMANDOS E REGRAS:
              1. INICIO: Iniciar rota. (Ex: "Saindo", "Iniciando")
              2. ENTREGA: Sucesso. (Ex: "Entreguei a 1020", Foto de comprovante)
              3. FALHA: Problema. (Ex: "Fechado", "Devolução", "Não atende")
              4. PAUSA: Parada temporária. (Ex: "Vou almoçar", "Parada pra café")
              5. RETOMADA: Voltar ao trabalho. (Ex: "Voltei do almoço", "Seguindo rota")
              6. RESUMO: Pedido de status. (Ex: "O que falta?", "Resumo")
              7. ATRASO: Aviso de demora. (Ex: "Vou atrasar 10 min", "Trânsito")
              8. NAVEGACAO: Pedir rota GPS. (Ex: "Me leva na próxima", "Manda a localização", "Como chego lá?")
              9. CONTATO: Pedir telefone. (Ex: "Manda o zap do cliente", "Cliente não atende", "Qual o numero dele?")
              10. DESFAZER: Corrigir erro. (Ex: "Baixei errado", "Desfaz a última", "Não entreguei ainda")
              11. AJUDA: Pedido de ajuda.
              12. OUTRO: Conversa fiada.

              SAÍDA JSON (Sem markdown):
              {
                "action": "INICIO" | "ENTREGA" | "FALHA" | "PAUSA" | "RETOMADA" | "RESUMO" | "ATRASO" | "NAVEGACAO" | "CONTATO" | "DESFAZER" | "AJUDA" | "OUTRO",
                "identifier": "numero nota ou nome cliente (opcional para navegação/desfazer)",
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
            
            this.logger.log(`🤖 Resposta IA (${modelName}): ${responseText}`);
            
            const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
            return JSON.parse(cleanJson);

        } catch (error: any) {
            if (error.toString().includes('404') || error.status === 404) {
                continue;
            }
            this.logger.error(`Erro na IA (${modelName}):`, error);
            return { action: 'UNKNOWN' };
        }
    }
    return { action: 'UNKNOWN' };
  }
}