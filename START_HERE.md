# 🚀 VulnNode-CTF v2.0 - Quick Start Guide

## ✅ Prerequisites Check

Before starting, make sure you have:
- **Node.js** v14+ installed
- **npm** package manager
- **Git** (to clone/pull updates)

## 📦 Installation Steps

### Step 1: Install Dependencies

```bash
npm install
```

If you get any errors, try:
```bash
npm install --legacy-peer-deps
```

### Step 2: Initialize Database

```bash
node database/init_db_v2.js
```

**Expected Output:**
```
[*] Initializing VulnNode-CTF v2.0 Database...
[!] WARNING: This database contains intentional vulnerabilities!

✓ Database schema created successfully!
✓ Seeded with realistic e-commerce data
✓ Users created: 6
✓ Products created: 15
...
[*] Happy Hacking! 🚩
```

### Step 3: Start the Server

```bash
node server_v2.js
```

**Expected Output:**
```
============================================================
   VulnNode-CTF v2.0 - Intentionally Vulnerable E-Commerce
============================================================
[!] WARNING: This application contains CRITICAL vulnerabilities
...
[+] Server Status: RUNNING
[+] Port: 3000
[+] URL: http://localhost:3000
```

### Step 4: Access the Application

Open your browser and navigate to:
**http://localhost:3000**

---

## 🔑 Default Credentials

| Role | Username | Password |
|------|----------|----------|
| Admin | admin | admin123 |
| User | alice | alice123 |
| User | bob | bob123 |
| User | charlie | charlie123 |
| Vendor | vendor1 | vendor123 |
| Test | testuser | test123 |

---

## 🚫 Common Issues & Fixes

### Issue 1: "Cannot find module 'express-fileupload'"

**Solution:**
```bash
npm install express-fileupload
# or
npm install
```

### Issue 2: "ReferenceError: datetime is not defined"

**Solution:**
Make sure you're using the fixed version:
```bash
git pull origin main
node database/init_db_v2.js
```

### Issue 3: "EADDRINUSE: Port 3000 is already in use"

**Solution:**
Either kill the process using port 3000:
```bash
# Linux/Mac
lsof -ti:3000 | xargs kill -9

# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

Or change the port:
```bash
PORT=3001 node server_v2.js
```

### Issue 4: Database locked error

**Solution:**
```bash
rm database/vuln_app.db
node database/init_db_v2.js
```

### Issue 5: "Error: Cannot find module './routes/cart'"

**Solution:**
Some routes are still in development. Use the original server temporarily:
```bash
node server.js
```

Or comment out missing routes in `server_v2.js`:
```javascript
// const cartRoutes = require('./routes/cart');  // Comment this
// app.use('/cart', cartRoutes);  // And this
```

---

## 📝 What's Working Now

✅ **Completed:**
- Enhanced database with 17 tables
- 15 products with realistic data
- 6 user accounts
- 15 CTF flags
- Basic server configuration
- Information disclosure vulnerabilities
- Insecure deserialization setup

⏳ **In Progress:**
- Shopping cart routes
- Checkout process
- Product pages
- Admin panel
- Support system

---

## 🎯 Your First Challenge

Once the server is running, try these:

### 1. Information Disclosure (Easy)
Visit: `http://localhost:3000/serverinfo`
Look for exposed environment variables and paths.

### 2. SQL Injection (Easy)
Try searching for products with:
```
' OR '1'='1
```

### 3. IDOR (Easy)
Try accessing different user profiles:
```
http://localhost:3000/user/1
http://localhost:3000/user/2
```

### 4. Hidden Product (Easy)
Find the secret product with FLAG in description.
Hint: Look at product ID 15 or search in database.

---

## 📚 Documentation

- **Implementation Plan:** See `IMPLEMENTATION_PLAN.md`
- **Vulnerability List:** Coming soon in `VULNERABILITIES.md`
- **Walkthroughs:** Coming soon in `WALKTHROUGHS/` directory

---

## 👥 Need Help?

If you encounter issues:
1. Check this guide first
2. Review `IMPLEMENTATION_PLAN.md`
3. Check the GitHub issues
4. Make sure all dependencies are installed

---

## ⚠️ Important Warnings

1. **DO NOT** deploy this in production
2. **DO NOT** use real credentials
3. **DO NOT** test on systems you don't own
4. Run only in isolated/sandboxed environments
5. This is for **educational purposes only**

---

## 🛠️ Development Mode

For development with auto-reload:
```bash
npm run dev
```

---

## 📊 Current Progress

- [x] Database Schema (100%)
- [x] Server Configuration (100%)
- [ ] Route Implementation (10%)
- [ ] Frontend Templates (0%)
- [ ] Vulnerability Testing (20%)
- [ ] Documentation (30%)

**Overall: ~15% Complete**

---

## 🆕 Next Steps

The development continues with:
1. Shopping cart routes
2. Checkout process
3. Product detail pages
4. Enhanced admin panel
5. Support system
6. Frontend UI/UX

---

**Happy Hacking! 🚩**

*Last Updated: December 27, 2025*