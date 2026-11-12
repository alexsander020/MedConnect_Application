/**
 * Vercel Web Analytics (sem cookies): remove query string e hash antes do envio.
 * Links de redefinição de senha e verificação de e-mail carregam tokens na URL, e nada além do
 * caminho da página deve sair para o provedor (LGPD — minimização).
 */
export function stripSensitiveUrlParts(event) {
  try {
    const url = new URL(event.url);
    url.search = '';
    url.hash = '';
    return { ...event, url: url.toString() };
  } catch {
    return null;
  }
}
