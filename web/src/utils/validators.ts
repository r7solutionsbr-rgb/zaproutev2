export const isValidCpf = (cpf: string): boolean => {
    if (!cpf) return false;
    const clean = cpf.replace(/\D/g, '');
    return clean.length === 11;
};

export const isValidCnpj = (cnpj: string): boolean => {
    if (!cnpj) return false;
    const clean = cnpj.replace(/\D/g, '');
    return clean.length === 14;
};

export const isValidPhone = (phone: string): boolean => {
    if (!phone) return false;
    const clean = phone.replace(/\D/g, '');
    // Aceita fixo (10) e celular (11)
    return clean.length === 10 || clean.length === 11;
};

export const hasMask = (value: string): boolean => {
    if (!value) return false;
    // Retorna true se encontrar qualquer caractere que não seja número ou espaço
    // (Pontos, traços, barras, parênteses)
    return /[.\-\/()]/.test(value);
};
