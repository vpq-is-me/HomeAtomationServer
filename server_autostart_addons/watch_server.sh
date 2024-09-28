#!/bin/bash

########################################################################
# for automatically start this script in scheduler manner it should be:
# 1. open 'crontab' file by call 'crontab -e' in terminal
# 2. put in next string at the end of file:
#      */5 * * * * /home/pi/Desktop/watch_server.sh
#      */5 * * * * /bin/bash -c "/home/pi/Desktop/watch_server.sh"
# 3. save file
########################################################################
HOME_SERV_START_SH_DIR="/home/pi/Desktop/"
COMMON_ERROR_FILE="common_error_log.txt"
#echo "$0 $(date)>: crone tested" >> ${HOME_SERV_START_SH_DIR}$COMMON_ERROR_FILE
######################################################
# check if server is hang-up
######################################################
JSFILE=$(curl http://localhost:8080/jfile --silent)
IN_TROUBLE=0
if [[ $JSFILE == *"last_time"* ]]; then
    LAST_TIME=$(echo ${JSFILE} | jq -r '.last_time')
    #convert and add some allowed delay time from last message, e.g. 60 seconds
    LAST_TIME_sec=$(($(date -d "$LAST_TIME" +%s) + 60))
    if [ $(date -d "$LAST_TIME" +%H) = '23' -a $(date +%H) = '00' ];then
        LAST_TIME_sec=$((${LAST_TIME_sec}+24*60*60))
    fi

    if [[ ${LAST_TIME_sec} -lt $(date +%s) ]]; then
        IN_TROUBLE=1
    fi
    echo "last received time $LAST_TIME (in sec ${LAST_TIME_sec})"
    echo "current time is $(date +%T) (in sec $(date +%s))"
else
    IN_TROUBLE=1
    echo "No answer"
fi

if [[ ${IN_TROUBLE} -ne 0 ]]; then
    echo "in trouble"
else
    echo "all good"
    exit
fi
######################################################
# some problem with server. Have to restart
######################################################
function search_chield {
    local ch_list=$(ps --ppid "$1" | grep -v PID | awk '{print $1}')
    local next_chield_ext
    declare -n list_arr=$2
    for next_chield in $ch_list
    do
        if [ -z $next_chield ];then
            exit
        else
            list_arr+=($next_chield)
            next_chield_ext=$(ps -p $next_chield -o "pid cmd" --no-headers )
            echo "$next_chield_ext"
            search_chield $next_chield $2
        fi
    done
}

home_terminal_ID=$(ps -ef | grep "bash" | grep "tmux" | grep "attach" | grep -v "grep" | awk 'FNR==1 {print $2}')
tmux_root_ID=$(ps -ef | grep "tmux" | grep "new-session" | grep "Home" | awk 'FNR==1 {print $2}')
printf "child list of tmux session Home (ID=$tmux_root_ID):\n"
tmux_list_arr=()
search_chield $tmux_root_ID tmux_list_arr

printf "\n"
printf "kill processes with -s SIGINT options:\n"
for (( i=(( ${#tmux_list_arr[@]}-1 )); i>=0; i-- ))
do
    echo "${tmux_list_arr[$i]}"
    kill -s SIGINT ${tmux_list_arr[$i]}
done
sleep 1
printf "\n kill processes with -s SIGTERM options:\n"
sleep 1
for (( i=(( ${#tmux_list_arr[@]}-1 )); i>=0; i-- ))
do
    echo "${tmux_list_arr[$i]}"
    kill -s SIGTERM ${tmux_list_arr[$i]}
done

printf "\n killing tmux session Home\n"
sleep 1
tmux kill-session -t "Home"


printf "killing terminal with HomeAuto script ID=$home_terminal_ID\n"
kill -s SIGKILL $home_terminal_ID

chr=$(ps -ef | grep "chromium" | grep -v "grep" | awk 'FNR==1 {print $2}' )
printf "close chromium with ID=$chr\n"
kill $chr

printf "\n Restart home_serv.sh \n"
sleep 3
echo "$0 $(date)>: Server restarted by watchdog" >> ${HOME_SERV_START_SH_DIR}$COMMON_ERROR_FILE
echo "launch ${HOME_SERV_START_SH_DIR}home_serv.sh"

# in case of launched from cron we have to provide cron with some environment values
if [ -z $(printenv DISPLAY) ]; then
	echo "ENV value absent"
    SHELL=/bin/bash
    PATH=/home/pi/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/usr/local/games:/usr/games
	export DISPLAY=:0
else 
	echo "ENV value is present"
fi

${HOME_SERV_START_SH_DIR}home_serv.sh
exit
