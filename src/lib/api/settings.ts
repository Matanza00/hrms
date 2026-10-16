import { apiGet, apiPost } from "../apiClient";

export type SettingsMap = Record<string, string | number | boolean>;

export const getSettings = () => apiGet<SettingsMap>("settings");

export const updateSettings = (data: SettingsMap) => apiPost<SettingsMap>("updateSettings", data);
