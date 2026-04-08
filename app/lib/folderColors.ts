/** Paleta de cores por pasta — usada em Vault, Relatórios, CofrePanel e qualquer exibição de nome de pasta */

export const FOLDER_COLORS: Record<string, string> = {
  '0_NCFN-ULTRASECRETOS':                         '#ef4444', // vermelho — máximo sigilo
  '1_NCFN-PROVAS-SENSÍVEIS':                      '#f97316', // laranja — sensível
  '2_NCFN-ELEMENTOS-DE-PROVA':                    '#eab308', // amarelo — evidência
  '3_NCFN-DOCUMENTOS-GERENTE':                    '#3b82f6', // azul — gerência
  '4_NCFN-PROCESSOS-PROCEDIMENTOS-CONTRATOS':     '#8b5cf6', // violeta — jurídico
  '5_NCFN-GOVERNOS-EMPRESAS':                     '#22c55e', // verde — institucional
  '6_NCFN-FORNECIDOS_sem_registro_de_coleta':     '#6b7280', // cinza — sem registro
  '7_NCFN-CAPTURAS-WEB_OSINT':                    '#00f3ff', // ciano — web/OSINT
  '8_NCFN-VIDEOS':                                '#a855f7', // roxo — vídeo
  '9_NCFN-PERFIS-CRIMINAIS_SUSPEITOS_CRIMINOSOS': '#dc2626', // vermelho-escuro — criminal
  '10_NCFN-ÁUDIO':                                '#ec4899', // rosa — áudio
  '12_NCFN-METADADOS-LIMPOS':                     '#34d399', // esmeralda — limpo
};

/** Retorna a cor de uma pasta, ou branco-fraco como fallback */
export function folderColor(folderKey: string): string {
  return FOLDER_COLORS[folderKey] ?? '#9ca3af';
}
