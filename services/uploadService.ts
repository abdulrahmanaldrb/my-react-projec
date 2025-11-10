// services/uploadService.ts
export interface UploadResult { ok: boolean; path?: string; error?: string }

const env: any = (import.meta as any)?.env || {};
export const UPLOAD_BASE = (env.VITE_UPLOAD_BASE as string) || 'http://localhost:4001/';
export const UPLOAD_ENDPOINT = (env.VITE_UPLOAD_ENDPOINT as string) || (UPLOAD_BASE.replace(/\/?$/, '/') + 'upload');

export const getPublicUrl = (relativePath: string) => {
  const base = UPLOAD_BASE.replace(/\/?$/, '/');
  return base + relativePath.replace(/^\/?/, '');
};

export const uploadFileToLocalServer = async (file: File, opts?: { dir?: string }): Promise<UploadResult> => {
  try {
    const form = new FormData();
    form.append('file', file);
    const endpoint = opts?.dir ? `${UPLOAD_ENDPOINT}?dir=${encodeURIComponent(opts.dir)}` : UPLOAD_ENDPOINT;
    const res = await fetch(endpoint, {
      method: 'POST',
      body: form,
    });
    if (!res.ok) {
      return { ok: false, error: `HTTP ${res.status}` };
    }
    const data = await res.json();
    return data as UploadResult;
  } catch (e: any) {
    return { ok: false, error: e?.message || 'Network error' };
  }
};

export const isUploadServerAvailable = async (): Promise<boolean> => {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1200);
    const res = await fetch(UPLOAD_BASE, { method: 'GET', signal: controller.signal, mode: 'no-cors' as any });
    clearTimeout(timeout);
    // In no-cors, status is 0 but the request succeeded; treat as available
    return true;
  } catch {
    return false;
  }
};
