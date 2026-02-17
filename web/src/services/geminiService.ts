import { GoogleGenerativeAI } from '@google/generative-ai';
import { Delivery } from '../types';

// Safe initialization of the API
const getAiClient = () => {
  const apiKey = (import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_API_KEY || '').trim();
  if (!apiKey) return null;
  return new GoogleGenerativeAI(apiKey);
};

export const analyzeDriverPerformance = async (
  completedDeliveries: number,
  complaints: number,
): Promise<string> => {
  const ai = getAiClient();

  // Fallback se não houver API Key configurada
  if (!ai)
    return 'Simulação: A performance do motorista está consistente com a média da frota.';

  try {
    // Correção: Alterado de 'gemini-2.5-flash' para 'gemini-1.5-flash-001'
    const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash-001' });
    const response = await model.generateContent(
      `Analise a performance do motorista: ${completedDeliveries} entregas concluídas, ${complaints} reclamações de clientes. Forneça um feedback construtivo de 1 frase em Português.`
    );

    // Verificação de segurança antes de acessar .text()
    if (response && response.response) {
      return response.response.text();
    }

    return 'Não foi possível gerar a análise (resposta vazia).';
  } catch (e) {
    // Log opcional para debug
    console.error('Erro ao analisar performance:', e);
    return 'Não foi possível gerar a análise.';
  }
};
