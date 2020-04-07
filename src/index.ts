/* eslint-disable @typescript-eslint/camelcase */
import * as path from "path";
import DataPack, { build, mcTick, mcLoad } from "@asaayers/ts-datapack";
import "./sorter";

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

  yield ac.command(ifCreeper, "run gamerule mobGriefing false");
  yield ac.command(unlessCreeper, "run gamerule mobGriefing true");

  yield `schedule function ${creepers} 10t`;
});

const compass = ac.mcFunction(function* compass() {
  const particle = "minecraft:dust 1.0 1.0 1.0 1.0 ~ ~ ~ 0 0 0 0 1";
  let closestPlayer = null;
  closestPlayer = ac.createSelector("@a", {
    distance: "0.1..",
    limit: 1,
    sort: "nearest",
  });
  // closestPlayer = ac.createSelector("@e", {
  //   type: "minecraft:creeper",
  //   // distance: "0.1..",
  //   distance: "10..",
  //   limit: 1,
  //   sort: "nearest",
  // });

  for (let distance = 1; distance <= 3; distance++) {
    yield ac.command(
      `execute at @s if entity ${closestPlayer({ distance: "10.." })}`,
      `facing entity ${closestPlayer} eyes`,
      `positioned ~ ~1 ~`,
      `positioned ^ ^ ^${distance}`,
      `run particle ${particle}`
    );
    yield ac.command(
      `execute at @s if entity ${closestPlayer({ distance: "10.." })}`,
      `run effect give ${closestPlayer} minecraft:glowing 1`
    );
  }
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

const tick = ac.mcFunction(function* tick() {
  yield `execute as @a[nbt={SelectedItem:{id:"minecraft:compass"}}] at @s run function ${compass}`;
});

mcTick(tick);
mcLoad(load);

build(path.join(__dirname, ".."));
