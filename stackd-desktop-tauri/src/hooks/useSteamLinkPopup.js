import { useCallback, useEffect, useRef, useState } from 'react';
import axios from '../api/axios';
import { ENDPOINTS } from '../utils/constants';
import { steamAuthChannel } from '../utils/steamAuthChannel';
import { openCenteredPopup, POPUP_POLL_MS } from './useSteamPopup';

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

      steamAuthChannel.post({ type: 'ack', id: `ack:${message.id}`, resultId: message.id });

      latest.current.onResult?.(message.status === 'linked' ? 'linked' : message.code || 'error');
    });

    return () => {
      unsubscribe();
      stopPolling();
    };
  }, [stopPolling]);

  const start = useCallback(async () => {
    if (popupRef.current && !popupRef.current.closed) {
      popupRef.current.focus();
      return;
    }

    const popup = openCenteredPopup('about:blank');
    const blocked = !popup;

    if (!blocked) {
      popupRef.current = popup;
      initiatedRef.current = true;
      setIsWaiting(true);

      stopPolling();
      pollRef.current = setInterval(() => {
        if (!popupRef.current || popupRef.current.closed) {
          stopPolling();
          setIsWaiting(false);
        }
      }, POPUP_POLL_MS);
    }

    try {
      const response = await axios.post(ENDPOINTS.STEAM.LINK, {
        popup: !blocked,
        origin: window.location.origin,
      });

      if (blocked) {
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