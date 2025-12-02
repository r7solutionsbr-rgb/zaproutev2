export const cleanDigits = (v: any) => v ? v.replace(/\D/g, '') : '';
export const maskCpfCnpj = (v: any) => {
    const s = cleanDigits(v);
    if (s.length <= 11) return s.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    return s.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
};
export const maskPhone = (v: any) => {
    let s = cleanDigits(v);
    if (s.startsWith('55') && s.length >= 12) s = s.substring(2);
    return s.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3').replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
};
export const maskCep = (v: any) => cleanDigits(v).replace(/(\d{5})(\d{3})/, '$1-$2');
