import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Bot, Loader2, Minimize2, Maximize2 } from 'lucide-react';
import { api } from '../services/api';

interface Message {
    id: string;
    text: string;
    sender: 'user' | 'bot';
    timestamp: Date;
}

export const AiChatWidget: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        {
            id: 'welcome',
            text: 'Olá! Sou Leônidas, seu assistente virtual. Como posso ajudar você hoje?',
            sender: 'bot',
            timestamp: new Date()
        }
    ]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        if (isOpen && !isMinimized) {
            scrollToBottom();
        }
    }, [messages, isOpen, isMinimized]);

    const handleSendMessage = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!inputValue.trim() || isLoading) return;

        const userMsg: Message = {
            id: Date.now().toString(),
            text: inputValue,
            sender: 'user',
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMsg]);
        setInputValue('');
        setIsLoading(true);

        try {
            // Captura o contexto da página atual (URL e Título)
            const context = `Página atual: ${window.location.hash} - ${document.title}`;

            const response = await api.ai.chat(userMsg.text, context);

            const botMsg: Message = {
                id: (Date.now() + 1).toString(),
                text: response.response,
                sender: 'bot',
                timestamp: new Date()
            };
            setMessages(prev => [...prev, botMsg]);
        } catch (error) {
            const errorMsg: Message = {
                id: (Date.now() + 1).toString(),
                text: 'Desculpe, estou com dificuldades de conexão. Tente novamente.',
                sender: 'bot',
                timestamp: new Date()
            };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 group flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-full shadow-lg shadow-blue-600/30 hover:shadow-blue-600/50 transform hover:-translate-y-1 transition-all duration-300 z-50 animate-in fade-in slide-in-from-bottom-4"
                title="Falar com Leônidas"
            >
                <div className="relative">
                    <Bot size={24} className="animate-pulse-slow" />
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-400 border-2 border-blue-600 rounded-full"></span>
                </div>
                <span className="font-bold text-sm hidden md:block">Leônidas</span>
            </button>
        );
    }

    return (
        <div className={`fixed bottom-6 right-6 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-50 transition-all duration-300 flex flex-col animate-in zoom-in-95 fade-in duration-200 ${isMinimized ? 'w-72 h-16' : 'w-80 md:w-[400px] h-[600px] max-h-[85vh]'}`}>
            {/* Header Premium */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 flex items-center justify-between text-white shrink-0 cursor-pointer shadow-md relative overflow-hidden" onClick={() => setIsMinimized(!isMinimized)}>
                {/* Efeito de brilho no fundo */}
                <div className="absolute top-0 left-0 w-full h-full bg-white/5 opacity-50 pointer-events-none"></div>

                <div className="flex items-center gap-3 relative z-10">
                    <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-md border border-white/30 shadow-inner">
                        <Bot size={20} className="text-white drop-shadow-sm" />
                    </div>
                    <div>
                        <h3 className="font-bold text-base leading-tight">Leônidas</h3>
                        <p className="text-xs text-blue-100 font-medium opacity-90">Seu copiloto logístico</p>
                    </div>
                </div>
                <div className="flex items-center gap-1 relative z-10">
                    <button onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized); }} className="p-1.5 hover:bg-white/20 rounded-full transition-colors text-white/90 hover:text-white">
                        {isMinimized ? <Maximize2 size={18} /> : <Minimize2 size={18} />}
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); setIsOpen(false); }} className="p-1.5 hover:bg-white/20 rounded-full transition-colors text-white/90 hover:text-white">
                        <X size={18} />
                    </button>
                </div>
            </div>

            {/* Body */}
            {!isMinimized && (
                <>
                    <div className="flex-1 overflow-y-auto p-4 bg-slate-50 space-y-6 custom-scrollbar">
                        {messages.map((msg) => (
                            <div key={msg.id} className={`flex w-full ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`flex max-w-[85%] ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'} gap-2 items-end`}>
                                    {/* Avatar do Bot (apenas se for bot) */}
                                    {msg.sender === 'bot' && (
                                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0 shadow-sm mb-1">
                                            <Bot size={12} className="text-white" />
                                        </div>
                                    )}

                                    <div className={`p-3.5 text-sm shadow-sm relative group transition-all duration-200 hover:shadow-md ${msg.sender === 'user'
                                            ? 'bg-blue-600 text-white rounded-2xl rounded-br-none'
                                            : 'bg-white text-slate-700 border border-slate-200/60 rounded-2xl rounded-bl-none'
                                        }`}>
                                        <p className="leading-relaxed">{msg.text}</p>
                                        <span className={`text-[10px] block mt-1.5 text-right font-medium opacity-70 ${msg.sender === 'user' ? 'text-blue-100' : 'text-slate-400'}`}>
                                            {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {/* Loading Animation (Typing) */}
                        {isLoading && (
                            <div className="flex justify-start w-full animate-in fade-in slide-in-from-left-2 duration-300">
                                <div className="flex items-end gap-2">
                                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0 shadow-sm mb-1">
                                        <Bot size={12} className="text-white" />
                                    </div>
                                    <div className="bg-white p-4 rounded-2xl rounded-bl-none border border-slate-200/60 shadow-sm flex items-center gap-1.5">
                                        <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                        <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                        <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce"></span>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Footer (Input) */}
                    <div className="p-3 bg-white border-t border-slate-100">
                        <form onSubmit={handleSendMessage} className="flex items-center gap-2 bg-slate-100 rounded-full px-2 py-2 border border-transparent focus-within:border-blue-300 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-50 transition-all duration-200">
                            <input
                                type="text"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                placeholder="Digite sua dúvida..."
                                className="flex-1 bg-transparent border-0 px-3 text-sm text-slate-700 placeholder:text-slate-400 focus:ring-0 outline-none"
                            />
                            <button
                                type="submit"
                                disabled={!inputValue.trim() || isLoading}
                                className="w-9 h-9 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm flex items-center justify-center hover:scale-105 active:scale-95"
                            >
                                {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} className="ml-0.5" />}
                            </button>
                        </form>
                        <div className="text-center mt-2">
                            <p className="text-[10px] text-slate-400 font-medium">IA pode cometer erros. Verifique informações importantes.</p>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};
