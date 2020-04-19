import * as fs from "fs";
import * as path from "path";
import * as util from "util";
import { processQueue } from "../ts-datapack/src";

const readFile = util.promisify(fs.readFile);

describe("Snapshot Tests", () => {
  require("./index");
  const plan = processQueue();

  const datapack = path.join(__dirname, "..");

  Object.values(plan).map((file) => {
    test(file.filename, async () => {
      const fullPath = path.join(datapack, file.filename);
      // console.log("writing", file.filename);
      const actual = await readFile(fullPath);
      expect(String(actual)).toBe(file.content);
    });
  });
});
