/* eslint-disable @typescript-eslint/camelcase */

// Testing

import DataPack, {
  say,
  execute,
  schedule,
  effect,
  team,
  gamerule,
  build,
} from "../ts-datapack/src";
import "./sorter";
import "./compass";
import path from "path";
import { selector } from "../ts-datapack/src/datapack";

const ac = new DataPack("ayers_craft", "AC");
const invincible = ac.objective("invincible", "dummy");

type GroupConfig = {
  group_name: string;
  item_frame: string;
  fallback?: string;
  items: string[];
};

const creepers = ac.mcFunction(function* creepers() {
  const creeper = selector("@e", {
    type: "minecraft:creeper",
    distance: "0..10",
  });

  const ifCreeper = execute().at("@a").if(`entity ${creeper}`);
  const unlessCreeper = execute().at("@a").unless(`entity ${creeper}`);

  yield ifCreeper.run(gamerule("mobGriefing", false));
  yield unlessCreeper.run(gamerule("mobGriefing", true));

  yield schedule(creepers, `10t`);
});

const invincibility = ac.mcFunction(function* invincibility() {
  yield effect(
    "give",
    `@a[scores={${invincible}=1}]`,
    "minecraft:regeneration",
    60,
    255,
    true
  );

  yield effect(
    "give",
    `@a[scores={${invincible}=1}]`,
    "minecraft:resistance",
    60,
    255,
    true
  );

  yield schedule(invincibility, "30s");
});

const load = ac.mcFunction(function* load() {
  yield say("Hello AyersCraft.ts");

  yield team("add", "AyersCraft");
  yield team("modify", "AyersCraft", "friendlyFire", "false");
  yield team("join", "AyersCraft", "@a");

  yield schedule(invincibility, "1t");
  yield schedule(creepers, "10t");
});

ac.register({
  tags: {
    functions: {
      "minecraft:load": [load],
    },
  },
});

if (module.parent) {
  console.log("required module");
} else {
  build(ac, path.join(__dirname, ".."));
}
