import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../config/prisma';
import { getJwtSecret } from '../middleware/auth';

const TOKEN_TTL = '12h';

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password } = req.body;

    if (!username || !password || typeof username !== 'string' || typeof password !== 'string') {
      res.status(400).json({ error: 'Username and password are required' });
      return;
    }

    const user = await prisma.staffUser.findUnique({ where: { username } });

    // Same error for unknown user and wrong password so usernames can't be enumerated
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      res.status(401).json({ error: 'Invalid username or password' });
      return;
    }

    const token = jwt.sign(
      { sub: user.id, username: user.username, role: user.role },
      getJwtSecret(),
      { expiresIn: TOKEN_TTL }
    );

    res.status(200).json({
      token,
      user: { id: user.id, username: user.username, role: user.role },
    });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const me = (req: Request, res: Response): void => {
  // requireRole has already validated the token and attached the payload
  res.status(200).json({
    id: req.staff?.sub,
    username: req.staff?.username,
    role: req.staff?.role,
  });
};
