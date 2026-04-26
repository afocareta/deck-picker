import { prisma } from "@/lib/prisma";

export const DEV_USER_EMAIL = "dev.user@example.com";
export const DEV_ADMIN_EMAIL = "dev.admin@example.com";

export async function getDevUser(email = DEV_USER_EMAIL) {
  return prisma.user.findUniqueOrThrow({
    where: { email },
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
}
