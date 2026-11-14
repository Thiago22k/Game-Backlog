// Comunicación entre la ventana emergente de Steam y la ventana original.
//
// No se usa window.opener / postMessage porque el navegador puede cortar la referencia
// al abrir páginas externas (Steam) con políticas COOP. En su lugar se usa BroadcastChannel
// y, como respaldo, el evento "storage" de localStorage; ambos solo funcionan entre
// pestañas del MISMO origen, así que ningún otro sitio puede leer estos mensajes.

const CHANNEL_NAME = 'stackd-steam-auth';
const STORAGE_KEY = 'stackd:steam-auth';

export const makeId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

const post = (message) => {
  const payload = { ...message, id: message.id || makeId() };

  try {
    const channel = new BroadcastChannel(CHANNEL_NAME);
    channel.postMessage(payload);
    channel.close();
  } catch {
    // BroadcastChannel no disponible: queda el respaldo por localStorage
  }

  try {
    // El mensaje puede incluir un token de registro: se borra de inmediato.
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // localStorage bloqueado
  }
};

const subscribe = (handler) => {
  const seen = new Set();

  const dispatch = (message) => {
    if (!message || typeof message !== 'object' || !message.id) return;
    if (seen.has(message.id)) return; // llega por ambos canales
    seen.add(message.id);
    handler(message);
  };

  let channel = null;
  try {
    channel = new BroadcastChannel(CHANNEL_NAME);
    channel.onmessage = (event) => dispatch(event.data);
  } catch {
    channel = null;
  }

  const onStorage = (event) => {
    if (event.key !== STORAGE_KEY || !event.newValue) return;
    try {
      dispatch(JSON.parse(event.newValue));
    } catch {
      // mensaje corrupto: se ignora
    }
  };
  window.addEventListener('storage', onStorage);

  return () => {
    window.removeEventListener('storage', onStorage);
    if (channel) channel.close();
  };
};

export const steamAuthChannel = { post, subscribe };
