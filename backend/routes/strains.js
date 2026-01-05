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
      microorganism_type,  // NEW: BAKTERI, YEAST, KAPANG, ACTINOMYCETES
      genus, 
      sample_type,         // NEW: Tanah, Air, dll
      biosafety, 
      search,
      // NEW: Filter by potentials
      nitrogen_fixer,
      phosphate_solubilizer,
      proteolytic,
      lipolytic,
      amylolytic,
      cellulolytic,
      antimicrobial,
      iaa_hormone,
      sort = 'created_at',
      order = 'DESC'
    } = req.query;

    const offset = (page - 1) * limit;

    // Build query
    let query = 'SELECT * FROM strains WHERE deleted_at IS NULL';
    const params = [];
    let paramCount = 0;

    // Filter by microorganism type
    if (microorganism_type) {
      paramCount++;
      params.push(microorganism_type);
      query += ` AND microorganism_type = $${paramCount}`;
    }

    // Filter by genus
    if (genus) {
      paramCount++;
      params.push(genus);
      query += ` AND genus = $${paramCount}`;
    }

    // Filter by sample type
    if (sample_type) {
      paramCount++;
      params.push(sample_type);
      query += ` AND sample_type = $${paramCount}`;
    }

    // Filter by biosafety
    if (biosafety) {
      paramCount++;
      params.push(biosafety);
      query += ` AND biosafety_level = $${paramCount}`;
    }

    // Search in multiple fields
    if (search) {
      paramCount++;
      params.push(`%${search}%`);
      query += ` AND (
        strain_code ILIKE $${paramCount} OR 
        genus_species ILIKE $${paramCount} OR 
        origin_location ILIKE $${paramCount}
      )`;
    }

    // NEW: Filter by potentials (8 activities)
    if (nitrogen_fixer === 'true') {
      query += ` AND potential_nitrogen_fixer = TRUE`;
    }
    if (phosphate_solubilizer === 'true') {
      query += ` AND potential_phosphate_solubilizer = TRUE`;
    }
    if (proteolytic === 'true') {
      query += ` AND potential_proteolytic = TRUE`;
    }
    if (lipolytic === 'true') {
      query += ` AND potential_lipolytic = TRUE`;
    }
    if (amylolytic === 'true') {
      query += ` AND potential_amylolytic = TRUE`;
    }
    if (cellulolytic === 'true') {
      query += ` AND potential_cellulolytic = TRUE`;
    }
    if (antimicrobial === 'true') {
      query += ` AND potential_antimicrobial = TRUE`;
    }
    if (iaa_hormone === 'true') {
      query += ` AND potential_iaa_hormone = TRUE`;
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
    const allowedSorts = [
      'created_at', 'strain_code', 'genus_species', 'microorganism_type', 
      'biosafety_level', 'sample_type'
    ];
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
  // Required fields
  body('strain_code').trim().notEmpty().isLength({ max: 100 }),
  body('microorganism_type').isIn(['BAKTERI', 'YEAST', 'KAPANG', 'ACTINOMYCETES']),
  
  // Optional fields
  body('genus_species').optional({ nullable: true }).trim().isLength({ max: 255 }),
  body('genus').optional({ nullable: true }).trim().isLength({ max: 100 }),
  body('species').optional({ nullable: true }).trim().isLength({ max: 100 }),
  body('sample_type').optional({ nullable: true }).trim().isLength({ max: 100 }),
  body('origin_location').optional({ nullable: true }).trim(),
  body('isolation_date').optional({ nullable: true }).isISO8601(),
  
  // Characteristics
  body('characteristics_macroscopic').optional({ nullable: true }).trim(),
  body('characteristics_microscopic').optional({ nullable: true }).trim(),
  body('characteristics_biochemical').optional({ nullable: true }).trim(),
  
  // Potentials (boolean)
  body('potential_nitrogen_fixer').optional({ nullable: true }).isBoolean(),
  body('potential_phosphate_solubilizer').optional({ nullable: true }).isBoolean(),
  body('potential_proteolytic').optional({ nullable: true }).isBoolean(),
  body('potential_lipolytic').optional({ nullable: true }).isBoolean(),
  body('potential_amylolytic').optional({ nullable: true }).isBoolean(),
  body('potential_cellulolytic').optional({ nullable: true }).isBoolean(),
  body('potential_antimicrobial').optional({ nullable: true }).isBoolean(),
  body('potential_iaa_hormone').optional({ nullable: true }).isBoolean(),
  
  // Storage
  body('storage_technique').optional({ nullable: true }).trim(),
  body('culture_stock').optional({ nullable: true }).trim(),
  body('storage_location').optional({ nullable: true }).trim().isLength({ max: 100 }),
  
  // System fields
  body('biosafety_level').optional({ nullable: true }).isInt({ min: 1, max: 4 }),
  body('genome_sequenced').optional({ nullable: true }).isBoolean(),
  body('genbank_accession').optional({ nullable: true }).trim().isLength({ max: 50 }),
  body('additional_notes').optional({ nullable: true }).isObject()
], async (req, res) => {
  // Validate input
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const {
      strain_code,
      microorganism_type,
      genus_species,
      genus,
      species,
      sample_type,
      origin_location,
      isolation_date,
      characteristics_macroscopic,
      characteristics_microscopic,
      characteristics_biochemical,
      potential_nitrogen_fixer,
      potential_phosphate_solubilizer,
      potential_proteolytic,
      potential_lipolytic,
      potential_amylolytic,
      potential_cellulolytic,
      potential_antimicrobial,
      potential_iaa_hormone,
      storage_technique,
      culture_stock,
      storage_location,
      biosafety_level,
      genome_sequenced,
      genbank_accession,
      additional_notes
    } = req.body;

    // Check if user has clearance to create this biosafety level
    const bsl = biosafety_level || 1;
    if (bsl > req.user.biosafety_clearance) {
      return res.status(403).json({ 
        error: 'Insufficient biosafety clearance to create this strain',
        required: bsl,
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
        strain_code, microorganism_type, genus_species, genus, species,
        sample_type, origin_location, isolation_date,
        characteristics_macroscopic, characteristics_microscopic, characteristics_biochemical,
        potential_nitrogen_fixer, potential_phosphate_solubilizer, 
        potential_proteolytic, potential_lipolytic, potential_amylolytic, 
        potential_cellulolytic, potential_antimicrobial, potential_iaa_hormone,
        storage_technique, culture_stock, storage_location,
        biosafety_level, genome_sequenced, genbank_accession, additional_notes,
        created_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 
        $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27
      ) RETURNING *`,
      [
        strain_code,
        microorganism_type,
        genus_species || null,
        genus || null,
        species || null,
        sample_type || null,
        origin_location || null,
        isolation_date || null,
        characteristics_macroscopic || null,
        characteristics_microscopic || null,
        characteristics_biochemical || null,
        potential_nitrogen_fixer || false,
        potential_phosphate_solubilizer || false,
        potential_proteolytic || false,
        potential_lipolytic || false,
        potential_amylolytic || false,
        potential_cellulolytic || false,
        potential_antimicrobial || false,
        potential_iaa_hormone || false,
        storage_technique || null,
        culture_stock || null,
        storage_location || null,
        bsl,
        genome_sequenced || false,
        genbank_accession || null,
        JSON.stringify(additional_notes || {}),
        req.user.userId
      ]
    );

    const strain = result.rows[0];

    // Audit log
    await db.query(
      `INSERT INTO audit_logs (action, resource_type, resource_id, user_id, details)
       VALUES ($1, $2, $3, $4, $5)`,
      ['CREATE_STRAIN', 'strain', strain.id, req.user.userId, 
       JSON.stringify({ strain_code, microorganism_type, biosafety_level: bsl })]
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
  body('strain_code').optional({ nullable: true }).trim().isLength({ max: 100 }),
  body('microorganism_type').optional({ nullable: true }).isIn(['BAKTERI', 'YEAST', 'KAPANG', 'ACTINOMYCETES']),
  body('genus_species').optional({ nullable: true }).trim().isLength({ max: 255 }),
  body('genus').optional({ nullable: true }).trim().isLength({ max: 100 }),
  body('species').optional({ nullable: true }).trim().isLength({ max: 100 }),
  body('sample_type').optional({ nullable: true }).trim().isLength({ max: 100 }),
  body('origin_location').optional({ nullable: true }).trim(),
  body('isolation_date').optional({ nullable: true }).isISO8601(),
  body('characteristics_macroscopic').optional({ nullable: true }).trim(),
  body('characteristics_microscopic').optional({ nullable: true }).trim(),
  body('characteristics_biochemical').optional({ nullable: true }).trim(),
  body('potential_nitrogen_fixer').optional({ nullable: true }).isBoolean(),
  body('potential_phosphate_solubilizer').optional({ nullable: true }).isBoolean(),
  body('potential_proteolytic').optional({ nullable: true }).isBoolean(),
  body('potential_lipolytic').optional({ nullable: true }).isBoolean(),
  body('potential_amylolytic').optional({ nullable: true }).isBoolean(),
  body('potential_cellulolytic').optional({ nullable: true }).isBoolean(),
  body('potential_antimicrobial').optional({ nullable: true }).isBoolean(),
  body('potential_iaa_hormone').optional({ nullable: true }).isBoolean(),
  body('storage_technique').optional({ nullable: true }).trim(),
  body('culture_stock').optional({ nullable: true }).trim(),
  body('storage_location').optional({ nullable: true }).trim().isLength({ max: 100 }),
  body('biosafety_level').optional({ nullable: true }).isInt({ min: 1, max: 4 }),
  body('genome_sequenced').optional({ nullable: true }).isBoolean(),
  body('genbank_accession').optional({ nullable: true }).trim().isLength({ max: 50 }),
  body('additional_notes').optional({ nullable: true }).isObject()
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
      'strain_code', 'microorganism_type', 'genus_species', 'genus', 'species',
      'sample_type', 'origin_location', 'isolation_date',
      'characteristics_macroscopic', 'characteristics_microscopic', 'characteristics_biochemical',
      'potential_nitrogen_fixer', 'potential_phosphate_solubilizer', 
      'potential_proteolytic', 'potential_lipolytic', 'potential_amylolytic',
      'potential_cellulolytic', 'potential_antimicrobial', 'potential_iaa_hormone',
      'storage_technique', 'culture_stock', 'storage_location',
      'biosafety_level', 'genome_sequenced', 'genbank_accession', 'additional_notes'
    ];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        paramCount++;
        params.push(field === 'additional_notes' ? JSON.stringify(req.body[field]) : req.body[field]);
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
    if (req.user.role === 'technician') {
      return res.status(403).json({ error: 'Technicians cannot delete strains' });
    }

    if (req.user.role === 'researcher' && strain.created_by !== req.user.userId) {
      return res.status(403).json({ error: 'You can only delete your own strains' });
    }

    // Soft delete
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

    // Check if already active
    if (!strain.deleted_at) {
      return res.status(400).json({ error: 'Strain is not deleted' });
    }

    // Check permissions
    if (req.user.role === 'technician') {
      return res.status(403).json({ error: 'Technicians cannot restore strains' });
    }

    if (req.user.role === 'researcher' && strain.created_by !== req.user.userId) {
      return res.status(403).json({ error: 'You can only restore your own strains' });
    }

    // Restore
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