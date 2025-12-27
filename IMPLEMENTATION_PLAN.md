# VulnNode-CTF v2.0 - Implementation Plan

## 🎯 Overview

This document outlines the complete implementation plan for transforming VulnNode-CTF into a realistic, feature-rich online shopping platform with progressive vulnerability levels (Basic → Advanced → Expert).

---

## ✅ Phase 1: Foundation & Database (COMPLETED)

### 1.1 Database Schema Enhancement ✓

**Status:** ✅ Completed

**Files Created:**
- `database/init_db_v2.js` - Enhanced database initialization

**Tables Implemented:**
1. `users` - Enhanced with 2FA, API keys, reset tokens
2. `categories` - Product categorization with hierarchy
3. `products` - Full e-commerce product data with SKU, variants, ratings
4. `addresses` - Shipping/billing addresses
5. `coupons` - Discount codes with validation rules
6. `orders` - Order management with status tracking
7. `order_items` - Order line items
8. `cart` - Shopping cart persistence
9. `wishlist` - User wishlist feature
10. `reviews` - Product reviews with XSS payloads
11. `payment_methods` - Saved payment information
12. `support_tickets` - Customer support system
13. `ticket_messages` - Support ticket threads
14. `secrets` - CTF flags with difficulty ratings
15. `user_progress` - CTF completion tracking
16. `logs` - Application logs (LFI targets)
17. `sessions` - Session storage

**Seed Data:**
- 6 users (admin, alice, bob, vendor1, charlie, testuser)
- 10 categories (Electronics, Fashion, Security Tools, etc.)
- 15 products (including 1 hidden product)
- 5 coupons (including admin-only)
- 15 CTF flags across all difficulty levels
- 3 orders with complete data
- 7 product reviews (including XSS payload)
- 3 support tickets

### 1.2 Server Configuration ✓

**Status:** ✅ Completed

**Files Created:**
- `server_v2.js` - Enhanced server with new middleware

**Features Implemented:**
- Insecure session configuration (weak secret, no httpOnly)
- File upload middleware (vulnerable configuration)
- Insecure deserialization middleware
- Verbose error handling with stack traces
- Information disclosure endpoints (/health, /serverinfo)
- robots.txt with sensitive path disclosure
- Directory listing for /uploads, /.git, /logs

---

## 📋 Phase 2: Route Implementation (IN PROGRESS)

### 2.1 Shopping & Cart Routes

**Priority:** HIGH

**Files to Create/Update:**

#### `/routes/cart.js` - Shopping Cart
```javascript
// Features:
- Add to cart (with price manipulation vulnerability)
- Update quantity (negative quantities allowed)
- Remove from cart
- Clear cart
- Apply coupon (race condition vulnerability)
- Cart summary with client-side price calculation
```

**Vulnerabilities:**
- Price manipulation via POST parameters
- Negative quantity leading to refunds
- Race condition in coupon application
- Client-side total calculation bypass

#### `/routes/checkout.js` - Checkout Process
```javascript
// Features:
- Multi-step checkout (shipping → payment → review)
- Address selection/creation
- Payment method selection
- Order summary
- Order confirmation
- Invoice generation (SSRF vulnerability)
```

**Vulnerabilities:**
- SSRF via invoice template URL
- Integer overflow in total calculation
- Free shipping bypass
- Payment verification bypass
- IDOR on order confirmation

### 2.2 Product & Search Routes

**Priority:** HIGH

**Files to Update:**

#### `/routes/product.js` - Product Details
```javascript
// Enhancements:
- Product variants (size, color)
- Image gallery
- Related products
- Add review (Stored XSS)
- Wishlist functionality
- Stock availability check (IDOR)
```

**Vulnerabilities:**
- Stored XSS in reviews
- IDOR on hidden products
- SQL injection in review search
- XSS in review title/comment

#### `/routes/index.js` - Homepage & Search
```javascript
// Enhancements:
- Featured products
- Category browsing
- Advanced search with filters
- Product recommendations
- Search autocomplete
```

**Vulnerabilities:**
- SQL injection in search (Union-based)
- Reflected XSS in search results
- Blind SQL injection in filters
- NoSQL injection (if MongoDB added)

### 2.3 Admin Panel Routes

**Priority:** HIGH

**Files to Update:**

#### `/routes/admin.js` - Admin Dashboard
```javascript
// Features:
- Dashboard with statistics
- User management (CRUD)
- Product management (CRUD)
- Order management
- Coupon management
- System logs viewer (LFI)
- Database backup (Command injection)
- System health check (Command injection)
- Configuration editor (File upload)
```

**Vulnerabilities:**
- Command injection in system health
- LFI in log viewer
- Command injection in backup
- File upload without validation
- IDOR on all admin operations
- Missing function-level access control
- CSRF on critical operations

### 2.4 User Account Routes

**Priority:** MEDIUM

**Files to Update:**

#### `/routes/user.js` - User Profile
```javascript
// Features:
- View/edit profile
- Change password
- Upload avatar (File upload vulnerability)
- View order history (IDOR)
- Address book management
- Wishlist
- Loyalty points
- API key management
```

**Vulnerabilities:**
- IDOR on profile viewing
- File upload (shell upload)
- Weak password validation
- IDOR on order history
- Horizontal privilege escalation

### 2.5 Authentication Routes

**Priority:** HIGH

**Files to Update:**

#### `/routes/auth.js` - Authentication
```javascript
// Features:
- Login (SQL injection bypass)
- Registration (XSS in username)
- Logout
- Password reset (token prediction)
- Email verification bypass
- 2FA (bypassable)
- OAuth integration (vulnerable)
```

**Vulnerabilities:**
- SQL injection in login
- Weak password hashing (MD5)
- JWT secret cracking
- Session fixation
- Password reset token prediction
- Email verification bypass
- 2FA bypass via cookie manipulation

### 2.6 Support System Routes

**Priority:** MEDIUM

**Files to Create:**

#### `/routes/support.js` - Customer Support
```javascript
// Features:
- Create ticket
- View tickets (IDOR)
- Reply to ticket
- Live chat (XSS)
- File attachments
- Ticket search
```

**Vulnerabilities:**
- IDOR on ticket viewing
- Stored XSS in messages
- File upload vulnerability
- SSRF via attachment URLs
- Information disclosure in search

### 2.7 Vendor Portal Routes

**Priority:** LOW

**Files to Create:**

#### `/routes/vendor.js` - Vendor Dashboard
```javascript
// Features:
- Vendor registration
- Product listing management
- Sales analytics
- Commission reports
- Inventory management
```

**Vulnerabilities:**
- Vendor approval bypass
- Price manipulation
- Commission calculation errors
- IDOR on vendor data

### 2.8 API Routes

**Priority:** HIGH

**Files to Update:**

#### `/routes/api.js` - REST API
```javascript
// Endpoints:
- /api/v1/products (Mass assignment)
- /api/v1/users (IDOR, Mass assignment)
- /api/v1/orders (IDOR)
- /api/v1/cart
- /api/v1/search
- /api/v2/graphql (GraphQL injection)
```

**Vulnerabilities:**
- Missing authentication
- Mass assignment
- IDOR on all resources
- Rate limiting bypass
- JWT algorithm confusion
- CORS misconfiguration
- API key exposure

### 2.9 CTF & Gamification Routes

**Priority:** MEDIUM

**Files to Create:**

#### `/routes/ctf.js` - CTF Management
```javascript
// Features:
- Challenge list
- Flag submission
- Leaderboard
- User progress tracking
- Hints system
- Writeup submissions
- Achievement badges
```

---

## 🎨 Phase 3: Frontend Implementation

### 3.1 Views & Templates

**Priority:** HIGH

**Files to Create/Update:**

#### Main Layout
- `views/layout/header.ejs` - Navigation, cart icon
- `views/layout/footer.ejs` - Footer with links
- `views/layout/sidebar.ejs` - Category navigation

#### Homepage
- `views/index.ejs` - Featured products, categories
- `views/search.ejs` - Search results

#### Products
- `views/products/list.ejs` - Product grid
- `views/products/detail.ejs` - Product details
- `views/products/category.ejs` - Category page

#### Cart & Checkout
- `views/cart/index.ejs` - Shopping cart
- `views/checkout/shipping.ejs` - Shipping form
- `views/checkout/payment.ejs` - Payment form
- `views/checkout/review.ejs` - Order review
- `views/checkout/confirmation.ejs` - Order confirmation

#### User Account
- `views/user/profile.ejs` - User profile
- `views/user/orders.ejs` - Order history
- `views/user/wishlist.ejs` - Wishlist
- `views/user/addresses.ejs` - Address book

#### Admin Panel
- `views/admin/dashboard.ejs` - Admin dashboard
- `views/admin/users.ejs` - User management
- `views/admin/products.ejs` - Product management
- `views/admin/orders.ejs` - Order management
- `views/admin/logs.ejs` - System logs
- `views/admin/config.ejs` - Configuration

#### Support
- `views/support/tickets.ejs` - Ticket list
- `views/support/ticket.ejs` - Ticket detail
- `views/support/create.ejs` - Create ticket

#### CTF
- `views/ctf/challenges.ejs` - Challenge list
- `views/ctf/leaderboard.ejs` - Leaderboard
- `views/ctf/progress.ejs` - User progress

### 3.2 Static Assets

**Priority:** MEDIUM

**Files to Create:**

#### CSS
- `public/css/main.css` - Main styles
- `public/css/shop.css` - E-commerce specific
- `public/css/admin.css` - Admin panel styles
- `public/css/ctf.css` - CTF interface

#### JavaScript
- `public/js/cart.js` - Cart functionality (vulnerabilities)
- `public/js/product.js` - Product interactions
- `public/js/checkout.js` - Checkout process
- `public/js/admin.js` - Admin panel
- `public/js/main.js` - Global functions

#### Images
- `public/img/products/` - Product images
- `public/img/categories/` - Category images
- `public/img/avatars/` - User avatars
- `public/img/logos/` - Brand logos

---

## 🔒 Phase 4: Vulnerability Implementation

### 4.1 Level 1: Basic Vulnerabilities (Beginner)

**Status:** Planned

**Vulnerabilities to Implement:**

1. ✅ **Information Disclosure**
   - Verbose error messages ✓
   - /serverinfo endpoint ✓
   - robots.txt disclosure ✓
   - Directory listing ✓
   - Commented credentials in HTML
   - Exposed backup files

2. **Basic Injection**
   - Reflected XSS in search
   - SQL injection in product search (Union-based)
   - SQL injection in login (auth bypass)
   - HTML injection in reviews

3. **Broken Access Control**
   - IDOR on user profiles
   - IDOR on orders
   - IDOR on tickets
   - Horizontal privilege escalation

4. **Security Misconfiguration**
   - ✅ Default credentials ✓
   - ✅ Weak session secret ✓
   - Missing security headers
   - Unnecessary HTTP methods

### 4.2 Level 2: Intermediate Vulnerabilities

**Status:** Planned

**Vulnerabilities to Implement:**

1. **Advanced Injection**
   - Blind SQL injection (boolean & time-based)
   - Second-order SQL injection
   - Template injection in emails
   - LDAP injection in user search

2. **Authentication Flaws**
   - ✅ Weak password hashing (MD5) ✓
   - JWT secret cracking
   - Session fixation
   - Password reset token prediction
   - 2FA bypass
   - Cookie injection

3. **Business Logic Flaws**
   - Price manipulation in cart
   - Negative quantity orders
   - Race condition in coupons
   - Integer overflow in payment
   - Loyalty points manipulation

4. **File Upload Vulnerabilities**
   - ✅ Unrestricted file upload ✓
   - Double extension bypass
   - MIME type bypass
   - Path traversal in upload

### 4.3 Level 3: Advanced Vulnerabilities

**Status:** Planned

**Vulnerabilities to Implement:**

1. **Server-Side Attacks**
   - SSRF via invoice generation
   - LFI in log viewer
   - RFI in template loading
   - SSTI in email templates

2. **Deserialization & RCE**
   - ✅ Node-serialize RCE ✓
   - Prototype pollution
   - eval() in discount calculator
   - Command injection in admin panel

3. **Advanced XSS & CSRF**
   - Stored XSS in reviews
   - DOM-based XSS
   - Mutation XSS (mXSS)
   - CSRF on critical actions
   - XSS to CSRF chaining

4. **API Security**
   - Mass assignment
   - JWT algorithm confusion
   - Rate limiting bypass
   - CORS misconfiguration

### 4.4 Level 4: Expert Vulnerabilities

**Status:** Planned

**Vulnerabilities to Implement:**

1. **Exploitation Chains**
   - XSS → Session theft → Admin → RCE
   - SQLi → File write → Webshell
   - SSRF → Internal services → AWS metadata
   - LFI → Log poisoning → RCE

2. **Cryptographic Weaknesses**
   - Weak JWT secret (brute-force)
   - ECB mode encryption oracle
   - Padding oracle attack
   - Hash length extension
   - Timing attacks

3. **Advanced Business Logic**
   - Payment bypass
   - Tax calculation manipulation
   - Currency conversion exploitation
   - Gift card algorithm weakness

---

## 🧪 Phase 5: Testing & Documentation

### 5.1 Vulnerability Testing

**Tasks:**
- [ ] Test each vulnerability individually
- [ ] Verify flags are accessible
- [ ] Test exploitation chains
- [ ] Difficulty calibration
- [ ] Write exploit scripts

### 5.2 Documentation

**Files to Create:**
- [ ] `README_v2.md` - Updated main README
- [ ] `VULNERABILITIES.md` - Complete vulnerability catalog
- [ ] `WALKTHROUGHS/` - Directory with solutions
  - [ ] `level1-beginner.md`
  - [ ] `level2-intermediate.md`
  - [ ] `level3-advanced.md`
  - [ ] `level4-expert.md`
- [ ] `HINTS.md` - Progressive hint system
- [ ] `API.md` - API documentation
- [ ] `DEPLOYMENT.md` - Deployment guide

### 5.3 Helper Tools

**Files to Create:**
- [ ] `tools/flag_checker.js` - Verify all flags
- [ ] `tools/reset_db.sh` - Quick database reset
- [ ] `tools/generate_payloads.js` - Generate exploit payloads
- [ ] `tools/health_check.js` - Verify all vulnerabilities

---

## 📦 Phase 6: Deployment & Packaging

### 6.1 Docker Enhancement

**Files to Update:**
- [ ] `Dockerfile` - Multi-stage build
- [ ] `docker-compose.yml` - Complete stack
- [ ] `.dockerignore` - Optimize build

### 6.2 Configuration

**Files to Create:**
- [ ] `config/database.js` - Database configuration
- [ ] `config/jwt.js` - JWT configuration (weak)
- [ ] `config/upload.js` - Upload configuration
- [ ] `config/email.js` - Email configuration
- [ ] `.env.example` - Environment variables template

### 6.3 CI/CD

**Files to Create:**
- [ ] `.github/workflows/test.yml` - Automated testing
- [ ] `.github/workflows/build.yml` - Docker build
- [ ] `.github/ISSUE_TEMPLATE/` - Issue templates

---

## 📊 Progress Tracking

### Overall Progress: ~15%

| Phase | Status | Progress |
|-------|--------|----------|
| Phase 1: Foundation | ✅ Complete | 100% |
| Phase 2: Routes | 🚧 In Progress | 10% |
| Phase 3: Frontend | ⏳ Planned | 0% |
| Phase 4: Vulnerabilities | ⏳ Planned | 20% |
| Phase 5: Testing | ⏳ Planned | 0% |
| Phase 6: Deployment | ⏳ Planned | 0% |

### Current Sprint: Phase 2 (Routes Implementation)

**Next Files to Create:**
1. `routes/cart.js` - Shopping cart with price manipulation
2. `routes/checkout.js` - Checkout process with SSRF
3. `middleware/auth.js` - Authentication middleware
4. `middleware/rbac.js` - Role-based access control (flawed)

---

## 🎯 Success Metrics

**When v2.0 is Complete:**

- [ ] 40+ unique CTF flags
- [ ] 50+ intentional vulnerabilities
- [ ] 4 difficulty levels (Basic → Expert)
- [ ] Complete e-commerce functionality
- [ ] Realistic user experience
- [ ] Comprehensive documentation
- [ ] Docker deployment ready
- [ ] Community feedback positive

---

## 🤝 Contributing

Contributions are welcome! Focus areas:
- New vulnerability ideas
- Frontend improvements
- Documentation
- Bug fixes (non-security)
- Test cases

---

## 📝 Notes

**Design Principles:**
1. Realism first - should feel like a real e-commerce site
2. Progressive difficulty - clear learning path
3. Educational value - each vuln teaches a concept
4. Safe to run - isolated environment
5. Well documented - solutions available

**Timeline:**
- Phase 2: 2-3 weeks
- Phase 3: 2 weeks
- Phase 4: 1 week
- Phase 5: 1 week
- Phase 6: 1 week

**Total Estimated Time:** 7-8 weeks for complete implementation

---

*Last Updated: December 27, 2025*
*Version: 2.0.0-alpha*