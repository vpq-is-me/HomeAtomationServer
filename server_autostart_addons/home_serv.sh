#!/bin/bash

############################################################
#For auto-start ability of this script after reboot you should
# 1. create ".desktop" file. e.g. "vpq_auto.desktop"
# 2. populate this file with:
#***************************************
#	[Desktop Entry]
#	Type=Application
#	Name=HomeAuto
#	Exec=/home/pi/Desktop/home_serv.sh
#***************************************
# Note: string "Name=HomeAuto" is optinal.
# 3. Put this file in '/home/pi/.config/autostart' directory.
############################################################


cd "$HOME/Desktop"
SESSION="Home"
BLESERV="BLEserv"
BLECLIENT="BLEcons"
NODESERV="node_serv"
WAITBOOTUP=60

tmux new-session -d -s $SESSION 
lxterminal -T "HomeAuto" --command="bash -c \"tmux attach; exec bash\"" &
tmux rename-window $BLESERV
tmux set -w window-style bg='#1F618D'
tmux send-keys -t $BLESERV "#Wait a minute finish bootup before continue..." Enter
sleep $WAITBOOTUP
tmux send-keys -t $BLESERV '/home/pi/Work/CodeBlocks_projects/UART_server/bin/Debug/UART_SocServ_test' Enter
 #tmux select-pane -t $BLECLIENT.0 -T "ttttiii"
sleep 3

tmux new-window -n $BLECLIENT
tmux split-window
tmux set -w window-style bg='#424949'
tmux new-window -n $NODESERV
tmux split-window
tmux set -w window-style bg='#154360'
tmux select-window -t $BLESERV

tmux select-window -t $BLECLIENT
tmux send-keys -t $BLECLIENT.0 '/home/pi/Work/CodeBlocks_projects/water_pump-manager/bin/Debug/WaterPumpManager' Enter
tmux send-keys -t $BLECLIENT.1 '/home/pi/Work/CodeBlocks_projects/SepticManager/bin/Debug/SepticManager' Enter
sleep 3
tmux select-window -t $NODESERV
tmux send-keys -t $NODESERV.0 'cd /home/pi/Work/nodeJS_projects/HomeAutomationServer; node app.js' Enter
sleep 10
tmux send-keys -t $NODESERV.1 'cd /home/pi/Work/nodeJS_projects/ElMeterCalcSumm; node app.js' Enter
sleep 10
xdg-open http://localhost:8080 > /dev/null 2>&1
exit
