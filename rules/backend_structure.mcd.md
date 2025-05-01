# Backend Structure for Foresight CDSS MVP

## Current MVP Status (April 2024)

The repository **does not yet include** the `/backend` folder or any of the Node/Express code described below. At present the system consists of:

1. A **Next.js 15 / React 19** front-end (fully in `src/`)
2. A standalone **Python 3.9+ ClinicalEngine** (`clinical_engine.py`) providing core CDS logic (run manually)

All directory listings, examples and schemas that follow are therefore **aspirational** and remain on the roadmap. They are documented here for reference while backend work is underway.

## Directory Structure Overview

```
/backend
├── src/
│   ├── api/                    # API layer
│   │   ├── controllers/        # Request handlers
│   │   │   ├── patients.ts
│   │   │   ├── consultations.ts
│   │   │   └── advisor.ts
│   │   ├── middlewares/        # API middlewares
│   │   │   ├── auth.ts
│   │   │   ├── validation.ts
│   │   │   └── errorHandler.ts
│   │   ├── routes/             # Route definitions
│   │   │   ├── patients.ts
│   │   │   ├── consultations.ts
│   │   │   └── advisor.ts
│   │   └── validators/         # Request validation schemas
│   │       ├── patients.ts
│   │       ├── consultations.ts
│   │       └── advisor.ts
│   ├── services/               # Business logic layer
│   │   ├── patient/
│   │   │   ├── patientService.ts
│   │   │   └── patientRepository.ts
│   │   ├── consultation/
│   │   │   ├── consultationService.ts
│   │   │   └── consultationRepository.ts
│   │   ├── advisor/
│   │   │   ├── advisorService.ts
│   │   │   ├── ruleEngine.ts
│   │   │   └── evidenceRepository.ts
│   │   └── analytics/
│   │       ├── analyticsService.ts
│   │       └── reportGenerator.ts
│   ├── models/                 # Data models
│   │   ├── Patient.ts
│   │   ├── Consultation.ts
│   │   ├── ClinicalDecision.ts
│   │   └── User.ts
│   ├── db/                     # Database configuration
│   │   ├── prisma/             # Prisma ORM
│   │   │   └── schema.prisma   # Database schema
│   │   ├── migrations/         # Database migrations
│   │   └── seed/               # Seed data
│   ├── utils/                  # Utility functions
│   │   ├── logger.ts
│   │   ├── encryption.ts
│   │   └── dateHelpers.ts
│   ├── config/                 # Configuration
│   │   ├── app.ts              # Application config
│   │   ├── db.ts               # Database config
│   │   └── auth.ts             # Auth config
│   └── types/                  # TypeScript type definitions
│       ├── api.ts
│       └── domain.ts
├── tests/                      # Tests
│   ├── unit/                   # Unit tests
│   │   ├── services/
│   │   └── utils/
│   ├── integration/            # Integration tests
│   │   ├── api/
│   │   └── db/
│   └── e2e/                    # End-to-end tests
│       └── api/
├── scripts/                    # Utility scripts
│   ├── seed.ts                 # Database seeding
│   └── generateApiDocs.ts      # API docs generation
├── .env                        # Environment variables
├── .env.example                # Example env file
├── package.json                # Dependencies
├── tsconfig.json               # TypeScript config
└── README.md                   # Project documentation
```

## Core Components

### API Layer

The API layer handles HTTP requests and responses, implementing RESTful endpoints for client communication.

#### Controllers
Controllers handle incoming requests, call appropriate services, and format responses:

```typescript
// Example controller (simplified)
export class PatientController {
  constructor(private patientService: PatientService) {}

  async getPatients(req: Request, res: Response, next: NextFunction) {
    try {
      const { page, limit, search } = req.query;
      const patients = await this.patientService.findPatients({
        page: parseInt(page as string, 10) || 1,
        limit: parseInt(limit as string, 10) || 20,
        search: search as string
      });
      
      return res.status(200).json({
        success: true,
        data: patients
      });
    } catch (error) {
      next(error);
    }
  }
  
  // Other controller methods
}
```

#### Routes
Routes define API endpoints and connect them to controllers:

```typescript
// Example route definitions
import { Router } from 'express';
import { PatientController } from '../controllers/patients';
import { authenticate } from '../middlewares/auth';
import { validateGetPatients } from '../validators/patients';

const router = Router();
const patientController = new PatientController(/* dependencies */);

router.get(
  '/',
  authenticate, 
  validateGetPatients,
  patientController.getPatients.bind(patientController)
);

router.get(
  '/:id',
  authenticate,
  patientController.getPatientById.bind(patientController)
);

// Other routes

export default router;
```

#### Middlewares
Middlewares provide cross-cutting concerns:

```typescript
// Example auth middleware (simplified)
export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    
    const decoded = verifyToken(token);
    req.user = decoded;
    
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
};
```

### Service Layer

The service layer implements business logic, separating it from API concerns.

```typescript
// Example service (simplified)
export class PatientService {
  constructor(private patientRepository: PatientRepository) {}
  
  async findPatients(options: FindPatientsOptions): Promise<PaginatedResult<Patient>> {
    return this.patientRepository.findMany(options);
  }
  
  async findPatientById(id: string): Promise<Patient | null> {
    return this.patientRepository.findById(id);
  }
  
  async createPatient(data: CreatePatientData): Promise<Patient> {
    // Validate business rules
    this.validatePatientData(data);
    
    // Process data
    const processedData = this.processPatientData(data);
    
    // Save to database
    return this.patientRepository.create(processedData);
  }
  
  // Other methods
  
  private validatePatientData(data: CreatePatientData): void {
    // Business rule validation
  }
  
  private processPatientData(data: CreatePatientData): ProcessedPatientData {
    // Data transformation
    return {
      ...data,
      // Transformations
    };
  }
}
```

### Repository Layer

Repositories handle data access, abstracting database operations:

```typescript
// Example repository (simplified)
export class PatientRepository {
  constructor(private prisma: PrismaClient) {}
  
  async findMany(options: FindPatientsOptions): Promise<PaginatedResult<Patient>> {
    const { page, limit, search } = options;
    const skip = (page - 1) * limit;
    
    const where = search 
      ? {
          OR: [
            { firstName: { contains: search, mode: 'insensitive' } },
            { lastName: { contains: search, mode: 'insensitive' } },
            { medicalRecordNumber: { contains: search } }
          ]
        } 
      : {};
    
    const [patients, total] = await Promise.all([
      this.prisma.patient.findMany({
        where,
        skip,
        take: limit,
        orderBy: { lastName: 'asc' }
      }),
      this.prisma.patient.count({ where })
    ]);
    
    return {
      data: patients,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }
  
  async findById(id: string): Promise<Patient | null> {
    return this.prisma.patient.findUnique({
      where: { id }
    });
  }
  
  async create(data: ProcessedPatientData): Promise<Patient> {
    return this.prisma.patient.create({
      data
    });
  }
  
  // Other methods
}
```

## Data Models

### Prisma Schema
The data model is defined using Prisma schema:

```prisma
// Example schema.prisma (simplified)
model Patient {
  id                  String         @id @default(uuid())
  medicalRecordNumber String         @unique
  firstName           String
  lastName            String
  dateOfBirth         DateTime
  sex                 String
  contactInformation  Json
  allergies           String[]
  medicalHistory      Json?
  createdAt           DateTime       @default(now())
  updatedAt           DateTime       @updatedAt
  consultations       Consultation[]
}

model Consultation {
  id             String            @id @default(uuid())
  patientId      String
  practitionerId String
  date           DateTime
  chiefComplaint String
  vitalSigns     Json
  observations   String
  assessment     String?
  plan           String?
  createdAt      DateTime          @default(now())
  updatedAt      DateTime          @updatedAt
  patient        Patient           @relation(fields: [patientId], references: [id])
  practitioner   User              @relation(fields: [practitionerId], references: [id])
  decisions      ClinicalDecision[]
}

model ClinicalDecision {
  id                 String       @id @default(uuid())
  consultationId     String
  recommendationType String
  recommendation     String
  evidenceBasis      String
  confidenceLevel    Float
  references         String[]
  createdAt          DateTime     @default(now())
  updatedAt          DateTime     @updatedAt
  consultation       Consultation @relation(fields: [consultationId], references: [id])
}

model User {
  id             String         @id @default(uuid())
  email          String         @unique
  passwordHash   String
  firstName      String
  lastName       String
  role           String
  specialization String?
  createdAt      DateTime       @default(now())
  updatedAt      DateTime       @updatedAt
  consultations  Consultation[]
}
```

### TypeScript Models
TypeScript interfaces align with database models:

```typescript
// Example TypeScript model
export interface Patient {
  id: string;
  medicalRecordNumber: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  sex: 'male' | 'female' | 'other';
  contactInformation: {
    address: string;
    phone: string;
    email?: string;
  };
  allergies: string[];
  medicalHistory?: {
    conditions: Array<{
      name: string;
      diagnosisDate?: Date;
      status: 'active' | 'resolved';
    }>;
    surgeries: Array<{
      procedure: string;
      date: Date;
    }>;
    medications: Array<{
      name: string;
      dosage: string;
      frequency: string;
      startDate: Date;
      endDate?: Date;
    }>;
  };
  createdAt: Date;
  updatedAt: Date;
}
```

## Configuration

### Environment Variables
Environment configuration is managed through `.env` files:

```
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/foresight_cdss

# Authentication
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=1d

# Application
PORT=3001
NODE_ENV=development
LOG_LEVEL=info
CORS_ORIGIN=http://localhost:3000

# API Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=100
```

### Configuration Files
Configuration is loaded and validated:

```typescript
// Example configuration loader
import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string(),
  PORT: z.string().transform(val => parseInt(val, 10)),
  NODE_ENV: z.enum(['development', 'test', 'production']),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']),
  CORS_ORIGIN: z.string(),
  RATE_LIMIT_WINDOW_MS: z.string().transform(val => parseInt(val, 10)),
  RATE_LIMIT_MAX: z.string().transform(val => parseInt(val, 10))
});

const env = envSchema.parse(process.env);

export default env;
```

## Error Handling

### Error Classes
Custom error classes for domain-specific errors:

```typescript
// Example error classes
export class BaseError extends Error {
  constructor(message: string, public statusCode: number) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends BaseError {
  constructor(resource: string) {
    super(`${resource} not found`, 404);
  }
}

export class ValidationError extends BaseError {
  constructor(message: string, public errors?: Record<string, string[]>) {
    super(message, 400);
  }
}

export class AuthenticationError extends BaseError {
  constructor(message = 'Authentication failed') {
    super(message, 401);
  }
}

export class AuthorizationError extends BaseError {
  constructor(message = 'Not authorized') {
    super(message, 403);
  }
}
```

### Global Error Handler
Centralized error handling middleware:

```typescript
// Example error handler middleware
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Log error
  logger.error(err);
  
  // Handle known errors
  if (err instanceof BaseError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      errors: 'errors' in err ? err.errors : undefined
    });
  }
  
  // Handle validation errors
  if (err instanceof z.ZodError) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: err.errors
    });
  }
  
  // Handle unknown errors
  const statusCode = 500;
  const message = process.env.NODE_ENV === 'production'
    ? 'Internal server error'
    : err.message || 'Internal server error';
  
  return res.status(statusCode).json({
    success: false,
    message
  });
};
```

## Authentication

### JWT Authentication
Token-based authentication implementation:

```typescript
// Example token utilities
import jwt from 'jsonwebtoken';
import config from '../config/auth';

export interface TokenPayload {
  userId: string;
  role: string;
}

export const generateToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn
  });
};

export const verifyToken = (token: string): TokenPayload => {
  return jwt.verify(token, config.jwtSecret) as TokenPayload;
};
```

## Logging

### Logger Configuration
Structured logging setup:

```typescript
// Example logger setup
import winston from 'winston';
import config from '../config/app';

const logger = winston.createLogger({
  level: config.logLevel,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'foresight-cdss-api' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Add file transport in production
if (process.env.NODE_ENV === 'production') {
  logger.add(
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' })
  );
  logger.add(
    new winston.transports.File({ filename: 'logs/combined.log' })
  );
}

export default logger;
```