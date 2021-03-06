/* eslint-disable @typescript-eslint/camelcase */
import config from "../mss_config.json";
import DataPack, {
  TextNode,
  McFunction,
  nbt,
  command,
  tellraw,
  scoreboard,
  execute,
  teleport,
  loot,
  Particle,
  particle,
} from "../ts-datapack/src";
import { Command } from "../ts-datapack/src/types";
import { selector } from "../ts-datapack/src/datapack";

const cooldownPlayer = "#ac_cooldown";
const tickPlayer = "#ac_tick";
const ac = new DataPack("ayers_sort", "sort");
const new_book = ac.objective("new_book", `trigger`);
const tickObjective = ac.objective("tick", "dummy");
const cooldown = ac.objective("cooldown", "dummy");
export default ac;

type GroupConfig = {
  group_name: string;
  item_frame: string;
  fallback?: string;
  items: string[];
};

function formatGroup(group: GroupConfig): TextNode {
  const stripPrefix = (str: string): string => str.replace("minecraft:", "");

  const textNode: TextNode = {
    text: group.group_name,
    color: "dark_purple",
    hoverEvent: {
      action: "show_text",
      value: [
        {
          text: `
frame: ${stripPrefix(group.item_frame)}${
            group.fallback ? "\nfallback: " + stripPrefix(group.fallback) : ""
          }
          `.trim(),
          color: "yellow",
        },
      ],
    },
  };

  const tRaw = ac.mcFunction(function* () {
    yield tellraw("@p", [
      "Group ",
      textNode,
      ":\n",
      ...group.items.map((item) => [
        "* ",
        {
          text: `${stripPrefix(item)}`,
          hoverEvent: {
            action: "show_item",
            value: nbt({
              id: stripPrefix(item),
              Count: 1,
              display: {
                Name: "A Cake",
                Lore: ["Made by", "Steve & Alex", "With Love <3"],
              },
            }),
          },
        },
        "\n",
      ]),
    ]);
  }, `sort/help/${group.group_name}`);

  return {
    ...textNode,
    clickEvent: {
      action: "run_command",
      value: `/function ${tRaw}`,
    },
  };
}
const book = ac.makeLootTable("book", () => {
  const groups = config.groups.map(formatGroup);
  const pages: TextNode[][][] = [];

  let page: TextNode[][] = [];
  page.push([
    {
      text: "Item Sorter Groups",
      clickEvent: {
        action: "run_command",
        value: `/trigger ${new_book}`, // eslint-disable-line @typescript-eslint/no-use-before-define
      },
    },
    "\n",
  ]);

  let lineLength = 0;
  let line: TextNode[] = [];
  groups.forEach((group, idx) => {
    line.push(group);

    // group is always an object, but I need this check to convince TypeScript
    if (typeof group !== "string") {
      lineLength += group.text.length;
      if (idx % 2 == 0) {
        line.push(
          Array(Math.max(0, 12 - lineLength))
            .fill(null)
            .join(" ")
        );
      } else {
        line.push("\n");
        page.push(line);
        line = [];
        lineLength = 0;
        if (page.length === 14) {
          pages.push(page);
          page = [];
        }
      }
    }
  });
  pages.push(page);

  return {
    type: "minecraft:loot",
    pools: [
      {
        rolls: 1,
        entries: [
          {
            type: "minecraft:item",
            name: "minecraft:written_book",
            functions: [
              {
                function: "minecraft:set_nbt",
                tag: nbt({
                  title: "AyersCraft",
                  author: "Urgaak",
                  pages: pages.map((page) => nbt(page.flat())),
                  // pages: [nbt([...groupLines[0], ...groupLines[1]])],
                }),
              },
            ],
          },
        ],
      },
    ],
  };
});

const get_new_book = ac.mcFunction(function* get_new_book() {
  yield loot("give", "@s").source("loot", book);
  yield scoreboard("players", "set", "@s", new_book, 0);
});

const sort = ac.mcFunction(function* sort() {
  yield execute()
    .at("@s")
    .unless(`score ${cooldownPlayer} ${cooldown} matches 1`)
    .run(
      command(
        `playsound minecraft:entity.illusioner.mirror_move block @a[distance=..5] ~ ~ ~ 1.0 1.0`
      )
    );
  yield execute()
    .at("@s")
    .unless(`score ${cooldownPlayer} ${cooldown} matches 1`)
    .run(particle(Particle.entity_effect, `~ ~ ~`, `1 1 1`, 1, 100));
  yield scoreboard("players", "set", cooldownPlayer, cooldown, 1);

  const groups: Record<string, McFunction> = {};

  function processGroup(group: GroupConfig): McFunction {
    if (groups[group.group_name] == null) {
      // Fallback to the player if no fallback was configured
      let fallback: Command | McFunction = teleport("@s", "@p");

      if (group.fallback != null) {
        const fallbackGroup = config.groups.find(
          (g) => g.group_name === group.fallback
        );
        if (fallbackGroup == null) {
          throw new Error(`Failed to find fallback: ${group.fallback}`);
        }
        const fn = processGroup(fallbackGroup);
        fallback = fn;
      }

      groups[group.group_name] = ac.mcFunction(function* () {
        const targetFrame = selector("@e", {
          type: "minecraft:item_frame",
          nbt: nbt({ Item: { id: group.item_frame } }),
          distance: "0..128",
        });

        yield execute()
          .as("@s")
          .if(`entity ${targetFrame}`)
          .at(
            targetFrame({
              limit: 1,
              sort: "random",
            })
          )
          .run(teleport("@s", "^ ^0.5 ^-0.5"));

        yield execute().as("@s").unless(`entity ${targetFrame}`).run(fallback);
        yield command(`data merge entity @s {Motion:[0.0,0.0,0.0]}`);
      }, `sort/${group.group_name}`);
    }
    return groups[group.group_name];
  }

  for (let i = 0; i < config.groups.length; i++) {
    const group = config.groups[i];
    const fn = processGroup(group);
    for (const item of group.items) {
      yield execute()
        .as("@s")
        .if(`entity @s[type=item,nbt={Item:{id:"${item}"}}]`)
        .run(fn);
    }
  }
}, "sort");

const second = ac.mcFunction(function* second() {
  yield execute()
    .as("@e[type=item]")
    .at("@s")
    .if(`block ~ ~-1 ~ minecraft:lapis_block`)
    .if(`block ~ ~-2 ~ minecraft:gold_block`)
    .run(sort);
});

const tick = ac.mcFunction(function* tick() {
  const cleanup = ac.mcFunction(function* cleanup() {
    yield scoreboard("players", "set", cooldownPlayer, cooldown, 0);
  }, "sort/cleanup");

  yield scoreboard("players", "add", tickPlayer, tickObjective, 1);

  yield execute()
    .if(`score ${tickPlayer} ${tickObjective} matches 1`)
    .run(second);
  yield execute()
    .if(`score ${tickPlayer} ${tickObjective} matches 21`)
    .run(second);
  yield execute()
    .if(`score ${tickPlayer} ${tickObjective} matches 41`)
    .run(second);
  yield execute()
    .if(`score ${tickPlayer} ${tickObjective} matches 61`)
    .run(second);
  yield execute()
    .if(`score ${tickPlayer} ${tickObjective} matches 81`)
    .run(second);

  yield execute()
    .if(`score ${tickPlayer} ${tickObjective} matches 2`)
    .if(`score ${cooldownPlayer} ${cooldown} matches 1`)
    .run(cleanup);
  yield execute()
    .if(`score ${tickPlayer} ${tickObjective} matches 22`)
    .if(`score ${cooldownPlayer} ${cooldown} matches 1`)
    .run(cleanup);
  yield execute()
    .if(`score ${tickPlayer} ${tickObjective} matches 42`)
    .if(`score ${cooldownPlayer} ${cooldown} matches 1`)
    .run(cleanup);
  yield execute()
    .if(`score ${tickPlayer} ${tickObjective} matches 62`)
    .if(`score ${cooldownPlayer} ${cooldown} matches 1`)
    .run(cleanup);
  yield execute()
    .if(`score ${tickPlayer} ${tickObjective} matches 82`)
    .if(`score ${cooldownPlayer} ${cooldown} matches 1`)
    .run(cleanup);

  yield execute()
    .if(`score ${tickPlayer} ${tickObjective} matches 100..`)
    .run(scoreboard("players", "set", tickPlayer, tickObjective, 0));

  yield scoreboard("players", "enable", "@a", new_book);
  yield execute().as(`@p[scores={${new_book}=1}]`).at("@s").run(get_new_book);
});

ac.register({
  tags: {
    functions: {
      "minecraft:tick": [tick],
    },
  },
});
