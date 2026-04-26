import { prisma } from "@/lib/prisma";

export type SelectableOffice = {
  id: string;
  code: string;
  name: string;
  location: string;
  seatCount: number;
};

export async function getSelectableOffices(): Promise<SelectableOffice[]> {
  const offices = await prisma.office.findMany({
    include: {
      floors: {
        include: {
          desks: {
            include: {
              seats: true,
            },
          },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  return offices.map((office) => ({
    id: office.id,
    code: office.code,
    name: office.name,
    location: office.location,
    seatCount: office.floors.reduce(
      (floorSum, floor) =>
        floorSum + floor.desks.reduce((deskSum, desk) => deskSum + desk.seats.length, 0),
      0,
    ),
  }));
}

export async function selectUserOffice(input: {
  userId: string;
  officeId: string;
}) {
  const office = await prisma.office.findUnique({
    where: { id: input.officeId },
    select: { id: true },
  });

  if (!office) {
    throw new Error("Office not found");
  }

  return prisma.user.update({
    where: { id: input.userId },
    data: {
      assignedOfficeId: input.officeId,
      officeSelectedAt: new Date(),
    },
  });
}
