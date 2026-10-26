/* Local development server.
 *
 *   npm run dev    tsx server.ts
 *
 * Serves the API and mounts Vite in middleware mode, so a single origin
 * answers both the app and /api/*, which is what the client code assumes.
 *
 * The routes themselves now live in src/server/apiRoutes.ts. They used to be
 * inline here, but production is Vercel, where nothing calls listen(): the
 * build is served from dist/ by the platform and the API runs as a function
 * (api/index.ts). Both register the same routes from the same file, so a
 * route added for local development is live in production rather than
 * needing to be written a second time.
 */
import express from 'express';
import http from 'http';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { registerApiRoutes } from './src/server/apiRoutes';
import { registerAdminAuth } from './src/server/adminAuth';

async function createServer() {
  const app = express();
  const server = http.createServer(app);
  const port = Number(process.env.PORT) || 3000;

  app.use(express.json());
  registerAdminAuth(app);
  registerApiRoutes(app);

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
        watch: null,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve('dist/index.html'));
    });
  }

  server.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
  });
}

createServer();
