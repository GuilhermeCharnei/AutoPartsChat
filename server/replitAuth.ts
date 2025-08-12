import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

if (!process.env.REPLIT_DOMAINS) {
  throw new Error("Environment variable REPLIT_DOMAINS not provided");
}

const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: sessionTtl,
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(
  claims: any,
) {
  // Set default permissions for new users (gerente role)
  const defaultPermissions = {
    viewStock: true,
    editProducts: true,
    viewReports: true,
    manageUsers: true,
    adminAccess: false,
    apiConfig: false
  };

  await storage.upsertUser({
    id: claims["sub"],
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"],
    role: "gerente",
    permissions: defaultPermissions,
  });
  
  // Auto-promote specific user to DEV role
  await autoPromoteDevUser(claims["sub"]);
}

// Auto-promote specific user to DEV role on login (internal use only)
async function autoPromoteDevUser(userId: string) {
  const DEV_USER_ID = "45583450"; // Guilherme's user ID
  
  if (userId === DEV_USER_ID) {
    try {
      const existingUser = await storage.getUser(userId);
      if (existingUser && existingUser.role !== 'dev') {
        await storage.updateUser(userId, {
          role: 'dev',
          permissions: {
            viewStock: true,
            editProducts: true,
            viewReports: true,
            manageUsers: true,
            accessWhatsappAPI: true,
            accessOpenAI: true,
            systemSettings: true
          }
        });
        console.log("Auto-promoted user to DEV:", userId);
      }
    } catch (error) {
      console.error("Error auto-promoting DEV user:", error);
    }
  }
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  const config = await getOidcConfig();

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    const user = {};
    updateUserSession(user, tokens);
    await upsertUser(tokens.claims());
    verified(null, user);
  };

  for (const domain of process.env
    .REPLIT_DOMAINS!.split(",")) {
    const strategy = new Strategy(
      {
        name: `replitauth:${domain}`,
        config,
        scope: "openid email profile offline_access",
        callbackURL: `https://${domain}/api/callback`,
      },
      verify,
    );
    passport.use(strategy);
  }

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  app.get("/api/login", (req, res, next) => {
    console.log("Login attempt for hostname:", req.hostname);
    console.log("Available domains:", process.env.REPLIT_DOMAINS);
    
    // Use the first domain from REPLIT_DOMAINS for OAuth strategy
    const domains = process.env.REPLIT_DOMAINS!.split(",");
    const targetDomain = domains[0];
    
    try {
      passport.authenticate(`replitauth:${targetDomain}`, {
        prompt: "login consent",
        scope: ["openid", "email", "profile", "offline_access"],
      })(req, res, next);
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Login failed", message: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  app.get("/api/callback", (req, res, next) => {
    console.log("OAuth callback for hostname:", req.hostname);
    
    // Use the first domain from REPLIT_DOMAINS for OAuth strategy
    const domains = process.env.REPLIT_DOMAINS!.split(",");
    const targetDomain = domains[0];
    
    passport.authenticate(`replitauth:${targetDomain}`, {
      successReturnToOrRedirect: "/",
      failureRedirect: "/api/login",
    })(req, res, (err: any) => {
      if (err) {
        console.error("OAuth callback error:", err);
        return res.redirect("/api/login");
      }
      console.log("OAuth callback successful");
    });
  });

  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      res.redirect(
        client.buildEndSessionUrl(config, {
          client_id: process.env.REPL_ID!,
          post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
        }).href
      );
    });
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;
  const session = (req as any).session;

  // Check for temporary login session first
  if (session && session.passport && session.passport.user) {
    const tempUser = session.passport.user;
    
    if (tempUser.access_token === 'temp-token') {
      const now = Math.floor(Date.now() / 1000);
      
      if (now <= tempUser.expires_at) {
        // Set user in req for routes to access
        (req as any).user = tempUser;
        return next();
      }
    }
  }

  // Standard OAuth authentication check
  if (!req.isAuthenticated() || !user || !user.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    return next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
};
