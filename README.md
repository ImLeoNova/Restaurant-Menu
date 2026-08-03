# 🍔 Restaurant Menu

A complete, modern **online restaurant/fast-food menu and ordering system**, featuring a customer-facing storefront, an admin dashboard, online payments, SMS OTP authentication, and a **Persian-speaking AI assistant** that can chat with and showcase products to customers.

The project is fully **decoupled** into a backend and a frontend, and both are Docker-ready out of the box.

---

## 🧱 Tech Stack

### Backend — `/Backend`
| Layer | Technology |
|---|---|
| Language & Framework | Python 3.13 + **Flask** |
| App Server | **gevent** (`WSGIServer`) via `run.py` |
| Database | **MySQL 8** (via `mysql-connector-python`) |
| Authentication | **JWT** (`PyJWT`) + secure cookies + SMS-based **OTP** flow via [SMS.ir](https://sms.ir) |
| AI | **OpenAI API** (`gpt-4o-mini`) powering a Persian-language support chatbot |
| File Storage | **S3-compatible** object storage (e.g. Parspack, MinIO) |
| Payment Gateway | **ZarinPal** |
| API Docs | **Swagger / OpenAPI** via `flasgger` (served at `/swagger/`) |
| Scheduling | `APScheduler` |
| Containerization | Docker (`python:3.13-slim`) |

### Frontend — `/Frontend`
| Layer | Technology |
|---|---|
| Framework | **Angular 17** (standalone components + PWA/Service Worker) |
| UI Kit | **Angular Material** + **Tailwind CSS** |
| State Management | **NgRx Store** |
| Charts / Analytics | **Chart.js** |
| Data Tables (Admin) | **AG Grid** |
| Client-side Auth | `jwt-decode` + Angular interceptors |
| Production Server | **Nginx**, served from a multi-stage Docker build |

### Infrastructure & Deployment
- **Docker Compose** runs all three services together: `frontend` (Angular + Nginx), `backend` (Flask), and `db` (MySQL)
- **GitHub Actions** (`.github/workflows/deploy.yml`) automates CI/CD to a Linux server over SSH/SCP on every push to `main`
- Ready-made scripts in `/scripts` for installing Docker on a fresh server (`setup-server.sh`) and deploying (`deploy.sh`)

---

## ⚙️ How It Works

```
                     ┌──────────────────────┐
                     │      Browser /        │
                     │        User            │
                     └──────────┬───────────┘
                                │  HTTP
                     ┌──────────▼───────────┐
                     │  Frontend (Angular)   │
                     │    served by Nginx     │
                     └──────────┬───────────┘
                                │  REST API (JSON) + JWT
                     ┌──────────▼───────────┐
                     │   Backend (Flask)      │
                     │ routes → services →    │
                     │  models → database      │
                     └───┬───────┬──────┬────┘
                         │       │      │
                 ┌───────▼─┐ ┌───▼───┐ ┌▼─────────────┐
                 │  MySQL  │ │  S3   │ │  OpenAI /     │
                 │(products│ │(images)│ │  SMS.ir /     │
                 │ orders) │ │       │ │  ZarinPal     │
                 └─────────┘ └───────┘ └───────────────┘
```

The backend follows a layered architecture:
- **`routes/`** → API entry points (users, admin, products, categories, orders, comments, tokens, AI, reports, health)
- **`services/`** → business logic (ZarinPal payment, SMS OTP, etc.)
- **`models/`** → data models (account, product, category, order, comment, report)
- **`middleware/`** → route protection via `token_required` and `admin_required`
- **`core/`** → database connection, CORS setup, and automatic schema bootstrapping

### Key Features
- 🛍️ Browse products and categories with details and search
- 🛒 Shopping cart, order placement, and online payment via ZarinPal
- 🔐 Phone number login with **SMS one-time-password (OTP)** + JWT-based sessions
- 🧑‍💼 **Admin dashboard** with sales charts, product/category/order management, and analytics reports (stuck pending orders, abandoned payments, etc.)
- 💬 Product commenting with anti-spam rate limiting
- 🤖 **AI chatbot** with a friendly Persian-speaking persona that can present products as visual cards
- 📱 **PWA support** (installable on mobile, offline capability via Service Worker)
- 🖼️ Image uploads managed through S3-compatible cloud storage
- 🛡️ Security headers (CSP, HSTS, X-Frame-Options, etc.) enabled by default

---

## 🚀 Running the Project on Different Systems

### Option 1 (Recommended, easiest): Run with Docker Compose

You only need **Docker** and **Docker Compose** — no manual install of Python, Node, or MySQL required, and this works identically on **Windows, macOS, and Linux**.

```bash
# 1. Clone the project
git clone https://github.com/ImLeoNova/Restaurant-Menu.git
cd Restaurant-Menu

# 2. Create the backend env file from the example
cd Backend
cp .env.example .env
# Edit .env and fill in real values (DB password, JWT secret, OpenAI key,
# S3 credentials, SMS.ir, and ZarinPal settings)

# 3. Bring up all three services (frontend + backend + mysql)
docker compose -f docker-compose.yaml up -d --build
```

Once the health checks turn green:

- Frontend: **http://localhost**
- Backend: **http://localhost:8080** (port is read from `SERVER_PORT` in `.env`)
- Swagger docs: **http://localhost:8080/swagger/**

To stop everything:
```bash
docker compose -f docker-compose.yaml down
```

---

### Option 2: Manual (Development) Setup Without Docker

Useful if you want to develop and run each part separately.

#### Prerequisites
- Python 3.13+
- Node.js 20+ and npm
- MySQL 8 (installed and running)
- Angular CLI: `npm install -g @angular/cli`

#### Backend (Flask)

```bash
cd Backend

# Create a virtual environment
python -m venv venv

# Activate it
# Windows (PowerShell):
venv\Scripts\Activate.ps1
# Windows (cmd):
venv\Scripts\activate.bat
# Linux / macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Environment configuration
cp .env.example .env      # Windows: copy .env.example .env
# Edit .env with your database credentials and required API keys

# Set up MySQL and import the base schema (optional — the app also bootstraps the schema automatically)
mysql -u root -p < restaurant.sql

# Run the server
python run.py
```

The server starts on the host/port configured in `.env` (default port `8080`).

#### Frontend (Angular)

```bash
cd Frontend
npm install
ng serve
```

The frontend will be available at **http://localhost:4200** and will hot-reload as you edit files.

> ⚠️ Make sure `CORS_ORIGINS` in the backend `.env` includes the frontend's URL (default `http://localhost:4200`).

---

## 🔑 Important Environment Variables (`Backend/.env`)

| Variable | Description |
|---|---|
| `SERVER_PORT` | Port the backend listens on (default `8080`) |
| `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | MySQL connection settings |
| `SECRET_KEY` | JWT signing key (**required**) |
| `CORS_ORIGINS` | Allowed origins for API access |
| `S3_ENDPOINT_URL`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_BUCKET_NAME` | Cloud storage settings for images |
| `OPENAI_KEY`, `OPENAI_BASEURL` | API key/URL for the AI chatbot |
| `SMSIR_API_KEY`, `SMSIR_TEMPLATE_ID` | SMS.ir settings for OTP delivery |
| `ZARINPAL_MERCHANT_ID`, `ZARINPAL_SANDBOX`, `ZARINPAL_CALLBACK_URL` | ZarinPal payment gateway settings |
| `FRONTEND_URL` | Frontend URL used for post-payment redirects |

A full example file is available at `Backend/.env.example`.

---

## 🌐 Automated Deployment (CI/CD)

The project ships with a ready-made workflow at `.github/workflows/deploy.yml` that, on every push to `main`:
1. Copies the codebase to the target Linux server (SCP)
2. Installs Docker on the server if needed (`scripts/setup-server.sh`)
3. Writes the backend `.env` file from GitHub secrets
4. Runs `scripts/deploy.sh` to build and start the services automatically, then checks container health

To enable it, define the following secrets in your repository settings (Settings → Secrets):
`SERVER_HOST`, `SERVER_USER`, `SERVER_PASSWORD`, `SERVER_PORT`, `SERVER_PATH`, `BACKEND_ENV_B64`

---

## 📁 Project Structure

```
Restaurant-Menu/
├── Backend/                # Flask server
│   ├── app.py               # App factory, blueprint registration, security headers
│   ├── run.py                 # Runs the server with gevent
│   ├── Ai/                     # AI chatbot logic
│   ├── routes/                  # API endpoints
│   ├── services/                  # Business logic (payments, SMS, etc.)
│   ├── models/                      # Data models
│   ├── middleware/                    # Auth & access control
│   ├── config/                          # Settings and environment variables
│   ├── requirements.txt
│   └── docker-compose.yaml             # Runs frontend + backend + db together
├── Frontend/                # Angular application
│   └── src/app/
│       ├── AI/                # Client-side chatbot module
│       ├── Authentication/     # Login/signup/OTP flows
│       ├── pages/                # Pages (home, products, cart, checkout, dashboard)
│       ├── services/               # API communication services
│       └── state/                    # NgRx state management
└── scripts/                 # Server setup & deployment scripts
```

---

## 📖 API Documentation

Once the backend is running, full interactive Swagger documentation is available at:

```
http://localhost:8080/swagger/
```