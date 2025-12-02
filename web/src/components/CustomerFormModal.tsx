import React, { useState } from 'react';
import { X, FileText, MapPin, Phone, AlertCircle, Loader2, Search } from 'lucide-react';
import { cnpjService } from '../services/cnpj';

interface CustomerFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    mode: 'CREATE' | 'EDIT';
    data: any;
    setData: React.Dispatch<React.SetStateAction<any>>;
    onSave: (e: React.FormEvent) => void;
    isLoading: boolean;
    formError: string;
    maskCNPJ: (value: string) => string;
    maskPhone: (value: string) => string;
    handleAddressChange: (field: string, value: string) => void;
    handleLocationChange: (field: 'lat' | 'lng', value: string) => void;
}

export const CustomerFormModal: React.FC<CustomerFormModalProps> = ({
    isOpen,
    onClose,
    mode,
    data,
    setData,
    onSave,
    isLoading,
    formError,
    maskCNPJ,
    maskPhone,
    handleAddressChange
}) => {
    const [activeTab, setActiveTab] = useState<'DATA' | 'ADDRESS' | 'CONTACT'>('DATA');
    const [loadingCep, setLoadingCep] = useState(false);
    const [loadingCnpj, setLoadingCnpj] = useState(false);
    const [localError, setLocalError] = useState('');

    if (!isOpen) return null;

    const handleCnpjSearch = async () => {
        setLocalError('');
        if (!data.cnpj || data.cnpj.length < 14) {
            setLocalError('Digite um CNPJ válido para buscar.');
            return;
        }

        setLoadingCnpj(true);
        try {
            const res = await cnpjService.search(data.cnpj);
            setData((prev: any) => ({
                ...prev,
                legalName: res.razao_social,
                tradeName: res.nome_fantasia || res.razao_social,
                phone: maskPhone(res.ddd_telefone_1),
                addressDetails: {
                    ...prev.addressDetails,
                    street: res.logradouro,
                    number: res.numero,
                    neighborhood: res.bairro,
                    city: res.municipio,
                    state: res.uf,
                    zipCode: res.cep
                }
            }));
        } catch (error: any) {
            setLocalError(error.message);
        } finally {
            setLoadingCnpj(false);
        }
    };

    const handleCepSearch = async () => {
        const cep = data.addressDetails?.zipCode?.replace(/\D/g, '');
        if (!cep || cep.length !== 8) return;

        setLoadingCep(true);
        try {
            const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
            const addressData = await response.json();

            if (!addressData.erro) {
                setData((prev: any) => ({
                    ...prev,
                    addressDetails: {
                        ...prev.addressDetails,
                        street: addressData.logradouro,
                        neighborhood: addressData.bairro,
                        city: addressData.localidade,
                        state: addressData.uf,
                        zipCode: addressData.cep
                    }
                }));
            }
        } catch (error) {
            console.error("Erro ao buscar CEP", error);
        } finally {
            setLoadingCep(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* HEADER */}
                <div className="flex justify-between items-center p-4 border-b bg-slate-50">
                    <h2 className="text-lg font-bold text-slate-800">{mode === 'CREATE' ? 'Novo Cliente' : 'Editar Cliente'}</h2>
                    <button onClick={onClose}><X size={24} className="text-slate-400 hover:text-slate-600" /></button>
                </div>

                {/* TABS */}
                <div className="flex border-b border-slate-200 bg-white px-4 pt-2 gap-4">
                    <button
                        type="button"
                        onClick={() => setActiveTab('DATA')}
                        className={`pb-2 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'DATA' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                        <FileText size={16} /> Dados Cadastrais
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('ADDRESS')}
                        className={`pb-2 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'ADDRESS' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                        <MapPin size={16} /> Endereço
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('CONTACT')}
                        className={`pb-2 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'CONTACT' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                        <Phone size={16} /> Contato & Vendas
                    </button>
                </div>

                {/* CONTENT */}
                <div className="overflow-y-auto p-6 flex-1 bg-slate-50/30">
                    <form id="customerForm" onSubmit={onSave} className="space-y-4">
                        {formError && <div className="p-3 bg-red-50 text-red-600 rounded text-sm flex items-center gap-2"><AlertCircle size={16} /> {formError}</div>}
                        {localError && <div className="p-3 bg-amber-50 text-amber-600 rounded text-sm flex items-center gap-2"><AlertCircle size={16} /> {localError}</div>}

                        {/* ABA: DADOS */}
                        {activeTab === 'DATA' && (
                            <div className="grid grid-cols-1 gap-4 animate-in fade-in slide-in-from-left-4 duration-300">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 block mb-1">CPF / CNPJ *</label>
                                    <div className="flex gap-2">
                                        <input
                                            required
                                            className="w-full border border-slate-300 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                            value={data.cnpj}
                                            onChange={e => setData({ ...data, cnpj: maskCNPJ(e.target.value) })}
                                            maxLength={18}
                                            placeholder="00.000.000/0000-00"
                                        />
                                        <button
                                            type="button"
                                            onClick={handleCnpjSearch}
                                            disabled={loadingCnpj}
                                            className="p-2.5 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors flex items-center gap-2 font-bold text-sm"
                                            title="Buscar Dados na Receita"
                                        >
                                            {loadingCnpj ? <Loader2 size={20} className="animate-spin" /> : <><Search size={18} /> Buscar</>}
                                        </button>
                                    </div>
                                </div>
                                <div><label className="text-xs font-bold text-slate-500 block mb-1">Razão Social</label><input className="w-full border border-slate-300 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={data.legalName} onChange={e => setData({ ...data, legalName: e.target.value })} placeholder="Razão Social Ltda" /></div>
                                <div><label className="text-xs font-bold text-slate-500 block mb-1">Nome Fantasia *</label><input required className="w-full border border-slate-300 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={data.tradeName} onChange={e => setData({ ...data, tradeName: e.target.value })} placeholder="Nome Fantasia" /></div>
                                <div><label className="text-xs font-bold text-slate-500 block mb-1">Inscrição Estadual</label><input className="w-full border border-slate-300 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={data.stateRegistration} onChange={e => setData({ ...data, stateRegistration: e.target.value })} placeholder="Isento ou Número" /></div>
                            </div>
                        )}

                        {/* ABA: ENDEREÇO */}
                        {activeTab === 'ADDRESS' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-right-4 duration-300">
                                <div className="col-span-2 md:col-span-1">
                                    <label className="text-xs font-bold text-slate-500 block mb-1">CEP</label>
                                    <div className="flex gap-2">
                                        <input
                                            className="w-full border border-slate-300 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                            value={data.addressDetails?.zipCode}
                                            onChange={e => handleAddressChange('zipCode', e.target.value)}
                                            placeholder="00000-000"
                                        />
                                        <button
                                            type="button"
                                            onClick={handleCepSearch}
                                            disabled={loadingCep}
                                            className="p-2.5 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
                                            title="Buscar CEP"
                                        >
                                            {loadingCep ? <Loader2 size={20} className="animate-spin" /> : <Search size={20} />}
                                        </button>
                                    </div>
                                </div>
                                <div className="col-span-2 md:col-span-1"><label className="text-xs font-bold text-slate-500 block mb-1">Cidade</label><input className="w-full border border-slate-300 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50" value={data.addressDetails?.city} onChange={e => handleAddressChange('city', e.target.value)} readOnly /></div>
                                <div className="col-span-2"><label className="text-xs font-bold text-slate-500 block mb-1">Rua</label><input className="w-full border border-slate-300 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={data.addressDetails?.street} onChange={e => handleAddressChange('street', e.target.value)} /></div>
                                <div><label className="text-xs font-bold text-slate-500 block mb-1">Número</label><input className="w-full border border-slate-300 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={data.addressDetails?.number} onChange={e => handleAddressChange('number', e.target.value)} /></div>
                                <div><label className="text-xs font-bold text-slate-500 block mb-1">Bairro</label><input className="w-full border border-slate-300 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={data.addressDetails?.neighborhood} onChange={e => handleAddressChange('neighborhood', e.target.value)} /></div>
                                <div><label className="text-xs font-bold text-slate-500 block mb-1">Estado (UF)</label><input className="w-full border border-slate-300 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50" value={data.addressDetails?.state} onChange={e => handleAddressChange('state', e.target.value)} maxLength={2} readOnly /></div>
                            </div>
                        )}

                        {/* ABA: CONTATO */}
                        {activeTab === 'CONTACT' && (
                            <div className="grid grid-cols-1 gap-4 animate-in fade-in slide-in-from-right-4 duration-300">
                                <div><label className="text-xs font-bold text-slate-500 block mb-1">Email</label><input type="email" className="w-full border border-slate-300 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={data.email} onChange={e => setData({ ...data, email: e.target.value })} placeholder="email@empresa.com" /></div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="text-xs font-bold text-slate-500 block mb-1">Telefone</label><input className="w-full border border-slate-300 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={data.phone} onChange={e => setData({ ...data, phone: maskPhone(e.target.value) })} placeholder="(00) 0000-0000" /></div>
                                    <div><label className="text-xs font-bold text-slate-500 block mb-1">WhatsApp</label><input className="w-full border border-slate-300 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={data.whatsapp} onChange={e => setData({ ...data, whatsapp: maskPhone(e.target.value) })} placeholder="(00) 00000-0000" /></div>
                                </div>
                                <div><label className="text-xs font-bold text-slate-500 block mb-1">Vendedor Responsável</label><input className="w-full border border-slate-300 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={data.salesperson} onChange={e => setData({ ...data, salesperson: e.target.value })} placeholder="Nome do Vendedor" /></div>
                            </div>
                        )}
                    </form>
                </div>

                {/* FOOTER */}
                <div className="p-4 border-t bg-slate-50 flex justify-end gap-2">
                    <button onClick={onClose} className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-lg transition-colors">Cancelar</button>
                    <button type="submit" form="customerForm" disabled={isLoading} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold flex gap-2 items-center hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
                        {isLoading && <Loader2 className="animate-spin" size={16} />} Salvar
                    </button>
                </div>
            </div>
        </div>
    );
};
