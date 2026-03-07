export async function register() {
    if (process.env.NEXT_RUNTIME === 'nodejs') {
        try {
            await import('./lib/cron');
            console.log('[SISTEMA NCFN] Bot Auditor e Cron Jobs engatilhados com sucesso.');
        } catch (e) {
            console.error('Erro ao iniciar os Cron Jobs:', e);
        }
    }
}
