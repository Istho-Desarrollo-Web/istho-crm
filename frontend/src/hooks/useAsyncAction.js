import { useState, useCallback, useRef } from 'react';

/**
 * Envuelve una función async y previene ejecuciones concurrentes.
 * Mientras la acción está en progreso, `loading` es true y llamadas adicionales
 * a `run` se ignoran — evita doble-click en formularios y botones de acción.
 *
 * @param {Function} fn - Función async a proteger
 * @returns {{ run: Function, loading: boolean }}
 *
 * @example
 * const { run: guardar, loading } = useAsyncAction(async () => {
 *   await clientesService.crear(data);
 * });
 * <button onClick={guardar} disabled={loading}>Guardar</button>
 */
const useAsyncAction = (fn) => {
  const [loading, setLoading] = useState(false);
  const inFlightRef = useRef(false);

  const run = useCallback(
    async (...args) => {
      if (inFlightRef.current) return;
      inFlightRef.current = true;
      setLoading(true);
      try {
        return await fn(...args);
      } finally {
        inFlightRef.current = false;
        setLoading(false);
      }
    },
    [fn]
  );

  return { run, loading };
};

export default useAsyncAction;
