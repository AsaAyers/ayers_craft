# Generated by ts-datapack

scoreboard players set @s cpl.follow_next 0

scoreboard players add @s cpl.follow 1

execute if score @s cpl.follow > #compass_player_locator cpl.id run scoreboard players set @s cpl.follow 1

execute if score @s cpl.follow = @s cpl.id run scoreboard players add @s cpl.follow 1

execute at @e[scores={cpl.id=1..}] if score @e[scores={cpl.id=1..},limit=1,sort=nearest] cpl.id = @s cpl.follow run scoreboard players set @s cpl.searching 0

execute if score @s cpl.searching = @s cpl.follow run scoreboard players set @s cpl.searching 0

execute if entity @s[scores={cpl.searching=1..}] run function compass_player_locator:change

execute if entity @s[scores={cpl.searching=0}] run function compass_player_locator:show_following
