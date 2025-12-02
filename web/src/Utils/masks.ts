export const cleanDigits = (value: string | undefined | null): string => {
    if (!value) return '';
    return value.replace(/\D/g, '');
};

export const maskCpfCnpj = (value: string | undefined | null): string => {
    const v = cleanDigits(value);
    if (!v) return '';
    if (v.length <= 11) {
        return v.replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d{1,2})/, '$1-$2')
            .replace(/(-\d{2})\d+?$/, '$1');
    } else {
        return v.replace(/(\d{2})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d)/, '$1/$2')
            .replace(/(\d{4})(\d)/, '$1-$2')
            .replace(/(-\d{2})\d+?$/, '$1');
    }
};

export const maskPhone = (value: string | undefined | null): string => {
    let v = cleanDigits(value);
    if (!v) return '';
    // Remove 55 visualmente se for longo
    if (v.startsWith('55') && v.length >= 12) v = v.substring(2);

    if (v.length > 10) { // Celular
        return v.replace(/(\d{2})(\d)/, '($1) $2')
            .replace(/(\d{5})(\d)/, '$1-$2').replace(/(-\d{4})\d+?$/, '$1');
    }
    // Fixo
    return v.replace(/(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{4})(\d)/, '$1-$2').replace(/(-\d{4})\d+?$/, '$1');
};

export const maskCep = (value: string | undefined | null): string => {
    const v = cleanDigits(value);
    if (!v) return '';
    return v.replace(/(\d{5})(\d)/, '$1-$2').replace(/(-\d{3})\d+?$/, '$1');
};
