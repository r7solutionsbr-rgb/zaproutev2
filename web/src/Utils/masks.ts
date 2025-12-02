export const cleanDigits = (value: string) => {
    return value.replace(/\D/g, '');
};

export const maskCpfCnpj = (value: string) => {
    const v = cleanDigits(value);

    if (v.length <= 11) {
        // CPF: 000.000.000-00
        return v
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d)/, '$1.$2')
            .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    } else {
        // CNPJ: 00.000.000/0000-00
        return v
            .replace(/^(\d{2})(\d)/, '$1.$2')
            .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
            .replace(/\.(\d{3})(\d)/, '.$1/$2')
            .replace(/(\d{4})(\d)/, '$1-$2');
    }
};

export const maskPhone = (value: string) => {
    let v = cleanDigits(value);

    // Se começar com 55 e tiver 12 ou 13 dígitos, remove o 55 visualmente
    if (v.startsWith('55') && (v.length === 12 || v.length === 13)) {
        v = v.substring(2);
    }

    // (00) 00000-0000
    if (v.length > 10) {
        return v
            .replace(/^(\d\d)(\d{5})(\d{4}).*/, '($1) $2-$3');
    }
    // (00) 0000-0000
    else if (v.length > 5) {
        return v
            .replace(/^(\d\d)(\d{4})(\d{0,4}).*/, '($1) $2-$3');
    }
    // (00) ...
    else if (v.length > 2) {
        return v.replace(/^(\d\d)(\d{0,5})/, '($1) $2');
    }
    else {
        return v;
    }
};
