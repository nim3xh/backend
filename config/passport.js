// config/passport.js
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const fs = require('fs');
const path = require('path');

const USERS_FILE = path.join(__dirname, '../users.json');

// Helper to load users
function loadUsers() {
  try {
    if (fs.existsSync(USERS_FILE)) {
      const data = fs.readFileSync(USERS_FILE, 'utf8');
      return JSON.parse(data);
    }
    return [];
  } catch (error) {
    console.error('Error loading users:', error);
    return [];
  }
}

// Helper to save users
function saveUsers(users) {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Error saving users:', error);
    return false;
  }
}

// Serialize user for the session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user from the session
passport.deserializeUser((id, done) => {
  try {
    const users = loadUsers();
    const user = users.find(u => u.id === id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// Configure Google OAuth Strategy
// Only configure if credentials are provided
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/auth/google/callback',
      passReqToCallback: true
    },
  async (req, accessToken, refreshToken, profile, done) => {
    try {
      const users = loadUsers();
      
      // Check if user already exists with this Google ID
      let user = users.find(u => u.googleId === profile.id);
      
      if (user) {
        // User exists, update their info if needed
        user.email = profile.emails && profile.emails.length > 0 ? profile.emails[0].value : user.email;
        user.displayName = profile.displayName || user.displayName;
        user.profilePhoto = profile.photos && profile.photos.length > 0 ? profile.photos[0].value : user.profilePhoto;
        user.lastLogin = new Date().toISOString();
        saveUsers(users);
        return done(null, user);
      }
      
      // Check if user exists with this email (regular signup)
      const email = profile.emails && profile.emails.length > 0 ? profile.emails[0].value : null;
      if (email) {
        user = users.find(u => u.email === email);
        if (user) {
          // Link Google account to existing user
          user.googleId = profile.id;
          user.displayName = profile.displayName || user.displayName;
          user.profilePhoto = profile.photos && profile.photos.length > 0 ? profile.photos[0].value : user.profilePhoto;
          user.lastLogin = new Date().toISOString();
          saveUsers(users);
          return done(null, user);
        }
      }
      
      // Create new user
      const newUser = {
        id: Date.now().toString(),
        googleId: profile.id,
        email: email || `google_${profile.id}@noemail.com`,
        displayName: profile.displayName || 'Google User',
        profilePhoto: profile.photos && profile.photos.length > 0 ? profile.photos[0].value : null,
        role: 'user', // Default role
        authMethod: 'google',
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString()
      };
      
      users.push(newUser);
      saveUsers(users);
      
      return done(null, newUser);
    } catch (error) {
      return done(error, null);
    }
  }
  ));
  console.log('✅ Google OAuth strategy configured');
} else {
  console.warn('⚠️ Google OAuth not configured - GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET required');
}

module.exports = passport;
