import { useState, useEffect } from "react";
import { settingsService, SystemConfig } from "../service";
import { toast } from "@/lib/toast";
import { Save, RefreshCcw, Info } from "lucide-react";

export const SettingsPage = () => {
    const [configs, setConfigs] = useState<SystemConfig[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<string | null>(null);

    const fetchConfigs = async () => {
        try {
            setLoading(true);
            const data = await settingsService.getConfigs();
            setConfigs(data);
        } catch (error) {
            toast.error("Failed to fetch configurations");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchConfigs();
    }, []);

    const handleUpdate = async (key: string, value: string) => {
        try {
            setSaving(key);
            await settingsService.updateConfig(key, value);
            toast.success("Configuration updated");
            fetchConfigs();
        } catch (error) {
            toast.error("Failed to update configuration");
        } finally {
            setSaving(null);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <RefreshCcw className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>
                    <p className="text-gray-500">Manage global business rules and constraints.</p>
                </div>
                <button
                    onClick={fetchConfigs}
                    className="p-2 text-gray-500 hover:text-blue-600 transition-colors"
                >
                    <RefreshCcw className="w-5 h-5" />
                </button>
            </div>

            <div className="grid gap-6">
                {configs.map((config) => (
                    <div
                        key={config.key}
                        className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
                    >
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 space-y-1">
                                <div className="flex items-center gap-2">
                                    <span className="font-mono text-sm font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                                        {config.key}
                                    </span>
                                    <div className="group relative">
                                        <Info className="w-4 h-4 text-gray-400 cursor-help" />
                                        <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 p-2 bg-gray-900 text-white text-xs rounded shadow-lg z-10">
                                            {config.description || "No description provided."}
                                        </div>
                                    </div>
                                </div>
                                <p className="text-gray-600 text-sm">
                                    {config.description || "Manage this system setting."}
                                </p>
                                <div className="mt-4 flex items-center gap-4">
                                    <input
                                        type="text"
                                        defaultValue={config.value}
                                        id={`input-${config.key}`}
                                        className="flex-1 max-w-md px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium"
                                    />
                                    <button
                                        onClick={() => {
                                            const input = document.getElementById(
                                                `input-${config.key}`
                                            ) as HTMLInputElement;
                                            handleUpdate(config.key, input.value);
                                        }}
                                        disabled={saving === config.key}
                                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                                    >
                                        {saving === config.key ? (
                                            <RefreshCcw className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <Save className="w-4 h-4" />
                                        )}
                                        Save
                                    </button>
                                </div>
                            </div>
                            <div className="text-right text-xs text-gray-400">
                                Last updated: {new Date(config.updated_at).toLocaleString()}
                            </div>
                        </div>
                    </div>
                ))}

                {configs.length === 0 && (
                    <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                        <p className="text-gray-500">No system configurations found.</p>
                    </div>
                )}
            </div>
        </div>
    );
};
