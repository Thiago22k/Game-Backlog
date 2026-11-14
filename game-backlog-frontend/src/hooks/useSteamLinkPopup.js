import { useCallback, useEffect, useRef, useState } from 'react';
import axios from '../api/axios';
import { ENDPOINTS } from '../utils/constants';
import { steamAuthChannel } from '../utils/steamAuthChannel';
import { openCenteredPopup, POPUP_POLL_MS } from './useSteamPopup';

/**
 * Vincula Steam a la cuenta actual (Ajustes) en una ventana emergente, sin salir de la página.
 *
 * El backend devuelve la URL de Steam en POST /steam/link, pero los navegadores solo permiten
 * window.open dentro del clic del usuario: por eso la ventana se abre YA (en blanco) y se le
 * asigna la URL cuando responde el backend.
 *
 * onResult(code) recibe 'linked' o el código de error (cancelled, already_linked, ...).
 * onError(message) se usa solo si no se pudo iniciar la vinculación.
 */
const useSteamLinkPopup = ({ onResult, onError } = {}) => {
  const [isWaiting, setIsWaiting] = useState(false);

  const popupRef = useRef(null);
  const pollRef = useRef(null);
  const initiatedRef = useRef(false);

  const latest = useRef({ onResult, onError });
  useEffect(() => {
    latest.current = { onResult, onError };
  });

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => {
    const unsubscribe = steamAuthChannel.subscribe((message) => {
      if (message.type !== 'result' || message.flow !== 'link' || !initiatedRef.current) return;
      initiatedRef.current = false;

      stopPolling();
      setIsWaiting(false);

      // Confirma a la ventana emergente que el resultado llegó, para que pueda cerrarse
      steamAuthChannel.post({ type: 'ack', id: `ack:${message.id}`, resultId: message.id });

      latest.current.onResult?.(message.status === 'linked' ? 'linked' : message.code || 'error');
    });

    return () => {
      unsubscribe();
      stopPolling();
    };
  }, [stopPolling]);

  const start = useCallback(async () => {
    // Si ya hay una ventana abierta, solo traerla al frente
    if (popupRef.current && !popupRef.current.closed) {
      popupRef.current.focus();
      return;
    }

    // Debe abrirse de forma síncrona dentro del clic, antes de cualquier await
    const popup = openCenteredPopup('about:blank');
    const blocked = !popup;

    if (!blocked) {
      popupRef.current = popup;
      initiatedRef.current = true;
      setIsWaiting(true);

      stopPolling();
      pollRef.current = setInterval(() => {
        if (!popupRef.current || popupRef.current.closed) {
          // Se libera el botón; el listener sigue activo por si llega el resultado igualmente
          stopPolling();
          setIsWaiting(false);
        }
      }, POPUP_POLL_MS);
    }

    try {
      const response = await axios.post(ENDPOINTS.STEAM.LINK, { popup: !blocked });

      if (blocked) {
        // Popup bloqueado -> flujo clásico en la misma pestaña (vuelve a /settings?steam=...)
        window.location.href = response.data.url;
        return;
      }

      popup.location.href = response.data.url;
    } catch (error) {
      if (!blocked) {
        popup.close();
        initiatedRef.current = false;
        stopPolling();
        setIsWaiting(false);
      }
      latest.current.onError?.(
        error.response?.data?.error || 'Could not start Steam linking.'
      );
    }
  }, [stopPolling]);

  return { start, isWaiting };
};

export default useSteamLinkPopup;
