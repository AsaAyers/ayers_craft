/* eslint-disable @typescript-eslint/camelcase */
import * as path from "path";
import DataPack, { build, mcLoad, command } from "@asaayers/ts-datapack";
import "./sorter";
import "./compass";

const ac = new DataPack("ayers_craft");
const scoreboard = ac.makeScoreboard("AC", {
  invincible: "dummy",
});

type GroupConfig = {
  group_name: string;
  item_frame: string;
  fallback?: string;
  items: string[];
};

const creepers = ac.mcFunction(function* creepers() {
  const creeper = ac.createSelector("@e", {
    type: "minecraft:creeper",
    distance: "0..10",
  });

  const ifCreeper = `execute at @a if entity ${creeper}`;
  const unlessCreeper = `execute at @a unless entity ${creeper}`;

  yield command(ifCreeper, "run gamerule mobGriefing false");
  yield command(unlessCreeper, "run gamerule mobGriefing true");

  yield `schedule function ${creepers} 10t`;
});

const invincibility = ac.mcFunction(function* invincibility() {
  yield `
effect give @a[scores={${scoreboard.invincible}=1}] minecraft:regeneration 60 255 true
effect give @a[scores={${scoreboard.invincible}=1}] minecraft:resistance 60 255 true
schedule function ${invincibility} 30s
  `;
});

const load = ac.mcFunction(function* load() {
  yield `say "Hello AyersCraft.ts"`;

  yield `
    team add AyersCraft
    team modify AyersCraft friendlyFire false
    team join AyersCraft @a
  `;

  yield `schedule function ${invincibility} 1t`;
  yield `schedule function ${creepers} 10t`;
});

mcLoad(load);

build(path.join(__dirname, ".."));
