const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes       = require('./routes/auth.routes');
const categoriesRoutes = require('./routes/categories.routes');
const eventsRoutes     = require('./routes/events.routes');
const reportsRoutes    = require('./routes/reports.routes');
const favoritesRoutes  = require('./routes/favorites.routes');
const usersRoutes = require('./routes/users.routes');
const purchasesRouter = require('./routes/purchases.routes');
const ticketCatalogRoutes    = require('./routes/ticketCatalog.routes');

const app  = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: [
    'http://localhost:3002',
    'http://10.111.161.71:3002'
  ],
  credentials: true
}));
app.use(express.json());

app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});


app.use('/api/purchases', purchasesRouter);
app.use('/api/auth',          authRoutes);
app.use('/api/categories',    categoriesRoutes);
app.use('/api/events',        eventsRoutes);
app.use('/api/admin/reports', reportsRoutes);
app.use('/api/favorites',     favoritesRoutes);
app.use('/api/admin/users', usersRoutes);
app.use('/api/ticket-catalog',      ticketCatalogRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use((_req, res) => res.status(404).json({ error: 'Route not found' }));

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running at http://localhost:${PORT}`);
});