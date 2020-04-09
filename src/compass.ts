import DataPack, { mcTick, mcLoad } from "@asaayers/ts-datapack";

const compass = new DataPack("compass_player_locator");

const scoreboard = compass.makeScoreboard("cpl", {
  id: "dummy",
  follow: "dummy",
  holding: "dummy",
  follow_next: "trigger",
  follow_new: "trigger",
  searching: "dummy",
});

const fakePlayer = "#compass_player_locator";
const nextId = `${fakePlayer} ${scoreboard.id}`;

const assign_id = compass.mcFunction(function* assign_id() {
  yield `
    scoreboard players operation @s ${scoreboard.id} = ${nextId}
    scoreboard players add ${nextId} 1
  `;
});

const nearby = compass.createSelector("@e", {
  distance: "0.1..3",
  sort: "nearest",
  limit: 1,
});
const follow_new_entity = compass.mcFunction(function* follow_new_entity() {
  yield `
  say "Follow New ${nearby}"
  scoreboard players set @s ${scoreboard.follow_new} 0
  scoreboard players operation @s ${scoreboard.follow} = ${nextId}
  execute as ${nearby} run function ${assign_id}
  `;
});

const entity = compass.createSelector("@e", {
  scores: `{${scoreboard.id}=1..}`,
});
const self = entity({
  limit: 1,
  sort: "nearest",
});

const show_following = compass.mcFunction(function* show_following() {
  yield compass.command(
    `execute at ${entity}`,
    // If its score mathes the subject's follow ID
    `if score ${self} ${scoreboard.id} = @s ${scoreboard.follow}`,
    `run title @a title ["",{"text":"Following"}]`
  );
  yield compass.command(
    `execute at ${entity}`,
    // If its score mathes the subject's follow ID
    `if score ${self} ${scoreboard.id} = @s ${scoreboard.follow}`,
    `run title @a subtitle ["",{"selector":"${self}"}]`
  );
});

const change = compass.mcFunction(function* change() {
  yield `
  scoreboard players set @s ${scoreboard.follow_next} 0

  # Increment follow
  scoreboard players add @s ${scoreboard.follow} 1

  # Loop around 
  execute if score @s ${scoreboard.follow} > ${nextId} run scoreboard players set @s ${scoreboard.follow} 1

  # Skip yourself
  execute if score @s ${scoreboard.follow} = @s ${scoreboard.id} run scoreboard players add @s ${scoreboard.follow} 1

  # title @a title ["",{"text":"Following"}]
  # title @a subtitle ["",{"selector":"@p"}]
  `;

  yield compass.command(
    `execute at ${entity}`,
    `if score ${self} ${scoreboard.id} = @s ${scoreboard.follow}`,
    `run`,
    `scoreboard players set @s ${scoreboard.searching} 0`
  );

  yield compass.command(
    `execute`,
    // If this looped all the way around
    `if score @s ${scoreboard.searching} = @s ${scoreboard.follow}`,
    `run`,
    // stop searching
    `scoreboard players set @s ${scoreboard.searching} 0`
  );

  yield compass.command(
    `execute`,
    `if entity @s[scores={${scoreboard.searching}=1..}]`,
    `run`,
    `function ${change}`
  );

  yield compass.command(
    `execute`,
    `if entity @s[scores={${scoreboard.searching}=0}]`,
    `run function ${show_following}`
  );
});

const show_status = compass.mcFunction(function* show_status() {
  const changeMessage = compass.nbt([
    "",
    { text: "Compass tracker: ", color: "gray" },
    {
      text: "[change]",
      color: "blue",
      clickEvent: {
        action: "run_command",
        value: `/trigger ${scoreboard.follow_next}`,
      },
    },
  ]);

  const nearMessage = compass.nbt([
    "",
    { text: "Compass tracker: ", color: "gray" },
    {
      text: "[follow]",
      color: "blue",
      clickEvent: {
        action: "run_command",
        value: `/trigger ${scoreboard.follow_new}`,
      },
    },
    { selector: `${nearby}` },
  ]);

  yield `
  scoreboard players set @s ${scoreboard.holding} 1
  function ${show_following}
  tellraw @s ${changeMessage}
  `;
  yield compass.command(`execute`, `if entity ${nearby}`, `run say ${nearby}`);
  yield compass.command(
    `execute`,
    `if entity ${nearby}`,
    `run tellraw @s ${nearMessage}`
  );
});

const load = compass.mcFunction(function* load() {
  yield `scoreboard players set ${fakePlayer} ${scoreboard.searching} 1`;
  yield `scoreboard players add ${nextId} 0`;
  yield compass.command(
    `execute if score ${nextId} < ${fakePlayer} ${scoreboard.searching}`,
    `run scoreboard players set ${nextId} 1`
  );
});

const playerHolingTool = compass.createSelector("@a", {
  nbt: compass.nbt({
    SelectedItem: {
      id: `minecraft:compass`,
    },
  }),
});

const tick = compass.mcFunction(function* tick() {
  const a = compass.createSelector("@a");

  yield `
scoreboard players add @a ${scoreboard.holding} 0

execute as ${playerHolingTool({
    scores: `{${scoreboard.holding}=0}`,
  })} at @s run function ${show_status}

execute as ${a({
    scores: `{${scoreboard.holding}=1}`,
  })} unless entity @s[nbt={SelectedItem:{id:"minecraft:compass"}}] run scoreboard players set @s ${scoreboard.holding} 0
  `;

  const triggeredFollow = `execute as @a[scores={${scoreboard.follow_new}=1..}]`;

  yield `
  scoreboard players enable @a ${scoreboard.follow_new}
  ${triggeredFollow} at @s run function ${follow_new_entity}
  `;

  const triggeredNext = `execute as @a[scores={${scoreboard.follow_next}=1..}]`;

  yield `
  scoreboard players enable @a ${scoreboard.follow_next}
  ${triggeredNext} run scoreboard players operation @s ${scoreboard.searching} = @s ${scoreboard.follow}
  ${triggeredNext} at @s run function ${change}

  scoreboard players add @a ${scoreboard.id} 0
  `;
  yield compass.command(
    `execute as @a[scores={${scoreboard.id}=0}, limit = 1]`,
    `run function ${assign_id}`
  );
});

mcLoad(load);
mcTick(tick);

const find_target = compass.mcFunction(function* track_entity() {
  const entity = compass.createSelector("@e", {
    scores: `{${scoreboard.id}=1..}`,
  });
  const self = entity({
    limit: 1,
    sort: "nearest",
  });

  const show_target = compass.mcFunction(function* show_target() {
    const particle = "minecraft:dust 1.0 1.0 1.0 1.0 ~ ~ ~ 0 0 0 0 1";
    const playerFollowing = compass.createSelector("@a", {
      scores: `{${scoreboard.follow}=1..}`,
      nbt: compass.nbt({ SelectedItem: { id: "minecraft:compass" } }),
    });

    const self = playerFollowing({ sort: "nearest", limit: 1 });

    yield `effect give @s minecraft:glowing 1 0 true`;
    for (let distance = 1; distance <= 3; distance++) {
      yield compass.command(
        `execute at ${playerFollowing}`,
        // find the player that is following me (@s)
        `if score ${self} ${scoreboard.follow} = @s ${scoreboard.id}`,
        // At the player...
        `at ${self}`,
        `facing entity @s eyes`,
        `positioned ~ ~1 ~`,
        `positioned ^ ^ ^${distance}`,
        `run particle ${particle}`
      );
    }
  });

  yield compass.command(
    // At every entity with an ID
    `execute at ${entity}`,
    // If its score mathes the subject's follow ID
    `if score ${self} ${scoreboard.id} = @s ${scoreboard.follow}`,
    `as ${self}`,
    `run function ${show_target}`
  );
});
mcTick(
  compass.mcFunction(function* tick_track() {
    yield `execute as @a[nbt={SelectedItem:{id:"minecraft:compass"}}] at @s run function ${find_target}`;
  })
);
