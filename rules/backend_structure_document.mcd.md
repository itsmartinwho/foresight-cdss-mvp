# Backend Structure Document for Foresight CDSS MVP

## Overview
This document outlines the backend architecture for the Foresight Clinical Decision Support System (CDSS) MVP. The backend serves as the foundation for data processing, clinical logic implementation, and API services that support the frontend application.

## Current MVP Status (April 2024)

The codebase **does not yet contain the `/backend` directory** or any Node.js/Express implementation described below. For the Minimal Viable Product we rely on:

1. A **Python 3.9+ ClinicalEngine** (`clinical_engine.py`) that can be run as a standalone process for CDS logic.
2. A **Next.js 15 / React 19 front-end** that mocks backend behaviour via `src/lib/*Service.ts` files.

The sections that follow remain the *target* architecture for the full product. They are kept for planning purposes and will be incrementally implemented. When reading, keep in mind that they are **aspirational, not currently in the repository**.

## Architecture
The Foresight CDSS backend follows a modular, service-oriented architecture organized around key clinical domains:

### Core Components

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