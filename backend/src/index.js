require('dotenv').config();

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');
const swaggerDefinition = require('./swagger');
const logger = require('./utils/logger');

const authRoutes = require('./routes/auth.routes');
const categoriesRoutes = require('./routes/categories.routes');
const eventsRoutes = require('./routes/events.routes');
const reportsRoutes = require('./routes/reports.routes');
const favoritesRoutes = require('./routes/favorites.routes');
const usersRoutes = require('./routes/users.routes');
const purchasesRouter = require('./routes/purchases.routes');
const ticketCatalogRoutes = require('./routes/ticketCatalog.routes');
const uploadRoutes = require('./routes/upload.routes');

const app = express();
const PORT = process.env.PORT || 3001;

const ALLOWED_ORIGINS = [
  'http://localhost:3002',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(
  cors({
    origin: ALLOWED_ORIGINS,
    credentials: true,
  })
);
app.use(express.json());

app.use(
  morgan('combined', {
    stream: {
      write: (message) => logger.info(message.trim(), { type: 'HTTP' }),
    },
  })
);

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDefinition));

app.use('/api/purchases', purchasesRouter);
app.use('/api/auth', authRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/admin/reports', reportsRoutes);
app.use('/api/favorites', favoritesRoutes);
app.use('/api/admin/users', usersRoutes);
app.use('/api/ticket-catalog', ticketCatalogRoutes);
app.use('/api/upload', uploadRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use((_req, res) => res.status(404).json({ error: 'Route not found' }));

app.use((err, _req, res, _next) => {
  logger.error('Unhandled error', { error: err.message, stack: err.stack });
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, '0.0.0.0', () => {
  logger.info(`Events backend running at http://localhost:${PORT}`);
  logger.info(`API docs: http://localhost:${PORT}/api-docs`);
});
