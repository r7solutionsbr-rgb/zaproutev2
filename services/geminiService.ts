import { GoogleGenAI } from "@google/genai";
// Certifique-se de que o caminho para '../types' está correto na sua estrutura
import { Delivery } from '../types';

// Safe initialization of the API
const getAiClient = () => {
  const apiKey = process.env.API_KEY?.trim(); // Adicionado trim() por segurança
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
};

export const analyzeDriverPerformance = async (completedDeliveries: number, complaints: number): Promise<string> => {
  const ai = getAiClient();
  
  // Fallback se não houver API Key configurada
  if (!ai) return "Simulação: A performance do motorista está consistente com a média da frota.";

  try {
    // Correção: Alterado de 'gemini-2.5-flash' para 'gemini-1.5-flash-001'
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash-001',
      contents: `Analise a performance do motorista: ${completedDeliveries} entregas concluídas, ${complaints} reclamações de clientes. Forneça um feedback construtivo de 1 frase em Português.`,
    });
    
    // Verificação de segurança antes de acessar .text()
    if (response && response.response) {
        return response.response.text();
    }
    
    return "Não foi possível gerar a análise (resposta vazia).";

  } catch (e) {
    // Log opcional para debug
    console.error("Erro ao analisar performance:", e);
    return "Não foi possível gerar a análise.";
  }
}