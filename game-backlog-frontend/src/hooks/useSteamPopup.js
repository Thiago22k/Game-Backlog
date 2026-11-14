import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL, ENDPOINTS } from '../utils/constants';
import { steamAuthChannel } from '../utils/steamAuthChannel';

export const STEAM_AUTH_ERRORS = {
  cancelled: 'Steam sign-in was cancelled.',
  invalid_state: 'Your Steam login session expired. Please try again.',
  verification_failed: 'We could not verify your Steam sign-in. Please try again.',
  banned: 'Your account has been suspended for violating community guidelines.',
  error: 'Something went wrong signing in with Steam.',
  // Solo aplican a la vinculación desde Ajustes
  already_linked: 'That Steam account is already linked to another Stackd account.',
  already_has_account: 'Your account already has a Steam account linked.',
};

const POPUP_NAME = 'stackd-steam-auth';
const POPUP_WIDTH = 520;
const POPUP_HEIGHT = 720;
export const POPUP_POLL_MS = 500;

const STEAM_LOGIN_URL = `${API_BASE_URL}${ENDPOINTS.STEAM.LOGIN}`;

export const openCenteredPopup = (url) => {
  const left = Math.max(0, Math.round(window.screenX + (window.outerWidth - POPUP_WIDTH) / 2));
  const top = Math.max(0, Math.round(window.screenY + (window.outerHeight - POPUP_HEIGHT) / 2));

  return window.open(
    url,
    POPUP_NAME,
    `popup=yes,width=${POPUP_WIDTH},height=${POPUP_HEIGHT},left=${left},top=${top}`
  );
};

const isRelative = (url) => url && url.startsWith('/') && !url.startsWith('//');

/**
 * Inicia sesión / registro con Steam en una ventana emergente, sin sacar al usuario de la
 * página actual. La ventana termina en /auth/steam/callback, que avisa por steamAuthChannel
 * y se cierra sola.
 *
 *  - Cuenta existente  -> se refresca la sesión y se navega al destino guardado (o "/").
 *  - Cuenta nueva      -> se navega a /register/steam para elegir el username.
 *  - Error / cancelado -> se llama a onError(mensaje).
 *
 * Si el navegador bloquea el popup, se usa la redirección en la misma pestaña como respaldo.
 */
const useSteamPopup = ({ onError } = {}) => {
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const [isWaiting, setIsWaiting] = useState(false);

  const popupRef = useRef(null);
  const pollRef = useRef(null);
  const initiatedRef = useRef(false);

  // Siempre la versión más reciente de los callbacks, sin re-suscribir el canal
  const latest = useRef({ onError, navigate, refreshUser });
  useEffect(() => {
    latest.current = { onError, navigate, refreshUser };
  });

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => {
    const unsubscribe = steamAuthChannel.subscribe(async (message) => {
      // Solo reaccionar si ESTA página inició el flujo (otras pestañas abiertas se ignoran)
      // Los resultados de vinculación (flow=link) los atiende useSteamLinkPopup
      if (message.type !== 'result' || message.flow === 'link' || !initiatedRef.current) return;
      initiatedRef.current = false;

      stopPolling();
      setIsWaiting(false);

      // Confirma a la ventana emergente que el resultado llegó, para que pueda cerrarse
      steamAuthChannel.post({ type: 'ack', id: `ack:${message.id}`, resultId: message.id });

      const { onError: handleError, navigate: go, refreshUser: refresh } = latest.current;

      if (message.status === 'success') {
        const result = await refresh();
        if (!result.success) {
          handleError?.(STEAM_AUTH_ERRORS.error);
          return;
        }
        const redirect = sessionStorage.getItem('redirectAfterLogin');
        sessionStorage.removeItem('redirectAfterLogin');
        go(isRelative(redirect) ? redirect : '/');
        return;
      }

      if (message.status === 'signup' && message.token) {
        go(`/register/steam?token=${encodeURIComponent(message.token)}`);
        return;
      }

      handleError?.(STEAM_AUTH_ERRORS[message.code] || STEAM_AUTH_ERRORS.error);
    });

    return () => {
      unsubscribe();
      stopPolling();
    };
  }, [stopPolling]);

  const start = useCallback(() => {
    // Si ya hay una ventana abierta, solo traerla al frente
    if (popupRef.current && !popupRef.current.closed) {
      popupRef.current.focus();
      return;
    }

    const popup = openCenteredPopup(`${STEAM_LOGIN_URL}?popup=1`);

    // Popup bloqueado por el navegador -> flujo clásico en la misma pestaña
    if (!popup) {
      window.location.href = STEAM_LOGIN_URL;
      return;
    }

    popupRef.current = popup;
    initiatedRef.current = true;
    setIsWaiting(true);

    stopPolling();
    pollRef.current = setInterval(() => {
      if (!popupRef.current || popupRef.current.closed) {
        // El usuario cerró la ventana sin terminar: se libera el botón. El listener sigue
        // activo (initiatedRef) por si el navegador reporta "closed" tras un cambio de COOP
        // y el resultado llega igualmente.
        stopPolling();
        setIsWaiting(false);
      }
    }, POPUP_POLL_MS);
  }, [stopPolling]);

  return { start, isWaiting };
};

export default useSteamPopup;
