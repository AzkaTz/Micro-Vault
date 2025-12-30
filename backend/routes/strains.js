const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const db = require('../config/db');
const { authenticateToken, checkBiosafety, checkRole } = require('../middleware/auth');

// GET /api/strains - List strains with pagination and filters
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      genus, 
      biosafety, 
      search,
      sort = 'created_at',
      order = 'DESC'
    } = req.query;

    const offset = (page - 1) * limit;

    // Build query
    let query = 'SELECT * FROM strains WHERE deleted_at IS NULL';
    const params = [];
    let paramCount = 0;

    // Filters
    if (genus) {
      paramCount++;
      params.push(genus);
      query += ` AND genus = $${paramCount}`;
    }

    if (biosafety) {
      paramCount++;
      params.push(biosafety);
      query += ` AND biosafety_level = $${paramCount}`;
    }

    if (search) {
      paramCount++;
      params.push(`%${search}%`);
      query += ` AND (scientific_name ILIKE $${paramCount} OR strain_code ILIKE $${paramCount})`;
    }

    // User can only see strains with biosafety <= their clearance
    paramCount++;
    params.push(req.user.biosafety_clearance);
    query += ` AND biosafety_level <= $${paramCount}`;

    // Count total
    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*)');
    const countResult = await db.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    // Sorting
    const allowedSorts = ['created_at', 'scientific_name', 'biosafety_level', 'strain_code'];
    const sortColumn = allowedSorts.includes(sort) ? sort : 'created_at';
    const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    
    query += ` ORDER BY ${sortColumn} ${sortOrder}`;

    // Pagination
    paramCount++;
    params.push(limit);
    query += ` LIMIT $${paramCount}`;
    
    paramCount++;
    params.push(offset);
    query += ` OFFSET $${paramCount}`;

    // Execute query
    const result = await db.query(query, params);

    res.json({
      strains: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('List strains error:', error);
    res.status(500).json({ error: 'Failed to fetch strains' });
  }
});

// GET /api/strains/:id - Get strain detail
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      `SELECT s.*, u.full_name as created_by_name, u.email as created_by_email
       FROM strains s
       LEFT JOIN users u ON s.created_by = u.id
       WHERE s.id = $1 AND s.deleted_at IS NULL`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Strain not found' });
    }

    const strain = result.rows[0];

    // Check biosafety clearance
    if (strain.biosafety_level > req.user.biosafety_clearance) {
      return res.status(403).json({ 
        error: 'Insufficient biosafety clearance to view this strain',
        required: strain.biosafety_level,
        current: req.user.biosafety_clearance
      });
    }

    res.json(strain);

  } catch (error) {
    console.error('Get strain error:', error);
    res.status(500).json({ error: 'Failed to fetch strain' });
  }
});

// POST /api/strains - Create new strain
router.post('/', [
  authenticateToken,
  body('strain_code').trim().notEmpty().isLength({ max: 50 }),
  body('scientific_name').trim().notEmpty().isLength({ max: 255 }),
  body('genus').trim().notEmpty().isLength({ max: 100 }),
  body('species').trim().notEmpty().isLength({ max: 100 }),
  body('biosafety_level').isInt({ min: 1, max: 4 }),
  body('source_location').optional().trim().isLength({ max: 255 }),
  body('isolation_date').optional().isISO8601(),
  body('storage_location').optional().trim().isLength({ max: 100 }),
  body('genome_sequenced').optional().isBoolean(),
  body('genbank_accession').optional().trim().isLength({ max: 50 }),
  body('characteristics').optional().isObject()
], async (req, res) => {
  // Validate input
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const {
      strain_code,
      scientific_name,
      genus,
      species,
      biosafety_level,
      source_location,
      isolation_date,
      storage_location,
      genome_sequenced,
      genbank_accession,
      characteristics
    } = req.body;

    // Check if user has clearance to create this biosafety level
    if (biosafety_level > req.user.biosafety_clearance) {
      return res.status(403).json({ 
        error: 'Insufficient biosafety clearance to create this strain',
        required: biosafety_level,
        current: req.user.biosafety_clearance
      });
    }

    // Check if strain_code already exists
    const existingStrain = await db.query(
      'SELECT id FROM strains WHERE strain_code = $1 AND deleted_at IS NULL',
      [strain_code]
    );

    if (existingStrain.rows.length > 0) {
      return res.status(400).json({ error: 'Strain code already exists' });
    }

    // Insert strain
    const result = await db.query(
      `INSERT INTO strains (
        strain_code, scientific_name, genus, species, biosafety_level,
        source_location, isolation_date, storage_location, genome_sequenced,
        genbank_accession, characteristics, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`,
      [
        strain_code,
        scientific_name,
        genus,
        species,
        biosafety_level,
        source_location || null,
        isolation_date || null,
        storage_location || null,
        genome_sequenced || false,
        genbank_accession || null,
        JSON.stringify(characteristics || {}),
        req.user.userId
      ]
    );

    const strain = result.rows[0];

    // Audit log
    await db.query(
      `INSERT INTO audit_logs (action, resource_type, resource_id, user_id, details)
       VALUES ($1, $2, $3, $4, $5)`,
      ['CREATE_STRAIN', 'strain', strain.id, req.user.userId, JSON.stringify({ strain_code, biosafety_level })]
    );

    res.status(201).json(strain);

  } catch (error) {
    console.error('Create strain error:', error);
    res.status(500).json({ error: 'Failed to create strain' });
  }
});

// PUT /api/strains/:id - Update strain
router.put('/:id', [
  authenticateToken,
  body('strain_code').optional().trim().isLength({ max: 50 }),
  body('scientific_name').optional().trim().isLength({ max: 255 }),
  body('genus').optional().trim().isLength({ max: 100 }),
  body('species').optional().trim().isLength({ max: 100 }),
  body('biosafety_level').optional().isInt({ min: 1, max: 4 }),
  body('source_location').optional().trim().isLength({ max: 255 }),
  body('isolation_date').optional().isISO8601(),
  body('storage_location').optional().trim().isLength({ max: 100 }),
  body('genome_sequenced').optional().isBoolean(),
  body('genbank_accession').optional().trim().isLength({ max: 50 }),
  body('characteristics').optional().isObject()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { id } = req.params;

    // Check if strain exists
    const existingStrain = await db.query(
      'SELECT * FROM strains WHERE id = $1 AND deleted_at IS NULL',
      [id]
    );

    if (existingStrain.rows.length === 0) {
      return res.status(404).json({ error: 'Strain not found' });
    }

    const strain = existingStrain.rows[0];

    // Check permissions
    // Admin can edit any strain
    // Researcher can edit own strains
    // Technician cannot edit
    if (req.user.role === 'technician') {
      return res.status(403).json({ error: 'Technicians cannot edit strains' });
    }

    if (req.user.role === 'researcher' && strain.created_by !== req.user.userId) {
      return res.status(403).json({ error: 'You can only edit your own strains' });
    }

    // Check biosafety clearance for new level
    if (req.body.biosafety_level && req.body.biosafety_level > req.user.biosafety_clearance) {
      return res.status(403).json({ 
        error: 'Insufficient biosafety clearance',
        required: req.body.biosafety_level,
        current: req.user.biosafety_clearance
      });
    }

    // Build update query
    const updates = [];
    const params = [];
    let paramCount = 0;

    const allowedFields = [
      'strain_code', 'scientific_name', 'genus', 'species', 'biosafety_level',
      'source_location', 'isolation_date', 'storage_location', 'genome_sequenced',
      'genbank_accession', 'characteristics'
    ];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        paramCount++;
        params.push(field === 'characteristics' ? JSON.stringify(req.body[field]) : req.body[field]);
        updates.push(`${field} = $${paramCount}`);
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    // Add updated_at
    paramCount++;
    params.push(new Date());
    updates.push(`updated_at = $${paramCount}`);

    // Add id for WHERE clause
    paramCount++;
    params.push(id);

    const query = `
      UPDATE strains 
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await db.query(query, params);

    // Audit log
    await db.query(
      `INSERT INTO audit_logs (action, resource_type, resource_id, user_id, details)
       VALUES ($1, $2, $3, $4, $5)`,
      ['UPDATE_STRAIN', 'strain', id, req.user.userId, JSON.stringify(req.body)]
    );

    res.json(result.rows[0]);

  } catch (error) {
    console.error('Update strain error:', error);
    res.status(500).json({ error: 'Failed to update strain' });
  }
});

// DELETE /api/strains/:id - Soft delete strain
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if strain exists
    const existingStrain = await db.query(
      'SELECT * FROM strains WHERE id = $1 AND deleted_at IS NULL',
      [id]
    );

    if (existingStrain.rows.length === 0) {
      return res.status(404).json({ error: 'Strain not found' });
    }

    const strain = existingStrain.rows[0];

    // Check permissions
    // Admin can delete any strain
    // Researcher can delete own strains
    // Technician cannot delete
    if (req.user.role === 'technician') {
      return res.status(403).json({ error: 'Technicians cannot delete strains' });
    }

    if (req.user.role === 'researcher' && strain.created_by !== req.user.userId) {
      return res.status(403).json({ error: 'You can only delete your own strains' });
    }

    // Soft delete (set deleted_at timestamp)
    await db.query(
      'UPDATE strains SET deleted_at = NOW() WHERE id = $1',
      [id]
    );

    // Audit log
    await db.query(
      `INSERT INTO audit_logs (action, resource_type, resource_id, user_id, details)
       VALUES ($1, $2, $3, $4, $5)`,
      ['DELETE_STRAIN', 'strain', id, req.user.userId, JSON.stringify({ strain_code: strain.strain_code })]
    );

    res.json({ message: 'Strain deleted successfully', id });

  } catch (error) {
    console.error('Delete strain error:', error);
    res.status(500).json({ error: 'Failed to delete strain' });
  }
});
// PATCH /api/strains/:id/restore - Restore deleted strain
router.patch('/:id/restore', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if strain exists (including soft-deleted)
    const existingStrain = await db.query(
      'SELECT * FROM strains WHERE id = $1',
      [id]
    );

    if (existingStrain.rows.length === 0) {
      return res.status(404).json({ error: 'Strain not found' });
    }

    const strain = existingStrain.rows[0];

    // Check if already active (not deleted)
    if (!strain.deleted_at) {
      return res.status(400).json({ error: 'Strain is not deleted' });
    }

    // Check permissions
    // Admin can restore any strain
    // Researcher can restore own strains
    if (req.user.role === 'technician') {
      return res.status(403).json({ error: 'Technicians cannot restore strains' });
    }

    if (req.user.role === 'researcher' && strain.created_by !== req.user.userId) {
      return res.status(403).json({ error: 'You can only restore your own strains' });
    }

    // Restore (set deleted_at to NULL)
    await db.query(
      'UPDATE strains SET deleted_at = NULL WHERE id = $1',
      [id]
    );

    // Audit log
    await db.query(
      `INSERT INTO audit_logs (action, resource_type, resource_id, user_id, details)
       VALUES ($1, $2, $3, $4, $5)`,
      ['RESTORE_STRAIN', 'strain', id, req.user.userId, JSON.stringify({ strain_code: strain.strain_code })]
    );

    res.json({ message: 'Strain restored successfully', id });

  } catch (error) {
    console.error('Restore strain error:', error);
    res.status(500).json({ error: 'Failed to restore strain' });
  }
});
module.exports = router;