import jwt from 'jsonwebtoken';

// Ensure a secret exists before the auth middleware reads it in tests
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';

export type TestStaffRole = 'ADMIN' | 'KITCHEN';

export const tokenFor = (
  role: TestStaffRole,
  overrides: { sub?: string; username?: string } = {}
): string =>
  jwt.sign(
    {
      sub: overrides.sub ?? `staff-${role.toLowerCase()}`,
      username: overrides.username ?? `${role.toLowerCase()}-user`,
      role,
    },
    process.env.JWT_SECRET as string,
    { expiresIn: '1h' }
  );

export const authHeader = (role: TestStaffRole): Record<string, string> => ({
  Authorization: `Bearer ${tokenFor(role)}`,
});
