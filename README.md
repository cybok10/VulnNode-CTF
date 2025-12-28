# 🛒 VulnNode-CTF v3.0

**An Intentionally Vulnerable E-Commerce Application for Security Training**

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node Version](https://img.shields.io/badge/node-%3E%3D14.0.0-brightgreen.svg)
![Platform](https://img.shields.io/badge/platform-Linux%20%7C%20macOS%20%7C%20Windows-lightgrey.svg)
![CTF Challenges](https://img.shields.io/badge/CTF%20Challenges-10-orange.svg)
![Total Points](https://img.shields.io/badge/Total%20Points-2150-red.svg)

---

## ⚠️ CRITICAL SECURITY WARNING

**THIS APPLICATION CONTAINS INTENTIONAL SECURITY VULNERABILITIES**

- 🚨 **DO NOT deploy to production**
- 🚨 **DO NOT expose to public internet**
- 🚨 **FOR EDUCATIONAL PURPOSES ONLY**
- 🚨 **Use in isolated/sandboxed environments**

This is a **Capture The Flag (CTF)** training platform designed to teach web application security through hands-on exploitation.

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Vulnerabilities](#-vulnerabilities)
- [CTF Challenges](#-ctf-challenges)
- [Installation](#-installation)
- [Quick Start](#-quick-start)
- [Usage](#-usage)
- [Default Credentials](#-default-credentials)
- [Project Structure](#-project-structure)
- [API Documentation](#-api-documentation)
- [Configuration](#-configuration)
- [Docker Deployment](#-docker-deployment)
- [Troubleshooting](#-troubleshooting)
- [Learning Resources](#-learning-resources)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🎯 Overview

VulnNode-CTF is a full-featured e-commerce web application built with **Node.js**, **Express**, **SQLite**, and **EJS** templates. It simulates a realistic online shopping platform while incorporating **10+ critical security vulnerabilities** for educational purposes.

### Key Statistics

- **10 CTF Challenges** (2,150 total points)
- **15 Database Tables** (64+ sample records)
- **50+ Routes** (Public, Protected, Admin, API)
- **10+ Vulnerability Types** (OWASP Top 10)
- **4 User Roles** (Admin, User, Vendor, Guest)
- **12 Products** with complete shopping cart

---

## ✨ Features

### E-Commerce Functionality

- 🛍️ **Product Catalog** - Browse 12 products with details
- 🔍 **Search** - Find products (with SQL injection)
- 🛒 **Shopping Cart** - Add/remove items, update quantities
- 💳 **Checkout** - Complete order process
- 📦 **Order History** - Track past purchases
- ⭐ **Product Reviews** - Rate and review (with XSS)
- 💬 **Support Tickets** - Customer support system

### User Management

- 👤 **Registration** - Create new accounts
- 🔐 **Authentication** - Login/logout with sessions
- 📊 **User Dashboard** - Personal dashboard
- 👨‍💼 **User Profiles** - View and edit profiles
- 🎯 **Gamification** - Loyalty points and badges

### Admin Features

- 🎛️ **Admin Panel** - Full administrative control
- 👥 **User Management** - View/edit/delete users
- 📝 **Activity Logs** - Monitor user actions
- 🔧 **System Diagnostics** - Server information
- 💻 **Command Execution** - Shell access (vulnerable)

### CTF Platform

- 🏆 **Scoreboard** - 10 challenges with leaderboard
- 🚩 **Flag Submission** - Submit flags to earn points
- 💡 **Hints System** - Get help on challenges
- 📈 **Progress Tracking** - Monitor your achievements
- 🥇 **Leaderboard** - Compete with other players

---

## 🐛 Vulnerabilities

This application includes the following **intentional vulnerabilities** for training:

### OWASP Top 10 Coverage

| # | Vulnerability | Severity | Location | OWASP |
|---|---------------|----------|----------|-------|
| 1 | **SQL Injection** | 🔴 Critical | `/search`, product queries | A03:2021 |
| 2 | **Stored XSS** | 🔴 Critical | Product reviews, support tickets | A03:2021 |
| 3 | **Reflected XSS** | 🟠 High | Search results, error pages | A03:2021 |
| 4 | **IDOR** | 🟠 High | Order details, user profiles | A01:2021 |
| 5 | **Command Injection** | 🔴 Critical | Admin panel `/api/admin/command` | A03:2021 |
| 6 | **Insecure Deserialization** | 🔴 Critical | Cookie handling (`user_prefs`) | A08:2021 |
| 7 | **File Upload RCE** | 🔴 Critical | Support ticket attachments | A04:2021 |
| 8 | **XXE** | 🟠 High | XML parsing endpoints | A05:2021 |
| 9 | **SSRF** | 🟠 High | Report feature, webhooks | A10:2021 |
| 10 | **Business Logic Flaw** | 🟡 Medium | Checkout process, discounts | A04:2021 |
| 11 | **Authentication Bypass** | 🔴 Critical | JWT weaknesses, session fixation | A07:2021 |
| 12 | **Sensitive Data Exposure** | 🟠 High | `/serverinfo`, error messages | A02:2021 |

### Additional Vulnerabilities

- Path Traversal (LFI/RFI)
- Mass Assignment
- Rate Limiting Issues
- Weak Cryptography
- Information Disclosure
- Session Management Issues
- CSRF (Cross-Site Request Forgery)
- Clickjacking

---

## 🏆 CTF Challenges

All challenges are accessible via the **Scoreboard** at `/scoreboard`

| # | Challenge Name | Category | Difficulty | Points |
|---|----------------|----------|------------|--------|
| 1 | SQL Injection Basics | Injection | 🟢 Easy | 100 |
| 2 | Stored XSS in Reviews | XSS | 🟡 Medium | 200 |
| 3 | IDOR in Orders | Access Control | 🟢 Easy | 150 |
| 4 | Command Injection | Injection | 🔴 Hard | 300 |
| 5 | Insecure Deserialization | Deserialization | 🔴 Hard | 350 |
| 6 | JWT Secret Weakness | Cryptography | 🟡 Medium | 250 |
| 7 | File Upload RCE | Upload | 🔴 Hard | 300 |
| 8 | XXE Attack | XML | 🟡 Medium | 200 |
| 9 | SSRF to Internal Network | SSRF | 🟡 Medium | 200 |
| 10 | Business Logic Flaw | Logic | 🟡 Medium | 250 |

**Total Points:** 2,150

### Flag Format

All flags follow this format: `FLAG{some_text_here}`

---

## 🚀 Installation

### Prerequisites

- **Node.js** >= 14.0.0 ([Download](https://nodejs.org/))
- **npm** >= 6.0.0 (comes with Node.js)
- **Git** ([Download](https://git-scm.com/))

### Step-by-Step Installation

```bash
# 1. Clone the repository
git clone https://github.com/cybok10/VulnNode-CTF.git
cd VulnNode-CTF

# 2. Install dependencies
npm install

# 3. Set up environment variables (optional)
cp .env.example .env
# Edit .env with your settings (defaults work fine)

# 4. Initialize database with sample data
npm run db-reset

# 5. Start the server
npm start
```

### Alternative: Quick Setup

```bash
git clone https://github.com/cybok10/VulnNode-CTF.git && cd VulnNode-CTF && npm install && npm run db-reset && npm start
```

---

## ⚡ Quick Start

### Start the Application

```bash
npm start
```

You should see:

```
============================================================
   VulnNode-CTF v3.0 - Intentionally Vulnerable E-Commerce
============================================================
[+] Server Status: RUNNING
[+] Port: 3000
[+] URL: http://localhost:3000

[*] Quick Links:
    Home:       http://localhost:3000/
    Scoreboard: http://localhost:3000/scoreboard 🏆
    Login:      http://localhost:3000/auth/login
```

### Access the Application

1. **Home Page:** http://localhost:3000
2. **Scoreboard:** http://localhost:3000/scoreboard
3. **Login:** http://localhost:3000/auth/login
4. **Admin Panel:** http://localhost:3000/admin (after admin login)

---

## 💻 Usage

### Available NPM Scripts

```bash
# Start the server
npm start

# Start with auto-reload (development)
npm run dev

# Reset database (delete and recreate)
npm run db-reset

# Initialize database only
npm run db-init

# Run tests (if available)
npm test

# Lint code
npm run lint
```

### Accessing Different Features

#### As a Guest User
- Browse products
- View scoreboard
- Search products (try SQLi!)
- Create account

#### As a Registered User
- All guest features
- Add items to cart
- Place orders
- Submit reviews (try XSS!)
- Create support tickets
- Submit CTF flags

#### As an Admin
- All user features
- Access admin panel
- Manage users
- View logs
- Execute system commands (vulnerable!)

---

## 🔑 Default Credentials

| Username | Password | Role | Balance | Description |
|----------|----------|------|---------|-------------|
| **admin** | admin123 | Admin | $9,999.00 | Full administrative access |
| **user** | user123 | User | $100.00 | Standard user account |
| **alice** | alice123 | User | $250.00 | Test user with more balance |
| **bob** | bob123 | User | $75.00 | Test user with less balance |

---

## 📁 Project Structure

```
VulnNode-CTF/
├── database/
│   ├── db.js                 # Better-sqlite3 connection
│   ├── init_complete_db.js   # Database initialization
│   └── vuln_app.db          # SQLite database file
├── middleware/
│   └── auth.js               # Authentication middleware
├── public/
│   ├── css/                  # Stylesheets
│   ├── js/                   # Client-side JavaScript
│   └── images/               # Static images
├── routes/
│   ├── admin.js              # Admin panel routes
│   ├── auth.js               # Authentication routes
│   ├── cart.js               # Shopping cart API
│   ├── checkout.js           # Checkout process
│   ├── frontend.js           # Frontend page routes
│   ├── gamification.js       # Loyalty/gamification
│   ├── index.js              # Home and search
│   ├── order.js              # Order management
│   ├── products.js           # Product API
│   ├── scoreboard.js         # CTF scoreboard
│   ├── support.js            # Support tickets
│   ├── upload.js             # File upload (vulnerable)
│   └── user.js               # User profile
├── uploads/                  # File upload directory
├── views/
│   ├── partials/             # EJS partials (header, footer)
│   ├── 404.ejs               # Not found page
│   ├── 500.ejs               # Error page
│   ├── index.ejs             # Home page
│   ├── scoreboard.ejs        # CTF scoreboard
│   └── ...                   # Other views
├── .env.example              # Environment template
├── .gitignore                # Git ignore rules
├── package.json              # NPM dependencies
├── server.js                 # Main application file
└── README.md                 # This file
```

---

## 🌐 API Documentation

### Authentication Endpoints

```http
POST /auth/register
Content-Type: application/json

{
  "username": "newuser",
  "password": "password123",
  "email": "user@example.com"
}
```

```http
POST /auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "admin123"
}
```

### Product Endpoints

```http
GET /api/products              # List all products
GET /api/products/:id          # Get product details
POST /api/products/:id/review  # Add review (requires auth)
```

### Cart Endpoints

```http
POST /api/cart/add
Content-Type: application/json

{
  "productId": 1,
  "quantity": 2
}
```

### CTF Endpoints

```http
GET /scoreboard                # View challenges
POST /scoreboard/submit        # Submit flag
GET /scoreboard/hint/:id       # Get hint
GET /scoreboard/progress       # User progress
```

### Admin Endpoints

```http
GET /admin                     # Admin dashboard
GET /admin/users               # List users
POST /api/admin/command        # Execute command (VULNERABLE!)
Content-Type: application/json

{
  "command": "ls -la"
}
```

For complete API documentation, see [API_DOCS.md](./API_DOCS.md)

---

## ⚙️ Configuration

### Environment Variables

Copy `.env.example` to `.env` and customize:

```bash
cp .env.example .env
```

**Key settings:**

```env
# Server
PORT=3000
NODE_ENV=development

# Database
DB_PATH=./database/vuln_app.db

# Session
SESSION_SECRET=your-secret-key-here

# CTF
CTF_ENABLED=true
FLAG_SUBMISSION_ENABLED=true

# Security (Vulnerabilities)
ENABLE_SQLI=true
ENABLE_XSS=true
ENABLE_COMMAND_INJECTION=true
```

See [.env.example](./.env.example) for all options.

---

## 🐳 Docker Deployment

### Using Docker Compose (Recommended)

```bash
# Build and start
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

### Using Docker

```bash
# Build image
docker build -t vulnnode-ctf .

# Run container
docker run -p 3000:3000 vulnnode-ctf
```

Access at: http://localhost:3000

---

## 🔧 Troubleshooting

### Common Issues

#### Port Already in Use

```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or use different port
PORT=3001 npm start
```

#### Database Errors

```bash
# Reset database
npm run db-reset

# Check database file exists
ls -la database/vuln_app.db
```

#### Module Not Found

```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

#### Permission Errors

```bash
# Fix file permissions
chmod -R 755 .
chmod 666 database/vuln_app.db
```

For more help, see [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)

---

## 📚 Learning Resources

### Recommended Tools

- **Burp Suite** - Web proxy and security testing
- **sqlmap** - Automated SQL injection tool
- **XSStrike** - XSS detection tool
- **Postman** - API testing
- **curl** - Command-line HTTP client

### CTF Walkthroughs

See [WALKTHROUGHS.md](./WALKTHROUGHS.md) for detailed solutions (spoilers!)

### OWASP Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP Testing Guide](https://owasp.org/www-project-web-security-testing-guide/)
- [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/)

---

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/new-challenge`)
3. Commit changes (`git commit -am 'Add new CTF challenge'`)
4. Push to branch (`git push origin feature/new-challenge`)
5. Open a Pull Request

See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

---

## 📄 License

MIT License - see [LICENSE](./LICENSE) file for details.

---

## 🙏 Acknowledgments

- OWASP for vulnerability classification
- Node.js and Express communities
- All CTF creators and security researchers

---

## 📞 Contact

- **GitHub:** [@cybok10](https://github.com/cybok10)
- **Repository:** [VulnNode-CTF](https://github.com/cybok10/VulnNode-CTF)
- **Issues:** [Report bugs or suggestions](https://github.com/cybok10/VulnNode-CTF/issues)

---

## ⭐ Star History

If you find this project useful for learning, please give it a star! ⭐

---

**Remember:** This application is intentionally vulnerable. Never deploy to production!

**Happy Hacking! 🎯**