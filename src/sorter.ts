/* eslint-disable @typescript-eslint/camelcase */
import config from "../mss_config.json";
import DataPack, {
  TextNode,
  mcTick,
  McFunction,
  nbt,
  command,
} from "@asaayers/ts-datapack";

const cooldownPlayer = "#ac_cooldown";
const tickPlayer = "#ac_tick";
const ac = new DataPack("ayers_sort");
const scoreboard = ac.makeScoreboard("sort", {
  new_book: `trigger`,
  tick: "dummy",
  cooldown: "dummy",
});
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

  const tellraw = ac.mcFunction(function* () {
    yield `
      tellraw @p ${nbt([
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
      ])}`.trim();
  }, `sort/help/${group.group_name}`);

  return {
    ...textNode,
    clickEvent: {
      action: "run_command",
      value: `/function ${tellraw}`,
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
        value: `/trigger ${scoreboard.new_book}`, // eslint-disable-line @typescript-eslint/no-use-before-define
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

const new_book = ac.mcFunction(function* new_book() {
  yield `
loot give @s loot ${book}
scoreboard players set @s ${scoreboard.new_book} 0
    `;
});

const sort = ac.mcFunction(function* sort() {
  yield `
execute at @s unless score ${cooldownPlayer} ${scoreboard.cooldown} matches 1 run playsound minecraft:entity.illusioner.mirror_move block @a[distance=..5] ~ ~ ~ 1.0 1.0
execute at @s unless score ${cooldownPlayer} ${scoreboard.cooldown} matches 1 run particle minecraft:entity_effect ~ ~ ~ 1 1 1 1 100
scoreboard players set ${cooldownPlayer} ${scoreboard.cooldown} 1
`;

  const groups: Record<string, McFunction> = {};

  function processGroup(group: GroupConfig): McFunction {
    if (groups[group.group_name] == null) {
      // Fallback to the player if no fallback was configured
      let fallback = `teleport @s @p`;

      if (group.fallback != null) {
        const fallbackGroup = config.groups.find(
          (g) => g.group_name === group.fallback
        );
        if (fallbackGroup == null) {
          throw new Error(`Failed to find fallback: ${group.fallback}`);
        }
        const fn = processGroup(fallbackGroup);
        fallback = `function ${fn}`;
      }

      groups[group.group_name] = ac.mcFunction(function* () {
        const targetFrame = ac.createSelector("@e", {
          type: "minecraft:item_frame",
          nbt: nbt({ Item: { id: group.item_frame } }),
          distance: "0..128",
        });

        yield command(
          "execute as @s",
          `if entity ${targetFrame}`,
          `at ${targetFrame({
            limit: 1,
            sort: "random",
          })}`,
          `run teleport @s ^ ^0.5 ^-0.5`
        );

        yield `execute as @s unless entity ${targetFrame} run ${fallback}`;
        yield `data merge entity @s {Motion:[0.0,0.0,0.0]}`;
      }, `sort/${group.group_name}`);
    }
    return groups[group.group_name];
  }

  for (let i = 0; i < config.groups.length; i++) {
    const group = config.groups[i];
    const fn = processGroup(group);
    for (const item of group.items) {
      yield `execute as @s if entity @s[type=item,nbt={Item:{id:"${item}"}}] run function ${fn}`;
    }
  }
}, "sort");

const second = ac.mcFunction(function* second() {
  yield `execute as @e[type=item] at @s if block ~ ~-1 ~ minecraft:lapis_block if block ~ ~-2 ~ minecraft:gold_block run function ${sort}`;
});

const tick = ac.mcFunction(function* tick() {
  const cleanup = ac.mcFunction(function* cleanup() {
    yield `scoreboard players set ${cooldownPlayer} ${scoreboard.cooldown} 0`;
  }, "sort/cleanup");

  yield `
scoreboard players add ${tickPlayer} ${scoreboard.tick} 1

# Every 1 second
execute if score ${tickPlayer} ${scoreboard.tick} matches 1 run function ${second}
execute if score ${tickPlayer} ${scoreboard.tick} matches 21 run function ${second}
execute if score ${tickPlayer} ${scoreboard.tick} matches 41 run function ${second}
execute if score ${tickPlayer} ${scoreboard.tick} matches 61 run function ${second}
execute if score ${tickPlayer} ${scoreboard.tick} matches 81 run function ${second}

# Every 1 second just after previous tick (cooldown)
execute if score ${tickPlayer} ${scoreboard.tick} matches 2 if score ${cooldownPlayer} ${scoreboard.cooldown} matches 1 run function ${cleanup}
execute if score ${tickPlayer} ${scoreboard.tick} matches 22 if score ${cooldownPlayer} ${scoreboard.cooldown} matches 1 run function ${cleanup}
execute if score ${tickPlayer} ${scoreboard.tick} matches 42 if score ${cooldownPlayer} ${scoreboard.cooldown} matches 1 run function ${cleanup}
execute if score ${tickPlayer} ${scoreboard.tick} matches 62 if score ${cooldownPlayer} ${scoreboard.cooldown} matches 1 run function ${cleanup}
execute if score ${tickPlayer} ${scoreboard.tick} matches 82 if score ${cooldownPlayer} ${scoreboard.cooldown} matches 1 run function ${cleanup}

# Reset at 100
execute if score ${tickPlayer} ${scoreboard.tick} matches 100.. run scoreboard players set ${tickPlayer} ${scoreboard.tick} 0
`;

  yield ` scoreboard players enable @a ${scoreboard.new_book} `;
  yield `execute as @p[scores={${scoreboard.new_book}=1}] at @s run function ${new_book}`;
});

mcTick(tick);
