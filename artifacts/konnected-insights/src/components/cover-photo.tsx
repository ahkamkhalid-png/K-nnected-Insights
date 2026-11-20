import { EditorialImage } from './editorial-image';

export function CoverPhoto({ src, alt = '', className = '', fit = 'cover' }: {
  src?: string; alt?: string; className?: string; generated?: boolean; fit?: 'cover' | 'contain';
}) {
  return (
    <div data-testid="cover-photo" className={`relative overflow-hidden bg-muted ${fit === 'contain' ? 'flex flex-col' : ''} ${className}`}>
      <EditorialImage src={src} alt={alt} className={fit === 'contain' ? 'min-h-0 flex-1 w-full object-contain object-center' : 'h-full w-full object-cover'} />
    </div>
  );
}
