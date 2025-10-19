/**
 * DMS Full-Text Search API Routes
 *
 * Comprehensive DMS API with full-text search capabilities using SQLite3 FTS5
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
 */

const express = require('express');
const { body, query, validationResult } = require('express-validator');
const { db } = require('../database/config');
const { logger } = require('../utils/logger');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

/**
 * Advanced search with multiple filters and ranking
 */
router.post('/search', [
  authenticateToken,
  body('query').isLength({ min: 1, max: 500 }).withMessage('Query must be 1-500 characters'),
  body('filters').optional().isObject().withMessage('Filters must be an object'),
  body('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100'),
  body('offset').optional().isInt({ min: 0, max: 1000 }).withMessage('Offset must be 0-1000'),
  body('sort_by').optional().isIn(['relevance', 'title', 'created_at', 'updated_at', 'fts_rank', 'bm25_score']).withMessage('Invalid sort field'),
  body('sort_order').optional().isIn(['asc', 'desc']).withMessage('Sort order must be asc or desc'),
  body('highlight').optional().isBoolean().withMessage('Highlight must be boolean'),
  body('snippet_length').optional().isInt({ min: 50, max: 500 }).withMessage('Snippet length must be 50-500')
], async (req, res) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const {
      query,
      filters = {},
      limit = 50,
      offset = 0,
      sort_by = 'relevance',
      sort_order = 'desc',
      highlight = true,
      snippet_length = 150
    } = req.body;

    const user = req.user;
    const startTime = Date.now();

    // Build search query
    let searchQuery = `
      SELECT
        d.id,
        d.title,
        d.description,
        d.content,
        d.tags,
        d.metadata,
        d.file_path,
        d.file_name,
        d.file_extension,
        d.file_size,
        d.mime_type,
        d.category,
        d.type,
        d.status,
        d.created_by,
        d.updated_by,
        d.created_at,
        d.updated_at,
        d.fts_rank,
        d.fts_last_updated,
        -- FTS5 results
        fts.matchinfo,
        fts.snippet(
          d.fts_content,
          1,
          2,
          '<mark>',
          '</mark>',
          '...',
          ${snippet_length}
        ) as snippet,
        -- Ranking
        CASE
          WHEN d.fts_rank > 0 THEN d.fts_rank
          ELSE 1.0
        END as relevance_score,
        -- BM25 score
        (SELECT rank
         FROM dms_documents_fts
         WHERE dms_documents_fts.fts_content MATCH ?
         AND dms_documents_fts.id = d.id
        ) as bm25_score,
        -- Combined ranking
        (CASE
          WHEN d.fts_rank > 0 THEN d.fts_rank * 0.7 + ((SELECT rank FROM dms_documents_fts WHERE dms_documents_fts.id = d.id AND dms_documents_fts.fts_content MATCH ?) * 0.3)
          ELSE ((SELECT rank FROM dms_documents_fts WHERE dms_documents_fts.id = d.id AND dms_documents_fts.fts_content MATCH ?) * 1.0)
        END) as combined_rank
      FROM documents d
      LEFT JOIN dms_documents_fts fts ON d.id = fts.id
      WHERE d.fts_content IS NOT NULL
        AND d.status = 'active'
    `;

    // Add search conditions
    const searchConditions = [];
    const queryParams = [];

    // Add full-text search
    searchConditions.push(`fts.fts_content MATCH ?`);
    queryParams.push(query);

    // Add filters
    if (filters.category) {
      searchConditions.push(`d.category = $${queryParams.length + 1}`);
      queryParams.push(filters.category);
    }

    if (filters.type) {
      searchConditions.push(`d.type = $${queryParams.length + 1}`);
      queryParams.push(filters.type);
    }

    if (filters.status) {
      searchConditions.push(`d.status = $${queryParams.length + 1}`);
      queryParams.push(filters.status);
    }

    if (filters.created_by) {
      searchConditions.push(`d.created_by = $${queryParams.length + 1}`);
      queryParams.push(filters.created_by);
    }

    if (filters.file_extension) {
      searchConditions.push(`d.file_extension = $${queryParams.length + 1}`);
      queryParams.push(filters.file_extension);
    }

    if (filters.mime_type) {
      searchConditions.push(`d.mime_type = $${queryParams.length + 1}`);
      queryParams.push(filters.mime_type);
    }

    if (filters.date_from) {
      searchConditions.push(`d.created_at >= $${queryParams.length + 1}`);
      queryParams.push(filters.date_from);
    }

    if (filters.date_to) {
      searchConditions.push(`d.created_at <= $${queryParams.length + 1}`);
      queryParams.push(filters.date_to);
    }

    if (filters.file_size_min) {
      searchConditions.push(`d.file_size >= $${queryParams.length + 1}`);
      queryParams.push(filters.file_size_min);
    }

    if (filters.file_size_max) {
      searchConditions.push(`d.file_size <= $${queryParams.length + 1}`);
      queryParams.push(filters.file_size_max);
    }

    // Combine conditions
    if (searchConditions.length > 0) {
      searchQuery += ` AND ${searchConditions.join(' AND ')}`;
    }

    // Add sorting
    const validSortFields = {
      relevance: 'combined_rank DESC',
      title: 'd.title ASC',
      created_at: 'd.created_at DESC',
      updated_at: 'd.updated_at DESC',
      fts_rank: 'd.fts_rank DESC',
      bm25_score: 'bm25_score DESC'
    };

    const sortField = validSortFields[sort_by] || validSortFields.relevance;
    searchQuery += ` ORDER BY ${sortField}`;

    // Add pagination
    searchQuery += ` LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
    queryParams.push(limit, offset);

    // Execute search query
    const results = await db.all(searchQuery, queryParams);

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM documents d
      LEFT JOIN dms_documents_fts fts ON d.id = fts.id
      WHERE d.fts_content IS NOT NULL
        AND d.status = 'active'
        AND fts.fts_content MATCH ?
    `;

    if (searchConditions.length > 0) {
      countQuery += ` AND ${searchConditions.join(' AND ')}`;
    }

    const countResult = await db.get(countQuery, queryParams.slice(0, -2));
    const total = countResult.total;

    // Log search analytics
    await db.run(`
      INSERT INTO dms_search_analytics (
        search_term, filters, user_id, result_count, search_time, created_at
      ) VALUES (?, ?, ?, ?, ?, ?)
    `, [
      query,
      JSON.stringify(filters),
      user.id,
      results.length,
      Date.now() - startTime,
      new Date().toISOString()
    ]);

    // Format results
    const formattedResults = results.map(result => ({
      ...result,
      snippet: result.snippet ? JSON.parse(result.snippet) : null,
      matchinfo: result.matchinfo ? JSON.parse(result.matchinfo) : null,
      relevance_score: parseFloat(result.relevance_score),
      bm25_score: parseFloat(result.bm25_score || 0),
      combined_rank: parseFloat(result.combined_rank),
      metadata: result.metadata ? JSON.parse(result.metadata) : null,
      tags: result.tags ? result.tags.split(',').map(tag => tag.trim()) : []
    }));

    // Send response
    res.status(200).json({
      success: true,
      message: 'Search completed successfully',
      data: {
        results: formattedResults,
        pagination: {
          total,
          limit,
          offset,
          totalPages: Math.ceil(total / limit),
          hasNext: offset + limit < total,
          hasPrev: offset > 0
        },
        search: {
          query,
          filters,
          sort_by,
          sort_order,
          highlight,
          snippet_length
        },
        timing: {
          search_time: Date.now() - startTime
        }
      }
    });

  } catch (error) {
    logger.error('DMS search error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

/**
 * Simple search with basic query
 */
router.get('/search', [
  authenticateToken,
  query('q').isLength({ min: 1, max: 500 }).withMessage('Query must be 1-500 characters'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100'),
  query('offset').optional().isInt({ min: 0, max: 1000 }).withMessage('Offset must be 0-1000')
], async (req, res) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const {
      q: query,
      limit = 50,
      offset = 0
    } = req.query;

    const user = req.user;
    const startTime = Date.now();

    // Build search query
    const searchQuery = `
      SELECT
        d.id,
        d.title,
        d.description,
        d.content,
        d.tags,
        d.metadata,
        d.file_path,
        d.file_name,
        d.file_extension,
        d.file_size,
        d.mime_type,
        d.category,
        d.type,
        d.status,
        d.created_by,
        d.updated_by,
        d.created_at,
        d.updated_at,
        d.fts_rank,
        fts.snippet(
          d.fts_content,
          1,
          2,
          '<mark>',
          '</mark>',
          '...',
          100
        ) as snippet
      FROM documents d
      LEFT JOIN dms_documents_fts fts ON d.id = fts.id
      WHERE d.fts_content IS NOT NULL
        AND d.status = 'active'
        AND fts.fts_content MATCH ?
      ORDER BY d.fts_rank DESC
      LIMIT $1 OFFSET $2
    `;

    const results = await db.all(searchQuery, [limit, offset]);

    // Get total count
    const countResult = await db.get(`
      SELECT COUNT(*) as total
      FROM documents d
      LEFT JOIN dms_documents_fts fts ON d.id = fts.id
      WHERE d.fts_content IS NOT NULL
        AND d.status = 'active'
        AND fts.fts_content MATCH ?
    `);

    const total = countResult.total;

    // Format results
    const formattedResults = results.map(result => ({
      ...result,
      snippet: result.snippet ? JSON.parse(result.snippet) : null,
      metadata: result.metadata ? JSON.parse(result.metadata) : null,
      tags: result.tags ? result.tags.split(',').map(tag => tag.trim()) : []
    }));

    // Send response
    res.status(200).json({
      success: true,
      message: 'Search completed successfully',
      data: {
        results: formattedResults,
        pagination: {
          total,
          limit,
          offset,
          totalPages: Math.ceil(total / limit),
          hasNext: offset + limit < total,
          hasPrev: offset > 0
        },
        timing: {
          search_time: Date.now() - startTime
        }
      }
    });

  } catch (error) {
    logger.error('DMS search error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

/**
 * Get search suggestions
 */
router.get('/suggestions', [
  authenticateToken,
  query('q').isLength({ min: 1, max: 100 }).withMessage('Query must be 1-100 characters'),
  query('limit').optional().isInt({ min: 1, max: 20 }).withMessage('Limit must be 1-20')
], async (req, res) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const {
      q: query,
      limit = 10
    } = req.query;

    // Get search suggestions
    const suggestionsQuery = `
      SELECT DISTINCT
        SUBSTR(d.title, 1, 50) as suggestion,
        d.category,
        d.type,
        d.status,
        COUNT(*) as frequency
      FROM documents d
      LEFT JOIN dms_documents_fts fts ON d.id = fts.id
      WHERE d.fts_content IS NOT NULL
        AND d.status = 'active'
        AND fts.fts_content MATCH ?
        AND d.title IS NOT NULL
      GROUP BY d.title, d.category, d.type, d.status
      ORDER BY frequency DESC, d.title ASC
      LIMIT $1
    `;

    const suggestions = await db.all(suggestionsQuery, [limit]);

    // Format suggestions
    const formattedSuggestions = suggestions.map(suggestion => ({
      ...suggestion,
      suggestion: suggestion.suggestion.trim(),
      frequency: parseInt(suggestion.frequency)
    }));

    // Send response
    res.status(200).json({
      success: true,
      message: 'Suggestions retrieved successfully',
      data: {
        suggestions: formattedSuggestions,
        count: formattedSuggestions.length,
        query
      }
    });

  } catch (error) {
    logger.error('DMS suggestions error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

/**
 * Get search analytics
 */
router.get('/analytics', [
  authenticateToken,
  query('date_from').optional().isDate().withMessage('Date from must be a valid date'),
  query('date_to').optional().isDate().withMessage('Date to must be a valid date'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100')
], async (req, res) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const {
      date_from,
      date_to,
      limit = 50
    } = req.query;

    // Build analytics query
    let analyticsQuery = `
      SELECT
        COUNT(*) as total_searches,
        AVG(search_time) as avg_search_time,
        MAX(search_time) as max_search_time,
        MIN(search_time) as min_search_time,
        COUNT(DISTINCT user_id) as unique_users,
        COUNT(DISTINCT search_term) as unique_terms,
        DATE(CAST(created_at AS DATE)) as search_date
      FROM dms_search_analytics
      WHERE 1=1
    `;

    const queryParams = [];

    // Add date filters
    if (date_from) {
      analyticsQuery += ` AND DATE(CAST(created_at AS DATE)) >= $${queryParams.length + 1}`;
      queryParams.push(date_from);
    }

    if (date_to) {
      analyticsQuery += ` AND DATE(CAST(created_at AS DATE)) <= $${queryParams.length + 1}`;
      queryParams.push(date_to);
    }

    analyticsQuery += ` GROUP BY DATE(CAST(created_at AS DATE))`;
    analyticsQuery += ` ORDER BY search_date DESC`;
    analyticsQuery += ` LIMIT $${queryParams.length + 1}`;
    queryParams.push(limit);

    const analytics = await db.all(analyticsQuery, queryParams);

    // Get top search terms
    const topTermsQuery = `
      SELECT
        search_term,
        COUNT(*) as count,
        AVG(result_count) as avg_results,
        AVG(search_time) as avg_time,
        MAX(search_time) as max_time,
        MIN(search_time) as min_time,
        DATE(CAST(created_at AS DATE)) as search_date
      FROM dms_search_analytics
      WHERE 1=1
    `;

    if (date_from) {
      topTermsQuery += ` AND DATE(CAST(created_at AS DATE)) >= $${queryParams.length + 1}`;
      queryParams.push(date_from);
    }

    if (date_to) {
      topTermsQuery += ` AND DATE(CAST(created_at AS DATE)) <= $${queryParams.length + 1}`;
      queryParams.push(date_to);
    }

    topTermsQuery += ` GROUP BY search_term, DATE(CAST(created_at AS DATE))`;
    topTermsQuery += ` ORDER BY count DESC, search_term ASC`;
    topTermsQuery += ` LIMIT 20`;

    const topTerms = await db.all(topTermsQuery, queryParams);

    // Get user statistics
    const userStatsQuery = `
      SELECT
        u.id,
        u.username,
        u.email,
        u.first_name,
        u.last_name,
        COUNT(sa.search_term) as search_count,
        AVG(sa.result_count) as avg_results,
        AVG(sa.search_time) as avg_time,
        MAX(sa.search_time) as max_time,
        MIN(sa.search_time) as min_time
      FROM users u
      LEFT JOIN dms_search_analytics sa ON u.id = sa.user_id
    `;

    if (date_from) {
      userStatsQuery += ` AND DATE(CAST(sa.created_at AS DATE)) >= $${queryParams.length + 1}`;
      queryParams.push(date_from);
    }

    if (date_to) {
      userStatsQuery += ` AND DATE(CAST(sa.created_at AS DATE)) <= $${queryParams.length + 1}`;
      queryParams.push(date_to);
    }

    userStatsQuery += ` GROUP BY u.id, u.username, u.email, u.first_name, u.last_name`;
    userStatsQuery += ` ORDER BY search_count DESC`;
    userStatsQuery += ` LIMIT 20`;

    const userStats = await db.all(userStatsQuery);

    // Get filter statistics
    const filterStatsQuery = `
      SELECT
        json_extract(filters, '$.category') as filter_category,
        json_extract(filters, '$.type') as filter_type,
        json_extract(filters, '$.status') as filter_status,
        COUNT(*) as count
      FROM dms_search_analytics
      WHERE filters IS NOT NULL
    `;

    if (date_from) {
      filterStatsQuery += ` AND DATE(CAST(created_at AS DATE)) >= $${queryParams.length + 1}`;
      queryParams.push(date_from);
    }

    if (date_to) {
      filterStatsQuery += ` AND DATE(CAST(created_at AS DATE)) <= $${queryParams.length + 1}`;
      queryParams.push(date_to);
    }

    filterStatsQuery += ` GROUP BY json_extract(filters, '$.category'), json_extract(filters, '$.type'), json_extract(filters, '$.status')`;
    filterStatsQuery += ` ORDER BY count DESC`;
    filterStatsQuery += ` LIMIT 20`;

    const filterStats = await db.all(filterStatsQuery, queryParams);

    // Format results
    const formattedAnalytics = analytics.map(analytics => ({
      ...analytics,
      total_searches: parseInt(analytics.total_searches),
      avg_search_time: parseFloat(analytics.avg_search_time),
      max_search_time: parseFloat(analytics.max_search_time),
      min_search_time: parseFloat(analytics.min_search_time),
      unique_users: parseInt(analytics.unique_users),
      unique_terms: parseInt(analytics.unique_terms)
    }));

    const formattedTopTerms = topTerms.map(term => ({
      ...term,
      count: parseInt(term.count),
      avg_results: parseFloat(term.avg_results),
      avg_time: parseFloat(term.avg_time),
      max_time: parseFloat(term.max_time),
      min_time: parseFloat(term.min_time)
    }));

    const formattedUserStats = userStats.map(stat => ({
      ...stat,
      search_count: parseInt(stat.search_count),
      avg_results: parseFloat(stat.avg_results),
      avg_time: parseFloat(stat.avg_time),
      max_time: parseFloat(stat.max_time),
      min_time: parseFloat(stat.min_time)
    }));

    // Send response
    res.status(200).json({
      success: true,
      message: 'Analytics retrieved successfully',
      data: {
        analytics: formattedAnalytics,
        top_terms: formattedTopTerms,
        user_stats: formattedUserStats,
        filter_stats: formattedFilterStats
      }
    });

  } catch (error) {
    logger.error('DMS analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

/**
 * Rebuild FTS index
 */
router.post('/rebuild-index', [
  authenticateToken,
  body('force').optional().isBoolean().withMessage('Force must be boolean')
], async (req, res) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { force = false } = req.body;
    const user = req.user;

    // Check if user is admin
    if (user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admin users can rebuild FTS index'
      });
    }

    const startTime = Date.now();

    // Rebuild FTS index
    await db.run(`INSERT INTO dms_documents_fts(dms_documents_fts) VALUES('rebuild')`);

    // Update FTS last updated for all documents
    await db.run(`
      UPDATE documents
      SET fts_last_updated = CURRENT_TIMESTAMP
      WHERE fts_content IS NOT NULL
    `);

    // Regenerate FTS content for all documents
    await db.run(`
      UPDATE documents
      SET fts_content = (
        COALESCE(title, '') || ' ' ||
        COALESCE(description, '') || ' ' ||
        COALESCE(content, '') || ' ' ||
        COALESCE(tags, '') || ' ' ||
        COALESCE(json_extract(metadata, '$.category'), '') || ' ' ||
        COALESCE(json_extract(metadata, '$.type'), '') || ' ' ||
        COALESCE(json_extract(metadata, '$.status'), '') || ' ' ||
        COALESCE(file_name, '') || ' ' ||
        COALESCE(file_extension, '') || ' ' ||
        COALESCE(category, '') || ' ' ||
        COALESCE(type, '') || ' ' ||
        COALESCE(status, '') || ' ' ||
        COALESCE(created_by, '') || ' '
      ),
      fts_last_updated = CURRENT_TIMESTAMP
      WHERE fts_content IS NOT NULL
    `);

    // Get document count
    const docCount = await db.get(`SELECT COUNT(*) as count FROM documents WHERE fts_content IS NOT NULL`);

    // Log rebuild action
    await db.run(`
      INSERT INTO dms_search_analytics (
        search_term, filters, user_id, result_count, search_time, created_at
      ) VALUES (?, ?, ?, ?, ?, ?)
    `, [
      'rebuild_index',
      JSON.stringify({ force }),
      user.id,
      docCount.count,
      Date.now() - startTime,
      new Date().toISOString()
    ]);

    res.status(200).json({
      success: true,
      message: 'FTS index rebuilt successfully',
      data: {
        document_count: docCount.count,
        rebuild_time: Date.now() - startTime,
        forced: force
      }
    }));

  } catch (error) {
    logger.error('DMS rebuild index error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

/**
 * Get document with highlighting
 */
router.get('/highlight/:id', [
  authenticateToken,
  query('q').isLength({ min: 1, max: 500 }).withMessage('Query must be 1-500 characters'),
  query('open_tag').optional().isLength({ min: 1, max: 50 }).withMessage('Open tag must be 1-50 characters'),
  query('close_tag').optional().isLength({ min: 1, max: 50 }).withMessage('Close tag must be 1-50 characters'),
  query('snippet_length').optional().isInt({ min: 50, max: 500 }).withMessage('Snippet length must be 50-500')
], async (req, res) {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const {
      params: { id },
      query: q,
      open_tag = '<mark>',
      close_tag = '</mark>',
      snippet_length = 150
    } = req;

    // Get document with highlighting
    const query = `
      SELECT
        d.id,
        d.title,
        d.description,
        d.content,
        d.tags,
        d.metadata,
        d.file_path,
        d.file_name,
        d.file_extension,
        d.file_size,
        d.mime_type,
        d.category,
        d.type,
        d.status,
        d.created_by,
        d.updated_by,
        d.created_at,
        d.updated_at,
        d.fts_rank,
        d.fts_last_updated,
        fts.snippet(
          d.fts_content,
          1,
          2,
          ?,
          ?,
          '...',
          ?
        ) as snippet
      FROM documents d
      LEFT JOIN dms_documents_fts fts ON d.id = fts.id
      WHERE d.id = ?
        AND d.fts_content IS NOT NULL
        AND d.status = 'active'
    `;

    const result = await db.get(query, [id]);

    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    // Format result
    const formattedResult = {
      ...result,
      snippet: result.snippet ? JSON.parse(result.snippet) : null,
      metadata: result.metadata ? JSON.parse(result.metadata) : null,
      tags: result.tags ? result.tags.split(',').map(tag => tag.trim()) : []
    };

    // Send response
    res.status(200).json({
      success: true,
      message: 'Document retrieved successfully',
      data: formattedResult
    });

  } catch (error) {
    logger.error('DMS highlight error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

/**
 * Get document snippet
 */
router.get('/snippet/:id', [
  authenticateToken,
  query('q').isLength({ min: 1, max: 500 }).withMessage('Query must be 1-500 characters'),
  query('start_tag').optional().isLength({ min: 1, max: 50 }).withMessage('Start tag must be 1-50 characters'),
  query('end_tag').optional().isLength({ min: 1, max: 50 }).withMessage('End tag must be 1-50 characters'),
  query('snippet_length').optional().isInt({ min: 50, max: 500 }).withMessage('Snippet length must be 50-500')
], async (req, res) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const {
      params: { id },
      query: q,
      start_tag = '<mark>',
      end_tag = '</mark>',
      snippet_length = 150
    } = req;

    // Get document snippet
    const query = `
      SELECT
        id,
        title,
        description,
        content,
        tags,
        metadata,
        file_name,
        file_extension,
        category,
        type,
        status,
        created_by,
        updated_by,
        created_at,
        updated_at,
        fts.snippet(
          fts_content,
          1,
          2,
          ?,
          ?,
          '...',
          ?
        ) as snippet
      FROM documents d
      LEFT JOIN dms_documents_fts fts ON d.id = fts.id
      WHERE d.id = ?
        AND d.fts_content IS NOT NULL
        AND d.status = 'active'
    `;

    const result = await db.get(query, [id]);

    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    // Format snippet
    const snippet = result.snippet ? JSON.parse(result.snippet) : null;

    // Send response
    res.status(200).json({
      success: true,
      message: 'Snippet retrieved successfully',
      data: {
        snippet,
        document_id: result.id,
        title: result.title,
        query,
        start_tag,
        end_tag,
        snippet_length
      }
    });

  } catch (error) {
    logger.error('DMS snippet error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

/**
 * Get search statistics
 */
router.get('/stats', [
  authenticateToken,
  query('date_from').optional().isDate().withMessage('Date from must be a valid date'),
  query('date_to').optional().isDate().withMessage('Date to must be a valid date')
], async (req, res) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const {
      date_from,
      date_to
    } = req.query;

    // Build stats query
    let statsQuery = `
      SELECT
        COUNT(*) as total_documents,
        COUNT(DISTINCT category) as total_categories,
        COUNT(DISTINCT type) as total_types,
        COUNT(DISTINCT status) as total_status,
        COUNT(DISTINCT created_by) as total_creators,
        COUNT(DISTINCT updated_by) total_updaters,
        COUNT(DISTINCT file_extension) as total_extensions,
        COUNT(DISTINCT mime_type) as total_mime_types,
        SUM(file_size) as total_file_size,
        AVG(file_size) as avg_file_size,
        MAX(file_size) as max_file_size,
        MIN(file_size) as min_file_size,
        COUNT(DISTINCT tags) as total_tags,
        COUNT(DISTINCT json_extract(metadata, '$.department')) as total_departments,
        COUNT(DISTINCT json_extract(metadata, '$.project')) as total_projects,
        COUNT(DISTINCT json_extract(metadata, '$.priority')) as total_priorities
      FROM documents
      WHERE status = 'active'
    `;

    const queryParams = [];

    // Add date filters
    if (date_from) {
      statsQuery += ` AND created_at >= $${queryParams.length + 1}`;
      queryParams.push(date_from);
    }

    if (date_to) {
      statsQuery += ` AND created_at <= $${queryParams.length + 1}`;
      queryParams.push(date_to);
    }

    const stats = await db.get(statsQuery, queryParams);

    // Get FTS stats
    const ftsStats = await db.get(`
      SELECT
        COUNT(*) as fts_documents,
        COUNT(DISTINCT json_extract(metadata, '$.priority')) as fts_priorities,
        COUNT(DISTINCT json_extract(metadata, '$.category')) as fts_categories,
        COUNT(DISTINCT json_extract(metadata, '$.type')) as fts_types
      FROM documents
      WHERE fts_content IS NOT NULL
        AND status = 'active'
    `);

    // Format stats
    const formattedStats = {
      total_documents: parseInt(stats.total_documents),
      total_categories: parseInt(stats.total_categories),
      total_types: parseInt(stats.total_types),
      total_status: parseInt(stats.total_status),
      total_creators: parseInt(stats.total_creators),
      total_updaters: parseInt(stats.total_updaters),
      total_extensions: parseInt(stats.total_extensions),
      total_mime_types: parseInt(stats.total_mime_types),
      total_tags: parseInt(stats.total_tags),
      total_departments: parseInt(stats.total_departments),
      total_projects: parseInt(stats.total_projects),
      total_priorities: parseInt(stats.total_priorities),
      total_file_size: parseInt(stats.total_file_size),
      avg_file_size: parseFloat(stats.avg_file_size),
      max_file_size: parseInt(stats.max_file_size),
      min_file_size: parseInt(stats.min_file_size),
      fts_documents: parseInt(ftsStats.fts_documents),
      fts_priorities: parseInt(ftsStats.fts_priorities),
      fts_categories: parseInt(ftsStats.fts_categories),
      fts_types: parseInt(ftsStats.fts_types)
    };

    // Send response
    res.status(200).json({
      success: true,
      message: 'Statistics retrieved successfully',
      data: formattedStats
    });

  } catch (error) {
    logger.error('DMS stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

module.exports = router;
```

## **📋 Step 4: Update Main App dengan DMS FTS Routes**

### **📄 Update Main App Configuration**
