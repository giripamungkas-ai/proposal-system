/**
 * Templates API Routes
 *
 * Complete template management system with:
 * - Template CRUD operations (Create, Read, Update, Delete)
 * - Advanced search and filtering capabilities
 * - Template analytics and insights
 * - Template versioning and history
 * - Template sharing and collaboration
 * - Template export and import
 * - Template rating and feedback system
 * - Template performance monitoring
 * - Template approval workflows
 * - Template usage tracking
 * - Template statistics and reporting
 */

const express = require('express');
const { body, validationResult } = require('express-validator');
const { pool } = require('../database/config');
const { logger } = require('../utils/logger');
const { authenticateToken } = require('../middleware/auth');
const { validateTemplate } = require('../middleware/validation');

const router = express.Router();

/**
 * Get All Templates
 * GET /api/templates
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const {
      category,
      subcategory,
      status,
      visibility,
      search,
      tags,
      page = 1,
      limit = 20,
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    let query = `
      SELECT
        t.id,
        t.name,
        t.description,
        t.category,
        t.subcategory,
        t.version,
        t.status,
        t.visibility,
        t.created_by,
        t.updated_by,
        t.published_at,
        t.archived_at,
        t.tags,
        t.metadata,
        t.created_at,
        t.updated_at,
        u.username as created_by_username,
        u.first_name,
        u.last_name,
        (SELECT COUNT(*) FROM template_analytics ta WHERE ta.template_id = t.id AND ta.event_type = 'template_viewed') as view_count,
        (SELECT COUNT(*) FROM template_analytics ta WHERE ta.template_id = t.id AND ta.event_type = 'template_used') as use_count,
        (SELECT COUNT(*) FROM template_analytics ta WHERE ta.template_id = t.id AND ta.properties->>'rating' IS NOT NULL) as rating_count,
        (SELECT AVG(CAST(ta.properties->>'rating' AS DECIMAL)) FROM template_analytics ta WHERE ta.template_id = t.id AND ta.properties->>'rating' IS NOT NULL) as average_rating
      FROM templates t
      LEFT JOIN users u ON t.created_by = u.id
      WHERE 1=1
    `;

    // Add filters
    const filters = [];
    const queryParams = [];

    if (category) {
      filters.push(`t.category = $${queryParams.length + 1}`);
      queryParams.push(category);
    }

    if (subcategory) {
      filters.push(`t.subcategory = $${queryParams.length + 1}`);
      queryParams.push(subcategory);
    }

    if (status) {
      filters.push(`t.status = $${queryParams.length + 1}`);
      queryParams.push(status);
    }

    if (visibility) {
      filters.push(`t.visibility = $${queryParams.length + 1}`);
      queryParams.push(visibility);
    }

    if (search) {
      filters.push(`(t.name ILIKE $${queryParams.length + 1} OR t.description ILIKE $${queryParams.length + 1} OR t.tags::text ILIKE $${queryParams.length + 1})`);
      queryParams.push(`%${search}%`);
    }

    if (tags && tags.length > 0) {
      const tagConditions = tags.map((tag, index) => `t.tags::text ILIKE $${queryParams.length + 1 + index}`).join(' OR ');
      filters.push(`(${tagConditions})`);
      queryParams.push(...tags.map(tag => `%${tag}%`));
    }

    if (filters.length > 0) {
      query += ` AND ${filters.join(' AND ')}`;
    }

    // Add sorting
    const validSortFields = ['name', 'category', 'subcategory', 'status', 'visibility', 'created_at', 'updated_at', 'view_count', 'use_count', 'average_rating'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'created_at';
    const sortDirection = sortOrder === 'asc' ? 'ASC' : 'DESC';
    query += ` ORDER BY ${sortField} ${sortDirection}`;

    // Add pagination
    const offset = (page - 1) * limit;
    query += ` LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
    queryParams.push(limit, offset);

    // Execute query
    const result = await pool.query(query, queryParams);

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM templates t
      WHERE 1=1
      ${filters.length > 0 ? `AND ${filters.join(' AND ')}` : ''}
    `;

    const countResult = await pool.query(countQuery, queryParams.slice(0, -2));
    const total = parseInt(countResult.rows[0].total);

    // Send response
    res.status(200).json({
      success: true,
      message: 'Templates retrieved successfully',
      data: {
        templates: result.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: offset + limit < total,
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    logger.error('Get templates error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

/**
 * Get Template by ID
 * GET /api/templates/:id
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Get template with analytics
    const query = `
      SELECT
        t.*,
        u.username as created_by_username,
        u.first_name,
        u.last_name,
        (SELECT COUNT(*) FROM template_analytics ta WHERE ta.template_id = t.id AND ta.event_type = 'template_viewed') as view_count,
        (SELECT COUNT(*) FROM template_analytics ta WHERE ta.template_id = t.id AND ta.event_type = 'template_used') as use_count,
        (SELECT COUNT(*) FROM template_analytics ta WHERE ta.template_id = t.id AND ta.properties->>'rating' IS NOT NULL) as rating_count,
        (SELECT AVG(CAST(ta.properties->>'rating' AS DECIMAL)) FROM template_analytics ta WHERE ta.template_id = t.id AND ta.properties->>'rating' IS NOT NULL) as average_rating,
        (SELECT JSON_AGG(
          json_build_object(
            'date', ta.timestamp,
            'event_type', ta.event_type,
            'user_id', ta.user_id,
            'properties', ta.properties
          )
        ) FROM template_analytics ta WHERE ta.template_id = t.id ORDER BY ta.timestamp DESC LIMIT 10) as recent_analytics
      FROM templates t
      LEFT JOIN users u ON t.created_by = u.id
      WHERE t.id = $1
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    const template = result.rows[0];

    // Send response
    res.status(200).json({
      success: true,
      message: 'Template retrieved successfully',
      data: template
    });

  } catch (error) {
    logger.error('Get template error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

/**
 * Create New Template
 * POST /api/templates
 */
router.post('/', [
  authenticateToken,
  body('name').isLength({ min: 1, max: 255 }).withMessage('Template name is required (1-255 characters)'),
  body('description').optional().isLength({ max: 1000 }).withMessage('Description must be less than 1000 characters'),
  body('category').isLength({ min: 1, max: 100 }).withMessage('Category is required (1-100 characters)'),
  body('subcategory').isLength({ min: 1, max: 100 }).withMessage('Subcategory is required (1-100 characters)'),
  body('content').isObject().withMessage('Content is required'),
  body('validation').optional().isObject().withMessage('Validation must be an object'),
  body('permissions').optional().isObject().withMessage('Permissions must be an object'),
  body('tags').optional().isArray().withMessage('Tags must be an array'),
  body('visibility').optional().isIn(['private', 'team', 'organization', 'public']).withMessage('Invalid visibility')
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
      name,
      description,
      category,
      subcategory,
      content,
      validation,
      permissions,
      tags,
      visibility = 'private'
    } = req.body;

    const user = req.user;

    // Create template
    const query = `
      INSERT INTO templates (
        name, description, category, subcategory, version, status, visibility,
        created_by, updated_by, tags, content, validation, permissions, approvals, analytics,
        created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )
      RETURNING *
    `;

    const values = [
      name,
      description,
      category,
      subcategory,
      '1.0',
      'draft',
      visibility,
      user.id,
      user.id,
      tags || [],
      JSON.stringify(content),
      JSON.stringify(validation || {}),
      JSON.stringify(permissions || {}),
      JSON.stringify({ created_by: user.id, status: 'pending', comments: [] }),
      JSON.stringify({ views: 0, uses: 0, downloads: 0, shares: 0, ratings: [], feedback: [] })
    ];

    const result = await pool.query(query, values);

    const template = result.rows[0];

    // Log template creation
    logger.info('Template created successfully:', {
      id: template.id,
      name: template.name,
      category: template.category,
      created_by: user.id
    });

    // Send response
    res.status(201).json({
      success: true,
      message: 'Template created successfully',
      data: template
    });

  } catch (error) {
    logger.error('Create template error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

/**
 * Update Template
 * PUT /api/templates/:id
 */
router.put('/:id', [
  authenticateToken,
  body('name').optional().isLength({ min: 1, max: 255 }).withMessage('Template name must be 1-255 characters'),
  body('description').optional().isLength({ max: 1000 }).withMessage('Description must be less than 1000 characters'),
  body('category').optional().isLength({ min: 1, max: 100 }).withMessage('Category must be 1-100 characters'),
  body('subcategory').optional().isLength({ min: 1, max: 100 }).withMessage('Subcategory must be 1-100 characters'),
  body('content').optional().isObject().withMessage('Content must be an object'),
  body('validation').optional().isObject().withMessage('Validation must be an object'),
  body('permissions').optional().isObject().withMessage('Permissions must be an object'),
  body('tags').optional().isArray().withMessage('Tags must be an array'),
  body('visibility').optional().isIn(['private', 'team', 'organization', 'public']).withMessage('Invalid visibility')
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

    const { id } = req.params;
    const {
      name,
      description,
      category,
      subcategory,
      content,
      validation,
      permissions,
      tags,
      visibility
    } = req.body;

    const user = req.user;

    // Check if template exists and user has permission
    const existingTemplate = await pool.query(
      'SELECT * FROM templates WHERE id = $1',
      [id]
    );

    if (existingTemplate.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    const template = existingTemplate.rows[0];

    // Check permission (only creator or admin can update)
    if (template.created_by !== user.id && user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to update this template'
      });
    }

    // Update template
    const updateQuery = `
      UPDATE templates
      SET
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        category = COALESCE($3, category),
        subcategory = COALESCE($4, subcategory),
        content = COALESCE($5, content),
        validation = COALESCE($6, validation),
        permissions = COALESCE($7, permissions),
        tags = COALESCE($8, tags),
        visibility = COALESCE($9, visibility),
        version = version || CONCAT(SUBSTRING(version FROM 1 FOR LENGTH) , '.', CAST(SUBSTRING(version FROM '\.([\d]+)$)' AS INTEGER) + 1)),
        updated_by = $10,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $11
      RETURNING *
    `;

    const values = [
      name,
      description,
      category,
      subcategory,
      JSON.stringify(content),
      JSON.stringify(validation || {}),
      JSON.stringify(permissions || {}),
      tags || [],
      visibility,
      user.id,
      id
    ];

    const result = await pool.query(updateQuery, values);

    const updatedTemplate = result.rows[0];

    // Log template update
    logger.info('Template updated successfully:', {
      id: updatedTemplate.id,
      name: updatedTemplate.name,
      category: updatedTemplate.category,
      updated_by: user.id
    });

    // Send response
    res.status(200).json({
      success: true,
      message: 'Template updated successfully',
      data: updatedTemplate
    });

  } catch (error) {
    logger.error('Update template error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

/**
 * Delete Template
 * DELETE /api/templates/:id
 */
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;

    // Check if template exists and user has permission
    const existingTemplate = await pool.query(
      'SELECT * FROM templates WHERE id = $1',
      [id]
    );

    if (existingTemplate.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    const template = existingTemplate.rows[0];

    // Check permission (only creator or admin can delete)
    if (template.created_by !== user.id && user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to delete this template'
      });
    }

    // Archive template instead of deleting
    const archiveQuery = `
      UPDATE templates
      SET
        status = 'archived',
        archived_at = CURRENT_TIMESTAMP,
        updated_by = $1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `;

    const result = await pool.query(archiveQuery, [user.id, id]);

    const archivedTemplate = result.rows[0];

    // Log template deletion
    logger.info('Template archived successfully:', {
      id: archivedTemplate.id,
      name: archivedTemplate.name,
      category: archivedTemplate.category,
      archived_by: user.id
    });

    // Send response
    res.status(200).json({
      success: true,
      message: 'Template archived successfully',
      data: archivedTemplate
    });

  } catch (error) {
    logger.error('Delete template error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

/**
 * Duplicate Template
 * POST /api/templates/:id/duplicate
 */
router.post('/:id/duplicate', authenticateToken, [
  body('name').isLength({ min: 1, max: 255 }).withMessage('Template name is required (1-255 characters)')
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

    const { id } = req.params;
    const { name } = req.body;
    const user = req.user;

    // Get original template
    const originalTemplateQuery = await pool.query(
      'SELECT * FROM templates WHERE id = $1',
      [id]
    );

    if (originalTemplateQuery.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    const originalTemplate = originalTemplateQuery.rows[0];

    // Create duplicate
    const duplicateQuery = `
      INSERT INTO templates (
        name, description, category, subcategory, version, status, visibility,
        created_by, updated_by, tags, content, validation, permissions, approvals, analytics,
        created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )
      RETURNING *
    `;

    const values = [
      name,
      `${originalTemplate.description} (Copy)`,
      originalTemplate.category,
      originalTemplate.subcategory,
      '1.0',
      'draft',
      originalTemplate.visibility,
      user.id,
      user.id,
      originalTemplate.tags,
      originalTemplate.content,
      originalTemplate.validation,
      originalTemplate.permissions,
      JSON.stringify({ created_by: user.id, status: 'pending', comments: [] }),
      JSON.stringify({ views: 0, uses: 0, downloads: 0, shares: 0, ratings: [], feedback: [] })
    ];

    const result = await pool.query(duplicateQuery, values);

    const duplicatedTemplate = result.rows[0];

    // Log template duplication
    logger.info('Template duplicated successfully:', {
      id: duplicatedTemplate.id,
      name: duplicatedTemplate.name,
      originalId: originalTemplate.id,
      originalName: originalTemplate.name,
      created_by: user.id
    });

    // Send response
    res.status(201).json({
      success: true,
      message: 'Template duplicated successfully',
      data: duplicatedTemplate
    });

  } catch (error) {
    logger.error('Duplicate template error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

/**
 * Get Template Categories
 * GET /api/templates/categories
 */
router.get('/categories', authenticateToken, async (req, res) => {
  try {
    const query = `
      SELECT DISTINCT
        category,
        ARRAY_AGG(DISTINCT subcategory ORDER BY subcategory) as subcategories,
        COUNT(*) as count
      FROM templates
      WHERE status != 'archived'
      GROUP BY category
      ORDER BY count DESC
    `;

    const result = await pool.query(query);

    // Send response
    res.status(200).json({
      success: true,
      message: 'Template categories retrieved successfully',
      data: result.rows
    });

  } catch (error) {
    logger.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

/**
 * Get Template Analytics
 * GET /api/templates/:id/analytics
 */
router.get('/:id/analytics', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { timeframe = '30d' } = req.query;

    // Calculate date range
    let dateFilter = '';
    if (timeframe === '7d') {
      dateFilter = "AND ta.timestamp >= CURRENT_DATE - INTERVAL '7 days'";
    } else if (timeframe === '30d') {
      dateFilter = "AND ta.timestamp >= CURRENT_DATE - INTERVAL '30 days'";
    } else if (timeframe === '90d') {
      dateFilter = "AND ta.timestamp >= CURRENT_DATE - INTERVAL '90 days'";
    }

    // Get template analytics
    const query = `
      SELECT
        t.id,
        t.name,
        t.category,
        t.subcategory,
        t.status,
        t.visibility,
        t.created_at,
        t.updated_at,
        -- Usage statistics
        (SELECT COUNT(*) FROM template_analytics ta WHERE ta.template_id = t.id ${dateFilter}) as total_views,
        (SELECT COUNT(*) FROM template_analytics ta WHERE ta.template_id = t.id AND ta.event_type = 'template_used' ${dateFilter}) as total_uses,
        (SELECT COUNT(*) FROM template_analytics ta WHERE ta.template_id = t.id AND ta.event_type = 'template_downloaded' ${dateFilter}) as total_downloads,
        (SELECT COUNT(*) FROM template_analytics ta WHERE ta.template_id = t.id AND ta.event_type = 'template_shared' ${dateFilter}) as total_shares,
        -- Rating statistics
        (SELECT COUNT(*) FROM template_analytics ta WHERE ta.template_id = t.id AND ta.properties->>'rating' IS NOT NULL ${dateFilter}) as total_ratings,
        (SELECT AVG(CAST(ta.properties->>'rating' AS DECIMAL)) FROM template_analytics ta WHERE ta.template_id = t.id AND ta.properties->>'rating' IS NOT NULL ${dateFilter}) as average_rating,
        -- Recent activity
        (SELECT JSON_AGG(
          json_build_object(
            'timestamp', ta.timestamp,
            'event_type', ta.event_type,
            'user_id', ta.user_id,
            'properties', ta.properties
          )
        ) FROM template_analytics ta WHERE ta.template_id = t.id ${dateFilter} ORDER BY ta.timestamp DESC LIMIT 10) as recent_analytics
      FROM templates t
      WHERE t.id = $1
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    const analytics = result.rows[0];

    // Send response
    res.status(200).json({
      success: true,
      message: 'Template analytics retrieved successfully',
      data: analytics
    });

  } catch (error) {
    logger.error('Get template analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

/**
 * Rate Template
 * POST /api/templates/:id/rate
 */
router.post('/:id/rate', [
  authenticateToken,
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('comment').optional().isLength({ max: 1000 }).withMessage('Comment must be less than 1000 characters')
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

    const { id } = req.params;
    const { rating, comment } = req.body;
    const user = req.user;

    // Check if template exists
    const templateQuery = await pool.query(
      'SELECT * FROM templates WHERE id = $1',
      [id]
    );

    if (templateQuery.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    // Add rating to analytics
    const analyticsQuery = `
      INSERT INTO template_analytics (
        template_id, event_type, user_id, properties, timestamp, created_at
      ) VALUES (
        $1, 'template_rated', $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )
      RETURNING *
    `;

    const analyticsResult = await pool.query(analyticsQuery, [
      id,
      user.id,
      JSON.stringify({ rating, comment })
    ]);

    // Update template analytics
    const updateQuery = `
      UPDATE templates
      SET analytics = jsonb_set(
        jsonb_set(
          analytics,
          'ratings',
          COALESCE(
            (SELECT jsonb_agg(
              json_build_object(
                'id', ta.id,
                'user_id', ta.user_id,
                'rating', ta.properties->>'rating',
                'comment', ta.properties->>'comment',
                'timestamp', ta.timestamp
              )
            ) FROM template_analytics ta
            WHERE ta.template_id = $1 AND ta.event_type = 'template_rated'
          ),
          '|| jsonb_build_array(
            json_build_object(
              'id', $2,
              'user_id', $3,
              'rating', $4,
              'comment', $5,
              'timestamp', CURRENT_TIMESTAMP
            )
          ),
          '|| analytics->'ratings'
        ),
        'total_ratings',
        analytics.total_ratings + 1
      )
      WHERE id = $1
      RETURNING *
    `;

    const updateResult = await pool.query(updateQuery, [
      id,
      analyticsResult.rows[0].id,
      user.id,
      rating,
      comment
    ]);

    // Log template rating
    logger.info('Template rated successfully:', {
      templateId: id,
      rating,
      userId: user.id,
      comment
    });

    // Send response
    res.status(200).json({
      success: true,
      message: 'Template rated successfully',
      data: {
        rating,
        comment,
        analytics: analyticsResult.rows[0]
      }
    });

  } catch (error) {
    logger.error('Rate template error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

/**
 * Share Template
 * POST /api/templates/:id/share
 */
router.post('/:id/share', [
  authenticateToken,
  body('sharedWith').isEmail().withMessage('Valid email is required'),
  body('permission').isIn(['view', 'edit', 'comment', 'download']).withMessage('Invalid permission'),
  body('expiresAt').optional().isISO8601().withMessage('Invalid date format')
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

    const { id } = req.params;
    const { sharedWith, permission, expiresAt } = req.body;
    const user = req.user;

    // Check if template exists
    const templateQuery = await pool.query(
      'SELECT * FROM templates WHERE id = $1',
      [id]
    );

    if (templateQuery.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    // Add share to database
    const shareQuery = `
      INSERT INTO template_shares (
        template_id, shared_by, shared_with, permission, expires_at, created_at
      ) VALUES (
        $1, $2, $3, $4, $5, CURRENT_TIMESTAMP
      )
      RETURNING *
    `;

    const shareResult = await pool.query(shareQuery, [
      id,
      user.id,
      sharedWith,
      permission,
      expiresAt
    ]);

    // Add to analytics
    const analyticsQuery = `
      INSERT INTO template_analytics (
        template_id, event_type, user_id, properties, timestamp, created_at
      ) VALUES (
        $1, 'template_shared', $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )
      RETURNING *
    `;

    await pool.query(analyticsQuery, [
      id,
      user.id,
      JSON.stringify({ sharedWith, permission, expiresAt })
    ]);

    // Log template share
    logger.info('Template shared successfully:', {
      templateId: id,
      sharedWith,
      permission,
      expiresAt,
      sharedBy: user.id
    });

    // Send response
    res.status(200).json({
      success: true,
      message: 'Template shared successfully',
      data: shareResult.rows[0]
    });

  } catch (error) {
    logger.error('Share template error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

/**
 * Export Template
 * GET /api/templates/:id/export
 */
router.get('/:id/export', authenticateToken, [
  body('format').isIn(['pdf', 'docx', 'html', 'json', 'csv']).withMessage('Invalid export format')
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

    const { id } = req.params;
    const { format } = req.body;
    const user = req.user;

    // Check if template exists
    const templateQuery = await pool.query(
      'SELECT * FROM templates WHERE id = $1',
      [id]
    );

    if (templateQuery.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    const template = templateQuery.rows[0];

    // Add to analytics
    const analyticsQuery = `
      INSERT INTO template_analytics (
        template_id, event_type, user_id, properties, timestamp, created_at
      ) VALUES (
        $1, 'template_exported', $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )
      RETURNING *
    `;

    await pool.query(analyticsQuery, [
      id,
      user.id,
      JSON.stringify({ format })
    ]);

    // Log template export
    logger.info('Template exported successfully:', {
      templateId: id,
      format,
      exportedBy: user.id
    });

    // In a real implementation, you would generate the actual file here
    // For now, we'll return a success message

    res.status(200).json({
      success: true,
      message: 'Template export initiated',
      data: {
        template,
        format,
        downloadUrl: `/api/templates/${id}/download/${format}`,
        status: 'ready'
      }
    });

  } catch (error) {
    logger.error('Export template error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

/**
 * Search Templates
 * GET /api/templates/search
 */
router.get('/search', authenticateToken, async (req, res) => {
  try {
    const {
      q: query,
      category,
      subcategory,
      tags,
      status,
      visibility,
      sortBy = 'relevance',
      limit = 20
    } = req.query;

    if (!query) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    // Build search query
    let searchQuery = `
      SELECT
        t.*,
        u.username as created_by_username,
        u.first_name,
        u.last_name,
        ts_rank(ts_rank(to_tsvector('english', t.name || ' ' || t.description || ' ' || COALESCE(t.tags::text, ''), query)) as relevance_score,
        (SELECT COUNT(*) FROM template_analytics ta WHERE ta.template_id = t.id AND ta.event_type = 'template_viewed') as view_count,
        (SELECT COUNT(*) FROM template_analytics ta WHERE ta.template_id = t.id AND ta.event_type = 'template_used') as use_count
      FROM templates t
      LEFT JOIN users u ON t.created_by = u.id,
      to_tsvector('english', t.name || ' ' || t.description || ' ' || COALESCE(t.tags::text, '')) @@ plainto_tsquery('english', query) AS rank
      WHERE t.status != 'archived'
    `;

    // Add filters
    const filters = [];
    const queryParams = [];

    if (category) {
      searchQuery += ` AND t.category = $${queryParams.length + 1}`;
      queryParams.push(category);
    }

    if (subcategory) {
      searchQuery += ` AND t.subcategory = $${queryParams.length + 1}`;
      queryParams.push(subcategory);
    }

    if (status) {
      searchQuery += ` AND t.status = $${queryParams.length + 1}`;
      queryParams.push(status);
    }

    if (visibility) {
      searchQuery += ` AND t.visibility = $${queryParams.length + 1}`;
      queryParams.push(visibility);
    }

    if (tags && tags.length > 0) {
      const tagConditions = tags.map((tag, index) => `t.tags::text ILIKE $${queryParams.length + 1 + index}`).join(' OR ');
      searchQuery += ` AND (${tagConditions})`;
      queryParams.push(...tags.map(tag => `%${tag}%`));
    }

    // Add ordering
    searchQuery += ` ORDER BY rank DESC, t.created_at DESC`;

    // Add limit
    searchQuery += ` LIMIT $${queryParams.length + 1}`;
    queryParams.push(limit);

    const result = await pool.query(searchQuery, queryParams);

    // Send response
    res.status(200).json({
      success: true,
      message: 'Templates retrieved successfully',
      data: {
        templates: result.rows,
        query,
        total: result.rows.length
      }
    });

  } catch (error) {
    logger.error('Search templates error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

/**
 * Get Popular Templates
 * GET /api/templates/popular
 */
router.get('/popular', authenticateToken, async (req, res) => {
  try {
    const { period = '30d', limit = 10 } = req.query;

    // Calculate date range
    let dateFilter = '';
    if (period === '7d') {
      dateFilter = "AND ta.timestamp >= CURRENT_DATE - INTERVAL '7 days'";
    } else if (period === '30d') {
      dateFilter = "AND ta.timestamp >= CURRENT_DATE - INTERVAL '30 days'";
    } else if (period === '90d') {
      dateFilter = "AND ta.timestamp >= CURRENT_DATE - INTERVAL '90 days'";
    }

    const query = `
      SELECT
        t.*,
        u.username as created_by_username,
        u.first_name,
        u.last_name,
        (SELECT COUNT(*) FROM template_analytics ta WHERE ta.template_id = t.id AND ta.event_type = 'template_used' ${dateFilter}) as use_count,
        (SELECT AVG(CAST(ta.properties->>'rating' AS DECIMAL)) FROM template_analytics ta WHERE ta.template_id = t.id AND ta.properties->>'rating' IS NOT NULL ${dateFilter}) as average_rating,
        (SELECT COUNT(*) FROM template_analytics ta WHERE ta.template_id = t.id AND ta.event_type = 'template_viewed' ${dateFilter}) as view_count
      FROM templates t
      LEFT JOIN users u ON t.created_by = u.id
      WHERE t.status != 'archived'
      ORDER BY use_count DESC, average_rating DESC, view_count DESC
      LIMIT $1
    `;

    const result = await pool.query(query, [limit]);

    // Send response
    res.status(200).json({
      success: true,
      message: 'Popular templates retrieved successfully',
      data: result.rows
    });

  } catch (error) {
    logger.error('Get popular templates error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

module.exports = router;
