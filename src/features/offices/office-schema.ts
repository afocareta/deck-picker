export type OfficeSeat = {
  seat_num: number;
};

export type OfficeDesk = {
  desk_num: number;
  desk_name: string;
  seats: OfficeSeat[];
};

export type OfficeFloor = {
  floor_num: number;
  floor_name: string;
  floor_map: string;
  desks: OfficeDesk[];
};

export type OfficeLayout = {
  name: string;
  location: string;
  floors: OfficeFloor[];
};

export const officeSourceFiles = [
  {
    code: "cs",
    sourceDir: "docs/requests/samples/uffici/cs",
    fileName: "ufficio-cs.json",
  },
  {
    code: "fi",
    sourceDir: "docs/requests/samples/uffici/fi",
    fileName: "ufficio-fi.json",
  },
  {
    code: "mi",
    sourceDir: "docs/requests/samples/uffici/mi",
    fileName: "ufficio-milano.json",
  },
  {
    code: "rm",
    sourceDir: "docs/requests/samples/uffici/rm",
    fileName: "ufficio-roma.json",
  },
  {
    code: "to",
    sourceDir: "docs/requests/samples/uffici/to",
    fileName: "ufficio-to.json",
  },
] as const;

export type OfficeCode = (typeof officeSourceFiles)[number]["code"];
