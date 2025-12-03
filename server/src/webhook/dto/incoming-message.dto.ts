
export enum MessageType {
    TEXT = 'TEXT',
    IMAGE = 'IMAGE',
    AUDIO = 'AUDIO',
    LOCATION = 'LOCATION',
    UNKNOWN = 'UNKNOWN'
}

export class IncomingMessage {
    provider: 'ZAPI' | 'SENDPULSE';
    rawPhone: string;
    type: MessageType;
    payload: {
        text?: string;
        url?: string;
        caption?: string;
        latitude?: number;
        longitude?: number;
    };
    metadata?: any;
}
