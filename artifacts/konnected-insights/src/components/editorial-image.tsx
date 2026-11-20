import { useState, type ImgHTMLAttributes } from 'react';
import artwork from '../assets/editorial-placeholder.svg';
import silhouette from '../assets/portrait-placeholder.svg';

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'onError'> & { src?: string | null; portrait?: boolean };

/** Display only: the fallback never becomes an editorial image URL. */
export function EditorialImage(props: Props) {
  return <ImageForSource key={props.src?.trim() || ''} {...props} />;
}
function ImageForSource({ src, portrait, alt = '', ...attributes }: Props) {
  const [failed, setFailed] = useState(false);
  const source = src?.trim();
  if (!source || failed) return <img {...attributes} src={portrait ? silhouette : artwork} alt="" aria-hidden="true" />;
  return <img {...attributes} src={source} alt={alt} onError={() => setFailed(true)} />;
}
