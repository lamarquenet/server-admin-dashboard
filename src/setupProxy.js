const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://192.168.8.209:8002',
      changeOrigin: true,
      pathRewrite: {
        '^/api': '/api'
      },
      // Don't fail the entire app if the server is down
      onError: (err, req, res) => {
        console.error('Proxy error:', err);
        res.status(502).json({ error: 'Server is offline or unreachable' });
      }
    })
  );
  
  // Socket.io proxy
  app.use(
    '/socket.io',
    createProxyMiddleware({
      target: 'http://192.168.8.209:8002',
      changeOrigin: true,
      ws: true,
      // Don't fail the entire app if the server is down
      onError: (err, req, res) => {
        console.error('Socket.io proxy error:', err);
        if (res.writeHead) {
          res.writeHead(502);
          res.end('Server is offline or unreachable');
        }
      }
    })
  );
};