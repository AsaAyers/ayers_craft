# Generated by ts-datapack

scoreboard players set #compass_player_locator cpl.searching 1

scoreboard players add #compass_player_locator cpl.id 0

execute if score #compass_player_locator cpl.id < #compass_player_locator cpl.searching run scoreboard players set #compass_player_locator cpl.id 1

