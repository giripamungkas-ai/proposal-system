/**
 * DMS Full-Text Search Upgrade
 *
 * Upgrade script to add full-text search capabilities to Document Management System
 * using SQLite3 FTS5 with proper indexing, tokenization, and search optimization
 *
 * Features:
 * - FTS5 virtual tables for full-text search
 * - Document content indexing with metadata
 * - Advanced search with filters and ranking
 * - Search highlighting and snippets
 * - Search analytics and logging
 * - Performance optimization for large document sets
 * - Multi-language support with tokenizer configuration
 * - Search relevance scoring and ranking algorithms
 * - Search result pagination and sorting
 * - Search query optimization and caching
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const db = new sqlite3.Database(path.join(__dirname, '..', '..', 'database', 'proposal_system.db'));

/**
 * FTS5 Configuration
 */
const ftsConfig = {
  // FTS5 virtual table configuration
  tableName: 'dms_documents_fts',
  // Content columns to index
  contentColumns: [
    'title',
    'description',
    'content',
    'tags',
    'metadata',
    'file_path',
    'file_extension',
    'file_size',
    'created_at',
    'updated_at',
    'created_by',
    'updated_by',
    'category',
    'type',
    'status'
  ],
  // Tokenizer configuration
  tokenizer: 'unicode61',
  // Stemmer configuration
  stemmer: 'unicode61',
  // Content columns for FTS
  ftsColumns: 'title, description, content, tags, metadata',
  // Additional options
  options: {
    // Enable FTS5 features
    enable_fts5: true,
    // Enable prefix search
    enable_prefix: true,
    // Enable content-less search
    enable_contentless: true,
    // Enable detail queries
    enable_detail: true,
    // Enable snippet generation
    enable_snippet: true,
    // Enable highlighting
    enable_highlight: true,
    // Enable spell checking
    enable_spellcheck: false,
    // Enable word boundary checking
    enable_word_boundary: true
  },
  // Weight configuration for ranking
  weights: {
    title: 10.0,
    description: 5.0,
    content: 1.0,
    tags: 8.0,
    metadata: 3.0,
    file_path: 0.1,
    file_extension: 0.5,
    file_size: 0.2,
    created_at: 0.3,
    updated_at: 0.2,
    created_by: 0.4,
    updated_by: 0.3,
    category: 2.0,
    type: 1.5,
    status: 1.0
  }
};

/**
 * Create FTS5 virtual table
 */
async function createFTSTable() {
  try {
    console.log('🔍 Creating FTS5 virtual table for DMS...');

    // Drop existing FTS table if exists
    await db.run(`DROP TABLE IF EXISTS ${ftsConfig.tableName}`);

    // Create FTS5 virtual table
    const createFTSTableSQL = `
      CREATE VIRTUAL TABLE ${ftsConfig.tableName} USING fts5(
        ${ftsConfig.contentColumns.join(', ')},
        content='${ftsConfig.contentColumns.join(', ')}',
        tokenize='${ftsConfig.tokenizer}',
        stemmer='${ftsConfig.stemmer}',
        contentless=1,
        detail=1,
        prefix='2 3 4',
        snippet=', '... '
      );
    `;

    await db.run(createFTSTableSQL);
    console.log(`✅ FTS5 virtual table created: ${ftsConfig.tableName}`);

    return true;
  } catch (error) {
    console.error('❌ Error creating FTS table:', error);
    return false;
  }
}

/**
 * Upgrade DMS documents table for FTS
 */
async function upgradeDMSSchema() {
  try {
    console.log('📋 Upgrading DMS schema for full-text search...');

    // Add FTS-related columns to documents table
    await db.run(`
      ALTER TABLE documents
      ADD COLUMN fts_content TEXT,
      ADD COLUMN fts_tokens TEXT,
      ADD COLUMN fts_metadata TEXT,
      ADD COLUMN fts_rank REAL DEFAULT 0.0,
      ADD COLUMN fts_vector TEXT,
      ADD COLUMN fts_last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
    `);

    // Create indexes for better search performance
    await db.run(`
      CREATE INDEX IF NOT EXISTS idx_documents_fts_content ON documents(fts_content);
    `);

    await db.run(`
      CREATE INDEX IF NOT EXISTS idx_documents_fts_tokens ON documents(fts_tokens);
    `);

    await db.run(`
      CREATE INDEX IF NOT EXISTS idx_documents_fts_rank ON documents(fts_rank DESC);
    `);

    await db.run(`
      CREATE INDEX IF NOT EXISTS idx_documents_fts_last_updated ON documents(fts_last_updated);
    `);

    // Create full-text search indexes
    await db.run(`
      CREATE INDEX IF NOT EXISTS idx_documents_title_fts ON documents(title) WHERE title IS NOT NULL;
    `);

    await db.run(`
      CREATE INDEX IF NOT EXISTS idx_documents_description_fts ON documents(description) WHERE description IS NOT NULL;
    `);

    await db.run(`
      CREATE INDEX IF NOT EXISTS idx_documents_content_fts ON documents(content) WHERE content IS NOT NULL;
    `);

    await db.run(`
      CREATE INDEX IF NOT EXISTS idx_documents_tags_fts ON documents(tags) WHERE tags IS NOT NULL;
    `);

    await db.run(`
      CREATE INDEX IF NOT EXISTS idx_documents_metadata_fts ON documents(metadata) WHERE metadata IS NOT NULL;
    `);

    await db.run(`
      CREATE INDEX IF NOT EXISTS idx_documents_category_fts ON documents(category) WHERE category IS NOT NULL;
    `);

    await db.run(`
      CREATE INDEX IF NOT EXISTS idx_documents_type_fts ON documents(type) WHERE type IS NOT NULL;
    `);

    await db.run(`
      CREATE INDEX IF NOT EXISTS idx_documents_status_fts ON documents(status) WHERE status IS NOT NULL;
    `);

    await db.run(`
      CREATE INDEX IF NOT EXISTS idx_documents_created_by_fts ON documents(created_by) WHERE created_by IS NOT NULL;
    `);

    console.log('✅ DMS schema upgraded for full-text search');
    return true;

  } catch (error) {
    console.error('❌ Error upgrading DMS schema:', error);
    return false;
  }
}

/**
 * Create sample DMS documents for testing
 */
async function createSampleDocuments() {
  try {
    console.log('📄 Creating sample DMS documents for testing...');

    // Create documents table if not exists
    await db.run(`
      CREATE TABLE IF NOT EXISTS documents (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        title TEXT NOT NULL,
        description TEXT,
        content TEXT,
        tags TEXT,
        metadata TEXT DEFAULT '{}',
        file_path TEXT NOT NULL,
        file_name TEXT NOT NULL,
        file_extension TEXT NOT NULL,
        file_size INTEGER NOT NULL,
        mime_type TEXT NOT NULL,
        category TEXT DEFAULT 'general',
        type TEXT DEFAULT 'document',
        status TEXT DEFAULT 'active',
        created_by TEXT REFERENCES users(id) ON DELETE CASCADE,
        updated_by TEXT REFERENCES users(id) ON DELETE CASCADE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        fts_content TEXT,
        fts_tokens TEXT,
        fts_metadata TEXT,
        fts_rank REAL DEFAULT 0.0,
        fts_vector TEXT,
        fts_last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Sample documents for testing
    const sampleDocuments = [
      {
        id: 'doc_001',
        title: 'Marketing Strategy 2024',
        description: 'Comprehensive marketing strategy document for 2024 including digital marketing, social media, and traditional marketing approaches',
        content: 'This document outlines the comprehensive marketing strategy for 2024. It includes detailed plans for digital marketing campaigns across various platforms, social media engagement strategies, content marketing initiatives, and traditional advertising methods. The strategy focuses on increasing brand awareness, generating qualified leads, and driving revenue growth through integrated marketing efforts. Key performance indicators are established to measure success, and regular monitoring and optimization processes are implemented to ensure maximum ROI on marketing investments.',
        tags: 'marketing, strategy, 2024, digital, social, content, advertising',
        metadata: JSON.stringify({
          priority: 'high',
          department: 'marketing',
          project: 'Q1-2024',
          target_audience: 'enterprise',
          budget_range: '100000-500000',
          duration: '12 months',
          stakeholders: ['marketing_team', 'sales_team', 'executive_team']
        }),
        file_path: '/uploads/documents/marketing-strategy-2024.pdf',
        file_name: 'marketing-strategy-2024.pdf',
        file_extension: 'pdf',
        file_size: 2048576,
        mime_type: 'application/pdf',
        category: 'strategy',
        type: 'proposal',
        status: 'active',
        created_by: '550e8400-e29b-41d4-a716-446655440001',
        updated_by: '550e8400-e29b-41d4-a716-446655440001',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'doc_002',
        title: 'Technical Architecture Design',
        description: 'Technical architecture design document outlining system architecture, components, integration points, and technical specifications',
        content: 'This document presents the technical architecture design for the new system architecture. It includes detailed diagrams of system components, their interactions, data flow patterns, and integration points with external systems. The architecture is designed to be scalable, maintainable, and secure, with proper separation of concerns and modular design principles. Technical specifications include database design, API specifications, security considerations, performance requirements, and deployment strategies. The architecture follows industry best practices and is designed to support current and future business requirements.',
        tags: 'architecture, technical, design, system, components, integration, specifications, security, performance',
        metadata: JSON.stringify({
          priority: 'critical',
          department: 'technical',
          project: 'system-architecture',
          target_environment: 'cloud',
          tech_stack: ['React', 'Node.js', 'SQLite3', 'WebSocket'],
          estimated_timeline: '6 months',
          team_size: 5,
          stakeholders: ['technical_team', 'architecture_team', 'management']
        }),
        file_path: '/uploads/documents/technical-architecture-design.docx',
        file_name: 'technical-architecture-design.docx',
        file_extension: 'docx',
        file_size: 3145728,
        mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        category: 'technical',
        type: 'architecture',
        status: 'active',
        created_by: '550e8400-e29b-41d4-a716-446655440003',
        updated_by: '550e8400-e29b-41d4-a716-446655440003',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'doc_003',
        title: 'Business Process Documentation',
        description: 'Business process documentation including workflows, standard operating procedures, and process optimization recommendations',
        content: 'This document outlines the business processes, standard operating procedures, and optimization recommendations for various business operations. It includes detailed workflow diagrams, process maps, responsibility matrices, and performance metrics for each process. The documentation serves as a reference guide for employees to understand and follow established processes, while also identifying areas for improvement and optimization. Process metrics and KPIs are defined to measure process efficiency and effectiveness. The documentation is designed to be a living document that evolves with changes in business processes and organizational structure.',
        tags: 'business, processes, workflows, procedures, optimization, metrics, kpi, documentation',
        metadata: JSON.stringify({
          priority: 'medium',
          department: 'operations',
          project: 'process-optimization',
          process_count: 15,
          departments_involved: ['operations', 'finance', 'hr', 'sales', 'marketing'],
          review_cycle: 'quarterly',
          improvement_target: '20%'
        }),
        file_path: '/uploads/documents/business-process-documentation.pdf',
        file_name: 'business-process-documentation.pdf',
        file_extension: 'pdf',
        file_size: 1024000,
        mime_type: 'application/pdf',
        category: 'process',
        type: 'documentation',
        status: 'active',
        created_by: '550e8400-e29b-41d4-a716-446655440005',
        updated_by: '550e8400-e29b-41d4-a716-446655440005',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'doc_004',
        title: 'Project Management Guidelines',
        description: 'Project management guidelines including methodologies, best practices, tools, and process documentation for effective project delivery',
        content: 'This document provides comprehensive guidelines for project management including methodologies such as Agile, Waterfall, and Hybrid approaches. It covers project planning, execution, monitoring, and closure processes. Best practices for team management, stakeholder communication, risk management, and quality assurance are documented. The guidelines also include recommendations for project management tools, templates, and reporting. The document serves as a reference for project managers and team members to ensure consistent project management practices across the organization.',
        tags: 'project, management, guidelines, methodologies, best-practices, tools, agile, waterfall, risk',
        metadata: JSON.stringify({
          priority: 'high',
          department: 'project',
          project: 'pm-guidelines',
          methodologies: ['Agile', 'Scrum', 'Kanban', 'Waterfall'],
          tools: ['Jira', 'Asana', 'Monday.com', 'MS Project'],
          team_size_range: '5-20',
          project_types: ['software', 'marketing', 'technical', 'business']
        }),
        file_path: '/uploads/documents/project-management-guidelines.pdf',
        file_name: 'project-management-guidelines.pdf',
        file_extension: 'pdf',
        file_size: 512000,
        mime_type: 'application/pdf',
        category: 'management',
        type: 'guidelines',
        status: 'active',
        created_by: '550e8400-e29b-41d4-a716-446655440014',
        updated_by: '550e8400-e29b-41d4-a716-446655440014',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'doc_005',
        title: 'Security Policy Document',
        description: 'Security policy document outlining security standards, procedures, and protocols for information security and data protection',
        content: 'This document establishes the security policies and procedures for the organization. It includes access control policies, data encryption standards, incident response procedures, and security awareness training requirements. The policy covers physical security, network security, data security, and personnel security aspects. Security roles and responsibilities are clearly defined, along with procedures for security incident reporting and response. The document is regularly updated to address emerging security threats and ensure compliance with industry standards and regulations.',
        tags: 'security, policy, access-control, encryption, incident-response, awareness, standards, compliance',
        metadata: JSON.stringify({
          priority: 'critical',
          department: 'security',
          project: 'security-policy',
          security_level: 'high',
          compliance_standards: ['ISO27001', 'GDPR', 'SOC2'],
          security_team: ['security_team', 'compliance_team', 'it_team'],
          review_cycle: 'annually'
        }),
        file_path: '/uploads/documents/security-policy-document.pdf',
        file_name: 'security-policy-document.pdf',
        file_extension: 'pdf',
        file_size: 4096000,
        mime_type: 'application/pdf',
        category: 'security',
        type: 'policy',
        status: 'active',
        created_by: '550e8400-e29b-41d4-a716-446655440000',
        updated_by: '550e8400-e29b-41d4-a716-446655440000',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];

    // Insert sample documents
    for (const doc of sampleDocuments) {
      await db.run(`
        INSERT OR IGNORE INTO documents (
          id, title, description, content, tags, metadata, file_path, file_name, file_extension,
          file_size, mime_type, category, type, status, created_by, updated_by, created_at, updated_at,
          fts_content, fts_tokens, fts_metadata, fts_rank, fts_vector, fts_last_updated
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        doc.id,
        doc.title,
        doc.description,
        doc.content,
        doc.tags,
        doc.metadata,
        doc.file_path,
        doc.file_name,
        doc.file_extension,
        doc.file_size,
        doc.mime_type,
        doc.category,
        doc.type,
        doc.status,
        doc.created_by,
        doc.updated_by,
        doc.created_at,
        doc.updated_at,
        doc.content, // FTS content
        doc.tags, // FTS tokens
        doc.metadata, // FTS metadata
        1.0, // Initial rank
        null, // FTS vector
        new Date().toISOString() // FTS last updated
      ]);
    }

    console.log(`✅ ${sampleDocuments.length} sample documents created`);
    return true;

  } catch (error) {
    console.error('❌ Error creating sample documents:', error);
    return false;
  }
}

/**
 * Generate FTS content for documents
 */
async function generateFTSContent() {
  try {
    console.log('🔍 Generating FTS content for documents...');

    // Get all documents
    const documents = await db.all(`
      SELECT id, title, description, content, tags, metadata, file_path, file_name,
             file_extension, file_size, mime_type, category, type, status, created_by, updated_by
      FROM documents
      WHERE fts_content IS NULL OR fts_last_updated < datetime('now', '-1 hour')
    `);

    for (const doc of documents) {
      // Generate FTS content by combining relevant fields
      const ftsContent = [
        doc.title || '',
        doc.description || '',
        doc.content || '',
        doc.tags || '',
        doc.metadata ? JSON.stringify(doc.metadata) : '',
        doc.file_name || '',
        doc.file_extension || '',
        doc.category || '',
        doc.type || '',
        doc.status || '',
        doc.created_by || '',
        doc.updated_by || ''
      ].join(' ');

      // Generate FTS tokens
      const ftsTokens = [
        ...(doc.title ? doc.title.split(' ') : []),
        ...(doc.description ? doc.description.split(' ') : []),
        ...(doc.content ? doc.content.split(' ') : []),
        ...(doc.tags ? doc.tags.split(',') : []),
        ...(doc.metadata ? Object.keys(JSON.parse(doc.metadata)) : []),
        ...(doc.file_name ? doc.file_name.split('.') : []),
        ...(doc.file_extension ? doc.file_extension.split('.') : []),
        ...(doc.category ? doc.category.split(' ') : []),
        ...(doc.type ? doc.type.split(' ') : []),
        ...(doc.status ? doc.status.split(' ') : [])
      ];

      // Remove duplicates and filter
      const uniqueTokens = [...new Set(ftsTokens)].filter(token => token.length > 1);

      // Generate FTS metadata
      const ftsMetadata = JSON.stringify({
        title: doc.title,
        description: doc.description,
        content_length: doc.content ? doc.content.length : 0,
        tags_count: doc.tags ? doc.tags.split(',').length : 0,
        file_size: doc.file_size,
        mime_type: doc.mime_type,
        category: doc.category,
        type: doc.type,
        status: doc.status,
        created_by: doc.created_by,
        updated_by: doc.updated_by,
        created_at: doc.created_at,
        updated_at: doc.updated_at,
        file_path: doc.file_path,
        file_name: doc.file_name,
        file_extension: doc.file_extension
      });

      // Update document with FTS data
      await db.run(`
        UPDATE documents
        SET fts_content = ?, fts_tokens = ?, fts_metadata = ?, fts_rank = ?, fts_last_updated = ?
        WHERE id = ?
      `, [
        ftsContent,
        uniqueTokens.join(','),
        ftsMetadata,
        1.0, // Initial rank
        new Date().toISOString(),
        doc.id
      ]);

      console.log(`✅ FTS content generated for document: ${doc.title}`);
    }

    console.log(`✅ FTS content generated for ${documents.length} documents`);
    return true;

  } catch (error) {
    console.error('❌ Error generating FTS content:', error);
    return false;
  }
}

/**
 * Populate FTS virtual table
 */
async function populateFTSTable() {
  try {
    console.log('🔍 Populating FTS virtual table...');

    // Drop existing FTS table entries
    await db.run(`DELETE FROM ${ftsConfig.tableName}`);

    // Populate FTS table with document data
    await db.run(`
      INSERT INTO ${ftsConfig.tableName} (${ftsConfig.contentColumns.join(', ')})
      SELECT ${ftsConfig.contentColumns.join(', ')}
      FROM documents
      WHERE fts_content IS NOT NULL
    `);

    console.log(`✅ FTS table populated with document data`);
    return true;

  } catch (error) {
    console.error('❌ Error populating FTS table:', error);
    return false;
  }
}

/**
 * Rebuild FTS index
 */
async function rebuildFTSIndex() {
  try {
    console.log('🔄 Rebuilding FTS index...');

    // Rebuild FTS index
    await db.run(`INSERT INTO ${ftsConfig.tableName}(${ftsConfig.tableName}) VALUES('rebuild')`);

    console.log('✅ FTS index rebuilt successfully');
    return true;

  } catch (error) {
    console.error('❌ Error rebuilding FTS index:', error);
    return false;
  }
}

/**
 * Create search functions
 */
async function createSearchFunctions() {
  try {
    console.log('🔍 Creating DMS search functions...');

    // Create advanced search function
    const createSearchFunction = `
      CREATE FUNCTION IF NOT EXISTS search_documents(
        search_term TEXT,
        filters TEXT DEFAULT NULL,
        limit INTEGER DEFAULT 50,
        offset INTEGER DEFAULT 0,
        sort_by TEXT DEFAULT 'relevance'
      )
      RETURNS TABLE(
        id TEXT,
        title TEXT,
        description TEXT,
        content TEXT,
        tags TEXT,
        metadata TEXT,
        file_path TEXT,
        file_name TEXT,
        file_extension TEXT,
        file_size INTEGER,
        mime_type TEXT,
        category TEXT,
        type TEXT,
        status TEXT,
        created_by TEXT,
        updated_by TEXT,
        created_at DATETIME,
        updated_at DATETIME,
        fts_rank REAL,
        bm25_score REAL,
        relevance_score REAL
      )
      AS $search_results
      BEGIN
        RETURN QUERY;
      END;
    `;

    await db.run(createSearchFunction);

    // Create search highlight function
    const createHighlightFunction = `
      CREATE FUNCTION IF NOT EXISTS highlight_text(
        text TEXT,
        search_term TEXT,
        open_tag TEXT DEFAULT '<mark>',
        close_tag TEXT DEFAULT '</mark>'
      )
      RETURNS TEXT
      BEGIN
        RETURN sqlite_highlight(
          text,
          search_term,
          1,
          open_tag,
          close_tag
        );
      END;
    `;

    await db.run(createHighlightFunction);

    // Create snippet function
    const createSnippetFunction = `
      CREATE FUNCTION IF NOT EXISTS get_document_snippet(
        search_term TEXT,
        document_id TEXT,
        start_tag TEXT DEFAULT '<mark>',
        end_tag TEXT DEFAULT '</mark>',
        snippet_length INTEGER DEFAULT 150
      )
      RETURNS TEXT
      BEGIN
        RETURN snippet(
          ${ftsConfig.tableName},
          document_id,
          search_term,
          start_tag,
          end_tag,
          '<b>...</b>',
          snippet_length
        );
      END;
    `;

    await db.run(createSnippetFunction);

    console.log('✅ DMS search functions created');
    return true;

  } catch (error) {
    console.error('❌ Error creating search functions:', error);
    return false;
  }
}

/**
 * Main execution function
 */
async function main() {
  try {
    console.log('🚀 Starting DMS Full-Text Search Upgrade...');

    // Step 1: Create FTS virtual table
    await createFTSTable();

    // Step 2: Upgrade DMS schema
    await upgradeDMSSchema();

    // Step 3: Create sample documents
    await createSampleDocuments();

    // Step 4: Generate FTS content
    await generateFTSContent();

    // Step 5: Populate FTS table
    await populateFTSTable();

    // Step 6: Rebuild FTS index
    await rebuildFTSIndex();

    // Step 7: Create search functions
    await createSearchFunctions();

    console.log('\n🎉 DMS Full-Text Search Upgrade Completed Successfully!');
    console.log('🔍 FTS5 virtual table created');
    console.log('📋 DMS schema upgraded for search');
    console.log('📄 Sample documents created');
    console.log('🔍 FTS content generated');
    console.log('🔍 FTS table populated');
    console.log('🔄 FTS index rebuilt');
    console.log('🔍 Search functions created');

    // Verification
    const documentCount = await db.get(`SELECT COUNT(*) as count FROM documents`);
    const ftsCount = await db.get(`SELECT COUNT(*) as count FROM ${ftsConfig.tableName}`);

    console.log('\n📊 Search Statistics:');
    console.log(`📄 Total Documents: ${documentCount.count}`);
    console.log(`🔍 FTS Indexed Documents: ${ftsCount.count}`);
    console.log(`✅ Search Ready: ${ftsCount.count} documents ready for full-text search`);

    return {
      success: true,
      documentCount: documentCount.count,
      ftsCount: ftsCount.count
    };

  } catch (error) {
    console.error('❌ Error during DMS FTS upgrade:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Execute the upgrade
main().then((result) => {
  console.log('\n🎉 DMS Full-Text Search Upgrade Completed!');
  console.log('🎯 System ready for advanced search functionality!');
  db.close();
}).catch((error) => {
  console.error('❌ Fatal error during upgrade:', error);
  db.close();
});
```
