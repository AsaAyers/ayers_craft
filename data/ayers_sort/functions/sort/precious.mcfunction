# Generated by ts-datapack

execute as @s if entity @e[type=minecraft:item_frame,nbt={"Item":{"id":"minecraft:gold_ingot"}},distance=0..128] at @e[type=minecraft:item_frame,nbt={"Item":{"id":"minecraft:gold_ingot"}},distance=0..128,limit=1,sort=random] run teleport @s ^ ^0.5 ^-0.5

execute as @s unless entity @e[type=minecraft:item_frame,nbt={"Item":{"id":"minecraft:gold_ingot"}},distance=0..128] run function ayers_sort:sort/misc

data merge entity @s {Motion:[0.0,0.0,0.0]}

