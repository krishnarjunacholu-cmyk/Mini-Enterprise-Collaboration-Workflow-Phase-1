# Step-by-Step Setup Guide

Follow these steps in order to get the backend running.

## Step 1: Prerequisites

Ensure you have:
- Python 3.9+ installed
- MySQL Server installed and running
- Git (optional, for version control)

**Check Python version:**
```bash
python --version
```

**Check MySQL is running:**
```bash
mysql -u root -p
# Type your MySQL password, then exit with: exit
```

---

## Step 2: Create Virtual Environment

Navigate to the backend folder and create a virtual environment:

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv

# Activate it
# On Windows:
venv\Scripts\activate

# On macOS/Linux:
source venv/bin/activate
```

You should see `(venv)` at the beginning of your terminal line.

---

## Step 3: Install Dependencies

With virtual environment activated:

```bash
pip install -r requirements.txt
```

This installs all required packages:
- FastAPI
- SQLAlchemy
- PyMySQL
- Python-Jose (JWT)
- Passlib (bcrypt)
- And others...

Installation takes 2-5 minutes.

---

## Step 4: Create MySQL Database

Open MySQL and create the database:

```bash
mysql -u root -p
```

Then run:

```sql
CREATE DATABASE mini_enterprise_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
SHOW DATABASES;
```

You should see `mini_enterprise_db` in the list.

Exit with: `exit`

---

## Step 5: Configure Environment Variables

Edit the `.env` file in the `backend` folder:

```env
DATABASE_URL=mysql+pymysql://root:yourpassword@localhost:3306/mini_enterprise_db
SECRET_KEY=your-secret-key-change-this-in-production-keep-it-long-and-random
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
DEBUG=True
```

⚠️ Replace `yourpassword` with your actual MySQL password.

---

## Step 6: Initialize Database Tables

The tables are created automatically when you start the server. No additional step needed!

(If you want to use Alembic migrations later, run: `alembic upgrade head`)

---

## Step 7: Start the Server

With virtual environment activated:

```bash
uvicorn app.main:app --reload
```

You should see:
```
INFO:     Uvicorn running on http://127.0.0.1:8000
INFO:     Application startup complete
```

The server is now running at: **http://localhost:8000**

---

## Step 8: Test the API

### Option A: Swagger UI (Easiest)

Go to: http://localhost:8000/docs

You'll see all API endpoints with a test interface!

### Option B: Using Curl

Register a user:
```bash
curl -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"name\": \"John Doe\", \"email\": \"john@example.com\", \"password\": \"TestPass123\", \"role\": \"employee\"}"
```

Login:
```bash
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"john@example.com\", \"password\": \"TestPass123\"}"
```

Get current user (replace TOKEN with the access_token from login response):
```bash
curl -X GET http://localhost:8000/auth/me \
  -H "Authorization: Bearer TOKEN"
```

---

## Testing Checklist

- ✅ Server runs without errors
- ✅ Swagger UI loads at http://localhost:8000/docs
- ✅ Register endpoint works (creates new user)
- ✅ Duplicate emails are rejected
- ✅ Invalid role is rejected
- ✅ Login endpoint works (returns JWT token)
- ✅ /auth/me works with valid token
- ✅ Invalid token is rejected (401 error)

---

## Troubleshooting

### "Can't connect to MySQL server"

**Problem:** Database connection fails

**Solution:**
1. Verify MySQL is running
2. Check your password in `.env` is correct
3. Verify database exists: `mysql -u root -p` then `SHOW DATABASES;`
4. Check PORT (default 3306)

### "No module named 'app'"

**Problem:** Import error when starting server

**Solution:**
- Make sure you're in the `backend` directory
- Make sure venv is activated (you see `(venv)` in terminal)
- Try: `python -m uvicorn app.main:app --reload`

### "Port 8000 already in use"

**Problem:** Another server is running on port 8000

**Solution:**
```bash
# Use a different port
uvicorn app.main:app --port 8001 --reload
```

### "Token expired" error

**Problem:** JWT token expired after 30 minutes

**Solution:**
- Get a new token by logging in again
- Or change `ACCESS_TOKEN_EXPIRE_MINUTES` in `.env`

---

## Project Structure

```
backend/
├── app/
│   ├── main.py              <- Start here to understand the app
│   ├── database.py          <- Database setup
│   ├── config.py            <- Environment configuration
│   ├── models.py            <- User model
│   ├── schemas.py           <- Request/Response schemas
│   ├── auth_utils.py        <- Password & JWT functions
│   ├── dependencies.py      <- FastAPI dependencies
│   └── routers/
│       ├── auth.py          <- /auth endpoints
│       └── users.py         <- /users endpoints
├── alembic/                 <- Database migrations
├── .env                     <- Your secrets (don't commit!)
├── requirements.txt         <- Dependencies
└── README.md                <- Full documentation
```

---

## Next Steps

1. Read through the inline comments in each file to understand the code
2. Try all endpoints in Swagger UI
3. Understand the authentication flow (register -> login -> use token)
4. Review error handling (what errors do different situations produce?)
5. When ready, move on to Day 2: Task CRUD operations

---

## Useful Commands

```bash
# Activate virtual environment
venv\Scripts\activate  # Windows
source venv/bin/activate  # Mac/Linux

# Run server with auto-reload on file changes
uvicorn app.main:app --reload

# Run server on specific port
uvicorn app.main:app --port 8001

# Run tests (when available)
pytest

# View Swagger docs
http://localhost:8000/docs

# View ReDoc docs
http://localhost:8000/redoc

# Health check
curl http://localhost:8000/health
```

---

## Questions?

- Check the inline comments in Python files
- Read the README.md for detailed API documentation
- Look at the Swagger UI at http://localhost:8000/docs for live examples

Happy coding! 🚀
