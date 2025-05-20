# Backend Structure Document for Foresight CDSS MVP (Aspirational)

## Overview
This document outlines a potential backend architecture for the Foresight Clinical Decision Support System (CDSS) MVP, based on Node.js/Express.

**Important: This document describes an aspirational or previously considered architecture. The *current, implemented* backend architecture uses Supabase (PostgreSQL) and Next.js API Routes (e.g., for Tool A - Advisor). For the authoritative description of the current backend and AI tools, please refer to [../docs/architecture.md#backend-architecture-and-data-layer](../docs/architecture.md#backend-architecture-and-data-layer) and other relevant sections in `docs/architecture.md`.**

The Node.js/Express architecture detailed here could be a consideration for future development, particularly if the demands of advanced AI tools (like the envisioned Tools B, C, D, F) require a more custom backend solution beyond the current Next.js/Supabase stack.

## Current MVP Status (Reality)

As detailed in `docs/architecture.md`:
*   The current system uses a **Supabase (PostgreSQL)** backend and **Next.js API Routes**.
*   **Tool A (Advisor)** is the primary live AI feature, using the `/api/advisor` Next.js route.
*   The Python script **`clinical_engine.py`** is an early-stage, standalone prototype for the aspirational **Tool B (Diagnosis and Treatment Engine)** and is not integrated into the live backend.
*   This document's Node.js/Express content is **aspirational** and not currently in the repository.

## Architecture (Aspirational Node.js/Express Backend)

If a Node.js/Express backend were to be developed (e.g., for future advanced AI tools), it might follow a modular, service-oriented architecture organized around key clinical domains:

### Core Components (Aspirational for a Node.js/Express context)

#### API Layer
- **REST API**: Primary interface for frontend communication
- **GraphQL API**: For complex data queries and subscriptions (future implementation)
- **Authentication Service**: JWT-based authentication and authorization
- **Rate Limiting**: Protection against abuse

#### Service Layer
- **Patient Service**: Patient data management and retrieval
- **Consultation Service**: Handles patient consultations and clinical workflows
- **Advisory Service**: Clinical decision support algorithms and recommendations
- **Analytics Service**: Usage metrics and clinical outcome tracking

#### Data Layer
- **Database Access Layer**: Abstracts database operations
- **Cache Service**: Performance optimization for frequently accessed data
- **Data Validation Service**: Ensures data integrity and format consistency

### Directory Structure
```
/backend
├── src/
│   ├── api/                  # API endpoints and controllers
│   │   ├── routes/           # Route definitions
│   │   └── middleware/       # API middleware (auth, validation, etc.)
│   ├── services/             # Business logic implementation
│   │   ├── patient/          # Patient-related services
│   │   ├── consultation/     # Consultation management
│   │   ├── advisor/          # Clinical decision support
│   │   └── analytics/        # Usage and outcome analytics
│   ├── models/               # Data models and schema definitions
│   ├── utils/                # Utility functions and helpers
│   ├── config/               # Configuration files
│   └── db/                   # Database connection and ORM setup
├── tests/                    # Automated tests
│   ├── unit/                 # Unit tests for individual components
│   ├── integration/          # Testing component interactions
│   └── e2e/                  # End-to-end API tests
└── scripts/                  # Utility scripts for development and deployment
```

## Data Models

### Key Entities
1. **Patient**
   - Demographics
   - Medical history
   - Risk factors
   - Current medications

2. **Consultation**
   - Timestamps
   - Practitioner information
   - Chief complaints
   - Clinical observations
   - Diagnoses

3. **Clinical Decision**
   - Recommendation type
   - Evidence basis
   - Confidence level
   - References

4. **User**
   - Authentication details
   - Role and permissions
   - Preferences

## API Endpoints

### Patient Management
- `GET /api/patients` - List patients
- `GET /api/patients/:id` - Get patient details
- `POST /api/patients` - Create new patient
- `PUT /api/patients/:id` - Update patient information
- `DELETE /api/patients/:id` - Remove patient record

### Consultation Management
- `GET /api/consultations` - List consultations
- `GET /api/consultations/:id` - Get consultation details
- `POST /api/consultations` - Create new consultation
- `PUT /api/consultations/:id` - Update consultation information
- `GET /api/patients/:id/consultations` - Get patient's consultation history

### Clinical Decision Support
- `POST /api/advisor/analyze` - Request clinical analysis
- `GET /api/advisor/recommendations/:consultationId` - Get recommendations for a consultation
- `POST /api/advisor/feedback` - Submit feedback on recommendations

## Authentication and Security
- JWT-based authentication
- Role-based access control
- Endpoint permissions
- Data encryption for sensitive information
- HIPAA/GDPR compliance measures

## Error Handling
- Standardized error responses
- Error logging and monitoring
- Graceful degradation strategies

## Performance Considerations
- Database indexing strategy
- Query optimization
- Caching layers
- Horizontal scaling capability

## Monitoring and Logging
- Application performance monitoring
- Error tracking
- Access logs
- Audit trails for clinical decisions