import DataPack, {
  execute,
  nbt,
  scoreboard,
  say,
  tellraw,
  effect,
  title,
  particle,
  Particle,
} from "../ts-datapack/src";
import { selector } from "../ts-datapack/src/datapack";
import { makeMenu, hold } from "./utils";

const compass = new DataPack("compass_player_locator", "cpl");

const id = compass.objective("id", "dummy");
const follow = compass.objective("follow", "dummy");
const searching = compass.objective("searching", "dummy");

const fakePlayer = "#compass_player_locator";
const nextId = `${fakePlayer} ${id}`;

const assign_id = compass.mcFunction(function* assign_id() {
  yield scoreboard("players", "operation", "@s", id, "=", fakePlayer, id);
  yield scoreboard("players", "add", fakePlayer, id, 1);
});

const nearby = selector("@e", {
  distance: "0.1..3",
  sort: "nearest",
  limit: 1,
});
const follow_new_entity = compass.mcFunction(function* follow_new_entity() {
  yield say(`Follow New ${nearby}`);
  yield scoreboard("players", "operation", "@s", follow, "=", fakePlayer, id);
  yield execute().as(nearby).run(assign_id);
});

const entity = selector("@e", {
  scores: `{${id}=1..}`,
});
const self = entity({
  limit: 1,
  sort: "nearest",
});

const show_following = compass.mcFunction(function* show_following() {
  yield execute()
    .at(entity)
    .if(`score ${self} ${id} = @s ${follow}`)
    .run(title("@a", "title", ["", { text: "Following" }]));

  yield execute()
    .at(entity)
    // If its score mathes the subject's follow ID
    .if(`score ${self} ${id} = @s ${follow}`)
    .run(title("@a", "subtitle", ["", { selector: self }]));
});

const change = compass.mcFunction(function* change() {
  // Increment follow
  yield scoreboard("players", "add", "@s", follow, 1);

  // Loop around
  yield execute()
    .if(`score @s ${follow} > ${nextId}`)
    .run(scoreboard("players", "set", "@s", follow, 1));

  // # Skip yourself
  yield execute()
    .if(`score @s ${follow} = @s ${id}`)
    .run(scoreboard("players", "add", "@s", follow, 1));

  yield execute()
    .at(entity)
    .if(`score ${self} ${id} = @s ${follow}`)
    .run(scoreboard("players", "set", "@s", searching, 0));

  yield execute()
    // If this looped all the way around
    .if(`score @s ${searching} = @s ${follow}`)
    // stop searching
    .run(scoreboard("players", "set", "@s", searching, 0));

  yield execute().if(`entity @s[scores={${searching}=1..}]`).run(change);

  yield execute().if(`entity @s[scores={${searching}=0}]`).run(show_following);
});

const load = compass.mcFunction(function* load() {
  yield scoreboard("players", "set", fakePlayer, searching, 1);
  yield scoreboard("players", "add", fakePlayer, id, 0);

  yield execute()
    .if(`score ${nextId} < ${fakePlayer} ${searching}`)
    .run(scoreboard("players", "set", fakePlayer, id, 1));
});

const backup_follow = compass.mcFunction(function* backup_follow() {
  yield execute()
    .as(`@s`)
    .run(
      scoreboard("players", "operation", "@s", searching, "=", "@s", follow)
    );
});
const changeTag = compass.makeTag("functions", "change");
changeTag(backup_follow, change);
const [follow_next, follow_new] = makeMenu(compass, "compass", [
  changeTag,
  follow_new_entity,
]);

const show_status = compass.mcFunction(function* show_status() {
  yield show_following;

  yield tellraw("@s", [
    "",
    { text: "Compass tracker: ", color: "gray" },
    {
      text: "[change]",
      color: "blue",
      clickEvent: {
        action: "run_command",
        value: `/${follow_next}`,
      },
    },
  ]);

  yield execute()
    .if(`entity ${nearby}`)
    .run(say(`${nearby}`));
  yield execute()
    .if(`entity ${nearby}`)
    .run(
      tellraw("@s", [
        "",
        { text: "Compass tracker: ", color: "gray" },
        {
          text: "[follow]",
          color: "blue",
          clickEvent: {
            action: "run_command",
            value: `/${follow_new}`,
          },
        },
        { selector: `${nearby}` },
      ])
    );
});

hold(compass, "compass", "minecraft:compass", show_status);
const tick = compass.mcFunction(function* tick() {
  yield scoreboard("players", "add", "@a", id, 0);

  yield execute().as(`@a[scores={${id}=0}, limit = 1]`).run(assign_id);
});

const find_target = compass.mcFunction(function* track_entity() {
  const entity = selector("@e", {
    scores: `{${id}=1..}`,
  });
  const self = entity({
    limit: 1,
    sort: "nearest",
  });

  const show_target = compass.mcFunction(function* show_target() {
    // TODO: Figure out the particle function

    const playerFollowing = selector("@a", {
      scores: `{${follow}=1..}`,
      nbt: nbt({ SelectedItem: { id: "minecraft:compass" } }),
    });

    const self = playerFollowing({ sort: "nearest", limit: 1 });

    yield effect(`give`, "@s", "minecraft:glowing", 1, 0, true);
    for (let distance = 1; distance <= 3; distance++) {
      yield execute()
        .at(playerFollowing)
        // find the player that is following me (@s)
        .if(`score ${self} ${follow} = @s ${id}`)
        // At the player...
        .at(self)
        .facing(`entity @s eyes`)
        .positioned(`~ ~1 ~`)
        .positioned(`^ ^ ^${distance}`)
        .run(
          particle(Particle.dust, "1.0 1.0 1.0 1.0", `~ ~ ~`, `0 0 0`, 0, 1)
        );
    }
  });

  // At every entity with an ID
  yield execute()
    .at(entity)
    // If its score mathes the subject's follow ID
    .if(`score ${self} ${id} = @s ${follow}`)
    .as(self)
    .run(show_target);
});

const tick_track = compass.mcFunction(function* tick_track() {
  yield execute()
    .as(`@a[nbt={SelectedItem:{id:"minecraft:compass"}}]`)
    .at(`@s`)
    .run(find_target);
});

compass.register({
  tags: {
    functions: {
      "minecraft:load": [load],
      "minecraft:tick": [tick, tick_track],
    },
  },
});
