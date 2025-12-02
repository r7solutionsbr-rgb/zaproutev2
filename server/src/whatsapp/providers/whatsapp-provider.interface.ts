export interface WhatsappProvider {
  sendText(to: string, message: string): Promise<void>;
  sendTemplate(to: string, template: string, variables: any[]): Promise<void>;
}
