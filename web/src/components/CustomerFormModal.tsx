import React, { useState, useEffect, useRef } from 'react';
import { X, FileText, MapPin, Phone, AlertCircle, Loader2, Search, DollarSign, User, Building2, Navigation } from 'lucide-react';
import { cnpjService } from '../services/cnpj';
import { api } from '../services/api';
import { Seller } from '../types';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

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
    const [activeTab, setActiveTab] = useState<'DATA' | 'ADDRESS' | 'FINANCIAL'>('DATA');
    const [loadingCep, setLoadingCep] = useState(false);
    const [loadingCnpj, setLoadingCnpj] = useState(false);
    const [loadingGeocode, setLoadingGeocode] = useState(false);
    const [localError, setLocalError] = useState('');
    const [geoSuccess, setGeoSuccess] = useState('');
    const [sellers, setSellers] = useState<Seller[]>([]);
    const numberInputRef = useRef<HTMLInputElement>(null);

    // Carregar Vendedores
    useEffect(() => {
        const fetchSellers = async () => {
            try {
                const userStr = localStorage.getItem('zaproute_user');
                if (userStr) {
                    const user = JSON.parse(userStr);
                    const allSellers = await api.sellers.getAll(user.tenantId);
                    setSellers(allSellers);
                }
            } catch (error) {
                console.error("Erro ao carregar vendedores", error);
            }
        };
        if (isOpen) fetchSellers();
    }, [isOpen]);

    // Auto-dismiss success message
    useEffect(() => {
        if (geoSuccess) {
            const timer = setTimeout(() => setGeoSuccess(''), 3000);
            return () => clearTimeout(timer);
        }
    }, [geoSuccess]);

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
        setLocalError('');
        try {
            const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
            const addressData = await response.json();

            if (addressData.erro) {
                setLocalError('CEP não encontrado.');
                setLoadingCep(false);
                return;
            }

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

            // Move focus to number field
            setTimeout(() => numberInputRef.current?.focus(), 100);
        } catch (error) {
            console.error("Erro ao buscar CEP", error);
            setLocalError('Erro ao buscar CEP. Tente novamente.');
        } finally {
            setLoadingCep(false);
        }
    };

    // Auto-search CEP on blur
    const handleCepBlur = () => {
        const cep = data.addressDetails?.zipCode?.replace(/\D/g, '');
        if (cep && cep.length === 8 && !loadingCep) {
            handleCepSearch();
        }
    };

    // Geocode address using Nominatim
    const handleGeocode = async () => {
        const { street, number, city, state } = data.addressDetails || {};

        if (!street || !city || !state) {
            setLocalError('Preencha Rua, Cidade e Estado para geolocalizar.');
            return;
        }

        const fullAddress = `${street}, ${number || ''}, ${city}, ${state}, Brasil`;
        setLoadingGeocode(true);
        setLocalError('');
        setGeoSuccess('');

        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fullAddress)}&limit=1`,
                {
                    headers: {
                        'User-Agent': 'ZapRoute/1.0'
                    }
                }
            );
            const results = await response.json();

            if (results && results.length > 0) {
                const { lat, lon } = results[0];
                setData((prev: any) => ({
                    ...prev,
                    location: {
                        ...prev.location,
                        lat: parseFloat(lat),
                        lng: parseFloat(lon),
                        address: fullAddress
                    }
                }));
                setGeoSuccess('✓ Coordenadas obtidas com sucesso!');
            } else {
                setLocalError('Endereço não encontrado. Verifique os dados.');
            }
        } catch (error) {
            console.error("Erro ao geolocalizar", error);
            setLocalError('Erro ao buscar coordenadas. Tente novamente.');
        } finally {
            setLoadingGeocode(false);
        }
    };

    // Máscara de Moeda
    const handleCreditLimitChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let value = e.target.value.replace(/\D/g, '');
        const numberValue = Number(value) / 100;
        setData({ ...data, creditLimit: numberValue });
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
    };

    // Check if coordinates are valid for map display
    const hasValidCoordinates = data.location?.lat && data.location?.lng &&
        data.location.lat !== 0 && data.location.lng !== 0;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* HEADER */}
                <div className="flex justify-between items-center p-4 border-b bg-slate-50">
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <Building2 size={20} className="text-blue-600" />
                        {mode === 'CREATE' ? 'Novo Cliente' : 'Editar Cliente'}
                    </h2>
                    <button onClick={onClose}><X size={24} className="text-slate-400 hover:text-slate-600" /></button>
                </div>

                {/* TABS */}
                <div className="flex border-b border-slate-200 bg-white px-4 pt-2 gap-4">
                    <button
                        type="button"
                        onClick={() => setActiveTab('DATA')}
                        className={`pb-2 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'DATA' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                        <FileText size={16} /> Dados Gerais
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
                        onClick={() => setActiveTab('FINANCIAL')}
                        className={`pb-2 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'FINANCIAL' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                        <DollarSign size={16} /> Comercial & Financeiro
                    </button>
                </div>

                {/* CONTENT */}
                <div className="overflow-y-auto p-6 flex-1 bg-slate-50/30">
                    <form id="customerForm" onSubmit={onSave} className="space-y-6">
                        {formError && <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm flex items-center gap-2 border border-red-100"><AlertCircle size={16} /> {formError}</div>}
                        {localError && <div className="p-3 bg-amber-50 text-amber-600 rounded-lg text-sm flex items-center gap-2 border border-amber-100"><AlertCircle size={16} /> {localError}</div>}
                        {geoSuccess && <div className="p-3 bg-green-50 text-green-600 rounded-lg text-sm flex items-center gap-2 border border-green-100">{geoSuccess}</div>}

                        {/* ABA: DADOS */}
                        {activeTab === 'DATA' && (
                            <div className="grid grid-cols-1 gap-4 animate-in fade-in slide-in-from-left-4 duration-300">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="md:col-span-2">
                                        <label className="text-xs font-bold text-slate-500 block mb-1">CPF / CNPJ *</label>
                                        <div className="flex gap-2">
                                            <input
                                                required
                                                className="w-full border border-slate-300 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                                value={data.cnpj}
                                                onChange={e => setData({ ...data, cnpj: maskCNPJ(e.target.value) })}
                                                maxLength={18}
                                                placeholder="00.000.000/0000-00"
                                            />
                                            <button
                                                type="button"
                                                onClick={handleCnpjSearch}
                                                disabled={loadingCnpj}
                                                className="px-4 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors flex items-center gap-2 font-bold text-sm disabled:opacity-50"
                                                title="Buscar Dados na Receita"
                                            >
                                                {loadingCnpj ? <Loader2 size={20} className="animate-spin" /> : <Search size={18} />}
                                            </button>
                                        </div>
                                    </div>
                                    <div><label className="text-xs font-bold text-slate-500 block mb-1">Nome Fantasia *</label><input required className="w-full border border-slate-300 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={data.tradeName} onChange={e => setData({ ...data, tradeName: e.target.value })} placeholder="Nome Fantasia" /></div>
                                    <div><label className="text-xs font-bold text-slate-500 block mb-1">Razão Social</label><input className="w-full border border-slate-300 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={data.legalName} onChange={e => setData({ ...data, legalName: e.target.value })} placeholder="Razão Social Ltda" /></div>
                                    <div><label className="text-xs font-bold text-slate-500 block mb-1">Inscrição Estadual</label><input className="w-full border border-slate-300 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={data.stateRegistration} onChange={e => setData({ ...data, stateRegistration: e.target.value })} placeholder="Isento ou Número" /></div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 block mb-1">Status</label>
                                        <select
                                            value={data.status || 'ACTIVE'}
                                            onChange={e => setData({ ...data, status: e.target.value })}
                                            className="w-full border border-slate-300 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                                        >
                                            <option value="ACTIVE">Ativo</option>
                                            <option value="BLOCKED">Bloqueado</option>
                                            <option value="INACTIVE">Inativo</option>
                                        </select>
                                    </div>
                                </div>
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
                                            onBlur={handleCepBlur}
                                            placeholder="00000-000"
                                            maxLength={9}
                                        />
                                        <button
                                            type="button"
                                            onClick={handleCepSearch}
                                            disabled={loadingCep}
                                            className="px-4 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors disabled:opacity-50"
                                            title="Buscar CEP"
                                        >
                                            {loadingCep ? <Loader2 size={20} className="animate-spin" /> : <Search size={20} />}
                                        </button>
                                    </div>
                                </div>
                                <div className="col-span-2 md:col-span-1">
                                    <label className="text-xs font-bold text-slate-500 block mb-1">Cidade</label>
                                    <input
                                        className="w-full border border-slate-300 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50"
                                        value={data.addressDetails?.city}
                                        onChange={e => handleAddressChange('city', e.target.value)}
                                        disabled={loadingCep}
                                        readOnly
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="text-xs font-bold text-slate-500 block mb-1">Rua</label>
                                    <input
                                        className="w-full border border-slate-300 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={data.addressDetails?.street}
                                        onChange={e => handleAddressChange('street', e.target.value)}
                                        disabled={loadingCep}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 block mb-1">Número</label>
                                    <input
                                        ref={numberInputRef}
                                        className="w-full border border-slate-300 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={data.addressDetails?.number}
                                        onChange={e => handleAddressChange('number', e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 block mb-1">Bairro</label>
                                    <input
                                        className="w-full border border-slate-300 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={data.addressDetails?.neighborhood}
                                        onChange={e => handleAddressChange('neighborhood', e.target.value)}
                                        disabled={loadingCep}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 block mb-1">Estado (UF)</label>
                                    <input
                                        className="w-full border border-slate-300 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50"
                                        value={data.addressDetails?.state}
                                        onChange={e => handleAddressChange('state', e.target.value)}
                                        maxLength={2}
                                        disabled={loadingCep}
                                        readOnly
                                    />
                                </div>

                                {/* GEOCODING */}
                                <div className="col-span-2 pt-4 border-t border-slate-200">
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="text-xs font-bold text-slate-500">Coordenadas GPS</label>
                                        <button
                                            type="button"
                                            onClick={handleGeocode}
                                            disabled={loadingGeocode}
                                            className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors flex items-center gap-2 text-xs font-bold disabled:opacity-50"
                                        >
                                            {loadingGeocode ? <Loader2 size={14} className="animate-spin" /> : <Navigation size={14} />}
                                            Geolocalizar Endereço
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 mb-4">
                                        <div>
                                            <label className="text-xs text-slate-400 block mb-1">Latitude</label>
                                            <input
                                                type="number"
                                                step="any"
                                                className="w-full border border-slate-300 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                                value={data.location?.lat || ''}
                                                onChange={e => setData({ ...data, location: { ...data.location, lat: parseFloat(e.target.value) || 0 } })}
                                                placeholder="-23.550520"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs text-slate-400 block mb-1">Longitude</label>
                                            <input
                                                type="number"
                                                step="any"
                                                className="w-full border border-slate-300 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                                value={data.location?.lng || ''}
                                                onChange={e => setData({ ...data, location: { ...data.location, lng: parseFloat(e.target.value) || 0 } })}
                                                placeholder="-46.633308"
                                            />
                                        </div>
                                    </div>

                                    {/* MAP PREVIEW */}
                                    {hasValidCoordinates && (
                                        <div className="rounded-lg overflow-hidden border border-slate-200 h-64">
                                            <MapContainer
                                                center={[data.location.lat, data.location.lng]}
                                                zoom={15}
                                                style={{ height: '100%', width: '100%' }}
                                            >
                                                <TileLayer
                                                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                                                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                                />
                                                <Marker position={[data.location.lat, data.location.lng]}>
                                                    <Popup>
                                                        <div className="text-sm">
                                                            <strong>{data.tradeName || 'Cliente'}</strong><br />
                                                            {data.addressDetails?.street}, {data.addressDetails?.number}
                                                        </div>
                                                    </Popup>
                                                </Marker>
                                            </MapContainer>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* ABA: COMERCIAL & FINANCEIRO */}
                        {activeTab === 'FINANCIAL' && (
                            <div className="grid grid-cols-1 gap-4 animate-in fade-in slide-in-from-right-4 duration-300">
                                <div><label className="text-xs font-bold text-slate-500 block mb-1">Email</label><input type="email" className="w-full border border-slate-300 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={data.email} onChange={e => setData({ ...data, email: e.target.value })} placeholder="email@empresa.com" /></div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="text-xs font-bold text-slate-500 block mb-1">Telefone</label><input className="w-full border border-slate-300 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={data.phone} onChange={e => setData({ ...data, phone: maskPhone(e.target.value) })} placeholder="(00) 0000-0000" /></div>
                                    <div><label className="text-xs font-bold text-slate-500 block mb-1">WhatsApp</label><input className="w-full border border-slate-300 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={data.whatsapp} onChange={e => setData({ ...data, whatsapp: maskPhone(e.target.value) })} placeholder="(00) 00000-0000" /></div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 block mb-1">Vendedor Responsável</label>
                                        <div className="relative">
                                            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                            <select
                                                value={data.sellerId || ''}
                                                onChange={e => setData({ ...data, sellerId: e.target.value })}
                                                className="w-full border border-slate-300 pl-10 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white appearance-none"
                                            >
                                                <option value="">Selecione um vendedor...</option>
                                                {sellers.map(seller => (
                                                    <option key={seller.id} value={seller.id}>{seller.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 block mb-1">Limite de Crédito</label>
                                        <div className="relative">
                                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                            <input
                                                className="w-full border border-slate-300 pl-10 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                                value={formatCurrency(data.creditLimit)}
                                                onChange={handleCreditLimitChange}
                                                placeholder="R$ 0,00"
                                            />
                                        </div>
                                    </div>
                                </div>
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
