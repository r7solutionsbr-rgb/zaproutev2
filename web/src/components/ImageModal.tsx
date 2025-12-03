import React from 'react';
import { X } from 'lucide-react';

interface ImageModalProps {
    imageUrl: string;
    title?: string;
    onClose: () => void;
}

export const ImageModal: React.FC<ImageModalProps> = ({ imageUrl, title, onClose }) => {
    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={onClose}>
            <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
            >
                <X size={24} />
            </button>

            <div className="max-w-4xl max-h-[90vh] flex flex-col items-center" onClick={e => e.stopPropagation()}>
                <img
                    src={imageUrl}
                    alt="Comprovante"
                    className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl"
                />
                {title && (
                    <p className="mt-4 text-white font-medium text-lg text-center">{title}</p>
                )}
            </div>
        </div>
    );
};
