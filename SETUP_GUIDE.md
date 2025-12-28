# 🎯 VulnNode-CTF Complete Setup Guide

## 📋 Table of Contents
- [Installation](#installation)
- [Database Setup](#database-setup)
- [Running the Application](#running-the-application)
- [Default Credentials](#default-credentials)
- [Features Overview](#features-overview)
- [CTF Challenges](#ctf-challenges)
- [Testing Checklist](#testing-checklist)
- [Troubleshooting](#troubleshooting)
- [NPM Commands](#npm-commands)

---

## 🚀 Installation

### Prerequisites
- Node.js >= 14.0.0
- npm or yarn
- Git

### Step 1: Clone Repository
```bash
git clone https://github.com/cybok10/VulnNode-CTF.git
cd VulnNode-CTF
```

### Step 2: Install Dependencies
```bash
npm install
```

This will install all required packages including:
- Express.js
- SQLite3 & Better-SQLite3
- bcryptjs
- EJS templates
- And all other dependencies

---

## 💾 Database Setup

### Option A: Complete Database (Recommended)

Initialize the database with **all 15 tables** and sample data:

```bash
npm run init-db-complete
```

This creates:
- ✅ 15 tables with proper relationships
- ✅ 4 user accounts (admin, user, alice, bob)
- ✅ 12 realistic products with stock
- ✅ 8 product reviews
- ✅ 3 sample orders with items
- ✅ 3 support tickets with messages
- ✅ 10 CTF challenges
- ✅ Admin logs and user progress

### Option B: Basic Database (Legacy)

For minimal setup with only users and products:

```bash
npm run init-db
```

### Database Reset

To completely reset the database:

```bash
npm run db-reset
```

### Database Backup

```bash
# Create backup
npm run db-backup

# Restore from backup
npm run db-restore
```

---

## ▶️ Running the Application

### Production Mode
```bash
npm start
```

### Development Mode (with auto-reload)
```bash
npm run dev
```

The application will start on: **http://localhost:3000**

---

## 🔑 Default Credentials

### User Accounts

| Username | Password | Role | Balance | Description |
|----------|----------|------|---------|-------------|
| `admin` | `admin123` | Admin | $9,999.00 | System administrator |
| `user` | `user123` | User | $100.00 | Regular user |
| `alice` | `alice123` | User | $250.00 | Security researcher |
| `bob` | `bob123` | User | $75.00 | Penetration tester |

### Quick Test Login

1. Go to: http://localhost:3000/auth/login
2. Username: `admin`
3. Password: `admin123`
4. You'll be logged in as administrator

---

## 🎨 Features Overview

### Frontend Features

#### 🏠 **Home Page** (`/`)
- Product catalog with 12 items
- Search functionality (SQL injection vulnerable)
- Featured products
- Category filters

#### 🛒 **Shopping Features**
- Product details with reviews
- Shopping cart management
- Checkout process
- Order tracking
- Order history

#### 👤 **User Features**
- User registration
- Login/Logout
- User profile
- Address management
- Payment methods
- Order history

#### 🎫 **Support System**
- Create support tickets
- View ticket list
- Ticket detail with messaging
- File attachments

#### 🏆 **CTF Features**
- Scoreboard with challenges
- Flag submission
- Progress tracking
- Leaderboard

#### 🔧 **Admin Panel** (Admin only)
- User management
- System diagnostics (command injection)
- Admin logs viewer
- Ticket management

### Backend Features

#### 📊 **Complete Database Schema**

1. **users** - User accounts and profiles
2. **products** - Product catalog with stock
3. **reviews** - Product reviews and ratings
4. **cart** - Shopping cart items
5. **orders** - Order records
6. **order_items** - Order line items
7. **addresses** - User shipping addresses
8. **payment_methods** - Saved payment cards
9. **support_tickets** - Support ticket system
10. **ticket_messages** - Ticket conversations
11. **secrets** - CTF challenges and flags
12. **user_progress** - Challenge completion tracking
13. **admin_logs** - Admin activity logs
14. **sessions** - User session management
15. **wishlist** - User wishlists

#### 🔗 **API Endpoints**

**Products API:**
- `GET /api/products` - List all products
- `GET /api/products/:id` - Get product details
- `POST /api/products/:id/review` - Add review

**Cart API:**
- `POST /api/cart/add` - Add to cart
- `PUT /api/cart/update/:id` - Update quantity
- `DELETE /api/cart/remove/:id` - Remove item

**Checkout API:**
- `POST /api/checkout/process` - Process order
- `GET /api/checkout/order/:number` - Get order

**Support API:**
- `POST /api/support/ticket` - Create ticket
- `POST /api/support/ticket/:id/reply` - Reply to ticket

**Admin API:**
- `GET /api/admin/users` - List users
- `POST /api/admin/command` - Execute command (vulnerable)
- `GET /api/admin/logs` - View logs

---

## 🎯 CTF Challenges

### Challenge List (10 Challenges, 2150 Total Points)

| # | Challenge | Category | Difficulty | Points | Description |
|---|-----------|----------|------------|--------|--------------|
| 1 | SQL Injection Basics | Web | ⭐ Easy | 100 | Extract admin credentials via search |
| 2 | Stored XSS in Reviews | Web | ⭐⭐ Medium | 200 | Inject JavaScript in product reviews |
| 3 | IDOR in Orders | Web | ⭐ Easy | 150 | Access other users' orders |
| 4 | Command Injection | Web | ⭐⭐⭐ Hard | 300 | Execute system commands via admin panel |
| 5 | Insecure Deserialization | Web | ⭐⭐⭐ Hard | 350 | Exploit user_prefs cookie for RCE |
| 6 | JWT Secret Weakness | Crypto | ⭐⭐ Medium | 250 | Crack JWT secret and forge admin token |
| 7 | File Upload RCE | Web | ⭐⭐⭐ Hard | 300 | Upload malicious file for code execution |
| 8 | XXE Attack | Web | ⭐⭐ Medium | 200 | Extract files via XML External Entity |
| 9 | SSRF to Internal Network | Web | ⭐⭐ Medium | 200 | Access internal services via SSRF |
| 10 | Business Logic Flaw | Logic | ⭐⭐ Medium | 250 | Exploit discount system |

### Flag Format
All flags follow the format: `FLAG{...}`

Example: `FLAG{sql_1nj3ct10n_m4st3r}`

### Submitting Flags

1. Go to: http://localhost:3000/scoreboard
2. Enter your flag in the submission box
3. Click "Submit Flag"
4. Get instant feedback and points!

---

## ✅ Testing Checklist

After setup, test these routes to ensure everything works:

### Public Routes
- [ ] `GET /` - Home page loads with products
- [ ] `GET /search?q=laptop` - Search works
- [ ] `GET /auth/login` - Login page displays
- [ ] `GET /auth/register` - Registration page displays

### Authentication
- [ ] `POST /auth/register` - Can create new account
- [ ] `POST /auth/login` - Can login with admin/admin123
- [ ] `GET /auth/logout` - Logout works

### Shopping Features (Requires Login)
- [ ] `GET /cart` - Cart page loads
- [ ] `POST /api/cart/add` - Can add items to cart
- [ ] `GET /checkout` - Checkout page loads
- [ ] `GET /profile` - Profile page shows user info

### Support System (Requires Login)
- [ ] `GET /support` - Support center loads
- [ ] `POST /api/support/ticket` - Can create ticket
- [ ] `GET /support/ticket/:id` - Ticket detail shows messages

### CTF Features
- [ ] `GET /scoreboard` - Scoreboard displays challenges
- [ ] `POST /scoreboard/submit` - Can submit flags

### Admin Features (Requires Admin Login)
- [ ] `GET /admin` - Admin panel loads
- [ ] `GET /admin/users` - User management works
- [ ] `GET /admin/logs` - Admin logs display

---

## 🛠️ Troubleshooting

### Issue: `Cannot find module 'better-sqlite3'`

**Solution:**
```bash
npm install
```

### Issue: `SQLITE_ERROR: no such table`

**Solution:** Initialize the database
```bash
npm run init-db-complete
```

### Issue: `Invalid credentials` when logging in

**Solution:** Re-initialize database (passwords are bcrypt hashed)
```bash
npm run db-reset
```

### Issue: Port 3000 already in use

**Solution:** Kill existing process or use different port
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or use different port
PORT=3001 npm start
```

### Issue: Database locked

**Solution:** Close any SQLite browser/editor and restart
```bash
# Check for processes using the database
lsof | grep vuln_app.db

# Kill if needed, then restart
npm start
```

### Issue: Routes returning 500 errors

**Check:**
1. Database exists: `ls database/vuln_app.db`
2. All dependencies installed: `npm list`
3. Check server logs for specific error
4. Ensure database has all tables: `npm run init-db-complete`

---

## 📦 NPM Commands

### Database Commands
```bash
npm run init-db              # Initialize basic database
npm run init-db-complete     # Initialize complete database (recommended)
npm run db-reset             # Delete and recreate database
npm run db-backup            # Create database backup
npm run db-restore           # Restore from backup
```

### Server Commands
```bash
npm start                    # Start server (production)
npm run dev                  # Start with auto-reload (development)
```

---

## 🎓 Learning Resources

### Intentional Vulnerabilities

This application contains the following **intentional vulnerabilities** for educational purposes:

1. **SQL Injection** - Search functionality
2. **Stored XSS** - Product reviews
3. **Reflected XSS** - Error messages
4. **IDOR** - Order/ticket access
5. **Command Injection** - Admin diagnostics
6. **Insecure Deserialization** - Cookie handling
7. **File Upload** - Avatar/attachment upload
8. **XXE** - XML processing
9. **SSRF** - Image proxy
10. **Business Logic** - Discount abuse
11. **Weak Authentication** - Predictable tokens
12. **Information Disclosure** - Verbose errors

### OWASP Top 10 Coverage

✅ A01:2021 - Broken Access Control  
✅ A02:2021 - Cryptographic Failures  
✅ A03:2021 - Injection  
✅ A04:2021 - Insecure Design  
✅ A05:2021 - Security Misconfiguration  
✅ A06:2021 - Vulnerable Components  
✅ A07:2021 - Authentication Failures  
✅ A08:2021 - Software and Data Integrity  
✅ A09:2021 - Security Logging Failures  
✅ A10:2021 - Server-Side Request Forgery  

---

## ⚠️ Important Warnings

### 🚨 **DO NOT DEPLOY TO PRODUCTION**

This application contains **critical security vulnerabilities** by design. It is intended **ONLY** for:

- ✅ Educational purposes
- ✅ Security training
- ✅ CTF competitions
- ✅ Penetration testing practice
- ✅ Secure coding workshops

### 🔒 **Use in Isolated Environment**

- Run only on localhost or isolated network
- Do not expose to the internet
- Do not use real credentials
- Do not store sensitive data

---

## 🤝 Contributing

Contributions are welcome! To contribute:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

---

## 📄 License

MIT License - See LICENSE file for details

---

## 📞 Support

For issues or questions:
- Open an issue on GitHub
- Check the Troubleshooting section
- Review documentation files (FIXES_APPLIED.md, RUNTIME_FIXES.md)

---

## 🎉 Enjoy the CTF!

Happy hacking! Remember, this is for **educational purposes only**. Learn, practice, and stay ethical! 🛡️

---

**Last Updated:** December 28, 2025
**Version:** 3.0.0
