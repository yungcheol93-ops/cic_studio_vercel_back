const jwt = require("jsonwebtoken");

function verifyToken(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        req.user = null;
        return next();
    }

    const token = authHeader.substring(7);

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // { id, email }
    } catch (err) {
        req.user = null;
    }

    next();
}

function requireAdmin(req, res, next) {
    if (!req.user || req.user.role !== "ROLE_ADMIN") {
        return res.status(403).json({ message: "권한 없음" });
    }
    next();
}

module.exports = { verifyToken, requireAdmin  };