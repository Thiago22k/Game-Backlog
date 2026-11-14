import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import usePageTitle from '../../hooks/usePageTitle';
import { STEAM_AUTH_ERRORS } from '../../hooks/useSteamPopup';
import { makeId, steamAuthChannel } from '../../utils/steamAuthChannel';
import SteamIcon from '../../assets/steam-icon.svg?react';

// Si la ventana original no confirma la recepción en este tiempo (p. ej. se cerró),
// se ofrece continuar en esta misma pestaña en vez de cerrarla.
const ACK_TIMEOUT_MS = 2500;
const CLOSE_FALLBACK_MS = 600;

const COPY = {
  linked: {
    title: 'Steam account linked',
    text: 'Taking you back to Stackd. This window will close automatically.',
  },
  success: {
    title: "You're signed in",
    text: 'Taking you back to Stackd. This window will close automatically.',
  },
  signup: {
    title: 'Steam account verified',
    text: 'Taking you back to Stackd to finish setting up. This window will close automatically.',
  },
  error: {
    title: 'Steam sign-in failed',
    text: 'This window will close automatically.',
  },
};

/**
 * Destino de la ventana emergente de Steam. Entrega el resultado a la ventana original
 * (que sigue abierta en la página donde estaba el usuario) y se cierra sola.
 */
const SteamCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [needsManualContinue, setNeedsManualContinue] = useState(false);

  usePageTitle('Steam Sign In');

  // flow=link: vinculación desde Ajustes; sin flow: inicio de sesión / registro
  const flow = searchParams.get('flow') === 'link' ? 'link' : 'login';
  const rawStatus = searchParams.get('status');
  const allowedStatuses = flow === 'link' ? ['linked'] : ['success', 'signup'];
  const status = allowedStatuses.includes(rawStatus) ? rawStatus : 'error';
  const code = searchParams.get('code') || 'error';
  const token = flow === 'login' ? searchParams.get('token') || '' : '';

  // Mismo id aunque React monte el efecto dos veces (StrictMode): el receptor deduplica
  const resultIdRef = useRef(makeId());

  useEffect(() => {
    const resultId = resultIdRef.current;
    let closeTimer = null;

    const unsubscribe = steamAuthChannel.subscribe((message) => {
      if (message.type !== 'ack' || message.resultId !== resultId) return;

      window.close();
      // Si el navegador no permite cerrarla, se muestra el botón de respaldo
      closeTimer = setTimeout(() => setNeedsManualContinue(true), CLOSE_FALLBACK_MS);
    });

    steamAuthChannel.post({ type: 'result', id: resultId, flow, status, code, token });

    const ackTimer = setTimeout(() => setNeedsManualContinue(true), ACK_TIMEOUT_MS);

    return () => {
      unsubscribe();
      clearTimeout(ackTimer);
      clearTimeout(closeTimer);
    };
  }, [flow, status, code, token]);

  const handleContinue = () => {
    if (flow === 'link') {
      navigate(`/settings?steam=${encodeURIComponent(status === 'linked' ? 'linked' : code)}`, {
        replace: true,
      });
    } else if (status === 'success') {
      // La sesión ya quedó iniciada; un reload completo asegura que el contexto la recoja
      window.location.replace('/');
    } else if (status === 'signup' && token) {
      navigate(`/register/steam?token=${encodeURIComponent(token)}`, { replace: true });
    } else {
      navigate(`/login?steam=${encodeURIComponent(code)}`, { replace: true });
    }
  };

  const isError = status === 'error';
  const copy = {
    ...COPY[status],
    ...(isError && flow === 'link' ? { title: 'Steam linking failed' } : {}),
  };

  return (
    <div className="min-h-screen bg-primary-navy-ultra-dark flex items-center justify-center px-6">
      <div className="w-full max-w-sm text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00adee]/15 text-[#00adee] text-xs font-medium mb-6">
          <SteamIcon className="w-3.5 h-3.5 fill-current" />
          Steam
        </div>

        <div className="flex justify-center mb-4">
          {isError ? (
            <AlertCircle size={48} className="text-red-400" />
          ) : (
            <CheckCircle2 size={48} className="text-primary-cyan" />
          )}
        </div>

        <h1 className="text-2xl font-bold text-white mb-2 tracking-tight">{copy.title}</h1>

        {isError && (
          <p className="text-sm text-red-300 mb-2">
            {STEAM_AUTH_ERRORS[code] || STEAM_AUTH_ERRORS.error}
          </p>
        )}

        <p className="text-sm text-gray-400">{copy.text}</p>

        {needsManualContinue ? (
          <div className="mt-6">
            <p className="text-xs text-gray-500 mb-3">
              We couldn't close this window automatically.
            </p>
            <button
              type="button"
              onClick={handleContinue}
              className="w-full h-11 bg-primary-yellow hover:bg-yellow-400 text-primary-navy font-bold rounded-md transition-all text-sm"
            >
              {isError ? (flow === 'link' ? 'Back to settings' : 'Back to login') : 'Continue to Stackd'}
            </button>
          </div>
        ) : (
          <div className="mt-6 flex justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-yellow border-t-transparent" />
          </div>
        )}
      </div>
    </div>
  );
};

export default SteamCallback;
