import { hashPassword, signToken, toPublicUser, verifyPassword, type PublicUser } from "../../lib/auth";
import { AppError, notFound } from "../../lib/http";
import { prisma } from "../../lib/prisma";
import type { LoginInput } from "./schemas";

let dummyHash: Promise<string> | undefined;

/** Compares against a throwaway hash so unknown emails take as long as wrong passwords. */
function compareWithDummy(password: string): Promise<boolean> {
  dummyHash ??= hashPassword("stocksense-timing-guard-1");
  return dummyHash.then((hash) => verifyPassword(password, hash)).then(() => false);
}

export async function login(input: LoginInput): Promise<{ token: string; user: PublicUser }> {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  const valid = user ? await verifyPassword(input.password, user.passwordHash) : await compareWithDummy(input.password);
  if (!user || !valid) throw new AppError(401, "UNAUTHORIZED", "Invalid email or password");
  return { token: signToken(user.id), user: toPublicUser(user) };
}

export async function getMe(userId: number): Promise<PublicUser> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw notFound("User");
  return toPublicUser(user);
}
