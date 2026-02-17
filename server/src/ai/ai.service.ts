import { Injectable, Logger } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';
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
      const response = await axios.get(audioUrl, {
        responseType: 'arraybuffer',
      });
      const audioBase64 = Buffer.from(response.data).toString('base64');
      return this.askGemini('Analise este áudio do motorista.', undefined, {
        mimeType: 'audio/ogg',
        data: audioBase64,
      });
    } catch (error) {
      this.logger.error('Erro ao processar áudio', error);
      return { action: 'UNKNOWN', error: 'Falha no download do áudio' };
    }
  }

  async interpretImage(imageUrl: string, caption: string = ''): Promise<any> {
    try {
      this.logger.log(`📷 Baixando imagem: ${imageUrl}`);
      const response = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
      });
      const imageBase64 = Buffer.from(response.data).toString('base64');
      const mimeType = response.headers['content-type'] || 'image/jpeg';

      return this.askGemini(
        `Analise esta imagem (comprovante/ocorrência). Legenda: "${caption}"`,
        undefined,
        { mimeType, data: imageBase64 },
      );
    } catch (error) {
      this.logger.error('Erro ao processar imagem', error);
      return { action: 'UNKNOWN', error: 'Falha no download da imagem' };
    }
  }

  async processMessage(
    driverId: string,
    text?: string,
    imageUrl?: string,
    audioUrl?: string,
  ): Promise<any> {
    if (imageUrl) {
      return this.interpretImage(imageUrl, text);
    }
    if (audioUrl) {
      return this.interpretAudio(audioUrl);
    }
    if (text) {
      return this.interpretText(text);
    }
    return { action: 'UNKNOWN', error: 'Nenhum conteúdo processável' };
  }

  private async askGemini(
    context: string,
    _unused?: string,
    mediaData?: { mimeType: string; data: string },
  ): Promise<any> {
    if (!this.genAI) {
      this.logger.error('❌ Gemini não configurado - API_KEY ausente');
      return { action: 'UNKNOWN', error: 'Gemini não disponível' };
    }

    // 1. Buscar exemplos aprendidos no banco (Memória do Bot)
    let learningContext = '';
    try {
      const examples = await (this.prisma as any).aiLearning.findMany({
        where: { isActive: true },
        take: 50, // Limite para não estourar tokens
        orderBy: { createdAt: 'desc' },
      });

      if (examples.length > 0) {
        learningContext = `
              EXEMPLOS APRENDIDOS (Use estes casos como referência absoluta):
              ${examples.map((e) => `- A frase "${e.phrase}" significa intenção ${e.intent}`).join('\n')}
            `;
      }
    } catch (error) {
      this.logger.warn(
        'Falha ao buscar aprendizado da IA (tabela existe?)',
        error,
      );
    }

    const modelsToTry = [
      'gemini-2.0-flash',
      'gemini-flash-latest',
      'gemini-1.5-flash',
    ];

    for (const modelName of modelsToTry) {
      try {
        const model = this.genAI.getGenerativeModel({ model: modelName });

        const prompt = `
              Você é um assistente logístico chamado ZapRoute.
              Sua função é extrair a INTENÇÃO e DADOS da mensagem do motorista.

              ${learningContext}

              COMANDOS E REGRAS:
              1. INICIO: Iniciar rota. Se o motorista disser o nome da rota, capture no identifier. (Ex: "Saindo", "Iniciando", "Iniciar rota Zona Sul")
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
              19. SAIR_ROTA: Sair da rota atual ou cancelar início. (Ex: "Sair da rota", "Cancelar rota", "Parei a rota", "Não vou mais fazer essa")
              20. CHEGADA: Chegou no cliente. (Ex: "Cheguei", "Estou na porta", "No local", "Cheguei no cliente X")
              21. INICIO_DESCARGA: Começou a baixar. (Ex: "Começando a baixar", "Iniciando descarga", "Vou descarregar")
              22. FIM_DESCARGA: Terminou de baixar. (Ex: "Terminei de baixar", "Descarga finalizada", "Acabei de descarregar")
              24. INICIO_JORNADA: Começar o dia de trabalho. (Ex: "Vou começar", "Bater ponto", "Iniciar jornada", "Começando o dia")
              25. INICIO_ALMOCO: Parada para refeição. (Ex: "Vou almoçar", "Parada para almoço", "Hora do rango")
              26. FIM_ALMOCO: Voltar do almoço. (Ex: "Voltei do almoço", "Acabei de almoçar", "Fim do intervalo")
              27. INICIO_DESCANSO: Parada para descanso. (Ex: "Vou descansar um pouco", "Parada para descanso", "Pausa de 15 min")
              28. FIM_DESCANSO: Voltar do descanso. (Ex: "Voltei do descanso", "Fim da pausa")
              29. INICIO_ESPERA: Tempo de espera no cliente. (Ex: "Estou na fila", "Aguardando nota", "Esperando para descarregar")
              30. FIM_ESPERA: Fim da espera. (Ex: "Sai da fila", "Acabou a espera", "Liberaram a descarga")
              31. FIM_JORNADA: Encerrar o dia de trabalho. (Ex: "Encerrar por hoje", "Fim do expediente", "Bater ponto final")

              SAÍDA JSON (Sem markdown):
              {
                "action": "INICIO" | "ENTREGA" | "FALHA" | "PAUSA" | "RETOMADA" | "RESUMO" | "ATRASO" | "NAVEGACAO" | "CONTATO" | "DESFAZER" | "DETALHES" | "AJUDA" | "SAUDACAO" | "FINALIZAR" | "VENDEDOR" | "SUPERVISOR" | "LISTAR" | "SINISTRO" | "SAIR_ROTA" | "CHEGADA" | "INICIO_DESCARGA" | "FIM_DESCARGA" | "INICIO_JORNADA" | "INICIO_ALMOCO" | "FIM_ALMOCO" | "INICIO_DESCANSO" | "FIM_DESCANSO" | "INICIO_ESPERA" | "FIM_ESPERA" | "FIM_JORNADA" | "OUTRO" | "UNKNOWN",
                "identifier": "numero nota, nome cliente ou nome da rota",
                "reason": "motivo, tempo de atraso ou detalhe"
              }
            `;

        const parts: any[] = [{ text: prompt }];

        if (mediaData) {
          parts.push({ inlineData: mediaData });
        }

        parts.push({ text: `\nContexto/Mensagem: "${context}"` });

        const result = await model.generateContent({
          contents: [{ role: 'user', parts }],
        });
        const responseText = result.response.text();

        this.logger.log(
          `✅ IA (${modelName}): ${responseText.substring(0, 100)}...`,
        );

        const cleanJson = responseText
          .replace(/```json/g, '')
          .replace(/```/g, '')
          .trim();
        return JSON.parse(cleanJson);
      } catch (error: any) {
        const errorStr = error?.toString() || '';
        const status = error?.status;

        if (status === 403 || errorStr.includes('403')) {
          this.logger.error(`❌ IA (${modelName}): API key inválida/vazada`);
          return { action: 'UNKNOWN', error: 'API key inválida' };
        }

        if (status === 404 || errorStr.includes('404')) {
          this.logger.warn(
            `⚠️ Modelo ${modelName} não disponível, tentando próximo...`,
          );
          continue;
        }

        this.logger.error(
          `❌ Erro na IA (${modelName}): ${error?.message || error}`,
        );
      }
    }

    this.logger.error('❌ Todos os modelos falharam - retornando UNKNOWN');
    return { action: 'UNKNOWN', error: 'IA indisponível' };
  }
  async analyzeDriverPerformance(
    driverName: string,
    stats: any,
  ): Promise<string> {
    if (!this.genAI) {
      return 'O cérebro do Leônidas (Gemini) não está conectado. Verifique a API Key.';
    }

    const model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = `
      Você é Leônidas, um gestor de frota experiente, justo e direto.
      Sua missão é analisar o desempenho do motorista e dar um feedback tático.

      DADOS DO MOTORISTA:
      - Nome: ${driverName}
      - Período: Últimos 30 dias
      - Total de Entregas: ${stats.totalDeliveries}
      - Taxa de Sucesso: ${stats.successRate}%
      - Ocorrências (Falhas/Devoluções): ${stats.failedCount}
      
      ÚLTIMAS OCORRÊNCIAS (Contexto):
      ${stats.recentIssues.length > 0 ? stats.recentIssues.map((i: any) => `- ${i}`).join('\n') : 'Nenhuma ocorrência recente.'}

      INSTRUÇÕES:
      1. Analise os números friamente.
      2. Aponte 1 PONTO FORTE (Elogie se merecer).
      3. Aponte 1 PONTO DE ATENÇÃO (Se houver falhas, seja firme mas educado).
      4. Dê 1 SUGESTÃO PRÁTICA para melhorar na próxima rota.
      5. Fale em primeira pessoa ("Eu notei que...", "Minha sugestão é...").
      6. Mantenha o tom profissional, motivador e de liderança.
      7. Seja breve (máximo 3 parágrafos).
      8. NÃO use markdown (negrito/itálico) em excesso, prefira texto limpo.
    `;

    try {
      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (error) {
      this.logger.error('Erro no Leônidas:', error);
      return 'Leônidas está indisponível no momento. Tente novamente mais tarde.';
    }
  }

  async chatWithLeonidas(
    message: string,
    context: string = '',
  ): Promise<string> {
    if (!this.genAI) {
      return 'Leônidas está offline (API Key ausente).';
    }

    const model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const systemPrompt = `
      Você é Leônidas, o suporte inteligente e proativo da ZapRoute.
      
      SUA PERSONA:
      - Você é um especialista em logística e operação de frotas.
      - Seu tom é prestativo, direto e profissional, mas amigável.
      - Você fala português do Brasil.
      - Você NUNCA inventa dados. Se não souber, diga que não sabe ou peça para contatar o suporte humano.

      SUA MISSÃO:
      - Ajudar motoristas e gestores com dúvidas sobre o sistema ZapRoute.
      - Resolver problemas operacionais (ex: pneu furado, cliente ausente).
      - Explicar funcionalidades (ex: como finalizar rota, como cadastrar motorista).

      CONTEXTO ATUAL (Onde o usuário está ou o que está vendo):
      ${context}

      REGRAS DE RESPOSTA:
      1. Seja breve. Respostas curtas são melhores para chat.
      2. Use emojis moderadamente para dar um tom humano 🤖.
      3. Se for uma emergência (acidente, roubo), instrua a ligar para a polícia (190) ou para o supervisor imediatamente.
    `;

    try {
      const chat = model.startChat({
        history: [
          { role: 'user', parts: [{ text: systemPrompt }] },
          {
            role: 'model',
            parts: [
              {
                text: 'Entendido. Estou pronto para atuar como Leônidas, o suporte da ZapRoute. Como posso ajudar?',
              },
            ],
          },
        ],
      });

      const result = await chat.sendMessage(message);
      return result.response.text();
    } catch (error) {
      this.logger.error('Erro no Chat Leônidas:', error);
      return 'Desculpe, tive um problema momentâneo. Tente novamente.';
    }
  }
}
