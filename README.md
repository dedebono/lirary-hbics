# Library Management System

A comprehensive full-stack library management system built with Node.js (Express), React (Vite), Tailwind CSS, and SQLite3.

## 🚀 Features

### Role-Based Access Control
- **Admin/Librarian**: Complete control over books, users, and system management
- **Teacher**: Browse and borrow books, view personal loan history
- **Student**: Check-in/out of library, browse books, read e-books, track borrowed books

### Core Functionality
- ✅ JWT-based authentication
- ✅ Book inventory management (CRUD)
- ✅ User management (Students, Teachers, Admins)
- ✅ Book borrowing and return system
- ✅ Attendance tracking (check-in/out)
- ✅ E-book management with file upload
- ✅ Overdue book tracking
- ✅ Comprehensive logging system

## 📋 Tech Stack

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: SQLite3
- **Authentication**: JWT (jsonwebtoken)
- **Password Hashing**: bcryptjs
- **File Upload**: Multer
- **Validation**: express-validator

### Frontend
- **Framework**: React 18
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Routing**: React Router v6
- **HTTP Client**: Axios
- **Icons**: Lucide React
- **Barcode Scanning**: html5-qrcode (ready for integration)
- **PDF Viewing**: react-pdf (ready for integration)

## 🛠️ Installation & Setup

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Initialize the database:
```bash
npm run init-db
```

4. Start the backend server:
```bash
npm run dev
```

The backend will run on `http://localhost:5000`

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The frontend will run on `http://localhost:3000`

## 🔑 Default Credentials

### Admin
- **Username**: `admin`
- **Password**: `admin123`

### Students
- **Barcode**: `STU001`, `STU002`, `STU003`
- **Password**: `student123`

### Teachers
- **Barcode**: `TCH001`, `TCH002`
- **Password**: `teacher123`

## 📁 Project Structure

```
library-nodejs/
├── backend/
│   ├── src/
│   │   ├── database/
│   │   │   ├── db.js              # Database connection
│   │   │   └── init-db.js         # Database initialization
│   │   ├── middleware/
│   │   │   ├── auth.middleware.js # JWT authentication
│   │   │   └── role.middleware.js # Role-based access control
│   │   ├── routes/
│   │   │   ├── auth.routes.js     # Authentication endpoints
│   │   │   ├── books.routes.js    # Book management
│   │   │   ├── users.routes.js    # User management
│   │   │   ├── attendance.routes.js # Attendance tracking
│   │   │   ├── borrow.routes.js   # Borrowing system
│   │   │   └── ebooks.routes.js   # E-book management
│   │   └── server.js              # Express server
│   ├── uploads/                   # File uploads directory
│   ├── .env                       # Environment variables
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── components/
    │   │   └── PrivateRoute.jsx   # Protected route component
    │   ├── context/
    │   │   └── AuthContext.jsx    # Authentication context
    │   ├── pages/
    │   │   ├── Login.jsx          # Login page
    │   │   ├── AdminDashboard.jsx # Admin dashboard
    │   │   ├── TeacherDashboard.jsx # Teacher dashboard
    │   │   └── StudentDashboard.jsx # Student dashboard
    │   ├── utils/
    │   │   └── api.js             # Axios API configuration
    │   ├── App.jsx                # Main app component
    │   ├── main.jsx               # Entry point
    │   └── index.css              # Global styles
    ├── index.html
    ├── vite.config.js
    ├── tailwind.config.js
    └── package.json
```

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `POST /api/auth/register` - Register new user (Admin only)

### Books
- `GET /api/books` - List all books
- `GET /api/books/:id` - Get book details
- `GET /api/books/barcode/:barcode` - Search by barcode
- `POST /api/books` - Add new book (Admin only)
- `PUT /api/books/:id` - Update book (Admin only)
- `DELETE /api/books/:id` - Delete book (Admin only)

### Users
- `GET /api/users` - List all users (Admin only)
- `GET /api/users/:userType/:id` - Get user details (Admin only)
- `PUT /api/users/:userType/:id` - Update user (Admin only)
- `DELETE /api/users/:userType/:id` - Delete user (Admin only)

### Attendance
- `POST /api/attendance/checkin` - Check in to library
- `POST /api/attendance/checkout` - Check out from library
- `GET /api/attendance/status` - Get attendance status
- `GET /api/attendance/logs` - Get all logs (Admin only)
- `GET /api/attendance/my-logs` - Get personal logs

### Borrowing
- `POST /api/borrow` - Borrow a book
- `POST /api/borrow/:id/return` - Return a book
- `GET /api/borrow/logs` - Get all borrow logs (Admin only)
- `GET /api/borrow/my-loans` - Get active loans
- `GET /api/borrow/my-history` - Get borrow history
- `GET /api/borrow/overdue` - Get overdue books (Admin only)

### E-books
- `GET /api/ebooks` - List all e-books
- `GET /api/ebooks/:id` - Get e-book details
- `POST /api/ebooks` - Upload e-book (Admin only)
- `GET /api/ebooks/:id/read` - Stream e-book file
- `DELETE /api/ebooks/:id` - Delete e-book (Admin only)

## 🗄️ Database Schema

### Tables
- **users**: Admin and Librarian accounts
- **students**: Student accounts with barcode
- **teachers**: Teacher accounts with barcode
- **books**: Physical book inventory
- **ebooks**: Digital book collection
- **attendance_logs**: Check-in/out records
- **borrow_logs**: Book borrowing history
- **ebook_read_logs**: E-book access logs

## 🎨 Features Ready for Enhancement

The following features have backend support and can be integrated into the frontend:

1. **Barcode Scanner**: Use `html5-qrcode` library (already installed) to scan book ISBNs and student/teacher barcodes
2. **E-book Viewer**: Use `react-pdf` library (already installed) to display PDF e-books
3. **Advanced Book Management**: Full CRUD interface for books with search and filters
4. **User Management Interface**: Admin panel for managing students and teachers
5. **Reports and Analytics**: Borrowing trends, popular books, attendance reports

## 🔒 Security Features

- JWT-based authentication with token expiration
- Password hashing using bcryptjs
- Role-based access control middleware
- Protected API endpoints
- Input validation using express-validator

## 📝 Environment Variables

### Backend (.env)
```env
PORT=5000
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
DATABASE_PATH=./database.sqlite
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=52428800
DEFAULT_ADMIN_USERNAME=admin
DEFAULT_ADMIN_PASSWORD=admin123
```

## 🚀 Deployment

### Backend
1. Set production environment variables
2. Build and deploy to your preferred hosting (Heroku, DigitalOcean, AWS, etc.)
3. Ensure database file is persisted

### Frontend
1. Build the production bundle:
```bash
npm run build
```
2. Deploy the `dist` folder to static hosting (Vercel, Netlify, etc.)
3. Update API URL in environment variables

## 📄 License

MIT

## 👨‍💻 Development

This is a fully functional MVP (Minimum Viable Product) with core features implemented. Additional features can be added as needed:

- Barcode scanning integration
- E-book PDF viewer
- Advanced search and filtering
- Email notifications for overdue books
- Fine calculation system
- Book reservation system
- Multi-language support

## 🤝 Contributing

Feel free to submit issues and enhancement requests!

---

**Built with ❤️ using modern web technologies**
