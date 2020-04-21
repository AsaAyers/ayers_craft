import DataPack, {
  execute,
  nbt,
  scoreboard,
  McFunction,
  command,
} from "../ts-datapack/src";
import { selector } from "../ts-datapack/src/datapack";
import { Tag, Command } from "../ts-datapack/src/types";

export function hold(
  dp: DataPack,
  prefix: string,
  item: string,
  callback: McFunction
): void {
  const a = selector("@a");
  const s = selector("@s");
  const holdingParams = {
    nbt: nbt({
      SelectedItem: {
        id: item,
      },
    }),
  };
  const holding = dp.objective(`${prefix}_hold`, "dummy");
  const tick = dp.mcFunction(function* () {
    yield scoreboard("players", "add", "@a", holding, 0);
    yield execute()
      .as(
        a({
          ...holdingParams,
          scores: `{${holding}=0}`,
        })
      )
      .at("@s")
      .run(callback);
    yield execute()
      .as(
        a({
          ...holdingParams,
          scores: `{${holding}=0}`,
        })
      )
      .at("@s")
      .run(scoreboard("players", "set", "@s", holding, 1));
    yield execute()
      .as(a({ scores: `{${holding}=1}` }))
      .unless(`entity ${s(holdingParams)}`)
      .run(scoreboard("players", "set", "@s", holding, 0));
  }, `${prefix}/hold_tick`);
  dp.register({
    tags: {
      functions: {
        "minecraft:tick": [tick],
      },
    },
  });
}
export function makeMenu(
  dp: DataPack,
  id: string,
  options: Array<McFunction | Tag<"functions">>
): Command[] {
  const menu = dp.objective(`menu_${id}`, "trigger");
  const tick = dp.mcFunction(function* () {
    yield scoreboard("players", "enable", "@a", menu);
    const reset = scoreboard("players", "set", "@s", menu, 0);
    for (let i = 0; i < options.length; i++) {
      const callback = options[i];
      yield execute()
        .as(`@a[scores={${menu}=${i + 1}}]`)
        .at("@s")
        .run(callback);
    }
    yield execute().as(`@a[scores={${menu}=1..}]`).at("@s").run(reset);
  }, `menu/${id}_tick`);
  dp.register({
    tags: {
      functions: {
        "minecraft:tick": [tick],
      },
    },
  });
  return options.map((value, i) => {
    return command(`trigger ${menu} set ${i + 1}`);
  });
}
