// Role-based access control middleware

export const requireAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    if (req.user.role !== 'Admin' && req.user.role !== 'Librarian') {
        return res.status(403).json({ error: 'Admin access required' });
    }

    next();
};

export const requireTeacher = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    const allowedRoles = ['Admin', 'Librarian', 'Teacher'];
    if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({ error: 'Teacher access required' });
    }

    next();
};

export const requireStudent = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    const allowedRoles = ['Admin', 'Librarian', 'Teacher', 'Student'];
    if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({ error: 'Student access required' });
    }

    next();
};
