import { readFileSync } from "node:fs";
import { parseCourse } from "../src/domain/content";
const course = parseCourse(
  JSON.parse(readFileSync("public/content/010-air-law.json", "utf8")),
  process.argv.includes("--production"),
);
console.log(
  `Valid ${course.moduleId} revision ${course.contentRevision}: ${course.items.length} items, ${course.language}`,
);
