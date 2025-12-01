import axios from 'axios';

export interface BrasilApiCnpjResponse {
    cnpj: string;
    razao_social: string;
    nome_fantasia: string;
    ddd_telefone_1: string;
    logradouro: string;
    numero: string;
    bairro: string;
    municipio: string;
    uf: string;
    cep: string;
    complemento: string;
}

export const cnpjService = {
    search: async (cnpj: string): Promise<BrasilApiCnpjResponse> => {
        // Remove caracteres não numéricos
        const cleanCnpj = cnpj.replace(/\D/g, '');

        if (cleanCnpj.length !== 14) {
            throw new Error('CNPJ inválido. Deve conter 14 dígitos.');
        }

        try {
            const response = await axios.get(`https://brasilapi.com.br/api/cnpj/v1/${cleanCnpj}`);
            return response.data;
        } catch (error: any) {
            if (error.response?.status === 404) {
                throw new Error('CNPJ não encontrado.');
            }
            if (error.response?.status === 429) {
                throw new Error('Muitas requisições. Tente novamente em instantes.');
            }
            throw new Error('Erro ao consultar CNPJ. Verifique a conexão.');
        }
    }
};
