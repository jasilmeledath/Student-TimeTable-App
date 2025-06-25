require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const flash = require('connect-flash');
const cookieParser = require('cookie-parser');
const path = require('path');
const expressLayouts = require('express-ejs-layouts');
const moment = require('moment');
const morgan = require('morgan');
const logger = require('./helpers/logger');

// Import routes
const authRoutes = require('./routes/auth');
const studentRoutes = require('./routes/student');
const adminRoutes = require('./routes/admin');

// Import middleware
const { checkAuth } = require('./middleware/authMiddleware');
const { checkRole } = require('./middleware/roleMiddleware');

const app = express();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/timetable_manager', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    family: 4 // Use IPv4, no DNS lookup needed
}).then(() => {
    logger.info('📦 Connected to MongoDB');
}).catch((err) => {
    logger.error('MongoDB connection error:', err);
    process.exit(1);
});

// Configure session middleware
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/timetable_manager',
        mongoOptions: {
            family: 4 // Use IPv4, no DNS lookup needed
        }
    }),
    cookie: {
        maxAge: 1000 * 60 * 60 * 24 // 24 hours
    }
}));

// Configure EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layouts/main');

// Configure middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(cookieParser(process.env.COOKIE_SECRET));
app.use(flash());

// Setup request logging
app.use(morgan('combined', { stream: logger.stream }));

// Make moment available in all views
app.locals.moment = moment;

// Global variables middleware
app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    res.locals.success = req.flash('success');
    res.locals.error = req.flash('error');
    res.locals.info = req.flash('info');
    res.locals.messages = req.flash();
    next();
});

// Routes
app.use('/auth', authRoutes);
app.use('/student', checkAuth, checkRole('student'), studentRoutes);
app.use('/admin', checkAuth, checkRole('admin'), adminRoutes);

// Home route
app.get('/', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/auth/login');
    }
    if (req.session.user.role === 'admin') {
        return res.redirect('/admin/dashboard');
    }
    res.redirect('/student/timetable');
});

// Error handling middleware
app.use((req, res, next) => {
    logger.warn('404 Not Found: %s', req.originalUrl);
    res.status(404).render('errors/404', {
        title: '404 Not Found',
        layout: 'layouts/auth'
    });
});

app.use((err, req, res, next) => {
    logger.error('Server Error:', {
        error: err.message,
        stack: err.stack,
        url: req.originalUrl,
        method: req.method,
        ip: req.ip
    });
    res.status(500).render('errors/500', {
        title: '500 Server Error',
        layout: 'layouts/auth'
    });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    logger.info(`🚀 Server is running on port ${PORT}`);
}); 