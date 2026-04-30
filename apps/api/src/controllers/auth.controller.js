import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "../config/db.js";
import {
  generateAccessToken,
  generateRefreshToken
} from "../utils/generateTokens.js";
import {
  setAuthCookies,
  clearAuthCookies
} from "../utils/setCookies.js";

function getRefreshTokenExpiryDate() {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  return date;
}

export async function register(req, res, next) {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Name, email, and password are required"
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters"
      });
    }

    const existingUser = await prisma.user.findUnique({
      where: {
        email
      }
    });

    if (existingUser) {
      return res.status(409).json({
        message: "User already exists"
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword
      },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        createdAt: true
      }
    });

    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: getRefreshTokenExpiryDate()
      }
    });

    setAuthCookies(res, accessToken, refreshToken);

    res.status(201).json({
      message: "Registered successfully",
      user
    });
  } catch (error) {
    next(error);
  }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required"
      });
    }

    const userWithPassword = await prisma.user.findUnique({
      where: {
        email
      }
    });

    if (!userWithPassword) {
      return res.status(401).json({
        message: "Invalid email or password"
      });
    }

    const isPasswordValid = await bcrypt.compare(
      password,
      userWithPassword.password
    );

    if (!isPasswordValid) {
      return res.status(401).json({
        message: "Invalid email or password"
      });
    }

    await prisma.refreshToken.deleteMany({
      where: {
        userId: userWithPassword.id
      }
    });

    const accessToken = generateAccessToken(userWithPassword.id);
    const refreshToken = generateRefreshToken(userWithPassword.id);

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: userWithPassword.id,
        expiresAt: getRefreshTokenExpiryDate()
      }
    });

    setAuthCookies(res, accessToken, refreshToken);

    res.json({
      message: "Logged in successfully",
      user: {
        id: userWithPassword.id,
        name: userWithPassword.name,
        email: userWithPassword.email,
        avatarUrl: userWithPassword.avatarUrl,
        createdAt: userWithPassword.createdAt
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function refresh(req, res, next) {
  try {
    const oldRefreshToken = req.cookies.refreshToken;

    if (!oldRefreshToken) {
      return res.status(401).json({
        message: "Refresh token missing"
      });
    }

    const savedToken = await prisma.refreshToken.findUnique({
      where: {
        token: oldRefreshToken
      },
      include: {
        user: true
      }
    });

    if (!savedToken) {
      return res.status(401).json({
        message: "Invalid refresh token"
      });
    }

    if (savedToken.expiresAt < new Date()) {
      await prisma.refreshToken.delete({
        where: {
          id: savedToken.id
        }
      });

      return res.status(401).json({
        message: "Refresh token expired"
      });
    }

    const decoded = jwt.verify(
      oldRefreshToken,
      process.env.JWT_REFRESH_SECRET
    );

    const accessToken = generateAccessToken(decoded.userId);
    const newRefreshToken = generateRefreshToken(decoded.userId);

    await prisma.refreshToken.delete({
      where: {
        id: savedToken.id
      }
    });

    await prisma.refreshToken.create({
      data: {
        token: newRefreshToken,
        userId: decoded.userId,
        expiresAt: getRefreshTokenExpiryDate()
      }
    });

    setAuthCookies(res, accessToken, newRefreshToken);

    res.json({
      message: "Token refreshed"
    });
  } catch (error) {
    next(error);
  }
}

export async function logout(req, res, next) {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (refreshToken) {
      await prisma.refreshToken.deleteMany({
        where: {
          token: refreshToken
        }
      });
    }

    clearAuthCookies(res);

    res.json({
      message: "Logged out successfully"
    });
  } catch (error) {
    next(error);
  }
}

export async function getMe(req, res) {
  res.json({
    user: req.user
  });
}