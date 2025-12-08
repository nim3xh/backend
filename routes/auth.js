// routes/auth.js
const express = require('express');
const passport = require('../config/passport');
const jwt = require('jsonwebtoken');
const router = express.Router();

// @route   GET /auth/google
// @desc    Initiate Google OAuth
// @access  Public
router.get('/google', (req, res, next) => {
  // Check if Google OAuth is configured
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return res.status(503).json({
      success: false,
      message: 'Google OAuth is not configured. Please contact support.'
    });
  }
  passport.authenticate('google', {
    scope: ['profile', 'email']
  })(req, res, next);
});

// @route   GET /auth/google/callback
// @desc    Google OAuth callback
// @access  Public
router.get('/google/callback',
  passport.authenticate('google', { 
    failureRedirect: process.env.FRONTEND_URL || 'http://localhost:5173',
    session: true 
  }),
  (req, res) => {
    // Successful authentication
    // Generate JWT token for the user
    const token = jwt.sign(
      { 
        id: req.user.id, 
        email: req.user.email,
        role: req.user.role,
        authMethod: 'google'
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );
    
    // Redirect to frontend with token
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/auth/callback?token=${token}`);
  }
);

// @route   GET /auth/user
// @desc    Get current authenticated user
// @access  Private (requires valid JWT or session)
router.get('/user', (req, res) => {
  // Check for JWT token in Authorization header
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
      
      // Load user from database
      const fs = require('fs');
      const path = require('path');
      const USERS_FILE = path.join(__dirname, '../users.json');
      const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
      const user = users.find(u => u.id === decoded.id);
      
      if (user) {
        // Return user without sensitive data
        const { passwordHash, ...userWithoutPassword } = user;
        return res.json({
          success: true,
          user: userWithoutPassword
        });
      }
    } catch (error) {
      console.error('JWT verification error:', error);
    }
  }
  
  // Check for session-based authentication
  if (req.isAuthenticated && req.isAuthenticated() && req.user) {
    const { passwordHash, ...userWithoutPassword } = req.user;
    return res.json({
      success: true,
      user: userWithoutPassword
    });
  }
  
  // Not authenticated
  res.status(401).json({
    success: false,
    message: 'Not authenticated'
  });
});

// @route   POST /auth/logout
// @desc    Logout user
// @access  Private
router.post('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({
        success: false,
        message: 'Error logging out'
      });
    }
    
    req.session.destroy((err) => {
      if (err) {
        console.error('Session destruction error:', err);
      }
      res.json({
        success: true,
        message: 'Logged out successfully'
      });
    });
  });
});

module.exports = router;
