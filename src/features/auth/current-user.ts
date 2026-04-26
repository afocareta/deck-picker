import { cookies } from "next/headers";

import { getDevUser } from "@/features/dev-user/dev-user";
import { prisma } from "@/lib/prisma";

import {
  SESSION_COOKIE_NAME,
  getSessionSecret,
  verifySessionCookieValue,
} from "./session";

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const session = verifySessionCookieValue({
    value: cookieStore.get(SESSION_COOKIE_NAME)?.value,
    secret: getSessionSecret(),
  });

  if (!session) {
    return getDevUser();
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: {
      assignedOffice: {
        select: {
          id: true,
          code: true,
          name: true,
          location: true,
        },
      },
    },
  });

  return user ?? getDevUser();
}
