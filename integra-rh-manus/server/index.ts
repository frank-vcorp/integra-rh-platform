import express from 'express';
import cors from 'cors';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { appRouter } from './routers';
import { createContext } from './context';

const app = express();

// Habilitamos CORS para permitir peticiones desde el frontend
app.use(cors());

// Creamos el middleware de tRPC y lo montamos en la ruta unificada /api/trpc
app.use(
  '/api/trpc',
  createExpressMiddleware({
    router: appRouter,
    createContext,
  })
);

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`🚀 Servidor API escuchando en http://localhost:${port}`);
});
