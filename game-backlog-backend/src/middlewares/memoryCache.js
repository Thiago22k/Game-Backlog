const cacheStore = new Map();

const memoryCache = (ttlSeconds = 180, maxEntries = 250) => {
    const ttlMs = ttlSeconds * 1000;

    return (req, res, next) => {
        if (req.method !== 'GET') return next();

        const key = req.originalUrl;
        const cached = cacheStore.get(key);
        const now = Date.now();

        if (cached && cached.expiresAt > now) {
            res.set('X-Cache', 'HIT');
            return res.status(cached.statusCode).json(cached.body);
        }

        const originalJson = res.json.bind(res);
        res.json = (body) => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
                if (cacheStore.size >= maxEntries) {
                    // Purgar expirados o la entrada más antigua
                    for (const [k, entry] of cacheStore.entries()) {
                        if (entry.expiresAt <= now) cacheStore.delete(k);
                    }
                    if (cacheStore.size >= maxEntries) {
                        const firstKey = cacheStore.keys().next().value;
                        if (firstKey) cacheStore.delete(firstKey);
                    }
                }
                cacheStore.set(key, {
                    statusCode: res.statusCode,
                    body,
                    expiresAt: Date.now() + ttlMs,
                });
            }
            res.set('X-Cache', 'MISS');
            return originalJson(body);
        };

        next();
    };
};

module.exports = { memoryCache };