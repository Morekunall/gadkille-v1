require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const connectDB = require('./config/db');
const ensureAdminUser = require('./utils/ensureAdminUser');
const ensureSeedForts = require('./utils/ensureSeedForts');
const repairFortMedia = require('./utils/repairFortMedia');
const verifyEmailConfig = require('./utils/verifyEmailConfig');

const authRoutes = require('./routes/authRoutes');
const fortRoutes = require('./routes/fortRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const vendorRoutes = require('./routes/vendorRoutes');
const tripRoutes = require('./routes/tripRoutes');
const userRoutes = require('./routes/userRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const inquiryRoutes = require('./routes/inquiryRoutes');
const historyRoutes = require('./routes/historyRoutes');

const app = express();

app.set('trust proxy', 1);

// Security headers (XSS, clickjacking, etc.)
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// Middleware
const allowedOrigin = process.env.CLIENT_URL || 'http://localhost:5173';
const extraOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const isDev = process.env.NODE_ENV !== 'production';

const isAllowedCorsOrigin = (origin) => {
  if (!origin) return true;
  if (origin === allowedOrigin || extraOrigins.includes(origin)) return true;
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) return true;
  if (/^https?:\/\/192\.168\.\d{1,3}\.\d{1,3}(:\d+)?$/i.test(origin)) return true;
  if (/^https?:\/\/10\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?$/i.test(origin)) return true;
  if (/^https?:\/\/[a-z0-9-]+(\.[a-z0-9-]+)*\.(ngrok-free\.app|ngrok-free\.dev|ngrok\.app|ngrok\.io)$/i.test(origin)) {
    return true;
  }
  if (/^https:\/\/[a-z0-9-]+(\.[a-z0-9-]+)*\.vercel\.app$/i.test(origin)) return true;
  if (/^https:\/\/[a-z0-9-]+(\.[a-z0-9-]+)*\.onrender\.com$/i.test(origin)) return true;
  return false;
};

app.use(
  cors({
    origin: (origin, callback) => {
      if (isDev || isAllowedCorsOrigin(origin)) {
        return callback(null, true);
      }
      console.warn(`CORS blocked for origin: ${origin}`);
      return callback(null, false);
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '10kb' }));
app.use(morgan('dev'));
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
app.use('/images', express.static(path.join(process.cwd(), 'uploads', 'images')));

// Root URL (Render “Open app” / health probes often GET `/` — API is under `/api`)
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Gadkille API',
    docs: 'Use /api/health and routes under /api/*',
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/forts', fortRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/vendors', vendorRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/users', userRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/inquiries', inquiryRoutes);
app.use('/api/history', historyRoutes);

// Basic health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Gadkille API running' });
});

// Global error handler fallback
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message || err);
  if (res.headersSent) return next(err);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    message:
      isDev && err.message
        ? err.message
        : status === 403
          ? 'Request not allowed'
          : 'Something went wrong',
  });
});

const PORT = Number(process.env.PORT) || 5000;
const HOST = '0.0.0.0';

const startServer = async () => {
  app.listen(PORT, HOST, () => {
    console.log(`Server listening on ${HOST}:${PORT}`);
  });

  try {
    await connectDB();
    await ensureAdminUser();
  } catch (error) {
    console.error('Startup initialization error:', error.message);
  }
};

startServer();

