-- Enable pgvector extension for vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create clinical guidelines documents table
CREATE TABLE IF NOT EXISTS guidelines_docs (
    id BIGSERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    source TEXT NOT NULL, -- NICE, USPSTF, NCI_PDQ, RxNorm
    specialty TEXT NOT NULL, -- Oncology, Primary Care, Rheumatology, Pharmacology, etc.
    metadata JSONB DEFAULT '{}',
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create clinical guidelines vectors table for RAG
CREATE TABLE IF NOT EXISTS guideline_vectors (
    id BIGSERIAL PRIMARY KEY,
    doc_id BIGINT NOT NULL REFERENCES guidelines_docs(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    embedding VECTOR(1536), -- Using OpenAI ada-002 embedding dimensions
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_guidelines_docs_source ON guidelines_docs(source);
CREATE INDEX IF NOT EXISTS idx_guidelines_docs_specialty ON guidelines_docs(specialty);
CREATE INDEX IF NOT EXISTS idx_guidelines_docs_content_trigram ON guidelines_docs USING GIN (content gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_guidelines_docs_title_trigram ON guidelines_docs USING GIN (title gin_trgm_ops);

-- Create vector similarity index
CREATE INDEX IF NOT EXISTS idx_guideline_vectors_embedding ON guideline_vectors 
USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Create function for similarity search with filtering
CREATE OR REPLACE FUNCTION match_guidelines(
    query_embedding VECTOR(1536),
    match_count INT DEFAULT 5,
    filter JSONB DEFAULT '{}'
)
RETURNS TABLE(
    id BIGINT,
    content TEXT,
    metadata JSONB,
    similarity FLOAT
)
LANGUAGE SQL
AS $$
    SELECT 
        guideline_vectors.id,
        guideline_vectors.content,
        guideline_vectors.metadata,
        1 - (guideline_vectors.embedding <=> query_embedding) AS similarity
    FROM guideline_vectors
    WHERE 
        CASE 
            WHEN filter = '{}' THEN TRUE
            ELSE guideline_vectors.metadata @> filter
        END
    ORDER BY guideline_vectors.embedding <=> query_embedding
    LIMIT match_count;
$$;

-- Create function to search guidelines by text (for UI search)
CREATE OR REPLACE FUNCTION search_guidelines_text(
    search_query TEXT,
    match_count INT DEFAULT 10
)
RETURNS TABLE(
    id BIGINT,
    title TEXT,
    content TEXT,
    source TEXT,
    specialty TEXT,
    similarity FLOAT
)
LANGUAGE SQL
AS $$
    SELECT 
        guidelines_docs.id,
        guidelines_docs.title,
        left(guidelines_docs.content, 500) as content, -- First 500 chars for preview
        guidelines_docs.source,
        guidelines_docs.specialty,
        similarity(guidelines_docs.title || ' ' || guidelines_docs.content, search_query) as similarity
    FROM guidelines_docs
    WHERE 
        guidelines_docs.title ILIKE '%' || search_query || '%' 
        OR guidelines_docs.content ILIKE '%' || search_query || '%'
    ORDER BY similarity DESC, guidelines_docs.title
    LIMIT match_count;
$$;

-- Create table for tracking data refresh status
CREATE TABLE IF NOT EXISTS guidelines_refresh_log (
    id BIGSERIAL PRIMARY KEY,
    source TEXT NOT NULL,
    status TEXT NOT NULL, -- 'started', 'completed', 'failed'
    message TEXT,
    documents_updated INTEGER DEFAULT 0,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
); 