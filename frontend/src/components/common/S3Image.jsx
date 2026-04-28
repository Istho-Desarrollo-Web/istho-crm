import { useS3Url } from '@hooks/useS3Url';

/**
 * Renderiza una imagen cuyo src puede ser un S3 key o una URL completa.
 * Para S3 keys, obtiene automáticamente la presigned URL vía /archivos/url.
 *
 * Props:
 *   src        - S3 key o URL completa
 *   fallback   - Nodo React a mostrar mientras carga o si falla (opcional)
 *   className, alt, y cualquier otro prop de <img>
 */
const S3Image = ({ src, fallback = null, className, alt = '', ...imgProps }) => {
  const { url, loading } = useS3Url(src);

  if (loading || !url) return fallback;
  return <img src={url} className={className} alt={alt} {...imgProps} />;
};

export default S3Image;
