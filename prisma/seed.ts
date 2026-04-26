import { prisma } from "../src/lib/prisma";
import { getPublicOfficeAssetPath, loadOfficeSources } from "../src/features/offices/import-offices";

async function seed() {
  const officeSources = await loadOfficeSources();

  for (const officeSource of officeSources) {
    const office = await prisma.office.upsert({
      where: { code: officeSource.code },
      update: {
        name: officeSource.name,
        location: officeSource.location,
      },
      create: {
        code: officeSource.code,
        name: officeSource.name,
        location: officeSource.location,
      },
    });

    for (const floorSource of officeSource.floors) {
      const floor = await prisma.floor.upsert({
        where: {
          officeId_floorNum: {
            officeId: office.id,
            floorNum: floorSource.floor_num,
          },
        },
        update: {
          floorName: floorSource.floor_name,
          floorMap: getPublicOfficeAssetPath(officeSource.code, floorSource.floor_map),
        },
        create: {
          officeId: office.id,
          floorNum: floorSource.floor_num,
          floorName: floorSource.floor_name,
          floorMap: getPublicOfficeAssetPath(officeSource.code, floorSource.floor_map),
        },
      });

      for (const deskSource of floorSource.desks) {
        const desk = await prisma.desk.upsert({
          where: {
            floorId_deskNum: {
              floorId: floor.id,
              deskNum: deskSource.desk_num,
            },
          },
          update: {
            deskName: deskSource.desk_name,
          },
          create: {
            floorId: floor.id,
            deskNum: deskSource.desk_num,
            deskName: deskSource.desk_name,
          },
        });

        for (const seatSource of deskSource.seats) {
          await prisma.seat.upsert({
            where: {
              deskId_seatNum: {
                deskId: desk.id,
                seatNum: seatSource.seat_num,
              },
            },
            update: {},
            create: {
              deskId: desk.id,
              seatNum: seatSource.seat_num,
            },
          });
        }
      }
    }
  }

  const milanoOffice = await prisma.office.findUniqueOrThrow({
    where: { code: "mi" },
  });

  await prisma.user.upsert({
    where: { email: "dev.user@example.com" },
    update: {
      name: "Dev User",
      role: "USER",
      assignedOfficeId: milanoOffice.id,
      officeSelectedAt: new Date(),
    },
    create: {
      email: "dev.user@example.com",
      name: "Dev User",
      role: "USER",
      assignedOfficeId: milanoOffice.id,
      officeSelectedAt: new Date(),
    },
  });
}

seed()
  .finally(async () => {
    await prisma.$disconnect();
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
