# VulnNode-CTF Professional Upgrade Plan

**Goal:** Transform VulnNode-CTF into a professional-grade vulnerable web application comparable to:
- 🧃 **OWASP Juice Shop**
- 🎯 **DVWA (Damn Vulnerable Web App)**
- 🚩 **PicoGym / PicoCTF**
- 🔬 **PortSwigger Web Security Academy**

---

## ✅ Phase 1: Critical Fixes (COMPLETED)

### Fixed Issues
- ✅ Created `routes/frontend.js` - UI routes for cart, checkout, support, profile, scoreboard
- ✅ Created `routes/support.js` - Support ticket API with XSS and IDOR vulnerabilities
- ✅ Created `routes/upload.js` - File upload with shell upload and LFI vulnerabilities
- ✅ All missing route files now exist
- ✅ Server should start without crashes

### Intentional Vulnerabilities Added

#### Frontend Routes (frontend.js)
1. SQL Injection in cart queries
2. IDOR on profile viewing (/profile/:id)
3. IDOR on order confirmation
4. Verbose error messages with SQL query disclosure
5. Weak admin authentication (username check only)
6. Session manipulation vulnerabilities

#### Support System (support.js)
1. Stored XSS in ticket messages
2. IDOR - view/update/delete any ticket
3. SQL Injection in ticket search
4. Missing authentication on critical operations
5. Weak admin authorization
6. Information disclosure in error messages

#### File Upload (upload.js)
1. Unrestricted file upload (shell upload)
2. Path traversal in file operations
3. LFI (Local File Inclusion)
4. Directory listing vulnerability
5. No file type validation
6. Missing authentication on sensitive operations
7. IDOR on file deletion

---

## 🚀 Phase 2: Professional Features (IN PROGRESS)

### Priority 1: CTF Score Board System

#### Features to Implement
```javascript
// Database schema for challenges
CREATE TABLE challenges (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,              -- OWASP Top 10 category
  difficulty INTEGER,          -- 1-5 stars
  flag TEXT UNIQUE,
  points INTEGER,
  hints TEXT,                  -- JSON array of hints
  solution_url TEXT,           -- Link to walkthrough
  tags TEXT                    -- JSON array of tags
);
```

#### UI Components Needed
- **Scoreboard Page** (`views/scoreboard.ejs`)
  - Challenge grid with cards
  - Filter by difficulty/category/status
  - Search functionality
  - Progress bar showing completion %
  - Statistics dashboard

- **Challenge Modal**
  - Challenge description
  - Difficulty rating (stars)
  - Hint system (costs points)
  - Flag submission form
  - Success animation

- **API Endpoints**
  ```
  GET  /api/scoreboard/challenges      - List all challenges
  POST /api/scoreboard/submit-flag     - Validate flag
  GET  /api/scoreboard/hint/:id        - Get progressive hint
  GET  /api/scoreboard/stats           - User statistics
  GET  /api/scoreboard/leaderboard     - Top users (optional)
  ```

### Priority 2: Hint System (Like PortSwigger Academy)

```javascript
// Progressive hints structure
{
  challenge_id: 1,
  hints: [
    {
      level: 1,
      cost: 0,
      text: "Look at the login form. What happens when you enter special characters?"
    },
    {
      level: 2,
      cost: 10,
      text: "Try using SQL comment syntax to bypass authentication."
    },
    {
      level: 3,
      cost: 25,
      text: "The payload is: admin' -- "
    },
    {
      level: 4,
      cost: 50,
      text: "Full solution video: https://youtu.be/..."
    }
  ]
}
```

### Priority 3: Complete EJS View Templates

#### Templates to Create
1. **`views/404.ejs`** - Not found page with hint
2. **`views/500.ejs`** - Error page with info disclosure
3. **`views/403.ejs`** - Access denied page
4. **`views/cart.ejs`** - Shopping cart UI
5. **`views/checkout.ejs`** - Checkout page
6. **`views/support.ejs`** - Support ticket interface
7. **`views/scoreboard.ejs`** - CTF dashboard
8. **`views/profile.ejs`** - User profile page
9. **`views/admin.ejs`** - Admin panel
10. **`views/challenge-details.ejs`** - Individual challenge page

#### Template Structure
```html
<%- include('partials/header', { title: 'Page Title' }) %>

<!-- Main Content -->
<div class="container mt-4">
  <!-- Your content here -->
  <!-- Hidden flags in HTML comments -->
  <!-- FLAG{view_source_master} -->
</div>

<%- include('partials/footer') %>
```

---

## 🎨 Phase 3: Modern UI Design

### Design System
- **Framework:** Bootstrap 5.3+
- **Theme:** Dark mode with hacker aesthetic
- **Colors:**
  - Primary: #00ff41 (Matrix green)
  - Secondary: #ff0062 (Neon pink)
  - Dark: #0a0e27 (Deep blue-black)
  - Success: #00ff88
  - Danger: #ff3860
  - Warning: #ffaa00

### Components to Build

#### 1. Challenge Card Component
```html
<div class="challenge-card" data-difficulty="3">
  <div class="challenge-header">
    <span class="category-badge">SQL Injection</span>
    <span class="difficulty-stars">⭐⭐⭐</span>
  </div>
  <h3>Login Bypass</h3>
  <p>Can you bypass the authentication?</p>
  <div class="challenge-footer">
    <span class="points">50 points</span>
    <button class="btn-solve">Solve</button>
  </div>
  <div class="solved-overlay" style="display:none">
    <i class="fas fa-check-circle"></i> SOLVED
  </div>
</div>
```

#### 2. Progress Dashboard
```html
<div class="progress-dashboard">
  <div class="stat-card">
    <h4>25/50</h4>
    <p>Challenges Solved</p>
  </div>
  <div class="stat-card">
    <h4>1,250</h4>
    <p>Points Earned</p>
  </div>
  <div class="stat-card">
    <h4>12h 34m</h4>
    <p>Total Time</p>
  </div>
</div>
```

#### 3. Flag Submission Modal
```html
<div class="modal" id="flagModal">
  <div class="modal-content">
    <h3>Submit Flag</h3>
    <input type="text" placeholder="FLAG{...}" id="flagInput">
    <button onclick="submitFlag()">Submit</button>
    <div id="result"></div>
  </div>
</div>
```

---

## 📚 Phase 4: Documentation & Tutorials

### Documentation to Create

#### 1. Challenge Walkthroughs
```markdown
# Challenge: SQL Injection - Login Bypass

## Difficulty: ⭐⭐ (Medium)
## Category: Injection
## Points: 50

### Description
The login form is vulnerable to SQL injection...

### Learning Objectives
- Understand SQL injection
- Learn authentication bypass techniques
- Practice manual exploitation

### Solution Steps
1. Analyze the login form
2. Test for SQL injection
3. Craft the payload
4. Bypass authentication
5. Find the flag

### Detailed Walkthrough
...

### Prevention
- Use parameterized queries
- Implement input validation
- Apply principle of least privilege
```

#### 2. Setup Guide
```markdown
# VulnNode-CTF Setup Guide

## Docker Setup (Recommended)
\`\`\`bash
git clone https://github.com/cybok10/VulnNode-CTF.git
cd VulnNode-CTF
docker-compose up -d
\`\`\`

Access: http://localhost:3000

## Manual Setup
...
```

#### 3. Vulnerability Index
Create `VULNERABILITY_INDEX.md` with:
- All vulnerabilities listed
- OWASP Top 10 mapping
- CVE references where applicable
- Exploitation difficulty
- Remediation guidance

---

## 🧪 Phase 5: Testing & Quality Assurance

### Automated Testing

#### 1. Vulnerability Verification Tests
```javascript
// tests/vulnerabilities.test.js
const request = require('supertest');
const app = require('../server');

describe('SQL Injection Vulnerabilities', () => {
  test('Login SQL injection should work', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({
        username: "admin' -- ",
        password: "anything"
      });
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
```

#### 2. Flag Validation Tests
```javascript
describe('Flag Submission', () => {
  test('Valid flag should be accepted', async () => {
    const res = await request(app)
      .post('/api/scoreboard/submit-flag')
      .send({ flag: 'FLAG{sql_injection_master}' });
    expect(res.body.correct).toBe(true);
  });
});
```

### Manual Testing Checklist
- [ ] All routes load without errors
- [ ] All vulnerabilities are exploitable
- [ ] All flags are accessible
- [ ] UI is responsive on mobile
- [ ] Dark mode works properly
- [ ] No unintentional bugs
- [ ] Docker container builds successfully

---

## 🔒 Phase 6: Security (Intentional vs Unintentional)

### What Should Be Vulnerable (Intentional)
1. ✅ SQL Injection in specific routes
2. ✅ XSS in reviews and support tickets
3. ✅ IDOR on user resources
4. ✅ File upload vulnerabilities
5. ✅ LFI/RFI in file operations
6. ✅ SSRF in invoice generation
7. ✅ Command injection in admin panel
8. ✅ Weak authentication
9. ✅ Session fixation
10. ✅ Business logic flaws

### What Should Be Secure (Unintentional bugs to fix)
1. ❌ No actual data leakage to external systems
2. ❌ No real RCE that breaks the container
3. ❌ No network attacks on host system
4. ❌ Proper Docker isolation
5. ❌ No actual malware distribution

---

## 🎯 Phase 7: Competition Features (Optional)

### Leaderboard System
```sql
CREATE TABLE leaderboard (
  rank INTEGER,
  user_id INTEGER,
  username TEXT,
  score INTEGER,
  challenges_solved INTEGER,
  total_time INTEGER,
  last_solve_at TIMESTAMP
);
```

### Team Mode
- Allow users to form teams
- Shared progress tracking
- Team leaderboard

### Time Attack Mode
- Timed challenges
- Speed bonuses
- Time penalties for hints

---

## 📊 Success Metrics

### Project is "Professional Grade" when:
- ✅ 50+ documented vulnerabilities
- ✅ Complete UI with no broken pages
- ✅ Score board with flag validation
- ✅ Hint system with progressive disclosure
- ✅ Comprehensive documentation
- ✅ Docker deployment in < 2 minutes
- ✅ Mobile responsive design
- ✅ Video walkthroughs for top challenges
- ✅ Active testing by community
- ✅ GitHub stars > 100

---

## 🗓️ Development Timeline

### Week 1: Foundation (Current)
- [x] Fix critical route errors
- [x] Create missing files
- [ ] Test server startup
- [ ] Fix any runtime errors

### Week 2: Core Features
- [ ] Implement score board backend
- [ ] Create all EJS templates
- [ ] Build hint system
- [ ] Add flag validation API

### Week 3: UI Polish
- [ ] Design modern UI with Bootstrap 5
- [ ] Add dark mode
- [ ] Create challenge cards
- [ ] Implement animations

### Week 4: Documentation
- [ ] Write challenge walkthroughs
- [ ] Create video tutorials
- [ ] Document all vulnerabilities
- [ ] Write setup guides

### Week 5: Testing
- [ ] Automated test suite
- [ ] Manual testing
- [ ] Bug fixes
- [ ] Performance optimization

### Week 6: Launch
- [ ] Final polish
- [ ] Community testing
- [ ] Social media announcement
- [ ] Submit to Awesome CTF lists

---

## 🤝 Contributing

This is an open-source educational project. Contributions welcome!

### How to Contribute
1. Fork the repository
2. Create a feature branch
3. Add vulnerabilities or features
4. Test thoroughly
5. Submit pull request

### Contribution Ideas
- Add new vulnerability challenges
- Create walkthrough videos
- Improve UI/UX design
- Write documentation
- Translate to other languages
- Report bugs (unintentional ones!)

---

## 📞 Support & Community

- **GitHub Issues:** Bug reports and features
- **Discussions:** Q&A and community chat
- **Discord:** Real-time help (coming soon)
- **YouTube:** Video walkthroughs (coming soon)

---

## 🏆 Inspiration Credits

- **OWASP Juice Shop** - Score board design and challenge system
- **DVWA** - Difficulty levels and educational approach
- **PortSwigger Academy** - Hint system and learning paths
- **PicoCTF** - CTF format and flag validation
- **HackTheBox** - UI design and user experience
- **TryHackMe** - Progressive learning approach

---

## 📄 License

MIT License - Free for educational use

⚠️ **WARNING:** This application contains intentional vulnerabilities.
Never deploy in production environments!

---

**Last Updated:** December 28, 2025
**Status:** Phase 1 Complete, Phase 2 In Progress
**Next Milestone:** CTF Score Board Implementation
