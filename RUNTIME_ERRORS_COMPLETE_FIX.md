# Complete Runtime Errors Fix - Phase 4

**Date:** December 28, 2025, 9:12 PM IST  
**Status:** 🔧 IN PROGRESS

---

## 🐛 Issues Identified

### 1. Database Connection Issues
**Problem:** Multiple route files may have inconsistent database connections

**Files to Check:**
- ✅ `routes/order.js` - FIXED (removed secrets config)
- ✅ `routes/gamification.js` - FIXED (removed secrets config)
- ⚠️ Other route files - NEED TO CHECK

### 2. Database Schema Mismatches
**Problem:** Queries using wrong column names

**Confirmed Mismatches:**
- ✅ `orders.total` → `orders.total_amount` - FIXED
- ⚠️ `products.image` → `products.image_url` - NEED TO CHECK ALL FILES
- ⚠️ Other potential mismatches - NEED SYSTEMATIC CHECK

### 3. Middleware Issues
**Problem:** req.user might not be set correctly in all routes

**Status:**
- ✅ `middleware/auth.js` - FIXED (added req.user mapping)
- ⚠️ Some routes might still use req.session.user - NEED TO CHECK

---

## 📋 Complete Database Schema Reference

### Users Table
```sql
id, username, password, email, isAdmin, avatar, 
balance, loyalty_points, created_at, last_login, 
is_active, phone, bio
```

### Products Table
```sql
id, name, description, price, image_url, category, 
stock, is_featured, is_hidden, discount_percent, 
rating, total_reviews, sku, tags, created_at, updated_at
```
**⚠️ NOTE:** Column is `image_url` NOT `image`

### Orders Table
```sql
id, user_id, order_number, total_amount, shipping_amount, 
tax_amount, status, payment_method, shipping_address, 
tracking_number, notes, created_at, updated_at
```
**⚠️ NOTE:** Column is `total_amount` NOT `total`

### Order Items Table
```sql
id, order_id, product_id, quantity, price, subtotal
```

### Reviews Table
```sql
id, product_id, user_id, rating, title, comment, 
is_verified, helpful_count, created_at
```

### Cart Table
```sql
id, user_id, product_id, quantity, added_at
```

### Support Tickets Table
```sql
id, user_id, subject, description, category, 
priority, status, created_at, updated_at
```

### Ticket Messages Table
```sql
id, ticket_id, sender_id, message, is_admin, 
attachment, created_at
```

### Secrets Table (CTF Challenges)
```sql
id, name, category, difficulty, description, 
flag, points, hint, created_at
```

### User Progress Table
```sql
id, user_id, challenge_id, solved_at
```

### Admin Logs Table
```sql
id, admin_id, action, target, ip_address, 
user_agent, details, created_at
```

### Sessions Table
```sql
id, session_id, user_id, data, expires_at, created_at
```

### Addresses Table
```sql
id, user_id, label, street, city, state, zip, 
country, is_default, created_at
```

### Payment Methods Table
```sql
id, user_id, card_type, last_four, expiry_month, 
expiry_year, cardholder_name, is_default, created_at
```

### Wishlist Table
```sql
id, user_id, product_id, added_at
```

---

## 🔧 Systematic Fix Plan

### Phase 4A: Route File Audit ⏳

#### Check Each Route File For:
1. Database connection method
2. Column name usage
3. req.user vs req.session.user
4. Error handling

#### Files to Audit:
- [ ] `routes/admin.js`
- [ ] `routes/api.js`
- [ ] `routes/auth.js`
- [ ] `routes/cart.js`
- [ ] `routes/checkout.js`
- [ ] `routes/frontend.js`
- [x] `routes/gamification.js` - FIXED
- [ ] `routes/index.js`
- [x] `routes/order.js` - FIXED
- [ ] `routes/product.js`
- [ ] `routes/products.js`
- [ ] `routes/scoreboard.js`
- [ ] `routes/support.js`
- [ ] `routes/upload.js`
- [ ] `routes/user.js`

### Phase 4B: Create Unified Database Module ✅

**Goal:** Single source of truth for database connection

**File to Create:** `database/db.js`
```javascript
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'vuln_app.db');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

console.log('[DB] Database connected:', dbPath);
console.log('[DB] Foreign keys enabled');

module.exports = db;
```

**Benefits:**
- All routes use same database instance
- Consistent configuration
- Easier to debug
- Better performance

### Phase 4C: Update All Routes to Use Unified DB ⏳

**Pattern to Replace:**
```javascript
// OLD (WRONG)
const sqlite3 = require('sqlite3').verbose();
const secrets = require('../config/secrets');
const db = new sqlite3.Database(secrets.DB_PATH);

// NEW (CORRECT)
const db = require('../database/db');
```

### Phase 4D: Fix Column Name Mismatches ⏳

**Search and Replace in ALL files:**
1. `o.total` → `o.total_amount`
2. `p.image` → `p.image_url`
3. `c.solved` → Check if column exists in challenges table
4. Verify all JOIN conditions

### Phase 4E: Standardize Authentication ⏳

**Ensure all routes use:**
```javascript
const { isAuthenticated, optionalAuth, isAdmin } = require('../middleware/auth');

// For protected routes
router.use(isAuthenticated);

// For optional auth (public + user)
router.use(optionalAuth);

// For admin only
router.use(isAdmin);
```

**Access user data:**
```javascript
const userId = req.user.id;  // ✅ CORRECT
const userId = req.session.user.id;  // ❌ AVOID
```

---

## 🎯 Immediate Action Items

### Priority 1: Critical Files (Likely Have Errors)
1. **Check `routes/index.js`** - Main landing page
2. **Check `routes/products.js`** - Product listing
3. **Check `routes/cart.js`** - Shopping cart
4. **Check `routes/checkout.js`** - Order placement
5. **Check `routes/support.js`** - Support tickets

### Priority 2: Admin & Special Features
6. **Check `routes/admin.js`** - Admin panel
7. **Check `routes/scoreboard.js`** - CTF scoreboard
8. **Check `routes/upload.js`** - File uploads

### Priority 3: Supporting Routes
9. **Check `routes/auth.js`** - Authentication
10. **Check `routes/user.js`** - User profile
11. **Check `routes/api.js`** - API endpoints

---

## ✅ Fixes Applied So Far

### Completed in Previous Phases:
1. ✅ Fixed `middleware/auth.js` - Added req.user mapping
2. ✅ Created `routes/scoreboard.js` - CTF scoreboard route
3. ✅ Fixed `routes/order.js` - Removed secrets config, fixed column names
4. ✅ Fixed `routes/gamification.js` - Removed secrets config
5. ✅ Updated `server.js` - Route registration
6. ✅ Created comprehensive documentation
7. ✅ Added Docker support

---

## 🚀 Next Steps

### Step 1: Create Unified Database Module
Create `database/db.js` with better-sqlite3 connection

### Step 2: Audit All Route Files
Check each file for:
- Database connection issues
- Column name mismatches  
- Authentication patterns
- Error handling

### Step 3: Batch Fix All Issues
Create PRs for:
- Database connection standardization
- Column name corrections
- Authentication improvements
- Error handling enhancements

### Step 4: Test Everything
- [ ] Test all routes manually
- [ ] Verify database queries
- [ ] Check authentication flows
- [ ] Test CTF challenges
- [ ] Verify admin panel

### Step 5: Create Test Suite
- [ ] Unit tests for routes
- [ ] Integration tests
- [ ] E2E tests for CTF
- [ ] Security regression tests

---

## 📊 Progress Tracker

| Phase | Status | Progress | ETA |
|-------|--------|----------|-----|
| Phase 1: Database & Core | ✅ Complete | 100% | Done |
| Phase 2: Bug Fixes & Routes | ✅ Complete | 100% | Done |
| Phase 3: Documentation | ✅ Complete | 100% | Done |
| **Phase 4: Runtime Errors** | 🔧 In Progress | 30% | Now |
| Phase 5: Testing | ⏳ Pending | 0% | TBD |

---

## 🔍 Common Error Patterns

### Pattern 1: Config Not Found
```javascript
// ❌ WRONG
const secrets = require('../config/secrets');
const db = new sqlite3.Database(secrets.DB_PATH);

// ✅ CORRECT
const db = require('../database/db');
```

### Pattern 2: Wrong Column Names
```javascript
// ❌ WRONG
SELECT o.total FROM orders o

// ✅ CORRECT  
SELECT o.total_amount FROM orders o
```

### Pattern 3: Inconsistent Auth
```javascript
// ❌ WRONG
if (req.session.user) {
    const userId = req.session.user.id;
}

// ✅ CORRECT
if (req.user) {
    const userId = req.user.id;
}
```

### Pattern 4: Missing Error Handling
```javascript
// ❌ WRONG
db.get(query, [id], (err, row) => {
    res.json(row);
});

// ✅ CORRECT
db.get(query, [id], (err, row) => {
    if (err) {
        console.error('Query error:', err);
        return res.status(500).json({ error: 'Database error' });
    }
    res.json(row);
});
```

---

## 📞 Support

If you encounter errors:
1. Check this document first
2. Verify database schema
3. Check route file for patterns above
4. Test with `curl` or Postman
5. Report issues with full error logs

---

**Last Updated:** December 28, 2025, 9:12 PM IST  
**Status:** Phase 4 In Progress  
**Next Update:** After route audit complete
