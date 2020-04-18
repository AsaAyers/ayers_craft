import DataPack, {
  mcTick,
  mcLoad,
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

const compass = new DataPack("compass_player_locator", "cpl");

const sb = compass.makeScoreboard("cpl", {
  id: "dummy",
  follow: "dummy",
  holding: "dummy",
  follow_next: "trigger",
  follow_new: "trigger",
  searching: "dummy",
});

const fakePlayer = "#compass_player_locator";
const nextId = `${fakePlayer} ${sb.id}`;

const assign_id = compass.mcFunction(function* assign_id() {
  yield scoreboard("players", "operation", "@s", sb.id, "=", fakePlayer, sb.id);
  yield scoreboard("players", "add", fakePlayer, sb.id, 1);
});

const nearby = selector("@e", {
  distance: "0.1..3",
  sort: "nearest",
  limit: 1,
});
const follow_new_entity = compass.mcFunction(function* follow_new_entity() {
  yield say(`Follow New ${nearby}`);
  yield scoreboard("players", "set", "@s", sb.follow_new, 0);
  yield scoreboard(
    "players",
    "operation",
    "@s",
    sb.follow,
    "=",
    fakePlayer,
    sb.id
  );
  yield execute().as(nearby).run(assign_id);
});

const entity = selector("@e", {
  scores: `{${sb.id}=1..}`,
});
const self = entity({
  limit: 1,
  sort: "nearest",
});

const show_following = compass.mcFunction(function* show_following() {
  yield execute()
    .at(entity)
    .if(`score ${self} ${sb.id} = @s ${sb.follow}`)
    .run(title("@a", "title", ["", { text: "Following" }]));

  yield execute()
    .at(entity)
    // If its score mathes the subject's follow ID
    .if(`score ${self} ${sb.id} = @s ${sb.follow}`)
    .run(title("@a", "subtitle", ["", { selector: self }]));
});

const change = compass.mcFunction(function* change() {
  yield scoreboard("players", "set", "@s", sb.follow_next, 0);
  // Increment follow
  yield scoreboard("players", "add", "@s", sb.follow, 1);

  // Loop around
  yield execute()
    .if(`score @s ${sb.follow} > ${nextId}`)
    .run(scoreboard("players", "set", "@s", sb.follow, 1));

  // # Skip yourself
  yield execute()
    .if(`score @s ${sb.follow} = @s ${sb.id}`)
    .run(scoreboard("players", "add", "@s", sb.follow, 1));

  yield execute()
    .at(entity)
    .if(`score ${self} ${sb.id} = @s ${sb.follow}`)
    .run(scoreboard("players", "set", "@s", sb.searching, 0));

  yield execute()
    // If this looped all the way around
    .if(`score @s ${sb.searching} = @s ${sb.follow}`)
    // stop searching
    .run(scoreboard("players", "set", "@s", sb.searching, 0));

  yield execute().if(`entity @s[scores={${sb.searching}=1..}]`).run(change);

  yield execute()
    .if(`entity @s[scores={${sb.searching}=0}]`)
    .run(show_following);
});

const show_status = compass.mcFunction(function* show_status() {
  yield scoreboard("players", "set", "@s", sb.holding, 1);
  yield show_following;

  yield tellraw("@s", [
    "",
    { text: "Compass tracker: ", color: "gray" },
    {
      text: "[change]",
      color: "blue",
      clickEvent: {
        action: "run_command",
        value: `/trigger ${sb.follow_next}`,
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
            value: `/trigger ${sb.follow_new}`,
          },
        },
        { selector: `${nearby}` },
      ])
    );
});

const load = compass.mcFunction(function* load() {
  yield scoreboard("players", "set", fakePlayer, sb.searching, 1);
  yield scoreboard("players", "add", fakePlayer, sb.id, 0);

  yield execute()
    .if(`score ${nextId} < ${fakePlayer} ${sb.searching}`)
    .run(scoreboard("players", "set", fakePlayer, sb.id, 1));
});

const playerHolingTool = selector("@a", {
  nbt: nbt({
    SelectedItem: {
      id: `minecraft:compass`,
    },
  }),
});

const tick = compass.mcFunction(function* tick() {
  const a = selector("@a");

  yield scoreboard("players", "add", "@a", sb.holding, 0);

  yield execute()
    .as(playerHolingTool({ scores: `{${sb.holding}=0}` }))
    .at("@s")
    .run(show_status);

  yield execute()
    .as(a({ scores: `{${sb.holding}=1}` }))
    .unless(`entity @s[nbt={SelectedItem:{id:"minecraft:compass"}}]`)
    .run(scoreboard("players", "set", "@s", sb.holding, 0));

  yield scoreboard("players", "enable", "@a", sb.follow_new);
  yield execute()
    .as(`@a[scores={${sb.follow_new}=1..}]`)
    .at("@s")
    .run(follow_new_entity);

  yield scoreboard("players", "enable", "@a", sb.follow_next);

  yield execute()
    .as(`@a[scores={${sb.follow_next}=1..}]`)
    .run(
      scoreboard(
        "players",
        "operation",
        "@s",
        sb.searching,
        "=",
        "@s",
        sb.follow
      )
    );

  yield execute().as(`@a[scores={${sb.follow_next}=1..}]`).at("@s").run(change);
  yield scoreboard("players", "add", "@a", sb.id, 0);

  yield execute().as(`@a[scores={${sb.id}=0}, limit = 1]`).run(assign_id);
});

mcLoad(load);
mcTick(tick);

const find_target = compass.mcFunction(function* track_entity() {
  const entity = selector("@e", {
    scores: `{${sb.id}=1..}`,
  });
  const self = entity({
    limit: 1,
    sort: "nearest",
  });

  const show_target = compass.mcFunction(function* show_target() {
    // TODO: Figure out the particle function

    const playerFollowing = selector("@a", {
      scores: `{${sb.follow}=1..}`,
      nbt: nbt({ SelectedItem: { id: "minecraft:compass" } }),
    });

    const self = playerFollowing({ sort: "nearest", limit: 1 });

    yield effect(`give`, "@s", "minecraft:glowing", 1, 0, true);
    for (let distance = 1; distance <= 3; distance++) {
      yield execute()
        .at(playerFollowing)
        // find the player that is following me (@s)
        .if(`score ${self} ${sb.follow} = @s ${sb.id}`)
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
    .if(`score ${self} ${sb.id} = @s ${sb.follow}`)
    .as(self)
    .run(show_target);
});
mcTick(
  compass.mcFunction(function* tick_track() {
    yield execute()
      .as(`@a[nbt={SelectedItem:{id:"minecraft:compass"}}]`)
      .at(`@s`)
      .run(find_target);
  })
);
