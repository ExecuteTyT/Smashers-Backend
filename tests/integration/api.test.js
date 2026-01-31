/**
 * Integration Tests for API Endpoints
 */

const request = require('supertest');

// Mock Prisma before requiring app
jest.mock('../../src/config/database', () => {
  const mockPrisma = {
    category: {
      findMany: jest.fn().mockResolvedValue([
        { id: 1, name: 'Тренировка', sortOrder: 1, isVisible: true, lastUpdated: new Date() }
      ]),
      findUnique: jest.fn().mockResolvedValue({
        id: 1,
        name: 'Тренировка',
        sortOrder: 1,
        isVisible: true,
        lastUpdated: new Date(),
        sessions: []
      }),
      count: jest.fn().mockResolvedValue(1)
    },
    membership: {
      findMany: jest.fn().mockResolvedValue([
        {
          id: 1,
          name: 'Абонемент 8',
          type: 'Обычный абик',
          price: 5000,
          sessionCount: 8,
          isVisible: true,
          lastUpdated: new Date()
        }
      ]),
      findUnique: jest.fn().mockResolvedValue({
        id: 1,
        name: 'Абонемент 8',
        type: 'Обычный абик',
        price: 5000,
        sessionCount: 8,
        isVisible: true,
        lastUpdated: new Date()
      }),
      count: jest.fn().mockResolvedValue(1)
    },
    session: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockResolvedValue(null),
      count: jest.fn().mockResolvedValue(0)
    },
    location: {
      findMany: jest.fn().mockResolvedValue([
        {
          id: 1,
          name: 'Зал 1',
          showLocation: true,
          showOnBookingScreen: true,
          description: 'Основной зал',
          sortOrder: 1,
          lastUpdated: new Date()
        }
      ]),
      findUnique: jest.fn().mockResolvedValue({
        id: 1,
        name: 'Зал 1',
        showLocation: true,
        showOnBookingScreen: true,
        description: 'Основной зал',
        sortOrder: 1,
        lastUpdated: new Date(),
        sessions: []
      }),
      count: jest.fn().mockResolvedValue(1)
    },
    bookingRequest: {
      create: jest.fn().mockResolvedValue({
        id: 1,
        name: 'Test User',
        phone: '+79991234567',
        source: 'contact_form',
        createdAt: new Date(),
        sentToTelegram: false
      }),
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0)
    },
    syncStatus: {
      findFirst: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockResolvedValue({})
    },
    $queryRaw: jest.fn().mockResolvedValue([{ 1: 1 }]),
    $disconnect: jest.fn()
  };

  return {
    prisma: mockPrisma,
    testConnection: jest.fn().mockResolvedValue(true),
    disconnectPrisma: jest.fn()
  };
});

// Mock telegram service
jest.mock('../../src/services/telegram.service', () => ({
  sendBookingNotification: jest.fn().mockResolvedValue(true),
  sendSystemAlert: jest.fn().mockResolvedValue(true)
}));

// Mock google sheets service
jest.mock('../../src/services/googleSheets.service', () => ({
  initializeAllSheets: jest.fn().mockResolvedValue(undefined),
  updateCategories: jest.fn().mockResolvedValue({ added: 0, updated: 0 }),
  updateLocations: jest.fn().mockResolvedValue({ added: 0, updated: 0 }),
  updateMemberships: jest.fn().mockResolvedValue({ added: 0, updated: 0 }),
  updateSessions: jest.fn().mockResolvedValue({ added: 0, updated: 0 })
}));

// Mock jobs
jest.mock('../../src/jobs/parser.job', () => ({
  startParserJob: jest.fn(),
  stopParserJob: jest.fn()
}));

jest.mock('../../src/jobs/sync.job', () => ({
  startSyncJob: jest.fn(),
  stopSyncJob: jest.fn()
}));

// Set environment
process.env.NODE_ENV = 'test';
process.env.API_KEY = 'test_api_key';

// Now require app
const app = require('../../src/app');

describe('API Endpoints', () => {
  describe('GET /api/health', () => {
    it('should return health status', async () => {
      const res = await request(app).get('/api/health');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.status).toBeDefined();
    });
  });

  describe('GET /api/categories', () => {
    it('should return list of categories', async () => {
      const res = await request(app).get('/api/categories');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('GET /api/categories/:id', () => {
    it('should return category by id', async () => {
      const res = await request(app).get('/api/categories/1');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(1);
    });
  });

  describe('GET /api/memberships', () => {
    it('should return list of memberships', async () => {
      const res = await request(app).get('/api/memberships');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('GET /api/locations', () => {
    it('should return list of locations', async () => {
      const res = await request(app).get('/api/locations');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('GET /api/sessions', () => {
    it('should return list of sessions', async () => {
      const res = await request(app).get('/api/sessions');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should accept date filter', async () => {
      const res = await request(app).get('/api/sessions?date=2024-01-29');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('POST /api/booking', () => {
    it('should create booking request', async () => {
      const res = await request(app).post('/api/booking').send({
        name: 'Test User',
        phone: '+79991234567',
        message: 'Test message',
        source: 'contact_form'
      });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBeDefined();
    });

    it('should validate required fields', async () => {
      const res = await request(app).post('/api/booking').send({
        name: ''
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should validate phone format', async () => {
      const res = await request(app).post('/api/booking').send({
        name: 'Test',
        phone: '123'
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Protected Endpoints', () => {
    it('should reject request without API key', async () => {
      const res = await request(app).get('/api/categories/all');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should accept request with valid API key', async () => {
      const res = await request(app)
        .get('/api/categories/all')
        .set('X-API-Key', 'test_api_key');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should reject request with invalid API key', async () => {
      const res = await request(app)
        .get('/api/categories/all')
        .set('X-API-Key', 'wrong_key');

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  describe('404 Handler', () => {
    it('should return 404 for unknown routes', async () => {
      const res = await request(app).get('/api/unknown');

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });
});
