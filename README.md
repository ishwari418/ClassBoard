
Readme · MD
# ClassBoard
 
A secure, role-based student dashboard platform built for colleges. Teachers can post notices that instantly reach students in their department and class. Students maintain a profile of their achievements — internships, certifications, hackathon wins — and get a fair, weighted ranking within their own class and department. An AI layer generates a short, plain-language summary of each student's profile.
 
Built during **BuildSprint 2026** using LatentCode.
 
---
 
## Features
 
- **Role-based authentication** — separate `teacher` and `student` roles, secured with JWT.
- **Notices** — teachers post notices scoped to a department and class; students see only what's relevant to them.
- **Achievement tracking** — students log internships, certifications, hackathon wins, and other accomplishments.
- **Weighted ranking system** — each achievement category carries a point weight; students are ranked fairly within their own department and class, not across unrelated fields.
- **AI profile summary** — a short, plain-language read on a student's strengths, generated from their achievement history.
---
 
## Tech Stack
 
| Layer | Technology |
|---|---|
| Backend | Node.js + Express |
| Database | PostgreSQL |
| Auth | JSON Web Tokens (JWT) + bcrypt |
| Frontend | React |
 
---
 
## Project Structure
 
```
classboard/
├── backend/
│   ├── middleware/
│   │   └── auth.js          # JWT verification middleware
│   ├── routes/               # API route handlers
│   ├── db.js                  # PostgreSQL connection setup
│   ├── schema.sql            # Database schema (users, notices, achievements)
│   ├── server.js             # Express app entry point
│   ├── test_auth.js          # Auth flow tests
│   └── package.json
└── frontend/
    ├── src/                   # React components and pages
    ├── public/
    ├── dist/                  # Production build output
    └── package.json
```
 
---
 
## Getting Started
 
### Prerequisites
 
- Node.js (v18+)
- PostgreSQL (v14+)
- npm
### 1. Clone the repository
 
```bash
git clone https://github.com/<your-username>/classboard.git
cd classboard
```
 
### 2. Set up the database
 
Create a PostgreSQL database and run the schema:
 
```bash
createdb classboard
psql -d classboard -f backend/schema.sql
```
 
### 3. Configure environment variables
 
Create a `.env` file inside `backend/` with:
 
```
DATABASE_URL=postgresql://<user>:<password>@localhost:5432/classboard
JWT_SECRET=<your-secret-key>
PORT=5000
```
 
### 4. Install dependencies
 
```bash
# Backend
cd backend
npm install
 
# Frontend
cd ../frontend
npm install
```
 
### 5. Run the app
 
```bash
# Terminal 1 — backend
cd backend
node server.js
 
# Terminal 2 — frontend
cd frontend
npm run dev
```
 
The backend runs on `http://localhost:5000` and the frontend on `http://localhost:5173` .
 
---
 
## API Overview
 
| Method | Endpoint | Description | Auth required |
|---|---|---|---|
| POST | `/signup` | Register a new user (teacher or student) | No |
| POST | `/login` | Log in and receive a JWT | No |
| GET | `/me` | Get the logged-in user's own data | Yes |
| POST | `/notices` | Post a new notice | Yes (teacher) |
| GET | `/notices` | View notices for your department/class | Yes |
| POST | `/achievements` | Add an achievement to your profile | Yes (student) |
| GET | `/rankings` | View ranked students within department/class | Yes |
 
 
---
 
 
## Security
 
- Passwords are hashed with **bcrypt** before storage — plaintext passwords are never saved.
- Routes that touch sensitive data (notices, rankings, achievements) are protected by **JWT middleware**, which verifies the token and attaches the authenticated user's identity and role to the request.
- Role checks ensure only teachers can post notices, and only the owning student can edit their own achievements.
---
 
## Built With LatentCode
 
This project was built end-to-end during the BuildSprint 2026 hackathon window using [LatentCode](https://latentstack.dev) as the AI coding harness, per the hackathon's rules.
