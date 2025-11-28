/**
 * Remove caracteres não numéricos de um telefone para salvar no banco.
 * Ex: "+55 (11) 99999-8888" -> "5511999998888"
 */
export function toStorageFormatPhone(phone: string | null | undefined): string {
  if (!phone) return '';
  return phone.replace(/\D/g, '');
}