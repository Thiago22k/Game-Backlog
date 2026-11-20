import { useState, useEffect, useCallback } from 'react';

/**
 * Module-level singleton: tracks which card menu is currently open.
 * All card instances share this state without needing a Context Provider.
 */
let _currentOpenId = null;
const _listeners = new Set();

function _setGlobalOpen(id) {
    _currentOpenId = id;
    _listeners.forEach((fn) => fn(id));
}

/**
 * useCardMenu — ensures only one card options menu is open at a time.
 * @param {string|number} cardId - unique identifier for this card (e.g. game.id)
 */
export function useCardMenu(cardId) {
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        const handleChange = (id) => setIsOpen(id === cardId);
        _listeners.add(handleChange);
        return () => _listeners.delete(handleChange);
    }, [cardId]);

    useEffect(() => {
        if (!isOpen) return;

        const handleClickOutside = (event) => {
            // If the click is outside any element with data-card-menu="cardId", close it
            if (!event.target.closest(`[data-card-menu="${cardId}"]`)) {
                _setGlobalOpen(null);
            }
        };

        // Use mousedown instead of click to trigger before other click events if needed
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen, cardId]);

    const open = useCallback(() => _setGlobalOpen(cardId), [cardId]);

    const close = useCallback(() => {
        if (_currentOpenId === cardId) _setGlobalOpen(null);
    }, [cardId]);

    const toggle = useCallback(() => {
        _currentOpenId === cardId ? _setGlobalOpen(null) : _setGlobalOpen(cardId);
    }, [cardId]);

    return { isOpen, open, close, toggle };
}
