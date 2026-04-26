import { copyFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";

const officeSourceFiles = [
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
];

async function copyOfficeAssets() {
  for (const { code, sourceDir, fileName } of officeSourceFiles) {
    const absoluteSourceDir = path.join(process.cwd(), sourceDir);
    const sourceJson = JSON.parse(await readFile(path.join(absoluteSourceDir, fileName), "utf8"));
    const targetDir = path.join(process.cwd(), "public", "offices", code);

    await mkdir(targetDir, { recursive: true });

    for (const floor of sourceJson.floors) {
      const sourceAsset = path.join(absoluteSourceDir, floor.floor_map);
      const targetAsset = path.join(targetDir, floor.floor_map);

      await copyFile(sourceAsset, targetAsset);
      console.log(`Copied ${sourceAsset} -> ${targetAsset}`);
    }
  }
}

copyOfficeAssets().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
