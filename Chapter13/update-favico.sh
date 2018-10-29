#!/bin/bash
# script to retrieve a specific file from an IBM Cloud App (Cloud Foundry) local storage
# uses scp to get a specific file 
# Guidance here: https://docs.cloudfoundry.org/devguide/deploy-apps/ssh-apps.html

# $1 is the name of the app
. ../common_OSX.sh

declare APP_NAME="Z2B"

# get the guid of the app from IBM Cloud
declare guid=$(cf app ${APP_NAME} --guid)

# retrieving endpoint information
declare v2info=$(cf curl /v2/info)

# get the ssh endpoint, strip off trailing :pppp
# remember the port number
# get the endpoint string

declare tmpEndPoint=$(echo ${v2info} | jq '.app_ssh_endpoint')
# get the url
declare len=${#tmpEndPoint}-7
declare sshEndPoint=${tmpEndPoint:1:len}
# get the port #
declare len=${#tmpEndPoint}-5
declare sshPort=${tmpEndPoint:len:4}

# cf authentication format is: 
# cf:APP-GUID/APP-INSTANCE-INDEX@SSH-ENDPOINT
# scp authenticated request format is: 
# scp -P 2222 -o User=cf:APP-GUID/0 ssh.MY-DOMAIN.com:REMOTE-FILE-TO-RETRIEVE LOCAL-FILE-DESTINATION

declare FILE_PATH='HTML/'
# retrieve and print the ssh code required for this request
showStep "Type this value when asked for password: ${RED} $(cf ssh-code)${RESET}"
scp -P ${sshPort} -o User=cf:${guid}/0 HTML/favicon.ico ${sshEndPoint}:app/${FILE_PATH}favicon.ico 
