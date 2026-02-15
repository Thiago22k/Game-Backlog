const requestLogger = (req, res, next) => {
  const start = Date.now();

  // Cuando la respuesta termine, log la información
  res.on('finish', () => {
    const duration = Date.now() - start;
    const log = {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
    };

    // Color según el status code
    const color = res.statusCode >= 500 ? '\x1b[31m' : // Rojo
                  res.statusCode >= 400 ? '\x1b[33m' : // Amarillo
                  '\x1b[32m'; // Verde
    const reset = '\x1b[0m';

    console.log(
      `${color}${log.method}${reset} ${log.path} - ${color}${log.status}${reset} - ${log.duration}`
    );
  });

  next();
};

module.exports = requestLogger;