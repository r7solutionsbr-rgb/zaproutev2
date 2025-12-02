export const maskCNPJ = (value: string) => {
    if (!value) return "";
    const v = value.replace(/\D/g, '').slice(0, 14);
    if (v.length > 12) return `${v.slice(0, 2)}.${v.slice(2, 5)}.${v.slice(5, 8)}/${v.slice(8, 12)}-${v.slice(12)}`;
    if (v.length > 8) return `${v.slice(0, 2)}.${v.slice(2, 5)}.${v.slice(5, 8)}/${v.slice(8)}`;
    if (v.length > 5) return `${v.slice(0, 2)}.${v.slice(2, 5)}.${v.slice(5)}`;
    if (v.length > 2) return `${v.slice(0, 2)}.${v.slice(2)}`;
    return v;
};

export const maskPhone = (value: string) => {
    if (!value) return "";
    let v = value;
    if (v.startsWith("+55")) v = v.substring(3);
    v = v.replace(/\D/g, "");
    v = v.slice(0, 11);
    if (!v) return "";
    let s = "+55";
    if (v.length > 0) s += ` (${v.slice(0, 2)}`;
    if (v.length > 2) s += `) ${v.slice(2, 7)}`; // Ajuste para 9 digitos
    if (v.length > 7) s += `-${v.slice(7)}`;
    return s;
};
