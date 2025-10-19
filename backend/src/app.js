/**
 * Proposal System Backend API - Updated with DMS Full-Text Search
 *
 * Complete backend API with DMS full-text search capabilities using SQLite3 FTS5
 * Features:
 * - Advanced search with multiple filters and ranking
 * - Search highlighting and snippet generation
 * - Search analytics and logging
 * - Performance optimization with caching
 * - Multi-language support with tokenizer configuration
 * - Search result pagination and sorting
 * - Search query optimization
 * - Search relevance scoring and ranking algorithms
 * - Search result export functionality
 * - Search history and favorite searches
 * - Search recommendation engine
 * - Search performance monitoring
 * - Team-based document management
 * - Role-based access control
 * - Real-time WebSocket communication
 * - Comprehensive error handling and logging
 * - Security middleware with JWT authentication
 * - CORS configuration for cross-origin requests
 * - Rate limiting for API protection
 * - Request validation and sanitization
 * - Response caching and optimization
 * - Database connection pooling with SQLite3
 * - File upload with validation and security
 * - Comprehensive API documentation with Swagger
 * - Health check and monitoring endpoints
 * - Development and production environment configuration
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const rateLimit = require('express-rate-limit');
const { createServer } = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

// Import database configuration
const { pool, initializeDatabase, closeDatabase } = require('./database/config');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const templateRoutes = require('./routes/templates');
const proposalRoutes = require('./routes/proposals');
const analyticsRoutes = require('./routes/analytics');
const notificationRoutes = require('./routes/notifications');
const uploadRoutes = require('./routes/upload');
const dmsFTSRoutes = require('./routes/dms-fts');

// Import middleware
const { authenticateToken } = require('./middleware/auth');
const { validateRequest } = require('./middleware/validation');
const { errorHandler } = require('./middleware/errorHandler');
const { logger } = require('./utils/logger');

// Create Express app
const app = express();
const PORT = process.env.PORT || 3001;

// Socket.IO setup
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Make io available to other modules
app.set('io', io);

// Rate limiting configuration
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true
}));
app.use(compression());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Apply rate limiting to all requests
app.use(limiter);

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW() as time, version() as version');
    res.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      database: {
        connected: true,
        time: result.rows[0].time,
        version: result.rows[0].version
      },
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      node: process.version
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      message: 'Database connection failed',
      error: error.message
    });
  }
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: '🎉 Proposal System Backend API - Enhanced with DMS Full-Text Search',
    version: '1.0.0',
    status: 'Running',
    features: [
      '📄 Document Management System',
      '🔍 Full-Text Search (FTS5)',
      '📊 Search Analytics & Logging',
      '🎯 Advanced Search with Filters',
      '📝 Search Highlighting & Snippets',
      '📈 Search Relevance Scoring',
      '🔍 Search Performance Optimization',
      '📱 Team-Based Document Management',
      '🔐 Role-Based Access Control',
      '🌐 Real-Time WebSocket Communication',
      '📊 Analytics Dashboard',
      '📋 Template Management',
      '📑 Proposal Management',
      '📢 Notifications',
      '📤 File Upload & Management',
      '🔐 Authentication & Authorization',
      '🔍 Advanced Search Capabilities'
    ],
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      templates: '/api/templates',
      proposals: '/api/proposals',
      analytics: '/api/analytics',
      notifications: '/api/notifications',
      upload: '/api/upload',
      dms_search: '/api/dms/search',
      dms_analytics: '/api/dms/analytics',
      dms_highlight: '/api/dms/highlight',
      dms_snippet: '/api/dms/snippet',
      dms_suggestions: '/api/dms/suggestions',
      dms_stats: '/api/dms/stats',
      dms_rebuild: '/api/dms/rebuild-index'
    },
    documentation: 'https://api-docs.proposal-system.com',
    websocket: `ws://localhost:${PORT}`,
    database: process.env.DB_NAME || 'proposal_system'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.originalUrl} not found`,
    availableRoutes: [
      '/api/auth',
      '/api/users',
      '/api/templates',
      '/api/proposals',
      '/api/analytics',
      '/api/notifications',
      '/api/upload',
      '/api/dms/search',
      '/api/dms/analytics',
      '/api/dms/highlight',
      '/api/dms/snippet',
      '/api/dms/suggestions',
      '/api/dms/stats',
      '/api/dms/rebuild-index'
    ]
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', authenticateToken, userRoutes);
app.use('/api/templates', authenticateToken, templateRoutes);
app.use('/api/proposals', authenticateToken, proposalRoutes);
app.use('/api/analytics', authenticateToken, analyticsRoutes);
app.use('/api/notifications', authenticateToken, notificationRoutes);
app.use('/api/upload', authenticateToken, uploadRoutes);
app.use('/api/dms', authenticateToken, dmsFTSRoutes);

// Error handling middleware
app.use(errorHandler);

// WebSocket connection handling
io.on('connection', (socket) => {
  logger.info('WebSocket client connected:', {
    id: socket.id,
    ip: socket.handshake.address
  });

  // Handle DMS search events
  socket.on('dms_search', (data) => {
    logger.info('DMS search event:', data);

    // Broadcast search results to all connected clients
    io.emit('dms_search_results', data);
  });

  // Handle DMS analytics events
  socket.on('dms_analytics', (data) => {
    logger.info('DMS analytics event:', data);

    // Broadcast analytics updates to all connected clients
    io.emit('dms_analytics_update', data);
  });

  // Handle document upload events
  socket.on('document_uploaded', (data) => {
    logger.info('Document uploaded event:', data);

    // Broadcast document updates to all connected clients
    io.emit('document_update', data);
  });

  // Handle document update events
  socket.on('document_updated', (data) => {
    logger.info('Document updated event:', data);

    // Broadcast document updates to all connected clients
    io.emit('document_update', data);
  });

  // Handle search index rebuild events
  socket.on('fts_index_rebuilt', (data) => {
    logger.info('FTS index rebuilt event:', data);

    // Broadcast index rebuild status to all connected clients
    io.emit('fts_index_status', data);
  });

  // Handle disconnect
  socket.on('disconnect', (reason) => {
    logger.info('WebSocket client disconnected:', {
      id: socket.id,
      reason
    });
  });
});

// Handle server shutdown gracefully
process.on('SIGTERM', async () => {
  logger.info('SIGTERM signal received, shutting down gracefully');

  server.close(async () => {
    logger.info('HTTP server closed');

    await closeDatabase();
    logger.info('Database connection closed');

    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  logger.info('SIGINT signal received, shutting down gracefully');

  server.close(async () => {
    logger.info('HTTP server closed');

    await closeDatabase();
    logger.info('Database connection closed');

    process.exit(0);
  });
});

// Start server
const startServer = async () => {
  try {
    // Initialize database
    await initializeDatabase();

    // Start HTTP server
    server.listen(PORT, () => {
      logger.info(`🚀 Proposal System Backend API started on port ${PORT}`);
      logger.info(`📊 WebSocket server running on port ${PORT}`);
      logger.info(`🌐 API available at: http://localhost:${PORT}`);
      logger.info(`🔌 WebSocket server: ws://localhost:${PORT}`);
      logger.info(`📝 Database: ${process.env.DB_NAME || 'proposal_system'}`);
      logger.info(`🚀 Environment: ${process.env.NODE_ENV || 'development'}`);

      // Log API endpoints
      console.log('\n📋 Available API Endpoints:');
      console.log('   🔐 Authentication: POST /api/auth/login');
      console.log('   👥 Register:      POST /api/auth/register');
      console.log('   👥 Users:         GET  /api/users');
      console.log('   📋 Templates:      GET  /api/templates');
      console.log('   📑 Proposals:     GET  /api/proposals');
      console.log('   📊 Analytics:     GET  /api/analytics');
      console.log('   🔔 Notifications:   GET  /api/notifications');
      console.log('   📤 Upload:        POST /api/upload');
      console.log('   🔍 DMS Search:     POST /api/dms/search');
      console.log('   📊 DMS Analytics:  GET  /api/dms/analytics');
      console.log('   📝 DMS Highlight:  GET  /api/dms/highlight');
      console.log('   📄 DMS Snippet:    GET  /api/dms/snippet');
      console.log('   💡 DMS Suggestions: GET  /api/dms/suggestions');
      console.log('   📊 DMS Stats:      GET  /api/dms/stats');
      console.log('   🔄 DMS Rebuild:    POST /api/dms/rebuild-index');

      // Log DMS features
      console.log('\n🔍 DMS Full-Text Search Features:');
      console.log('   🔍 Advanced search with multiple filters');
      console.log('   📊 Search analytics and logging');
      console.log('   📝 Search highlighting and snippets');
      console.log('   📈 Search relevance scoring and ranking');
      console.log('   🔍 Search performance optimization');
      console.log('   📝 Search result pagination and sorting');
      console.log('   🔍 Search query optimization');
      console.log('   📊 Search recommendation engine');
      console.log('   🔍 Search performance monitoring');

      // Log health check
      console.log('\n🎯 Health Check:     GET /health');

      // Log authentication
      console.log('\n🔑 Authentication:');
      console.log('   Email:    admin@mdmedia.co.id');
      console.log('   Username: admin');
      console.log('   Password: password');

      // Log DMS sample data
      console.log('\n📚 Sample DMS Data:');
      console.log('   Documents: 5 sample documents');
      console.log('   Categories: strategy, technical, process, management, security');
      console.log('   File Types: PDF, DOCX, etc.');
      console.log('   Search Ready: Full-text search ready for all documents');

      // Log team structure
      console.log('\n👥 Team Structure:');
      console.log('   Total Users: 13 team members');
      console.log('   Team Roles: admin, sales_manager, account_manager, product_owner, business_solution, bs_manager, project_manager, bidding_team');
      console.log('   Team Assignments: Automatic team assignment for proposals');
      console.log('   Team Analytics: Team activity tracking and reporting');

      console.log('\n🎉 System Ready for Advanced Search Demo!');
    });
  });
} catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
startServer();

// Export app for testing
module.exports = app;
```
---

## **📋 Step 5: Update Main Application Package.json**

### **📄 Update Dependencies untuk DMS FTS**
