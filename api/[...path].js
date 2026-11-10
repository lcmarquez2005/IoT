import https from 'https';

const agent = new https.Agent({
  rejectUnauthorized: false,
});

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const targetPath = req.url.replace(/^\/api/, '') || '/';
  const targetUrl = `https://ec2-100-50-120-115.compute-1.amazonaws.com${targetPath}`;

  const headers = { ...req.headers };
  delete headers.host;
  delete headers.connection;

  const proxyReq = https.request(
    targetUrl,
    {
      method: req.method,
      headers: {
        ...headers,
        host: 'ec2-100-50-120-115.compute-1.amazonaws.com',
      },
      agent,
    },
    (proxyRes) => {
      res.writeHead(proxyRes.statusCode || 200, proxyRes.headers);
      proxyRes.pipe(res);
    }
  );

  proxyReq.on('error', (err) => {
    console.error('Proxy Error:', err);
    res.status(502).json({ error: 'Proxy to AWS EC2 failed', details: err.message });
  });

  if (req.body) {
    if (typeof req.body === 'string' || Buffer.isBuffer(req.body)) {
      proxyReq.write(req.body);
    } else {
      proxyReq.write(JSON.stringify(req.body));
    }
  }

  proxyReq.end();
}
