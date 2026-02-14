const timestamp = () => new Date().toISOString();

export const logger = {
  info: (msg: string, data?: unknown) => {
    console.log(`[${timestamp()}] INFO: ${msg}`, data ?? '');
  },
  error: (msg: string, error?: unknown) => {
    console.error(`[${timestamp()}] ERROR: ${msg}`, error ?? '');
  },
  warn: (msg: string, data?: unknown) => {
    console.warn(`[${timestamp()}] WARN: ${msg}`, data ?? '');
  },
};
