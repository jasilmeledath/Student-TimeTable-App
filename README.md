# Student Timetable Manager

A Node.js + Express + EJS web application for managing student timetables with an Apple Calendar-style interface.

## 📖 Backstory

As a student, I found it frustrating to navigate through a large, combined PDF timetable shared by my university. It made it hard to find my daily schedule quickly. So I built this app to simplify the process — allowing students to log in and view just their personalized timetable in an interactive, organized format.


## 🚀 Features

- **Authentication System**
  - Login via roll number + password
  - Default password: `passme@123` (forced change on first login)
  - Password reset via email (OTP/reset link)
  - Login activity tracking with geolocation
  - Session management with secure cookies

- **Student Features**
  - Add/edit/delete timetable periods
  - Manage subjects, faculty, and venues
  - Apple Calendar-style weekly/daily view
  - Color-coded periods by subject

- **Admin Dashboard**
  - User activity monitoring
  - Detailed activity logs with filters
  - Student location tracking
  - Timeline view of student actions

## 🛠️ Tech Stack

- **Backend**: Node.js + Express
- **Database**: MongoDB + Mongoose
- **View Engine**: EJS
- **Styling**: Tailwind CSS
- **Authentication**: Session-based with bcrypt
- **Email**: Nodemailer
- **Geolocation**: geoip-lite
- **Date/Time**: Moment.js

## 📋 Prerequisites

- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn
- SMTP server access for emails

## 🔧 Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd student-timetable-manager
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file based on `.env.example`:
   ```bash
   cp .env.example .env
   ```

4. Configure environment variables in `.env`:
   ```env
   # Server Configuration
   PORT=3000
   NODE_ENV=development

   # MongoDB Configuration
   MONGODB_URI=mongodb://localhost:27017/student-timetable

   # Session Configuration
   SESSION_SECRET=your-super-secret-session-key

   # Email Configuration
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-app-specific-password

   # Admin Account
   ADMIN_EMAIL=admin@institute.edu
   ADMIN_PASSWORD=change-this-secure-password

   # Default Student Password
   DEFAULT_STUDENT_PASSWORD=passme@123

   # Cookie Settings
   COOKIE_SECRET=your-cookie-secret-key
   ```

5. Seed the database:
   ```bash
   npm run seed
   ```

6. Start the server:
   ```bash
   # Development mode
   npm run dev

   # Production mode
   npm start
   ```

## 🌐 Usage

### Student Access

1. Login with your roll number and default password (`passme@123`)
2. Change your password when prompted
3. Access your timetable at `/student/timetable`
4. Add/edit/delete periods as needed

### Admin Access

1. Login with admin credentials (set in `.env`)
2. Access dashboard at `/admin/dashboard`
3. View student activity and logs
4. Monitor login locations and timestamps

## 🔒 Password Reset Flow

### Option A: OTP Verification
1. Click "Forgot Password" on login page
2. Enter roll number and registered email
3. Receive OTP via email
4. Enter OTP and new password
5. Password is reset upon verification

### Option B: Reset Link
1. Click "Forgot Password" on login page
2. Enter roll number and registered email
3. Receive reset link via email
4. Click link and set new password
5. Link expires after 1 hour

## 📝 API Endpoints

### Authentication
- `POST /auth/login` - Student login
- `POST /auth/change-password` - Change password
- `POST /auth/forgot-password` - Request password reset
- `POST /auth/reset-password` - Reset password with OTP
- `GET /auth/logout` - Logout

### Student Routes
- `GET /student/timetable` - View timetable
- `GET /student/courses` - View course list

### Admin Routes
- `GET /admin/dashboard` - Admin dashboard
- `GET /admin/activity-logs` - View activity logs
- `GET /admin/students/:rollNo` - View student details

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Express.js](https://expressjs.com/)
- [Mongoose](https://mongoosejs.com/)
- [EJS](https://ejs.co/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Moment.js](https://momentjs.com/) 