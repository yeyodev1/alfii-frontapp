/**
 * Lectura de un export de WhatsApp desde el navegador.
 *
 * Android entrega un .txt; iPhone un .zip con _chat.txt dentro. El usuario no
 * tiene que descomprimir nada: aqui se abre el zip con fflate y se devuelve
 * texto plano. Lo usan el dropzone de /nueva, la hoja de import y el
 * arrastrar-y-soltar del chat del expediente.
 */
import { unzipSync, strFromU8 } from 'fflate';

export const MAX_CHAT_BYTES = 2 * 1024 * 1024;

export type DropKind = 'image' | 'chat' | 'audio' | 'unknown';

/** Vercel corta el body en 4.5 MB: un opus de WhatsApp de 10 min pesa ~1 MB. */
export const MAX_AUDIO_BYTES = 4 * 1024 * 1024;
const AUDIO_EXT = /\.(opus|ogg|oga|m4a|mp4|aac|mp3|wav|webm|flac|amr)$/i;

/** Clasifica un archivo (o un item de dataTransfer) sin leerlo. */
export function classifyFile(file: { name?: string; type?: string }): DropKind {
  const type = file.type || '';
  const name = (file.name || '').toLowerCase();
  if (type.startsWith('image/')) return 'image';
  if (type.startsWith('audio/') || type === 'application/ogg' || type === 'video/webm') return 'audio';
  if (AUDIO_EXT.test(name)) return 'audio';
  if (type === 'text/plain' || type === 'application/zip' || type === 'application/x-zip-compressed') return 'chat';
  if (name.endsWith('.txt') || name.endsWith('.zip')) return 'chat';
  return 'unknown';
}

export async function readChatExport(file: File): Promise<{ text: string; fileName: string }> {
  const lower = file.name.toLowerCase();
  if (lower.endsWith('.zip') || file.type.includes('zip')) {
    const entries = unzipSync(new Uint8Array(await file.arrayBuffer()));
    const names = Object.keys(entries).filter(
      (n) => n.toLowerCase().endsWith('.txt') && !n.startsWith('__MACOSX'),
    );
    const chosen = names.find((n) => /_chat\.txt$/i.test(n)) ?? names[0];
    if (!chosen) throw new Error('Ese .zip no trae ningún chat de WhatsApp (.txt).');
    const text = strFromU8(entries[chosen]!);
    if (text.length > MAX_CHAT_BYTES) throw new Error('Ese chat pesa más de 2 MB. Exporta un tramo más corto.');
    return { text, fileName: chosen.split('/').pop() || 'chat.txt' };
  }
  if (file.size > MAX_CHAT_BYTES) throw new Error('Ese archivo pesa más de 2 MB. Exporta un tramo más corto.');
  if (!lower.endsWith('.txt') && !file.type.startsWith('text/')) {
    throw new Error('Necesito el .txt (o el .zip) que exporta WhatsApp, no una imagen.');
  }
  return { text: await file.text(), fileName: file.name };
}
