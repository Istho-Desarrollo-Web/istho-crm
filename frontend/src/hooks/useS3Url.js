import { useState, useEffect } from 'react';
import apiClient from '@api/client';

const isS3Key = (value) =>
  !!value && !value.startsWith('http') && !value.startsWith('data:') && !value.startsWith('/');

/**
 * Resuelve un S3 key a una presigned URL mediante GET /archivos/url.
 * Si el valor ya es una URL completa (Cloudinary, data:, etc.) lo devuelve tal cual.
 */
export const useS3Url = (keyOrUrl) => {
  const [url, setUrl] = useState(() => (isS3Key(keyOrUrl) ? null : keyOrUrl || null));
  const [loading, setLoading] = useState(() => isS3Key(keyOrUrl));
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!keyOrUrl) { setUrl(null); setLoading(false); return; }

    if (!isS3Key(keyOrUrl)) {
      setUrl(keyOrUrl);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    apiClient
      .get(`/archivos/url?key=${encodeURIComponent(keyOrUrl)}`)
      .then((res) => { if (!cancelled) setUrl(res.data?.url || null); })
      .catch((err) => { if (!cancelled) setError(err); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [keyOrUrl]);

  return { url, loading, error };
};
