import { useState } from 'react';
import { router } from '@inertiajs/react';
import { Settings, ToggleLeft, ToggleRight, Plus, Save, Zap } from 'lucide-react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { AppSetting, BravoValue } from './types';

interface AdminConfigProps {
    settings: AppSetting[];
    bravoValues: BravoValue[];
}

const SETTING_LABELS: Record<string, string> = {
    base_points_per_bravo:         'Points de base par Bravo',
    max_bravos_per_day:            'Max Bravos par jour (par employé)',
    max_points_per_day:            'Max points distribuables par jour',
    max_same_receiver_per_period:  'Max Bravos vers même personne (fenêtre)',
    same_receiver_window_hours:    'Durée fenêtre glissante (heures)',
    notify_bravo_by_email:         'Notifications email activées',
};

export default function AdminConfig({ settings, bravoValues }: AdminConfigProps) {
    const [editedSettings, setEditedSettings] = useState<Record<string, string>>(
        Object.fromEntries(settings.map(s => [s.key, s.value]))
    );
    const [savingSettings, setSavingSettings] = useState(false);
    const [togglingId, setTogglingId]         = useState<number | null>(null);

    // Nouvel valeur Bravo — state local
    const [showNewValue, setShowNewValue] = useState(false);
    const [newValue, setNewValue]         = useState({ name: '', multiplier: '1', color: '#6366f1', icon: '' });
    const [savingValue, setSavingValue]   = useState(false);

    const handleSaveSettings = () => {
        setSavingSettings(true);
        const payload = settings
            .filter(s => editedSettings[s.key] !== s.value)
            .map(s => ({ key: s.key, value: editedSettings[s.key] }));

        if (payload.length === 0) {
            setSavingSettings(false);
            return;
        }

        router.post('/admin/config/settings', { settings: payload }, {
            preserveScroll: true,
            onFinish: () => setSavingSettings(false),
        });
    };

    const handleToggleValue = (value: BravoValue) => {
        setTogglingId(value.id);
        router.patch(`/admin/config/bravo-values/${value.id}/toggle`, {}, {
            preserveScroll: true,
            onFinish: () => setTogglingId(null),
        });
    };

    const handleCreateValue = () => {
        if (!newValue.name.trim()) return;
        setSavingValue(true);
        router.post('/admin/config/bravo-values', {
            name:       newValue.name.trim(),
            multiplier: parseFloat(newValue.multiplier),
            color:      newValue.color,
            icon:       newValue.icon || null,
        }, {
            preserveScroll: true,
            onSuccess: () => { setNewValue({ name: '', multiplier: '1', color: '#6366f1', icon: '' }); setShowNewValue(false); },
            onFinish: () => setSavingValue(false),
        });
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* Header */}
            <div>
                <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
                    <Settings size={24} className="text-primary" />
                    Configuration
                </h1>
                <p className="text-sm text-on-surface-variant font-medium mt-1">
                    Paramètres métier et valeurs Bravo — accès RH / Admin.
                </p>
            </div>

            {/* Paramètres métier */}
            <Card className="border-none bg-white/80 space-y-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-black tracking-tight">Règles métier</h2>
                    <Button variant="primary" onClick={handleSaveSettings} disabled={savingSettings} className="gap-2">
                        <Save size={14} />
                        {savingSettings ? 'Sauvegarde...' : 'Sauvegarder'}
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {settings.map(s => (
                        <div key={s.key} className="space-y-1.5">
                            <label className="text-xs font-black uppercase tracking-widest text-on-surface-variant">
                                {SETTING_LABELS[s.key] ?? s.key}
                            </label>
                            {s.cast === 'boolean' ? (
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => setEditedSettings(prev => ({
                                            ...prev,
                                            [s.key]: prev[s.key] === 'true' ? 'false' : 'true',
                                        }))}
                                        className="focus:outline-none"
                                    >
                                        {editedSettings[s.key] === 'true'
                                            ? <ToggleRight size={32} className="text-primary" />
                                            : <ToggleLeft  size={32} className="text-on-surface-variant" />
                                        }
                                    </button>
                                    <span className="text-sm font-bold">
                                        {editedSettings[s.key] === 'true' ? 'Activé' : 'Désactivé'}
                                    </span>
                                </div>
                            ) : (
                                <input
                                    type={s.cast === 'int' || s.cast === 'float' ? 'number' : 'text'}
                                    value={editedSettings[s.key] ?? ''}
                                    onChange={e => setEditedSettings(prev => ({ ...prev, [s.key]: e.target.value }))}
                                    className="w-full border border-surface-container-high rounded-lg px-3 py-2 text-sm font-bold focus:ring-2 focus:ring-primary/20 transition-all"
                                />
                            )}
                            {s.description && (
                                <p className="text-[11px] text-on-surface-variant leading-snug">{s.description}</p>
                            )}
                        </div>
                    ))}
                </div>
            </Card>

            {/* Valeurs Bravo */}
            <Card className="border-none bg-white/80 space-y-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-black tracking-tight flex items-center gap-2">
                        <Zap size={18} className="text-primary" />
                        Valeurs Bravo
                    </h2>
                    <Button variant="outline" onClick={() => setShowNewValue(v => !v)} className="gap-2">
                        <Plus size={14} />
                        Nouvelle valeur
                    </Button>
                </div>

                {/* Formulaire nouvelle valeur */}
                {showNewValue && (
                    <div className="p-4 bg-surface-container-low rounded-xl space-y-4 border border-primary/20">
                        <p className="text-xs font-black uppercase tracking-widest text-primary">Créer une valeur</p>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Nom *</label>
                                <input
                                    type="text"
                                    value={newValue.name}
                                    onChange={e => setNewValue(p => ({ ...p, name: e.target.value }))}
                                    placeholder="Ex: Innovation"
                                    className="mt-1 w-full border rounded-lg px-3 py-2 text-sm font-bold"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Multiplicateur</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    min="0.1"
                                    max="10"
                                    value={newValue.multiplier}
                                    onChange={e => setNewValue(p => ({ ...p, multiplier: e.target.value }))}
                                    className="mt-1 w-full border rounded-lg px-3 py-2 text-sm font-bold"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Couleur</label>
                                <input
                                    type="color"
                                    value={newValue.color}
                                    onChange={e => setNewValue(p => ({ ...p, color: e.target.value }))}
                                    className="mt-1 w-full h-10 border rounded-lg cursor-pointer"
                                />
                            </div>
                        </div>
                        <div className="flex gap-2 justify-end">
                            <Button variant="outline" onClick={() => setShowNewValue(false)}>Annuler</Button>
                            <Button variant="primary" onClick={handleCreateValue} disabled={savingValue || !newValue.name.trim()}>
                                {savingValue ? 'Création...' : 'Créer'}
                            </Button>
                        </div>
                    </div>
                )}

                {/* Liste des valeurs */}
                <div className="space-y-3">
                    {bravoValues.map(value => (
                        <div key={value.id} className="flex items-center justify-between p-4 bg-surface-container-low rounded-xl">
                            <div className="flex items-center gap-3">
                                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: value.color ?? '#6366f1' }} />
                                <div>
                                    <p className="font-bold text-sm">{value.name}</p>
                                    <p className="text-xs text-on-surface-variant">Multiplicateur : ×{value.multiplier}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className={`text-xs font-bold ${value.is_active ? 'text-green-600' : 'text-on-surface-variant'}`}>
                                    {value.is_active ? 'Active' : 'Inactive'}
                                </span>
                                <button
                                    onClick={() => handleToggleValue(value)}
                                    disabled={togglingId === value.id}
                                    className="focus:outline-none"
                                >
                                    {value.is_active
                                        ? <ToggleRight size={28} className="text-primary cursor-pointer" />
                                        : <ToggleLeft  size={28} className="text-on-surface-variant cursor-pointer" />
                                    }
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </Card>
        </div>
    );
}
