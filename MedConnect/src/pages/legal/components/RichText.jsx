import { Fragment } from 'react';
import { Link } from 'react-router-dom';

/**
 * Formatação inline mínima para textos estruturados (documentos legais e FAQ):
 * **negrito** e [rótulo](/rota | https://… | mailto:…). Colchetes sem link — como
 * os placeholders "[Endereço da sede a preencher]" — continuam como texto.
 */
const TOKEN = /(\*\*[^*]+\*\*|\[[^\]]+\]\([^)\s]+\))/g;

export default function RichText({ text }) {
  if (!text) return null;
  const parts = String(text).split(TOKEN).filter(Boolean);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i}>{part.slice(2, -2)}</strong>;
        }
        const link = part.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/);
        if (link) {
          const [, label, href] = link;
          if (href.startsWith('/')) {
            return (
              <Link key={i} to={href}>
                {label}
              </Link>
            );
          }
          const external = href.startsWith('http');
          return (
            <a key={i} href={href} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
              {label}
            </a>
          );
        }
        return <Fragment key={i}>{part}</Fragment>;
      })}
    </>
  );
}
