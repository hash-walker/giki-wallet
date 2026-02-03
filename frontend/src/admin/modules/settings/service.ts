import axios from "@/lib/axios";
import { type APIResponse } from "@/lib/errors";

export interface SystemConfig {
    key: string;
    value: string;
    description: string;
    updated_at: string;
}

export const settingsService = {
    getConfigs: async (): Promise<SystemConfig[]> => {
        const { data } = await axios.get<SystemConfig[]>("/admin/settings");
        return data;
    },

    updateConfig: async (key: string, value: string): Promise<void> => {
        await axios.put(`/admin/settings/${key}`, { value });
    },
};
