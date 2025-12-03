export interface WhatsappProvider {
  sendText(to: string, message: string): Promise<void>;
  sendTemplate(to: string, template: string, variables: any[]): Promise<void>;

  // Z-API Specifics (Restored)
  sendImage(to: string, url: string, caption?: string): Promise<void>;
  sendAudio(to: string, url: string): Promise<void>;
  sendLocation(to: string, lat: number, lng: number, title?: string, address?: string): Promise<void>;
  sendLink(to: string, linkUrl: string, title?: string): Promise<void>;
}
