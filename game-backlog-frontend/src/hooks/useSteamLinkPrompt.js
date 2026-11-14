import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import axios from '../api/axios';
import { ENDPOINTS } from '../utils/constants';
import { useAuth } from '../context/AuthContext';
import useSteamLinkPopup from './useSteamLinkPopup';
import { STEAM_AUTH_ERRORS } from './useSteamPopup';

const LINK_ERRORS = {
  ...STEAM_AUTH_ERRORS,
  error: 'Something went wrong linking your Steam account.',
};

const dismissKey = (userId) => `stackd:steam-banner-dismissed:${userId}`;

const readDismissed = (userId) => {
  try {
    return localStorage.getItem(dismissKey(userId)) === '1';
  } catch {
    return false;
  }
};

/**
 * Estado compartido de la recomendación "vincula tu Steam" en el perfil propio.
 * Se usa UNA vez (en ProfileLayout) y alimenta tanto al banner como al estado vacío de la
 * pestaña de juegos, para que vincular desde uno actualice al otro.
 *
 *  - bannerMode: 'link' | 'import' | null  (el banner respeta el "descartar")
 *  - emptyMode:  'link' | 'import' | null  (el estado vacío siempre invita si no hay Steam)
 *
 * La gestión completa de la conexión sigue estando en Ajustes.
 */
const useSteamLinkPrompt = ({ enabled = true, onImported } = {}) => {
  const { user } = useAuth();
  const userId = user?.id;
  const active = Boolean(enabled && userId);

  const storedDismissed = useMemo(() => (userId ? readDismissed(userId) : true), [userId]);
  const [dismissedFor, setDismissedFor] = useState(null); // descartado en esta visita
  const dismissed = storedDismissed || dismissedFor === userId;

  const [linked, setLinked] = useState(null); // null = desconocido / cargando
  const [justLinked, setJustLinked] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);

  useEffect(() => {
    if (!active) return undefined;

    let cancelled = false;
    axios
      .get(ENDPOINTS.STEAM.STATUS)
      .then((response) => {
        if (!cancelled) setLinked(Boolean(response.data?.linked));
      })
      .catch(() => {
        // Si no se puede saber el estado, mejor no mostrar nada
        if (!cancelled) setLinked(null);
      });

    return () => {
      cancelled = true;
    };
  }, [active, userId]);

  const { start: startLink, isWaiting } = useSteamLinkPopup({
    onResult: (code) => {
      if (code === 'linked') {
        setLinked(true);
        setJustLinked(true);
        toast.success('Steam account linked successfully!');
      } else {
        toast.error(LINK_ERRORS[code] || LINK_ERRORS.error);
      }
    },
    onError: (message) => toast.error(message),
  });

  const dismissBanner = useCallback(() => {
    if (justLinked) {
      setJustLinked(false);
      return;
    }
    try {
      localStorage.setItem(dismissKey(userId), '1');
    } catch {
      // sin localStorage: se oculta solo durante esta visita
    }
    setDismissedFor(userId);
  }, [justLinked, userId]);

  const handleImported = useCallback(() => {
    setJustLinked(false);
    onImported?.();
  }, [onImported]);

  const needsLink = active && linked === false;

  let bannerMode = null;
  let emptyMode = null;
  if (active) {
    if (justLinked) {
      bannerMode = 'import';
      emptyMode = 'import';
    } else if (needsLink) {
      bannerMode = dismissed ? null : 'link';
      emptyMode = 'link';
    }
  }

  return {
    bannerMode,
    emptyMode,
    isWaiting,
    startLink,
    dismissBanner,
    importModalOpen,
    openImport: () => setImportModalOpen(true),
    closeImport: () => setImportModalOpen(false),
    handleImported,
  };
};

export default useSteamLinkPrompt;
