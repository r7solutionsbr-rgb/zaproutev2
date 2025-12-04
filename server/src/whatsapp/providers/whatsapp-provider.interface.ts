export interface WhatsappProvider {
  sendText(to: string, message: string): Promise<void>;

  // Embora a Z-API não use templates oficiais do mesmo jeito que a API Cloud,
  // mantemos o método para compatibilidade futura ou fallback
  sendTemplate(to: string, template: string, variables: any[]): Promise<void>;

  // Métodos específicos de mídia e localização
  sendImage(to: string, url: string, caption?: string): Promise<void>;
  sendAudio(to: string, url: string): Promise<void>;
  sendLocation(to: string, lat: number, lng: number, title?: string, address?: string): Promise<void>;
  sendLink(to: string, linkUrl: string, title?: string): Promise<void>;

  // --- NOVO MÉTODO (Adicionado para corrigir o erro no ZapiProvider) ---
  sendButtons(to: string, title: string, footer: string, buttons: { id: string, label: string }[]): Promise<void>;
}