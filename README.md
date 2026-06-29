# Acewall Scholar Backend

**Acewall Scholar** is a full-featured, multi-portal educational technology platform backend built with Node.js, Express, and MongoDB. It supports student learning, instructor instruction, and school administration through a unified REST API with real-time capabilities.

---

## Table of Contents

- [Project Overview](#project-overview)
- [System Architecture](#system-architecture)
- [Installation and Setup](#installation-and-setup)
- [Local Development](#local-development)
- [Scripts](#scripts)
- [Environment Variables](#environment-variables)
- [API Documentation](#api-documentation)

---

## Project Overview

Acewall Scholar Backend powers a comprehensive e-learning ecosystem that connects students, instructors, and administrators. The platform provides course management, assessments, grading, real-time messaging, AI chat assistance, payment processing, and institutional administration.

### Core Capabilities

| Domain | Capabilities |
|--------|-------------|
| **Authentication & Users** | JWT-based auth, OTP signup, Google SAML SSO, role-based access (student, instructor, admin) |
| **Course Management** | Categories, subcategories, courses, chapters, lessons, semesters, quarters |
| **Assessment & Grading** | Assessments, submissions, standard grading, gradebook, GPA tracking, transcript requests |
| **Communication** | Real-time chat (Socket.IO), discussions, comments, direct messaging, notifications |
| **Social & Engagement** | Posts, post likes, post comments, ratings, wishlists, course sharing, campaigns |
| **Commerce** | Stripe payments, coupon codes, purchases, enrollment, teacher payments, withdrawals |
| **Institutional** | Announcements, school management, admin dashboards, newsletter, contact/support |
| **Integrations** | Zoom meetings, Google Drive, Twilio (SMS/WhatsApp), Cloudinary, Gemini AI, Edlink, email (Nodemailer) |
| **Automation** | Cron jobs for Zoom meeting monitoring and assessment reminders |

---

## System Architecture

### High-Level Design

The backend follows a layered MVC-inspired architecture using ES modules.

```
┌─────────────────────────────────────────────────────────────┐
│                      Client Applications                     │
│  (Web Frontend · Admin Frontend · Mobile Apps)              │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTP / WebSocket
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                      Express Application                     │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                  Middleware Stack                      │  │
│  │  CORS · Cookie Parser · Body Parser · JWT Auth        │  │
│  │  Error Handling · Not Found                           │  │
│  └───────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                 Route Registry                         │  │
│  │  /api/auth · /api/course · /api/assessment · ...     │  │
│  └───────────────────────────────────────────────────────┘  │
└──────────────────────────┬──────────────────────────────────┘
                           │
          ┌────────────────┼────────────────┐
          │                │                │
          ▼                ▼                ▼
┌─────────────────┐ ┌───────────────┐ ┌────────────────────┐
│   Controllers    │ │  Services     │ │   Socket.IO        │
│  (Route Logic)   │ │ (Business     │ │  (Real-time)       │
│                  │ │  Logic)       │ │                    │
└────────┬─────────┘ └───────┬───────┘ └──────────┬─────────┘
         │                   │                      │
         ▼                   ▼                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                          Data Layer                              │
│  ┌────────────────────┐  ┌──────────────────────────────────┐   │
│  │  MongoDB            │  │  External Services               │   │
│  │  (Mongoose)         │  │  Cloudinary · Stripe · Twilio   │   │
│  │  - Users            │  │  Zoom · Google Drive · Nodemailer│   │
│  │  - Courses          │  │  Gemini AI · Edlink              │   │
│  │  - Assessments      │  │                                   │   │
│  │  - Messages         │  │                                   │   │
│  │  - Posts            │  │                                   │   │
│  │  - ...              │  │                                   │   │
│  └────────────────────┘  └──────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Key Architectural Decisions

- **ES Modules**: The project uses `"type": "module"` and ESM imports throughout.
- **Dual Portal Authentication**: Separate JWT cookies (`ind_client_jwt` and `ind_admin_jwt`) distinguish client vs. admin portals by subdomain.
- **Centralized Error Handling**: All async route handlers use an `asyncHandler` wrapper; custom error classes (`AuthenticationError`, `ValidationError`, etc.) are passed to a global error middleware.
- **Real-time via Socket.IO**: Manages online user presence, typing indicators, and live messaging alongside REST endpoints.
- **Horizontal Route Namespacing**: Each domain has its own route file under `src/Routes/`, organized by feature grouping (e.g., `CourseRoutes/`, `Discussion/`, `PostRoutes/`).
- **Utility Layer**: Cross-cutting concerns like swagger specs, email templates, notification constants, and gradebook updates live in `src/Utiles/`.

### Directory Structure

```text
├── .env                      # Environment configuration (excluded from Git)
├── package.json
├── package-lock.json
├── README.md
├── src/
│   ├── index.js              # App entry: Express + Socket.IO server
│   ├── lib/
│   │   ├── connectDB.js      # MongoDB connection with retry logic
│   │   └── socket.io.js      # Socket.IO server setup & user mapping
│   ├── Routes/
│   │   ├── Auth.Routes.js
│   │   ├── CourseRoutes/
│   │   ├── Discussion/
│   │   ├── PostRoutes/
│   │   └── ...
│   ├── Contollers/
│   │   ├── auth.controller.js
│   │   ├── stripe.controller.js
│   │   └── ...
│   ├── Models/
│   │   ├── user.model.js
│   │   ├── courses.model.sch.js
│   │   ├── Enrollement.model.js
│   │   └── ...
│   ├── middlewares/
│   │   ├── Auth.Middleware.js
│   │   ├── admins.middleware.js
│   │   ├── isEnrolled.middleware.js
│   │   └── errorHandler.middleware.js
│   ├── Utiles/
│   │   ├── swaggerSpec.js
│   │   ├── jwtToken.js
│   │   ├── nodemailer.tranporter.js
│   │   └── ...
│   ├── config/
│   │   └── stripe.js
│   ├── cronJobs/
│   │   ├── assessmentReminder.js
│   │   └── zoomMeetingMonitor.js
│   └── uploads/              # Static file serving directory
├── utils/
│   ├── gemini.js
│   └── difficultyPrompts.js
```

### Component Interactions

1. **Request Flow**: HTTP request enters through Express middleware (CORS, parser, cookies) → JWT auth middleware validates token → route handler delegates to controller → controller interacts with models or external services → response returned.
2. **Database**: Mongoose models define schemas and business logic methods. Controllers perform CRUD and aggregation operations.
3. **Real-time**: Socket.IO shares the same HTTP server. Handshakes carry the `userId` query param; the server maintains user socket mappings for presence and direct messaging.
4. **Background Jobs**: `node-cron` schedules periodic tasks at server startup (`assessmentReminder.js`, `zoomMeetingMonitor.js`).
5. **File Uploads**: `multer` handles multipart uploads; files are stored in `uploads/` and optionally forwarded to Cloudinary for persistent storage.

---

## Installation and Setup

### Prerequisites

Before running the backend, ensure the following are installed:

| Requirement | Version | Purpose |
|-------------|---------|---------|
| Node.js | 18.x or higher | Runtime engine |
| npm | 9.x or higher | Package manager |
| MongoDB | 4.4+ (local) or MongoDB Atlas | Primary database |
| Git | 2.x | Version control (optional) |

### Step 1: Clone the Repository

```bash
git clone <repository-url>
cd acewall-ind-BE
```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Configure Environment Variables

Create a `.env` file at the project root with all required variables. At minimum, configure:

```bash
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>/<db>
JWT_SECRAT=your_jwt_secret
PORT=5050
SESSION_SECRET=your_session_secret
```

See [Environment Variables](#environment-variables) for the full list.

### Step 4: Database Setup

The application connects to MongoDB on startup. No migration scripts are bundled; Mongoose models are created dynamically.

- **MongoDB Atlas**: Set `MONGODB_URI` to your Atlas cluster connection string.
- **Local MongoDB**: Use `mongodb://localhost:27017/yourdbname`.

No initial seed data is required.

### Dependency Management

Dependencies are locked via `package-lock.json`. Use the following commands:

```bash
# Install exact locked versions (recommended for CI/production)
npm ci

# Update dependencies within semver ranges
npm update

# Add a new dependency
npm install <package-name>
```

---

## Local Development

### Running in Development Mode

Development uses `nodemon` for automatic server restarts on file changes.

```bash
npm run dev
```

Expected console output:

```text
This app is running on localhost 5050
🔗 Webhook endpoint: https://acewell-production.up.railway.app/api/stripe/webhook
✅ MongoDB connected
```

The server starts on `http://localhost:5050`. Socket.IO listens on the same port.

### API Documentation

Once running, interactive API docs are available at:

```text
http://localhost:5050/api-docs
```

Raw OpenAPI spec is exposed at:

```text
http://localhost:5050/openapi.json
```

### Available Route Namespaces

The application exposes the following route prefixes:

| Prefix | Domain | Key File |
|--------|--------|----------|
| `/api/auth` | Authentication | `src/Routes/Auth.Routes.js` |
| `/api/category` | Categories | `src/Routes/Category.Routes.js` |
| `/api/subcategory` | Subcategories | `src/Routes/subCategory.Routes.js` |
| `/api/course` | Courses | `src/Routes/CourseRoutes/Courses.Routes.js` |
| `/api/chapter` | Chapters | `src/Routes/CourseRoutes/Chapter.Routes.js` |
| `/api/lesson` | Lessons | `src/Routes/CourseRoutes/Lesson.Routes.js` |
| `/api/semester` | Semesters | `src/Routes/CourseRoutes/semester.Routes.js` |
| `/api/quarter` | Quarters | `src/Routes/CourseRoutes/Quarter.Routes.js` |
| `/api/comment` | Comments | `src/Routes/Comment.Routes.js` |
| `/api/rating` | Ratings | `src/Routes/Rating.Routes.js` |
| `/api/messeges` | Messages | `src/Routes/Message.Routes.js` |
| `/api/conversation` | Conversations | `src/Routes/conversation.Route.js` |
| `/api/purchase` | Purchases | `src/Routes/Purchase.Routes.js` |
| `/api/assessment` | Assessments | `src/Routes/Assessment.Routes.js` |
| `/api/assessmentSubmission` | Submissions | `src/Routes/Submission.Routes.js` |
| `/api/assessmentCategory` | Assessment Categories | `src/Routes/Assessment-category.Routes.js` |
| `/api/gradebook` | Gradebook | `src/Routes/gradebook.Routes.js` |
| `/api/gpa` | GPA Records | `src/Routes/GPA.Routes.js` |
| `/api/standardGrading` | Standard Grading | `src/Routes/StandardGrading.Routes.js` |
| `/api/enrollment` | Enrollments | `src/Routes/Enrollement.Routes.js` |
| `/api/admin` | Admin Operations | `src/Routes/Admin.Routes.js` |
| `/api/announcements` | Announcements | `src/Routes/Annoucement.Routes.js` |
| `/api/newsletter` | Newsletter | `src/Routes/Newsletter.Routes.js` |
| `/api/support` | Support | `src/Routes/Support.Route.js` |
| `/api/pages` | CMS Pages | `src/Routes/Pages.Routes.js` |
| `/api/teacher` | Teacher Payments | `src/Routes/TeacherPayment.Routes.js` |
| `/api/contact` | Contact | `src/Routes/Contact.Routes.js` |
| `/api/discussion` | Discussions | `src/Routes/Discussion/Descussion.Routes.js` |
| `/api/discussionComment` | Discussion Comments | `src/Routes/Discussion/discussionComment.Routes.js` |
| `/api/replyDiscussion` | Discussion Replies | `src/Routes/Discussion/Replydiscussion.Routes.js` |
| `/api/posts` | Posts | `src/Routes/PostRoutes/Post.Routes.js` |
| `/api/postlike` | Post Likes | `src/Routes/PostRoutes/PostLikes.Routes.js` |
| `/api/postComment` | Post Comments | `src/Routes/PostRoutes/PostComment.Routes.js` |
| `/api/aichat` | AI Chat | `src/Routes/AIChat.Routes.js` |
| `/api/coupon` | Coupons | `src/Routes/coupenCode.Routes.js` |
| `/api/wishlist` | Wishlist | `src/Routes/Wishlist.Routes.js` |
| `/api/zoom` | Zoom | `src/Routes/Zoom.Routes.js` |
| `/api/notifications` | Notifications | `src/Routes/notification.Routes.js` |
| `/api/course-share` | Course Share | `src/Routes/CourseShare.Routes.js` |
| `/api/campaigns` | Campaigns | `src/Routes/Campaign.Routes.js` |

> **Note**: Webhook endpoints are registered at `/api/stripe/webhook` and `/api/stripe/webhook/mobile`, using `express.raw()` to preserve Stripe signatures.

### Debugging Tips

1. **Database connection failures**: Verify `MONGODB_URI` and network access. The server continues running even if DB is unreachable, but data operations will fail.
2. **Authentication issues**: Confirm JWT secret and cookie names match portal expectations (`ind_client_jwt` vs `ind_admin_jwt`).
3. **CORS errors**: Check that the requesting origin is in the CORS whitelist in `src/index.js` and `src/lib/socket.io.js`.
4. **Socket.IO not connecting**: Ensure the client sends `userId` as a query parameter during the handshake.
5. **File uploads**: Verify `uploads/` directory permissions and Cloudinary credentials if using remote storage.

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with auto-reload via nodemon |
| `npm test` | No tests are currently configured |

---

## Environment Variables

### Core

| Variable | Required | Description |
|----------|----------|-------------|
| `MONGODB_URI` | Yes | MongoDB connection string |
| `JWT_SECRAT` | Yes | Secret for signing JWT tokens |
| `SESSION_SECRET` | Yes | Secret for cookie/session encryption |
| `PORT` | No | Server port (default: `5050`) |
| `NODE_ENV` | No | `development` or `production` |

### Payments (Stripe)

| Variable | Required | Description |
|----------|----------|-------------|
| `STRIPE_SECRET_KEY` | Yes | Stripe secret API key |
| `STRIPE_PUBLISHABLE_KEY` | Yes | Stripe publishable key |
| `STRIPE_WEBHOOK_SECRET` | Yes | Webhook endpoint secret |

### File Storage (Cloudinary)

| Variable | Required | Description |
|----------|----------|-------------|
| `CLOUDINARY_CLOUD_NAME` | Yes | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Yes | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Yes | Cloudinary API secret |

### Communications

| Variable | Required | Description |
|----------|----------|-------------|
| `MAIL_HOST` | Yes | SMTP host (e.g., `smtp.gmail.com`) |
| `MAIL_PORT` | Yes | SMTP port (e.g., `465` for SSL) |
| `MAIL_USER` | Yes | Sender email address |
| `MAIL_PASS` | Yes | SMTP password / app password |
| `MAIL_SUPPORT_TO` | Yes | Support inbox recipient |
| `MAIL_CONTACT_TO` | Yes | Contact inbox recipient |
| `TWILIO_ACCOUNT_SID` | Yes | Twilio account SID |
| `TWILIO_ACCOUNT_TOKEN` | Yes | Twilio auth token |
| `TWILIO_PHONE_NUMBER` | Yes | Twilio phone number |

### AI & Integrations

| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | Yes | Google Generative AI API key |
| `ZOOM_ACCOUNT_ID` | Yes | Zoom account ID |
| `ZOOM_CLIENT_ID` | Yes | Zoom OAuth client ID |
| `ZOOM_CLIENT_SECRET` | Yes | Zoom OAuth client secret |
| `ZOOM_WEBHOOK_SECRET` | Yes | Zoom webhook validation secret |
| `EDLINK_CLIENT_ID` | Yes | Edlink OAuth client ID |
| `EDLINK_CLIENT_SECRET` | Yes | Edlink OAuth client secret |
| `EDLINK_REDIRECT_URI` | Yes | Edlink OAuth callback URL |
| `GOOGLE_CSS_CLIENT_ID` | Yes | Google CSS client ID |
| `GOOGLE_CSS_CLIENT_SECRET` | Yes | Google CSS client secret |
| `GOOGLE_DRIVE_CLIENT_ID` | Yes | Google Drive client ID |
| `GOOGLE_DRIVE_CLIENT_SECRET` | Yes | Google Drive client secret |
| `GOOGLE_DRIVE_REDIRECT_URI` | Yes | Google Drive callback URL |
| `BACKEND_URL` | Yes | Base backend URL for integrations |
| `ADMIN_FRONTEND_URL` | Yes | Admin frontend URL |

### SAML SSO (Okta)

| Variable | Required | Description |
|----------|----------|-------------|
| `SAML_OKTA_ENTRY_POINT` | Yes | Okta SSO URL |
| `SAML_OKTA_ISSUER` | Yes | SAML issuer |
| `SAML_OKTA_IDP_ISSUER` | Yes | Okta IDP issuer |
| `SAML_OKTA_CERT` | Yes | Okta signing certificate (PEM block) |
| `BACKEND_BASE_URL` | Yes | Backend base URL for SAML |

### Miscellaneous

| Variable | Required | Description |
|----------|----------|-------------|
| `CLIENT_URL` | Yes | Client frontend URL |
| `ASSET_URL` | No | Public asset base URL |
| `SAME_SITE` | No | Cookie SameSite value (e.g., `lax`) |
| `SECURE` | No | Cookie Secure flag (`true`/`false`) |
| `DB_ENCRYPTION_KEY` | No | Database encryption key |
| `ENCRYPTION_KEY` | No | Application encryption key |
| `BLIND_INDEX_PEPPER` | No | Pepper for blind indexing |

---

## API Documentation

The backend provides interactive Swagger/OpenAPI documentation:

- **Swagger UI**: `http://localhost:5050/api-docs`
- **OpenAPI JSON**: `http://localhost:5050/openapi.json`

These are generated from `src/Utiles/swaggerSpec.js`.
