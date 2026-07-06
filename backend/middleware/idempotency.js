const cache = new Map();

// Periodic cleanup of expired keys (runs every 60 seconds)
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of cache.entries()) {
    if (record.expiresAt < now) {
      cache.delete(key);
    }
  }
}, 60000);

export const idempotencyCheck = (req, res, next) => {
  const key = req.headers['x-idempotency-key'];
  
  if (!key) {
    return res.status(400).json({ 
      error: 'Idempotency validation failed', 
      message: 'X-Idempotency-Key header is required for this operation.' 
    });
  }

  const cachedRecord = cache.get(key);

  if (cachedRecord) {
    if (cachedRecord.status === 'processing') {
      return res.status(409).json({ 
        error: 'Conflict', 
        message: 'A duplicate request is currently being processed. Please retry shortly.' 
      });
    }
    
    if (cachedRecord.status === 'completed') {
      console.log(`[Idempotency] Serving cached response for key: ${key}`);
      res.status(cachedRecord.statusCode);
      return res.json(cachedRecord.body);
    }
  }

  // Register in-flight request
  cache.set(key, {
    status: 'processing',
    expiresAt: Date.now() + 10 * 60 * 1000 // 10 minutes TTL
  });

  // Intercept json response
  const originalJson = res.json;
  res.json = function (body) {
    cache.set(key, {
      status: 'completed',
      statusCode: res.statusCode,
      body: body,
      expiresAt: Date.now() + 10 * 60 * 1000
    });
    return originalJson.call(this, body);
  };

  // Intercept send response in case json isn't called directly
  const originalSend = res.send;
  res.send = function (body) {
    const current = cache.get(key);
    if (current && current.status === 'processing') {
      let parsedBody = body;
      if (typeof body === 'string') {
        try {
          parsedBody = JSON.parse(body);
        } catch (e) {
          // Keep string body
        }
      }
      cache.set(key, {
        status: 'completed',
        statusCode: res.statusCode,
        body: parsedBody,
        expiresAt: Date.now() + 10 * 60 * 1000
      });
    }
    return originalSend.call(this, body);
  };

  // If request fails on server level, clear the key so the user can retry
  res.on('finish', () => {
    if (res.statusCode >= 500) {
      console.log(`[Idempotency] Request failed with status ${res.statusCode}. Purging key ${key}`);
      cache.delete(key);
    }
  });

  next();
};
