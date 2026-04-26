import { readFile } from "node:fs/promises";
import path from "node:path";

import Ajv2020 from "ajv/dist/2020";

import officeSchema from "../../../docs/requests/schemas/office-schema.json";
import { type OfficeLayout, officeSourceFiles, type OfficeCode } from "./office-schema";

export type OfficeSource = OfficeLayout & {
  sourceDir: string;
  code: OfficeCode;
  seatCount: number;
};

const ajv = new Ajv2020({ allErrors: true });
const validateOfficeLayout = ajv.compile<OfficeLayout>(officeSchema);

function getWorkspacePath(...segments: string[]) {
  return path.join(process.cwd(), ...segments);
}

function getSeatCount(office: OfficeLayout) {
  return office.floors.reduce(
    (officeTotal, floor) =>
      officeTotal +
      floor.desks.reduce((floorTotal, desk) => floorTotal + desk.seats.length, 0),
    0,
  );
}

export function getPublicOfficeAssetPath(code: string, floorMap: string) {
  return `/offices/${code}/${floorMap}`;
}

export function getPublicOfficeAssetFilePath(code: string, floorMap: string) {
  return getWorkspacePath("public", "offices", code, floorMap);
}

export async function loadOfficeSources(): Promise<OfficeSource[]> {
  const offices = await Promise.all(
    officeSourceFiles.map(async ({ code, sourceDir, fileName }) => {
      const absoluteSourceDir = getWorkspacePath(sourceDir);
      const sourcePath = path.join(absoluteSourceDir, fileName);
      const rawSource = await readFile(sourcePath, "utf8");
      const parsedSource: unknown = JSON.parse(rawSource);

      if (!validateOfficeLayout(parsedSource)) {
        throw new Error(
          `Invalid office source ${sourcePath}: ${ajv.errorsText(validateOfficeLayout.errors)}`,
        );
      }

      return {
        ...parsedSource,
        sourceDir: absoluteSourceDir,
        code,
        seatCount: getSeatCount(parsedSource),
      };
    }),
  );

  return offices;
}
