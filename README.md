VulnNode CTF - Intentionally Vulnerable Web Application

VulnNode CTF is a vulnerable e-commerce application built with Node.js, Express, and SQLite. It is designed for educational purposes to demonstrate common web vulnerabilities found in legacy or poorly configured applications.

⚠️ WARNING: DO NOT DEPLOY THIS APPLICATION IN A PRODUCTION ENVIRONMENT. It contains intentional Remote Code Execution (RCE), SQL Injection, and other critical flaws. Run this only in a secure, isolated sandbox or VM.

🚀 Quick Start (Local)

Prerequisites

Node.js (v14+)

npm

Installation

Install Dependencies:

npm install


Initialize Database:
Run the seeder script to create the SQLite database, users, and flags.

node database/init_db.js


Start the Server:

npm start


Access the Lab:
Open your browser and navigate to: http://localhost:3000

🐳 Docker Setup (Recommended)

If you prefer to keep your host machine clean, use Docker.

Build and Run:

docker-compose up --build


Access:
Navigate to http://localhost:3000

🚩 Challenge Map (Vulnerabilities)

The application is packed with vulnerabilities ranging from easy to hard.

🔴 1. Injection Attacks

SQL Injection (Search): The search bar in routes/index.js allows Union-Based injection.

Goal: Dump the secrets table.

SQL Injection (Login): The login form in routes/auth.js is vulnerable to auth bypass.

Goal: Login as Admin without a password.

Command Injection (RCE): The "System Health" check in the Admin Panel (routes/admin.js).

Goal: Read the config/secrets.js file or execute system commands.

🟡 2. Broken Authentication & Session Management

Weak Password Hashing: Passwords are stored using MD5.

JWT Misconfiguration: The JWT secret is weak and hardcoded.

Session Fixation: Session cookies are not HTTPOnly/Secure.

🔵 3. Cross-Site Scripting (XSS)

Reflected XSS: The search results page (views/index.ejs) reflects input raw.

Stored XSS: Product reviews (routes/product.js) save HTML/JS comments directly to the DB.

Goal: Steal the admin's session cookie (simulated).

🟢 4. Insecure Direct Object References (IDOR)

Profile Peeking: routes/user.js allows viewing other user profiles by changing the ID in the URL.

Goal: Find the hidden flag in a user's profile context.

🟣 5. Security Misconfiguration

Verbose Errors: The application leaks stack traces and SQL errors.

Directory Traversal / LFI: The Log Viewer in Admin (routes/admin.js) allows reading arbitrary files.

Goal: Read /etc/passwd or the application source code.

Mass Assignment: The API endpoint /api/users/:id allows updating sensitive fields like isAdmin.

⚫ 6. Component Vulnerabilities

Insecure Deserialization: node-serialize is used in utils/helper.js (Advanced exploitation).

🏆 Flags

The lab contains several hidden flags in the format FLAG{...}. Here are a few hints:

Database Secrets: FLAG{blind_sql_injection_master} (Found in secrets table)

Hidden Product: FLAG{idor_product_discovery_success} (Found via IDOR or SQLi on products)

Config File: FLAG{hardcoded_secrets_in_config_file} (Read config/secrets.js via LFI or RCE)

Error Logs: FLAG{verbose_error_handling_leaks_info} (Trigger a 500 error)

📝 Credentials

Role

Username

Password

Admin

admin

admin123

User

bob

user123

User

alice

user123

⚖️ Disclaimer

This project is for educational and ethical testing purposes only. Using these techniques on target systems without permission is illegal. The author is not responsible for any misuse of this code.# VulnNode-CTF
