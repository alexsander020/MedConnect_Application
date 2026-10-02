import 'dotenv/config';
import app from './app';
import http from 'http';
import { Server } from 'socket.io';

const PORT = process.env.PORT || 3000;

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PATCH']
  }
});

import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'medconnect_super_secret_key';

// Middleware de Autenticação para WebSocket
io.use((socket, next) => {
  const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');
  if (!token) {
    // Permitir conexão apenas autenticada, ou rejeitar se não houver token
    return next(new Error('Autenticação requerida'));
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    (socket as any).user = decoded;
    next();
  } catch (err) {
    next(new Error('Token inválido'));
  }
});

io.on('connection', (socket) => {
  const user = (socket as any).user;
  console.log(`User connected via WebSocket: ${socket.id} (User: ${user?.id || 'unknown'})`);

  // O usuário entra automaticamente na sua sala pessoal segura para receber notificações
  if (user?.id) {
    socket.join(user.id);
  }

  // Entrar em uma sala específica (verificando autorização)
  socket.on('join_room', (roomId) => {
    if (user?.role === 'ADMIN' || user?.id === roomId) {
      socket.join(roomId);
      console.log(`Socket ${socket.id} joined room ${roomId}`);
    } else {
      console.warn(`Socket ${socket.id} tentou entrar na sala não autorizada: ${roomId}`);
    }
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

// Exporta o io para usar nos controllers
export { io, server };

if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Swagger docs available at http://localhost:${PORT}/api-docs`);
  });
}
