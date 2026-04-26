import { prisma } from "@/lib/prisma";

export const DEV_USER_EMAIL = "dev.user@example.com";

export async function getDevUser() {
  return prisma.user.findUniqueOrThrow({
    where: { email: DEV_USER_EMAIL },
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
