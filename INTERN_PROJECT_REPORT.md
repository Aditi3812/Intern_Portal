# UPTOSKILL Internship Management Portal — Intern Project Report

## Executive Summary

The UPTOSKILL Internship Management Portal is a production-ready MERN (MongoDB, Express.js, React, Node.js) web application that automates the complete internship certificate lifecycle. The system replaces manual email-based coordination between interns and HR with a structured digital workflow, covering everything from initial intern onboarding through certificate generation, verification, and data retention compliance.

The application is structured as a monorepo with two primary directories: `backend/` (Node.js/Express API server running on port 3000) and `frontend/` (React/Vite single-page application running on port 5173). Communication happens over HTTPS/JSON with JWT-based authentication stored in HTTP-only cookies. MongoDB serves as the primary data store through Mongoose ODM, with Redis as an optional caching layer for analytics data.

### Core Modules

**Authentication & User Management** — Three-tier role-based access control (intern, team leader, admin) with JWT cookies, bcrypt password hashing, password reset via email (Brevo SMTP), and intern code-based initial login.

**Certificate Lifecycle** — Full request-to-issuance workflow supporting 7 certificate types (Offer Letter, Bonafide, OJT Certificate, Experience Letter, Internship Completion, Intern of the Month, League Winner). Interns submit requests, team leaders review and approve, and the system automatically generates PDF certificates via Puppeteer.

**Certificate Verification** — Dual verification system: a private verification endpoint (`/api/verify/:verifyId`) for internal/admin use, and a public verification endpoint (`/api/public/verify/:verificationId`) with QR codes embedded in certificate PDFs for external stakeholders to validate authenticity.

**Certificate Template Management** — Admin-configurable HTML templates using Handlebars syntax with dynamic placeholder injection. Templates are rendered server-side and converted to PDF with Puppeteer.

**Analytics Dashboard** — Admin-facing analytics with overview statistics, trend data, certificate type breakdown, and request pipeline visualization. Data is cached in Redis (180-second TTL) with in-memory fallback. Supports CSV and Excel export.

**Audit Trail** — Comprehensive audit logging capturing all significant actions (login, request submission, approval, certificate generation, data retention operations, etc.) with automatic sensitive data redaction, IP address tracking, and user agent logging.

**Data Retention & Compliance** — Automated lifecycle management via daily cron jobs: after 30 days (grantDays), archived data receives a warning email; after 90 days (purgeDays), personal data is permanently purged from the database. All actions are audit-logged.

**Notifications** — In-app notifications (bell icon with dropdown, 30-second polling) and email delivery via Brevo SMTP for password resets, certificate readiness, request status changes, and archival warnings.

**Bulk Import** — Excel-based bulk intern creation from `backend/data/interns.xlsx` with automatic intern code generation (format: `INT-XXXXXX`) and initial password setup using the intern code.

### Key Design Decisions

1. **Two-tier verification IDs**: Legacy `verifyId` (UUID v1 format) for private verification, and `verificationId` (UUID v2 format) for public URL-based verification, ensuring backward compatibility during migration.

2. **Intern code as initial password**: Newly imported interns use their generated intern code as their initial login password, forcing a password change on first login.

3. **Dual verification systems**: Private verification (`/api/verify/`) is strict and ID-based; public verification (`/api/public/verify/`) is rate-limited (30 req/15min per IP) and supports both form-based search and direct URL access via QR codes.

4. **Dry-run mode**: Setting `DRY_RUN=true` in `.env` causes cron jobs to log planned actions without modifying any data, enabling safe testing.

5. **Redis with graceful fallback**: Analytics caching uses Redis when available but seamlessly falls back to in-memory caching, preventing failures when Redis is not configured.

6. **Append-only audit logs**: The `AuditLog` model has a pre-save hook that prevents any updates to existing log entries, ensuring tamper-proof audit trails.

## Table of Contents
1. [Project Overview](#1-project-overview)
2. [Technology Stack](#2-technology-stack)
3. [Architecture](#3-architecture)
4. [Authentication & Authorization](#4-authentication--authorization)
5. [User Roles & Permissions](#5-user-roles--permissions)
6. [Backend Structure](#6-backend-structure)
   - [Models](#61-models)
   - [Controllers](#62-controllers)
   - [Routes](#63-routes)
   - [Services](#64-services)
   - [Middlewares](#65-middlewares)
   - [Utilities](#66-utilities)
   - [Validators](#67-validators)
   - [Scheduled Jobs](#68-scheduled-jobs)
7. [Frontend Structure](#7-frontend-structure)
   - [Context Providers](#71-context-providers)
   - [Hooks](#72-hooks)
   - [Components](#73-components)
   - [Pages](#74-pages)
8. [Data Flow](#8-data-flow)
9. [Key Features](#9-key-features)
10. [Setup & Development Guide](#10-setup--development-guide)
11. [Environment Variables](#11-environment-variables)
12. [Testing](#12-testing)

---

## 1. Project Overview

**UPTOSKILL Internship Management Portal** is a MERN stack web application that automates the internship certificate lifecycle. It enables interns to request certificates, team leaders to review requests, and admins to manage users, templates, and analytics. The application includes:

- Role-based dashboards (intern, team leader, admin)
- Certificate request and approval workflow
- PDF certificate generation with QR codes
- Public and private certificate verification
- Audit logging for all actions
- Data retention and archival policies
- Email notifications
- Analytics dashboard with export capabilities

---

## 2. Technology Stack

### Backend
| Technology | Version | Purpose |
|---|---|---|
| Node.js | — | Runtime environment |
| Express.js | 5.x | Web framework |
| MongoDB | — | Database (via Mongoose 9.x ODM) |
| JWT (jsonwebtoken) | 9.x | Authentication tokens |
| bcryptjs | 3.x | Password hashing |
| Puppeteer | 25.x | HTML-to-PDF rendering |
| Handlebars | 4.x | Template engine |
| QRCode | 1.x | QR code generation |
| Nodemailer | 10.x | Email delivery |
| node-cron | 4.x | Scheduled tasks |
| ioredis | 5.x | Redis caching |
| xlsx | 0.18.x | Excel import/export |
| express-validator | 7.x | Input validation |
| cookie-parser | 1.x | Cookie parsing |
| cors | 2.x | Cross-origin resource sharing |
| dotenv | 17.x | Environment variable management |
| axios | 1.x | HTTP client |

### Frontend
| Technology | Version | Purpose |
|---|---|---|
| React | 19.x | UI library |
| Vite | 8.x | Build tool |
| React Router DOM | 7.x | Client-side routing |
| Axios | 1.x | HTTP client |
| GrapeJS | — | Drag-and-drop template editor |
| Recharts | — | Analytics charts |
| QRCode | — | QR code display |
| ESLint | 10.x | Code linting |

---

## 3. Architecture

```
┌──────────────┐         ┌──────────────────┐         ┌──────────────┐
│   Frontend   │   Axios │    Backend API    │         │   MongoDB     │
│  (React/Vite)│◄────────►│ (Express/Node.js)│◄────────►│  (Mongoose)   │
│   :5173      │         │     :3000        │         │  Documents    │
└──────────────┘         └─────────┬────────┘         └──────┬───────┘
                                   │                        │
                          ┌────────┴────────┐               │
                          │   Redis Cache   │◄──────────────┘
                          │   (Optional)    │
                          └─────────────────┘

                                   │
                         ┌─────────┴─────────┐
                         │ External Services │
                         │  • Brevo SMTP      │
                         │  • Puppeteer       │
                         └────────────────────┘
```

### Request Lifecycle
1. Frontend sends HTTP request via Axios to backend API
2. JWT token in cookie is verified by `verifyAuth` middleware
3. Role is checked by `requireAdmin` or inline checks
4. Request validation runs via express-validator
5. Controller processes business logic
6. Mongoose model interacts with MongoDB
7. Redis cache is checked/updated where applicable
8. Response returned to frontend
9. Audit logs are written for significant actions

---

## 4. Authentication & Authorization

### JWT-Based Authentication
- **Login endpoint**: `POST /api/auth/login`
- **Token storage**: The JWT is stored in an HTTP cookie (`req.cookies.token`)
- **Cookie options**: `httpOnly`, `sameSite: 'strict'`, `maxAge: 7 days`
- **Password handling**: bcrypt hashing via `bcryptjs`
- **Intern initial password**: Intern code serves as initial password until changed

### Login Flow
1. Admin creates intern accounts (via import or manual creation)
2. Intern receives intern code (e.g., `INT-XXXXXX`)
3. Intern logs in using email + intern code as password
4. After login, intern is prompted to change password
5. Password change: `PUT /api/intern/set-password`

### Password Reset
- `POST /api/auth/forgot-password` — sends reset email via Brevo SMTP
- `POST /api/auth/reset-password/:token` — resets password using time-limited token

---

## 5. User Roles & Permissions

### Roles
| Role | Description |
|---|---|
| `intern` | Can view dashboard, request certificates, download certificates, update profile |
| `teamleader` | Can view assigned interns, review certificate requests, view analytics |
| `admin` | Full system access: user management, templates, audit logs, retention policy |

### Role-Based Route Protection
- **Protected routes** require valid JWT token
- **Admin-only routes** additionally require `role: 'admin'` in user document
- **Intern routes** require `role: 'intern'`
- **Team Leader routes** require `role: 'teamleader'`

---

## 6. Backend Structure

Location: `C:\Users\user\Desktop\Intern_Portal\backend`

### Directory Layout
```
backend/
├── server.js                    # Entry point: starts Express server + cron jobs
├── app.js                       # Express app: middleware, routes, CORS config
├── package.json                 # Dependencies and scripts
├── .env.example                 # Environment variable template
├── src/
│   ├── config/
│   │   ├── database.js          # MongoDB connection
│   │   ├── emailConfig.js       # Brevo SMTP configuration
│   │   └── redis.js             # Redis client
│   ├── models/                  # Mongoose schemas
│   ├── controllers/             # Request handlers
│   ├── routes/                  # API route definitions
│   ├── services/                # Business logic services
│   ├── middlewares/             # Auth & validation middleware
│   ├── utils/                   # Helper utilities
│   ├── validators/              # express-validator schemas
│   └── jobs/                    # Cron jobs
├── seeds/                       # Database seed scripts
│   ├── seedTemplates.js         # Seeds 7 certificate templates
│   └── convertExistingTemplates.js
├── scripts/                     # Utility scripts
│   ├── importInterns.js         # Excel-to-MongoDB importer
│   ├── backfillCertificateVerificationIds.js
│   └── backupCertificates.js
└── data/                        # Excel import files
```

### 6.1 Models

All models are in `src/models/` and use Mongoose schemas.

#### User.js
```
Fields:
- name: String (required)
- email: String (required, unique, lowercase)
- password: String (bcrypt-hashed)
- role: String (enum: 'intern', 'teamleader', 'admin')
- internCode: String (unique, used as initial password for interns)
- employeeId: String (for team leaders/admins)
- department: String
- startDate: Date (internship start)
- endDate: Date (internship end)
- mobile: String
- isActive: Boolean (default: true)
- personalDataPurged: Boolean (default: false) — set by retention job
- createdAt: Date
- updatedAt: Date
```

#### CertificateRequest.js
```
Fields:
- requestId: String (auto-generated, e.g., CERT-REQ-001)
- internId: ObjectId (ref: User)
- certificateType: String (enum: OFFER_LETTER, BONAFIDE, OJT, EXPERIENCE, COMPLETION, INTERN_MONTH, LEAGUE_WINNER)
- status: String (enum: PENDING, APPROVED, REJECTED, IN_PROGRESS, COMPLETED)
- teamLeaderId: ObjectId (ref: User) — assigned reviewer
- remarks: String (HR comments)
- adminRemarks: String
- isForwarded: Boolean (default: false)
- forwardedFrom: ObjectId (ref: CertificateRequest)
- forwardedAt: Date
- forwardedBy: ObjectId (ref: User)
- requestedAt: Date
- reviewedAt: Date
- completedAt: Date
- updatedAt: Date
```

#### Certificate.js
```
Fields:
- certificateId: String (unique identifier, e.g., CERT-2024-001)
- requestId: ObjectId (ref: CertificateRequest)
- internId: ObjectId (ref: User)
- teamLeaderId: ObjectId (ref: User)
- certificateType: String
- filePath: String (local file path)
- fileUrl: String (for cloud storage)
- issueDate: Date
- templateUsed: String
- verificationCode: String (legacy verification)
- verifyId: String (v1 verification ID, format: UUID)
- verificationId: String (v2 verification ID, for public verification)
- status: String (enum: ISSUED, REVOKED)
- revokedAt: Date
- revokedBy: ObjectId (ref: User)
- revokedReason: String
- createdAt: Date
- updatedAt: Date
```

#### CertificateTemplate.js
```
Fields:
- name: String (required)
- templateId: String (unique identifier)
- type: String (certificate type enum)
- htmlContent: String (Handlebars template)
- isActive: Boolean (default: true)
- isDefault: Boolean (default: false)
- createdBy: ObjectId (ref: User)
- createdAt: Date
- updatedAt: Date
```

#### AuditLog.js
```
Fields:
- actorId: ObjectId (ref: User) — who performed the action
- action: String (from auditActions constants)
- targetEntity: String (e.g., 'CertificateRequest')
- targetId: ObjectId (reference to affected document)
- description: String
- metadata: Object
- ipAddress: String
- userAgent: String
- createdAt: Date (indexed)
```
**Append-only**: Pre-save hook prevents updates.

#### Notification.js
```
Fields:
- recipientId: ObjectId (ref: User)
- senderId: ObjectId (ref: User)
- title: String
- message: String
- type: String (enum: REQUEST_SUBMITTED, REQUEST_APPROVED, REQUEST_REJECTED, CERTIFICATE_GENERATED, etc.)
- relatedId: String (related document ID)
- isRead: Boolean (default: false)
- readAt: Date
- createdAt: Date
```

#### Session.js
```
Fields:
- userId: ObjectId (ref: User)
- token: String (JWT)
- userAgent: String
- ipAddress: String
- isActive: Boolean
- expiresAt: Date
- createdAt: Date
```

#### AiLog.js
```
Fields:
- requestId: ObjectId (ref: CertificateRequest)
- internId: ObjectId (ref: User)
- action: String (enum: CHAT, VALIDATION, DUPLICATE_CHECK, CERTIFICATE_GENERATION)
- prompt: String
- response: String
- metadata: Object
- createdAt: Date
```

#### ArchivedRecord.js
```
Fields:
- originalCollection: String
- documentId: ObjectId
- data: Object (full snapshot)
- archivedAt: Date
- retentionExpiry: Date (when to purge)
- archivedBy: ObjectId (ref: User or 'SYSTEM')
- reason: String
- createdAt: Date
```

#### RetentionPolicy.js
```
Fields:
- graceDays: Number (default: 30) — days before archival after internship ends
- purgeDays: Number (default: 90) — days before permanent deletion after archival
- lastArchivedInternId: ObjectId
- createdAt: Date
- updatedAt: Date
```

#### DataRetentionPolicy.js
```
Fields:
- policyName: String
- isActive: Boolean
- settings: Object (retention periods per entity)
- createdBy: ObjectId (ref: User)
- createdAt: Date
- updatedAt: Date
```

#### Department.js
```
Fields:
- name: String (required, unique)
- code: String (unique)
- head: ObjectId (ref: User)
- isActive: Boolean (default: true)
- createdBy: ObjectId (ref: User)
- createdAt: Date
- updatedAt: Date
```

#### Counter.js / Counter.model.js
Separate counter models for request number tracking.

---

### 6.2 Controllers

Controllers handle business logic and are in `src/controllers/`.

#### auth.controller.js
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/login` | Login with email + password or intern code |
| POST | `/api/auth/register` | Register new user (admin-only) |
| POST | `/api/auth/forgot-password` | Send password reset email |
| POST | `/api/auth/reset-password/:token` | Reset password using token |
| PUT | `/api/auth/set-password` | Intern sets their own password |
| POST | `/api/auth/logout` | Clear auth cookie |

#### intern.controller.js
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/intern/profile` | Get intern profile |
| PUT | `/api/intern/profile` | Update intern profile |
| GET | `/api/intern/requests` | List intern's certificate requests |
| POST | `/api/intern/requests` | Submit new certificate request |
| GET | `/api/intern/requests/:id` | Get specific request details |
| GET | `/api/intern/certificates` | List issued certificates |
| GET | `/api/intern/certificates/:id/download` | Download certificate PDF |
| PUT | `/api/intern/certificates/:id/revoke-qr` | Revoke certificate QR code |
| PUT | `/api/intern/change-password` | Change password |
| POST | `/api/intern/set-password` | Set initial password |

#### teamleader.controller.js
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/teamleader/interns` | List assigned interns |
| GET | `/api/teamleader/requests` | List pending requests |
| GET | `/api/teamleader/requests/:id` | Get request details |
| PATCH | `/api/teamleader/requests/:id/approve` | Approve request |
| PATCH | `/api/teamleader/requests/:id/reject` | Reject request |
| GET | `/api/teamleader/completions` | List upcoming completions |
| GET | `/api/teamleader/stats` | Team statistics |

#### admin.controller.js
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/admin/users` | List all users |
| POST | `/api/admin/users` | Create new user |
| GET | `/api/admin/users/:id` | Get user details |
| PUT | `/api/admin/users/:id` | Update user |
| DELETE | `/api/admin/users/:id` | Delete user |
| GET | `/api/admin/templates` | List certificate templates |
| POST | `/api/admin/templates` | Create template |
| PUT | `/api/admin/templates/:id` | Update template |
| GET | `/api/admin/requests` | List all requests |
| PATCH | `/api/admin/requests/:id` | Update request status |
| GET | `/api/admin/certificates` | List all certificates |
| GET | `/api/admin/audit-logs` | Get audit logs |
| GET | `/api/admin/analytics` | Get analytics data |
| GET | `/api/admin/analytics/csv` | Export analytics to CSV |
| GET | `/api/admin/analytics/xlsx` | Export analytics to Excel |
| GET | `/api/admin/retention-policy` | Get retention policy |
| PUT | `/api/admin/retention-policy` | Update retention policy |
| GET | `/api/admin/departments` | List departments |
| POST | `/api/admin/departments` | Create department |

#### adminAnalytics.controller.js
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/admin/analytics/overview` | Overview statistics |
| GET | `/api/admin/analytics/trends` | Trend data over time |
| GET | `/api/admin/analytics/certificate-types` | Breakdown by type |
| GET | `/api/admin/analytics/pipeline` | Request pipeline stats |
| GET | `/api/admin/analytics/export` | Export data |

**Caching**: Results cached for 180 seconds (3 minutes) in Redis when available, falls back to in-memory cache.

#### verify.controller.js
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/verify/:verifyId` | Private verification (admin/internship access) |
| GET | `/api/verify/certificate/:certificateId` | Verify by certificate ID |

#### public.controller.js
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/public/verify` | Public verification (form-based, rate-limited) |
| GET | `/api/public/verify/:verificationId` | Public verification by URL |
| GET | `/api/public/certificate/:verificationId` | Get certificate details for verification |

**Rate limiting**: 30 requests per 15 minutes per IP.

---

### 6.3 Routes

Routes are defined in `src/routes/` and mounted at `/api/` prefix in `app.js`.

```
/api/
├── auth.*                    # Authentication routes
├── intern/*                  # Intern-specific routes
├── teamleader/*              # Team leader routes
├── admin/*                   # Admin routes
├── admin/analytics/*         # Analytics endpoints
├── verify/*                  # Private verification routes
├── public/*                  # Public verification routes
└── notifications/*           # Notification routes
```

### 6.4 Services

Located in `src/services/`.

#### certificate.service.js
- **generateCertificate(requestId)**: Main certificate generation function
  1. Fetches request, intern, team leader, and template data
  2. Renders HTML template using Handlebars with data context
  3. Generates QR code for verification link
  4. Uses Puppeteer to convert HTML to PDF
  5. Generates verification IDs (v1 and v2)
  6. Saves PDF file locally
  7. Updates Certificate document with file paths and verification IDs
  8. Sends notification to intern
  9. Logs audit event

#### adminAnalytics.service.js
- **getOverview(dateWindow)**: Aggregates total users, interns, certificates, requests
- **getTrends(dateWindow)**: Groups data by time periods
- **getCertificateTypes()**: Breakdown by certificate type with counts and statuses
- **getPipelineStats()**: Request status distribution
- **resolveDateWindow()**: Parses query parameters for date ranges

#### notification.service.js
- **sendNotification(recipientId, type, title, message, relatedId)**: Creates notification record
- **sendEmailNotification(email, subject, htmlContent)**: Sends email via Brevo SMTP

### 6.5 Middlewares

Located in `src/middlewares/`.

#### verifyAuth.js
- Extracts JWT from `req.cookies.token`
- Verifies token using `JWT_SECRET`
- Fetches user from database
- Attaches user object to `req.user`
- Throws 401 if token invalid or missing

#### requireAdmin.js
- Checks if `req.user.role === 'admin'`
- Returns 403 Forbidden if not admin

#### publicRateLimit.js
- Express rate limiter for public verification endpoints
- 30 requests per 15 minutes per IP

### 6.6 Utilities

Located in `src/utils/`.

#### sendEmail.js
- Uses Nodemailer with Brevo SMTP
- Configuration uses `BREVO_SMTP_USER`, `BREVO_SMTP_KEY`, `BREVO_SENDER_EMAIL`
- Note: The `.env.example` mentions `RESEND_API_KEY` but the actual email service uses Brevo SMTP

#### generateInternCode.js
- Generates non-sequential intern codes
- Format: `INT-XXXXXX` (6 random characters + numbers)

#### auditLogger.js
- Logs actions to `AuditLog` collection
- Redacts sensitive fields (password, email, token, etc.)
- Records: actor, action, target, description, metadata, IP, user agent

#### logAction.js
- Legacy audit logging utility
- Alternative to `auditLogger.js`

#### redisCache.js
- Redis client wrapper
- Lazily connects (doesn't fail if Redis unavailable)
- Falls back to in-memory cache
- Used for analytics caching

#### notificationService.js
- Helper for creating notifications
- Supports multiple destination types

### 6.7 Validators

Located in `src/validators/`.

#### auth.validator.js
- Login validation: email required, password required
- Registration validation: name, email, password, role
- Team leader creation validation: name, email, department

#### intern.validator.js
- Profile update validation
- Password change validation (min length, confirmation match)

#### adminAnalytics.validator.js
- Query parameter validation for analytics endpoints
- Date range validation
- Export format validation

### 6.8 Scheduled Jobs

Located in `src/jobs/`.

#### internshipStatus.job.js
- Runs daily at 2:00 AM UTC
- Transitions internships:
  - `upcoming` → `ongoing` (when start date passes)
  - `ongoing` → `completed` (when end date passes)
- Logs actions to audit log

#### retention.job.js
- Runs daily at 2:05 AM UTC
- Implements data retention lifecycle:
  1. After `graceDays` (30 days): Marks interns as ready for archival
  2. Sends archival warning email to team leader
  3. After archival: Creates `ArchivedRecord` snapshot
  4. After `purgeDays` (90 days): Permanently deletes records
- Sets `personalDataPurged` flag on User documents
- Audit logs every action

---

## 7. Frontend Structure

Location: `C:\Users\user\Desktop\Intern_Portal\frontend`

### Directory Layout
```
frontend/
├── index.html
├── vite.config.js
├── eslint.config.js
├── package.json
├── .env.example
├── public/
└── src/
    ├── main.jsx                  # React entry point
    ├── app/
    │   ├── App.jsx               # Root router
    │   └── App.css
    ├── features/
    │   ├── auth/
    │   │   ├── components/       # Login, ForgotPassword, ResetPassword
    │   │   ├── context/AuthContext.jsx
    │   │   ├── hooks/            # useAuth, useLogin
    │   │   └── services/auth.service.js
    │   ├── intern/
    │   │   ├── pages/            # InternDashboard
    │   │   ├── components/       # RequestCertificateModal, MyRequestsList, ChangePasswordForm
    │   │   ├── context/internContext.jsx
    │   │   ├── hooks/            # useIntern, useCertificateRequests
    │   │   └── services/intern.api.js
    │   ├── teamleader/
    │   │   ├── pages/            # TLDashboard
    │   │   ├── components/       # MyInternsList, PendingReviewList, CreateIntern
    │   │   ├── hooks/            # useMyInterns, useReviewRequests, useTeamLeaderInterns
    │   │   └── services/tl.service.js
    │   ├── admin/
    │   │   ├── pages/            # AdminDashboard, AuditLogsPage, AnalyticsView, CertificateReviewPage, CertificateTemplateEditorPage
    │   │   ├── components/       # CreateIntern, CreateTl, TeamLeadersSection, RetentionManagement, ForwardedRequestsList, CertificatesOverview
    │   │   ├── hooks/            # useTeamLeaders, useForwardedRequests, useArchivedInterns, useAdminAnalytics
    │   │   └── services/admin.service.js
    │   ├── analytics/
    │   │   └── services/analytics.service.js
    │   ├── shared/
    │   │   ├── components/       # ProtectedRoute, NotificationBell, StatusBadge, CertificatePreview, CertificateTemplateEditor, Toast
    │   │   ├── hooks/          # useNotifications
    │   │   └── services/certificates.service.js
    │   └── public/
    │       ├── pages/           # VerifyPage, CertificateVerificationPage
    │       └── services/verify.service.js
    ├── shared/
    │   ├── components/         # Toast (root level)
    │   ├── constants/          # auditActions.js, demoCertificateTemplate.js
    │   └── utils/              # notificationDestination.js
    ├── hooks/                  # Root-level hooks
    └── contexts/               # Root-level contexts
```

### 7.1 Context Providers

#### AuthContext.jsx
- Manages authentication state
- `login(email, password or internCode)` — POST to `/api/auth/login`
- `logout()` — clears cookie and localStorage
- `getMe()` — fetches current user from `/api/auth/me`
- `setPassword(password)` — PUT to `/api/auth/set-password`
- Stores token in localStorage and sends it as cookie via Axios

#### internContext.jsx
- Provides intern profile data
- Fetches profile on mount
- Checks for account archival notices
- Provides `refreshProfile()` function

### 7.2 Hooks

#### useAuth
- Wraps authentication context
- Provides: `user`, `login`, `logout`, `loading`, `error`

#### useIntern
- Manages intern profile data
- Provides: `profile`, `updateProfile`, `loading`

#### useCertificateRequests (intern)
- Fetches intern's certificate requests
- Provides: `requests`, `submitRequest`, `loading`, `error`

#### useNotifications
- Fetches notifications
- Polls for updates every 30 seconds
- Provides: `notifications`, `unreadCount`, `markAllRead`, `markRead`

#### useMyInterns (team leader)
- Fetches team leader's assigned interns
- Provides: `interns`, `loading`, `error`

#### useReviewRequests (team leader)
- Fetches pending certificate requests
- Provides: `requests`, `approveRequest`, `rejectRequest`

#### useTeamLeaders (admin)
- Fetches all team leaders
- Provides: `teamLeaders`, `createTeamLeader`, `loading`

#### useForwardedRequests (admin)
- Fetches forwarded certificate requests
- Provides: `requests`, `loading`

#### useArchivedInterns (admin)
- Fetches archived intern records
- Provides: `archived`, `loading`

#### useTeamLeaderInterns (admin)
- Fetches interns by team leader
- Provides: `interns`, `loading`

#### useAdminAnalytics
- Fetches analytics data
- Provides: `overview`, `trends`, `certificateTypes`, `pipelineStats`, `exportData`

#### useCertificateDraft
- Manages certificate template editor state
- Provides: `html`, `css`, `setHtml`, `setCss`, `exportTemplate`

### 7.3 Components

#### ProtectedRoute.jsx
- Guards routes based on user role
- Props: `children`, `allowedRoles`
- Redirects unauthenticated users to login
- Shows 403 for unauthorized role access

#### NotificationBell.jsx
- Dropdown notification list
- Shows unread count badge
- Marks notifications as read on click
- Polls every 30 seconds for new notifications

#### StatusBadge.jsx
- Displays status badges with appropriate colors
- Variants: pending (yellow), approved (green), rejected (red), in-progress (blue), completed (purple)

#### Toast.jsx
- Global toast notification system
- Shows success/error/info messages
- Auto-dismisses after 5 seconds
- Position: top-right corner

#### CertificatePreview.jsx
- Renders HTML certificate template for preview
- Shows how the certificate will look
- Updates in real-time as fields change

#### CertificateTemplateEditor.jsx
- Drag-and-drop template editor using GrapeJS
- Allows editing HTML/CSS for certificate templates
- Exports template HTML for backend storage

### 7.4 Pages

#### Login.jsx
- Login form with email/intern code + password fields
- Shows role selection if applicable
- Redirects to appropriate dashboard on success

#### ForgotPasswordPage.jsx
- Email input form
- Sends password reset email
- Shows success message after submission

#### ResetPasswordPage.jsx
- Uses URL parameter (reset token)
- Password + confirm password fields
- Posts to `/api/auth/reset-password/:token`

#### AdminDashboard.jsx
Five main views:
1. **Overview**: User stats, certificate stats, recent activity
2. **Requests**: All certificate requests with filters (status, type, date)
3. **Certificates**: Generated certificates list with search/verification
4. **Team Leaders**: Manage team leaders and departments
5. **Retention**: Data retention policy configuration and monitoring

#### InternDashboard.jsx
Three navigation sections:
1. **Dashboard**: Profile summary, stats, upcoming deadlines
2. **Certificates**: My requests + My certificates with download
3. **Settings**: Profile update, password change

#### TLDashboard.jsx
Three views:
1. **Overview**: Team statistics, upcoming completions
2. **Review**: Pending certificate requests to review
3. **Interns**: List of assigned interns with status

#### AuditLogsPage.jsx
- Admin page for viewing audit logs
- Filters by date range, action type, user
- Export to CSV/Excel functionality

#### AnalyticsView.jsx
- Admin analytics dashboard
- Charts: requests over time, certificate types, pipeline stats
- Export functionality (CSV/Excel)

#### CertificateVerificationPage.jsx
- Public certificate verification form
- Input verification ID or scan QR code
- Displays certificate details and validity

#### VerifyPage.jsx
- Verification result display
- Shows certificate details, intern info, verification status
- Option to download verified certificate

---

## 8. Data Flow

### Certificate Request Flow
```
1. Intern submits request → POST /api/intern/requests
   → CertificateRequest model (status: PENDING)
   → AuditLog: REQUEST_SUBMITTED
   → Notification to team leader

2. Team leader reviews → GET /api/teamleader/requests
   → PATCH /api/teamleader/requests/:id/approve
   → CertificateRequest status: APPROVED
   → AuditLog: REQUEST_APPROVED

3. Certificate generation triggered
   → certificate.service.js
   → Fetch data from User, CertificateRequest, CertificateTemplate
   → Render Handlebars template with data
   → Generate QR code
   → Puppeteer HTML→PDF
   → Generate verification IDs
   → Save Certificate document
   → AuditLog: CERTIFICATE_GENERATED
   → Notification to intern

4. Intern downloads → GET /api/intern/certificates/:id/download
   → Returns PDF file
   → AuditLog: CERTIFICATE_DOWNLOADED
```

### Public Verification Flow
```
1. External party visits /verify/:verificationId
   → Frontend VerifyPage calls GET /api/public/verify/:verificationId
   → Rate-limited by IP
   → Fetch Certificate + User data
   → Return verified details
```

### Retention Lifecycle Flow
```
Daily at 2:05 AM UTC (retention.job.js)

1. Find interns where endDate + graceDays (30d) has passed
   → Send archival warning email to team leader
   → AuditLog: RETENTION_ARCHIVAL_WARNING_SENT

2. Find interns where archival date + retentionExpiry has passed (if already archived)
   → Create ArchivedRecord snapshot
   → Set User.personalDataPurged = true
   → Delete sensitive User fields
   → AuditLog: USER_DATA_PURGED

3. Find ArchivedRecords where retentionExpiry (purgeDays = 90d) has passed
   → Delete ArchivedRecord
   → Delete associated certificate files
   → AuditLog: ARCHIVED_DATA_PURGED
```

---

## 9. Key Features

### 9.1 Role-Based Dashboards
- **Intern Dashboard**: Profile, request submission, certificate list, download center, password settings
- **Team Leader Dashboard**: Assigned interns list, pending requests, upcoming completions, team stats
- **Admin Dashboard**: Full user management, certificate request workflow, analytics, audit logs, retention management

### 9.2 Certificate Workflow
- 7 certificate types: Offer Letter, Bonafide, OJT, Experience Letter, Internship Completion, Intern of the Month, League Winner
- Request tracking: PENDING → APPROVED/REJECTED → IN_PROGRESS → COMPLETED
- Request forwarding capability between team leaders
- Admin override for approval/rejection

### 9.3 Certificate Verification
- **Private verification**: `/api/verify/:verifyId` (v1 format)
- **Public verification**: `/api/public/verify/:verificationId` (v2 format with URL path)
- QR codes embedded in certificate PDFs link to public verification
- Rate limiting (30 req/15min per IP) on public endpoints

### 9.4 Certificate Generation
- Puppeteer for HTML-to-PDF conversion
- Handlebars templates with dynamic data
- QR code embedding for verification
- Local file storage (configurable for cloud storage)

### 9.5 Analytics
- Overview statistics (users, interns, certificates, requests)
- Trend data over time (daily/weekly/monthly)
- Certificate type breakdown
- Request pipeline status distribution
- CSV and Excel export
- 3-minute Redis caching

### 9.6 Audit Logging
- All significant actions logged to `AuditLog` collection
- Append-only (prevents modification)
- Sensitive data redaction (passwords, emails, tokens)
- IP address and user agent tracking
- Exportable via admin interface

### 9.7 Data Retention
- Configurable grace period (default: 30 days)
- Configurable purge period (default: 90 days)
- Warning emails before archival
- Data snapshots before deletion
- `personalDataPurged` flag for compliance

### 9.8 Notifications
- In-app notifications (bell icon with dropdown)
- Email notifications via Brevo SMTP
- Real-time polling (30-second interval)
- Read/unread status tracking

### 9.9 Email System
- Uses Brevo SMTP (Brevo_SMTP_USER, BREVO_SMTP_KEY, BREVO_SENDER_EMAIL)
- Password reset emails
- Certificate generation notifications
- Archival warning emails
- Request approval/rejection emails

### 9.10 Bulk Import
- Excel import script (`scripts/importInterns.js`)
- Accepts columns: Full Name, Email ID, Intern Code, Mobile No., Domain, Start Date, End Date
- Intern code used as initial password

---

## 10. Setup & Development Guide

### Prerequisites
- Node.js 20+ and npm
- MongoDB (local or Atlas)
- Git

### Backend Setup
```bash
cd backend
npm install
# Create .env file
cp .env.example .env
# Edit .env with your values
npm run dev
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### Database Seeding
```bash
# Seed certificate templates
cd backend
npm run seed:templates

# Import interns from Excel
# Place interns.xlsx in backend/data/
node scripts/importInterns.js

# Backfill verification IDs (for existing certificates)
npm run backfill:certificate-verification-ids
```

### Useful Commands

**Backend:**
- `npm run dev` — Start with nodemon (auto-restart)
- `npm run seed:templates` — Seed certificate templates
- `npm run backfill:certificate-verification-ids` — Generate verification IDs
- `npm run backup:certificates` — Backup certificates
- `npm test` — Run tests

**Frontend:**
- `npm run dev` — Start dev server (Vite) on port 5173
- `npm run lint` — Run ESLint
- `npm run build` — Production build
- `npm run preview` — Preview production build

### Environment Variables
See [Section 11](#11-environment-variables) below for detailed descriptions.

---

## 11. Environment Variables

### Backend (`backend/.env`)

| Variable | Description | Example |
|---|---|---|
| `MONGO_URI` | MongoDB connection string | `mongodb://127.0.0.1:27017/uptoskill` |
| `JWT_SECRET` | Secret key for JWT signing | `your-secret-key-here` |
| `FRONTEND_URL` | Frontend origin (for CORS) | `http://localhost:5173` |
| `BREVO_SMTP_USER` | Brevo SMTP username | `your-brevo-smtp-user` |
| `BREVO_SMTP_KEY` | Brevo SMTP password | `your-brevo-smtp-key` |
| `BREVO_SENDER_EMAIL` | Sender email address | `onboarding@uptoskill.com` |
| `REDIS_URL` | Redis connection string (optional) | `redis://localhost:6379` |
| `NODE_ENV` | Environment (development/production) | `development` |
| `DRY_RUN` | If true, cron jobs log but don't modify | `true` or `false` |

### Frontend (`frontend/.env`)

| Variable | Description | Default |
|---|---|---|
| `VITE_API_BASE_URL` | Backend API base URL | `http://localhost:3000` |

---

## 12. Testing

### Backend Tests
- Tests located in `backend/tests/`
- Run: `npm test` (uses Node's built-in test runner)
- Covers controllers and services

### Frontend Tests
- No dedicated test framework configured
- Primary validation: `npm run lint` and `npm run build`

### Key Testing Areas
1. **Authentication**: Login flow, token verification, password reset
2. **RBAC**: Role-based access control for each user type
3. **Certificate workflow**: Request submission, approval, generation
4. **Verification**: Both private and public verification endpoints
5. **Retention**: Archival and purge logic (use dry-run mode)
6. **Email**: SMTP delivery and template content
7. **File uploads/downloads**: PDF generation and storage

---

## Appendix A: Certificate Types

| Type | Description | Template ID |
|---|---|---|
| OFFER_LETTER | Initial internship offer | `offer_letter` |
| BONAFIDE | Certificate of presence | `bonafide` |
| OJT | On-the-Job Training certificate | `ojt` |
| EXPERIENCE | Experience letter | `experience` |
| COMPLETION | Internship completion | `completion` |
| INTERN_MONTH | Intern of the Month | `intern_of_month` |
| LEAGUE_WINNER | League winner certificate | `league_winner` |

---

## Appendix B: Audit Actions Reference

**File**: `frontend/src/shared/constants/auditActions.js`

| Action Constant | Description |
|---|---|
| `USER_LOGIN` | User logged in |
| `USER_LOGOUT` | User logged out |
| `USER_CREATED` | New user created |
| `USER_UPDATED` | User profile updated |
| `USER_DELETED` | User deleted |
| `REQUEST_SUBMITTED` | Certificate request submitted |
| `REQUEST_APPROVED` | Request approved by reviewer |
| `REQUEST_REJECTED` | Request rejected by reviewer |
| `REQUEST_FORWARDED` | Request forwarded to another reviewer |
| `CERTIFICATE_GENERATED` | Certificate PDF generated |
| `CERTIFICATE_DOWNLOADED` | Certificate downloaded |
| `CERTIFICATE_REVOKED` | Certificate revoked |
| `TEMPLATE_CREATED` | Certificate template created |
| `TEMPLATE_UPDATED` | Certificate template updated |
| `AUDIT_LOG_EXPORTED` | Audit logs exported |
| `RETENTION_POLICY_UPDATED` | Retention policy modified |
| `RETENTION_ARCHIVAL_WARNING_SENT` | Archival warning email sent |
| `USER_DATA_PURGED` | User personal data purged |
| `ARCHIVED_DATA_PURGED` | Archived data permanently deleted |
| `PASSWORD_CHANGED` | User password changed |

---

## Appendix C: API Response Formats

### User Object
```json
{
  "id": "67abc123...",
  "name": "John Doe",
  "email": "john@example.com",
  "role": "intern",
  "internCode": "INT-abc123",
  "department": "Software Engineering",
  "startDate": "2024-01-01",
  "endDate": "2024-06-01",
  "mobile": "1234567890",
  "isActive": true,
  "personalDataPurged": false,
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

### Certificate Request Object
```json
{
  "id": "67def456...",
  "requestId": "CERT-REQ-001",
  "internId": { "id": "...", "name": "John Doe" },
  "certificateType": "COMPLETION",
  "status": "APPROVED",
  "teamLeaderId": { "id": "...", "name": "Jane Smith" },
  "remarks": "All requirements met",
  "adminRemarks": "",
  "requestedAt": "2024-01-01T00:00:00Z",
  "reviewedAt": "2024-01-02T00:00:00Z",
  "completedAt": "2024-01-03T00:00:00Z"
}
```

### Certificate Object
```json
{
  "id": "67ghi789...",
  "certificateId": "CERT-2024-001",
  "requestId": "67def456...",
  "internId": { "id": "...", "name": "John Doe" },
  "certificateType": "COMPLETION",
  "filePath": "/path/to/cert.pdf",
  "fileUrl": "https://...",
  "issueDate": "2024-01-03T00:00:00Z",
  "verificationId": "uuid-v2-format",
  "verifyId": "uuid-v1-format",
  "status": "ISSUED",
  "createdAt": "2024-01-03T00:00:00Z"
}
```

---

## Appendix D: Error Handling

### HTTP Status Codes
- `200` — Success
- `201` — Created
- `400` — Bad request (validation error)
- `401` — Unauthorized (no/invalid token)
- `403` — Forbidden (insufficient permissions)
- `404` — Resource not found
- `429` — Rate limited
- `500` — Server error

### Common Error Responses
```json
// Validation Error
{
  "errors": [
    { "msg": "Email is required", "param": "email", "location": "body" }
  ]
}

// Authentication Error
{
  "message": "No token, authorization denied"
}

// Authorization Error
{
  "message": "Admin access required"
}
```

---

## Appendix E: Cron Schedule

| Job | Schedule | Purpose |
|---|---|---|
| `internshipStatus.job.js` | Daily at 2:00 AM UTC | Intern status transitions |
| `retention.job.js` | Daily at 2:05 AM UTC | Data archival and purge |

Use `DRY_RUN=true` in `.env` to test job logic without modifying data.

---

*Generated as part of the intern onboarding documentation. For questions or issues, refer to the relevant source files or the project README.*
