import https from 'https';

const EC2_HOST = 'ec2-100-50-120-115.compute-1.amazonaws.com';

const agent = new https.Agent({
  rejectUnauthorized: false, // Permitir certificado auto-firmado de AWS EC2
  keepAlive: true,
  timeout: 15000,
});

function getRequestBody(req) {
  return new Promise((resolve, reject) => {
    if (req.body !== undefined && req.body !== null) {
      if (Buffer.isBuffer(req.body)) return resolve(req.body);
      if (typeof req.body === 'object') return resolve(Buffer.from(JSON.stringify(req.body)));
      return resolve(Buffer.from(String(req.body)));
    }
    if (typeof req.on !== 'function') {
      return resolve(null);
    }
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(chunks.length > 0 ? Buffer.concat(chunks) : null));
    req.on('error', (err) => reject(err));
  });
}

function sendJson(res, statusCode, data) {
  if (typeof res.status === 'function' && typeof res.json === 'function') {
    return res.status(statusCode).json(data);
  }
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  });
  res.end(JSON.stringify(data));
}

export default async function handler(req, res) {
  // Configuración de cabeceras CORS universales
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

  if (req.method === 'OPTIONS') {
    return res.writeHead ? res.writeHead(200).end() : res.end();
  }

  try {
    // 1. Determinar la ruta de destino dentro de EC2
    let targetPath = '';

    if (req.query && req.query.__subpath !== undefined) {
      const sub = Array.isArray(req.query.__subpath)
        ? req.query.__subpath.join('/')
        : req.query.__subpath;
      targetPath = '/' + String(sub).replace(/^\//, '');
    } else if (req.query && req.query.path !== undefined) {
      const sub = Array.isArray(req.query.path)
        ? req.query.path.join('/')
        : req.query.path;
      targetPath = '/' + String(sub).replace(/^\//, '');
    } else if (req.url && !req.url.startsWith('/api/proxy')) {
      targetPath = req.url.replace(/^\/api/, '') || '/';
      const qIndex = targetPath.indexOf('?');
      if (qIndex !== -1) {
        targetPath = targetPath.substring(0, qIndex);
      }
    } else {
      targetPath = '/';
    }

    // 2. Extraer parámetros query originales ignorando las variables de ruteo de Vercel
    const queryParams = new URLSearchParams();
    if (req.query) {
      for (const [key, val] of Object.entries(req.query)) {
        if (key !== '__subpath' && key !== 'path') {
          if (Array.isArray(val)) {
            val.forEach((v) => queryParams.append(key, v));
          } else if (val !== undefined && val !== null) {
            queryParams.append(key, String(val));
          }
        }
      }
    }

    const qs = queryParams.toString();
    const fullTargetPath = targetPath + (qs ? `?${qs}` : '');
    const targetUrl = `https://${EC2_HOST}${fullTargetPath}`;

    // 3. Preparar cuerpo de la petición
    const bodyData = await getRequestBody(req);

    // 4. Copiar y ajustar cabeceras hacia EC2
    const headers = { ...(req.headers || {}) };
    delete headers.host;
    delete headers.connection;
    delete headers['content-length'];

    headers.host = EC2_HOST;
    if (bodyData && bodyData.length > 0) {
      headers['content-length'] = bodyData.length;
      if (!headers['content-type']) {
        headers['content-type'] = 'application/json';
      }
    }

    // 5. Enviar petición al backend de AWS EC2
    const proxyReq = https.request(
      targetUrl,
      {
        method: req.method,
        headers,
        agent,
        timeout: 15000,
      },
      (proxyRes) => {
        const responseHeaders = { ...(proxyRes.headers || {}) };
        responseHeaders['access-control-allow-origin'] = '*';
        res.writeHead(proxyRes.statusCode || 200, responseHeaders);
        proxyRes.pipe(res);
      }
    );

    proxyReq.on('timeout', () => {
      proxyReq.destroy();
      if (!res.headersSent) {
        sendJson(res, 504, { error: 'Gateway Timeout', message: 'AWS EC2 tardó más de 15s en responder' });
      }
    });

    proxyReq.on('error', (err) => {
      console.error('[Proxy Error to EC2]:', err.message);
      if (!res.headersSent) {
        sendJson(res, 502, {
          error: 'Proxy to AWS EC2 failed',
          details: err.message,
          targetUrl,
        });
      }
    });

    if (bodyData && bodyData.length > 0) {
      proxyReq.write(bodyData);
    }
    proxyReq.end();
  } catch (err) {
    console.error('[Vercel Handler Error]:', err);
    if (!res.headersSent) {
      sendJson(res, 500, { error: 'Internal Serverless Proxy Error', details: err.message });
    }
  }
}
