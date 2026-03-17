const jwt = require("jsonwebtoken")

const Authentication = (req, res, next) => {
    const token = req.body?.token

    // No token
    if (!token) {
        return res.status(401).json({
            success: false,
            error: "Authentication token missing"
        })
    }

    try {
        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_ACCESS_TOKEN)

        // Attach decoded payload
        req.user = decoded

        next()
    } catch (err) {
        return res.status(401).json({
            success: false,
            error: "Invalid or expired authentication token"
        })
    }
}

module.exports = { 
    Authentication 
}
