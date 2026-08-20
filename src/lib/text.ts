// Detecção client-side de email automático (aceite de convite, notas do
// Gemini, newsletter). Espelha a regra do sync — necessária porque o job de
// background do Skip também grava emails, com a heurística antiga.
const AUTO_FROM =
  /(no-?_?reply|donotreply|nao.?responda|bounce|mailer-daemon|notifica|newsletter|marketing@|@google\.com|calendar-notification|drive-shares|gemini)/i
const AUTO_SUBJECT =
  /^(aceito:|aceita:|accepted:|recusado:|declined:|talvez:|tentative:|convite:|invitation:|invite:|atualiza[çc][ãa]o de convite|updated invitation|cancelad[oa]:|cancell?ed:|notas:|notes:|anota[çc][õo]es|resumo da reuni[ãa]o|meeting notes|lembrete:|reminder:|confirma[çc][ãa]o|confirmation|recibo|receipt|fatura|invoice|out of office|ausente:)/i

export function isAutomatedEmail(from: string, subject: string): boolean {
  return AUTO_FROM.test(from || '') || AUTO_SUBJECT.test((subject || '').trim())
}

// Converte HTML de fontes externas (corpo de email, descrição de evento do
// HubSpot/Google) em texto legível — nunca renderizamos HTML cru de terceiros.
export function htmlToText(html: string): string {
  return (html || '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/tr>/gi, '\n')
    .replace(/<li[^>]*>/gi, '\n• ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
