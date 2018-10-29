updating to Composer Version 0.20.2 from 0.16.2

 (1) update both package.json files

    - composer version from 0.16 to 0.20
    - fabric client version from 1.0.4 to 1.2.2

 (2) update deployNetwork.sh

    - composer network start

        - from: composer network start -c PeerAdmin@hlfv1 -A admin -S adminpw -a $NETWORK_NAME.bna --file networkadmin.card
        - to: composer network start -c PeerAdmin@hlfv1 -A admin -S adminpw  --file networkadmin.card --networkName ${NETWORK_NAME} --networkVersion 0.1.5

    - check if card exists

        - from: if composer card list --name admin@$NETWORK_NAME > /dev/null; then
        - to: if composer card list -c admin@$NETWORK_NAME > /dev/null; then

 (3) startup.sh

    - composer card list

        - from: composer card list --name PeerAdmin@hlfv1
        - to: composer card list --card PeerAdmin@hlfv1

 (4) env.json

    - composer metadata

        from: "type": "hlfv1",
        to: "x-type": "hlfv1",

 (5) queryBlockchain.js

    - exports.getChainEvents

        - add: peer = client.newPeer(config.fabric.peerRequestURL);
        - create event handler

            - from: var bcEvents = new hfcEH(client);
            - to: var bcEvents = new hfcEH(channel, peer);

    - replace 

        - from: const hfcEH = require('fabric-client/lib/EventHub');
        - to: const hfcEH = require('fabric-client/lib/ChannelEventHub');

 (6) pageStyles.class

    - from: 

        - .scrollingPaneLeft{
	    - height: 82%;
        - .scrollingPaneRight{
	    - height: 82%;
        - .blockchain {
	    - height: 8%;
        - .block {
	    - height: 90%;

    - to: 

        - .scrollingPaneLeft{
	    - height: 73%;
        - .scrollingPaneRight{
	    - height: 73%;
        - .blockchain {
	    - height: 8em;
        - .block {
	    - height: 98%;

 (7) z2c-admin.js

    - function getChainEvents()

        - from: 

            - $(content).append('<span class="block">block '+JSON.parse(message.data).header.number+'<br/>Hash: '+JSON.parse(message.data).header.data_hash+'</span>');

        - to: 
        
            - let _data =  JSON.parse(message.data);
            - $(content).append('<span class="block">block '+_data.channel_id+': '+_data.number+'<br/>Type: '+_data.filtered_transactions[0].type+'<br/>Hash: '+_data.filtered_transactions[0].txid+'</span>');

