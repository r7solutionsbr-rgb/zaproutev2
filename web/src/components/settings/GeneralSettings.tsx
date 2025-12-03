import React from 'react';
import { Building, CheckCircle } from 'lucide-react';
import { Tenant } from '../../types';

interface GeneralSettingsProps {
    tenant: Tenant | null;
}

export const GeneralSettings: React.FC<GeneralSettingsProps> = ({ tenant }) => {
    return (
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-center">
            <div className="w-24 h-24 bg-slate-100 rounded-full mx-auto mb-6 flex items-center justify-center">
                <Building size={48} className="text-slate-300" />
            </div>
            <h3 className="text-xl font-bold text-slate-800">{tenant?.name}</h3>
            <p className="text-slate-500 mb-6 font-mono text-sm bg-slate-50 inline-block px-3 py-1 rounded-full mt-2 border border-slate-100">
                ID: {tenant?.id}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left max-w-2xl mx-auto">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <label className="text-xs font-bold text-slate-400 uppercase">Plano</label>
                    <div className="font-bold text-slate-700">{tenant?.plan || 'Free'}</div>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <label className="text-xs font-bold text-slate-400 uppercase">Status</label>
                    <div className="font-bold text-green-600 flex items-center gap-1">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        {tenant?.status}
                    </div>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <label className="text-xs font-bold text-slate-400 uppercase">Criado em</label>
                    <div className="font-bold text-slate-700">{new Date(tenant?.createdAt || '').toLocaleDateString()}</div>
                </div>
            </div>
        </div>
    );
};
