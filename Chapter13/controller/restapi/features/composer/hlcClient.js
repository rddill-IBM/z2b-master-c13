/*
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */


'use strict';
let fs = require('fs');
let path = require('path');
const BusinessNetworkConnection = require('composer-client').BusinessNetworkConnection;
const BusinessNetworkDefinition = require('composer-common').BusinessNetworkDefinition;
const config = require('../../../env.json');
const NS = 'org.acme.Z2BTestNetwork';
let itemTable = null;
const svc = require('./Z2B_Services');
const financeCoID = 'easymoney@easymoneyinc.com';
let bRegistered = false;

/**
 * get orders for buyer with ID =  _id
 * @param {express.req} req - the inbound request object from the client
 *  req.body.id - the id of the buyer making the request
 *  req.body.userID - the user id of the buyer in the identity table making this request
 *  req.body.secret - the pw of this user.
 * @param {express.res} res - the outbound response object for communicating back to client
 * @param {express.next} next - an express service to enable post processing prior to responding to the client
 * @returns {Array} an array of assets
 * @function
 */
exports.getMyOrders = function (req, res, next) {
    // connect to the network
    let methodName = 'getMyOrders';
    console.log(methodName+' req.body.userID is: '+req.body.userID );
    let allOrders = new Array();
    let businessNetworkConnection;
    if (svc.m_connection === null) {svc.createMessageSocket();}
    let ser;
    let archiveFile = fs.readFileSync(path.join(path.dirname(require.main.filename),'network','dist','zerotoblockchain-network.bna'));
    businessNetworkConnection = new BusinessNetworkConnection();
    return BusinessNetworkDefinition.fromArchive(archiveFile)
    .then((bnd) => {
        ser = bnd.getSerializer();
        //
        // v0.14
        // return businessNetworkConnection.connect(config.composer.connectionProfile, config.composer.network, req.body.userID, req.body.secret)
        //
        // v0.15
        console.log(methodName+' req.body.userID is: '+req.body.userID );
        return businessNetworkConnection.connect(req.body.userID)
        .then(() => {
            return businessNetworkConnection.query('selectOrders')
            .then((orders) => {
                allOrders = new Array();
                for (let each in orders)
                    { (function (_idx, _arr)
                        {
                        let _jsn = ser.toJSON(_arr[_idx]);
                        _jsn.id = _arr[_idx].orderNumber;
                        allOrders.push(_jsn);
                    })(each, orders);
                }
                res.send({'result': 'success', 'orders': allOrders});
            })
            .catch((error) => {console.log('selectOrders failed ', error);
                res.send({'result': 'failed', 'error': 'selectOrders: '+error.message});
            });
        })
        .catch((error) => {console.log('businessNetwork connect failed ', error);
            res.send({'result': 'failed', 'error': 'businessNetwork: '+error.message});
        });
    })
    .catch((error) => {console.log('create bnd from archive failed ', error);
        res.send({'result': 'failed', 'error': 'create bnd from archive: '+error.message});
    });
};


/**
 * return a json object built from the item table created by the autoload function
 * @param {express.req} req - the inbound request object from the client
 * @param {express.res} res - the outbound response object for communicating back to client
 * @param {express.next} next - an express service to enable post processing prior to responding to the client
 * return {Array} an array of assets
 * @function
 */
exports.getItemTable = function (req, res, next)
{
    if (itemTable === null)
    {
        let newFile = path.join(path.dirname(require.main.filename),'startup','itemList.txt');
        itemTable = JSON.parse(fs.readFileSync(newFile));
    }
    res.send(itemTable);
};

/**
 * orderAction - act on an order for a buyer
 * @param {express.req} req - the inbound request object from the client
 * req.body.action - string with buyer requested action
 * buyer available actions are:
 * Pay  - approve payment for an order
 * Dispute - dispute an existing order. requires a reason
 * Purchase - submit created order to seller for execution
 * Cancel - cancel an existing order
 * req.body.participant - string with buyer id
 * req.body.orderNo - string with orderNo to be acted upon
 * req.body.reason - reason for dispute, required for dispute processing to proceed
 * @param {express.res} res - the outbound response object for communicating back to client
 * @param {express.next} next - an express service to enable post processing prior to responding to the client
 * @returns {Array} an array of assets
 * @function
 */
exports.orderAction = function (req, res, next) {
    let methodName = 'orderAction';
    console.log(methodName+' req.body.participant is: '+req.body.participant );
    if (svc.m_connection === null) {svc.createMessageSocket();}
    let businessNetworkConnection;
    let updateOrder;
    businessNetworkConnection = new BusinessNetworkConnection();
    return businessNetworkConnection.connect(req.body.participant)
    .then(() => {
        return businessNetworkConnection.getAssetRegistry(NS+'.Order')
        .then((assetRegistry) => {
            return assetRegistry.get(req.body.orderNo)
            .then((order) => {
                let factory = businessNetworkConnection.getBusinessNetwork().getFactory();
                updateOrder = assessAction(factory, order, req.body);
                return businessNetworkConnection.submitTransaction(updateOrder)
                .then(() => {res.send({'result': ' order '+req.body.orderNo+' successfully updated to '+req.body.action});})
                .catch((error) => {
                    if (error.message.search('MVCC_READ_CONFLICT') !== -1)
                        {svc.loadTransaction(req.app.locals, updateOrder, req.body.orderNo, businessNetworkConnection);}
                    else
                    {res.send({'result': req.body.orderNo+' submitTransaction to update status to '+req.body.action+' failed with text: '+error.message});}
                });
            })
            .catch((error) => {res.send({'result': 'failed', 'error': 'Registry Get Order failed: '+error.message});});
        })
        .catch((error) => {res.send({'result': 'failed', 'error': 'Get Asset Registry failed: '+error.message});});
    })
    .catch((error) => {res.send({'result': 'failed', 'error': 'Get Asset Registry failed: '+error.message});});
};

function assessAction (_factory, _order, _body)
{
    let order = _order;
    let factory = _factory;
    order.status = _body.action;
    updateOrder = factory.newTransaction(NS, order.status);
    updateOrder.order = factory.newRelationship(NS, 'Order', order.$identifier);
    switch (order.status)
    {
    case 'Pay':
    case 'Request Payment':
        updateOrder.financeCo = factory.newRelationship(NS, 'FinanceCo', financeCoID);
        updateOrder.seller = factory.newRelationship(NS, 'Seller', order.seller.$identifier);
        break;
    case 'Dispute':
        updateOrder.financeCo = factory.newRelationship(NS, 'FinanceCo', financeCoID);
        updateOrder.buyer = factory.newRelationship(NS, 'Buyer', order.buyer.$identifier);
        updateOrder.seller = factory.newRelationship(NS, 'Seller', order.seller.$identifier);
        updateOrder.dispute = _body.reason;
        break;
    case 'Purchase':
    case 'Cancel':
        updateOrder.buyer = factory.newRelationship(NS, 'Buyer', order.buyer.$identifier);
        updateOrder.seller = factory.newRelationship(NS, 'Seller', order.seller.$identifier);
        break;
    case 'Order From Supplier':
        updateOrder.provider = factory.newRelationship(NS, 'Provider', _body.provider);
        updateOrder.seller = factory.newRelationship(NS, 'Seller', order.seller.$identifier);
        break;
    case 'Refund':
        updateOrder.seller = factory.newRelationship(NS, 'Seller', order.seller.$identifier);
        updateOrder.financeCo = factory.newRelationship(NS, 'FinanceCo', financeCoID);
        updateOrder.refund = _body.reason;
        break;
    case 'Resolve':
        updateOrder.buyer = factory.newRelationship(NS, 'Buyer', order.buyer.$identifier);
        updateOrder.shipper = factory.newRelationship(NS, 'Shipper', order.shipper.$identifier);
        updateOrder.provider = factory.newRelationship(NS, 'Provider', order.provider.$identifier);
        updateOrder.seller = factory.newRelationship(NS, 'Seller', order.seller.$identifier);
        updateOrder.financeCo = factory.newRelationship(NS, 'FinanceCo', financeCoID);
        updateOrder.resolve = _body.reason;
        break;
    case 'Request Shipping':
        updateOrder.shipper = factory.newRelationship(NS, 'Shipper', _body.shipper);
        updateOrder.provider = factory.newRelationship(NS, 'Provider', order.provider.$identifier);
        break;
    case 'Update Delivery Status':
        updateOrder.shipper = factory.newRelationship(NS, 'Shipper', _body.participant);
        updateOrder.deliveryStatus = _body.delivery;
        break;
    case 'Delivered':
        updateOrder.shipper = factory.newRelationship(NS, 'Shipper', _body.participant);
        break;
    case 'BackOrder':
        updateOrder.backorder = _body.reason;
        updateOrder.provider = factory.newRelationship(NS, 'Provider', order.provider.$identifier);
        break;
    case 'Authorize Payment':
        updateOrder.buyer = factory.newRelationship(NS, 'Buyer', order.buyer.$identifier);
        updateOrder.financeCo = factory.newRelationship(NS, 'FinanceCo', financeCoID);
        break;
    default :
        res.send({'result': 'failed', 'error':' order '+_body.orderNo+' unrecognized request: '+_body.action});
    }

}
/**
 * adds an order to the blockchain
 * @param {express.req} req - the inbound request object from the client
 * req.body.seller - string with seller id
 * req.body.buyer - string with buyer id
 * req.body.items - array with items for order
 * @param {express.res} res - the outbound response object for communicating back to client
 * @param {express.next} next - an express service to enable post processing prior to responding to the client
 * @returns {Array} an array of assets
 * @function
 */
exports.addOrder = function (req, res, next) {
    let methodName = 'addOrder';
    console.log(methodName+' req.body.buyer is: '+req.body.buyer );
    let businessNetworkConnection;
    let factory;
    let ts = Date.now();
    let orderNo = req.body.buyer.replace(/@/, '').replace(/\./, '')+ts;
    if (svc.m_connection === null) {svc.createMessageSocket();}
    businessNetworkConnection = new BusinessNetworkConnection();
    //
    // v0.14
    // return businessNetworkConnection.connect(config.composer.connectionProfile, config.composer.network, req.body.buyer, req.body.secret)
    //
    // v0.15
    return businessNetworkConnection.connect(req.body.buyer)
    //return businessNetworkConnection.connect(config.composer.adminCard)
    .then(() => {
        factory = businessNetworkConnection.getBusinessNetwork().getFactory();
        let order = factory.newResource(NS, 'Order', orderNo);
        order = svc.createOrderTemplate(order);
        order.amount = 0;
        order.orderNumber = orderNo;
        order.buyer = factory.newRelationship(NS, 'Buyer', req.body.buyer);
        order.seller = factory.newRelationship(NS, 'Seller', req.body.seller);
        order.provider = factory.newRelationship(NS, 'Provider', 'noop@dummy');
        order.shipper = factory.newRelationship(NS, 'Shipper', 'noop@dummy');
        order.financeCo = factory.newRelationship(NS, 'FinanceCo', financeCoID);
        for (let each in req.body.items)
        {(function(_idx, _arr)
            {   _arr[_idx].description = _arr[_idx].itemDescription;
            order.items.push(JSON.stringify(_arr[_idx]));
            order.amount += parseInt(_arr[_idx].extendedPrice);
        })(each, req.body.items);
        }
        // create the buy transaction
        const createNew = factory.newTransaction(NS, 'CreateOrder');

        createNew.order = factory.newRelationship(NS, 'Order', order.$identifier);
        createNew.buyer = factory.newRelationship(NS, 'Buyer', req.body.buyer);
        createNew.seller = factory.newRelationship(NS, 'Seller', req.body.seller);
        createNew.financeCo = factory.newRelationship(NS, 'FinanceCo', financeCoID);
        createNew.amount = order.amount;
        // add the order to the asset registry.
        return businessNetworkConnection.getAssetRegistry(NS+'.Order')
        .then((assetRegistry) => {
            return assetRegistry.add(order)
                .then(() => {
                    return businessNetworkConnection.submitTransaction(createNew)
                    .then(() => {console.log(' order '+orderNo+' successfully added');
                        res.send({'result': ' order '+orderNo+' successfully added'});
                    })
                    .catch((error) => {
                        if (error.message.search('MVCC_READ_CONFLICT') !== -1)
                            {console.log(orderNo+' retrying assetRegistry.add for: '+orderNo);
                            svc.loadTransaction(req.app.locals, createNew, orderNo, businessNetworkConnection);
                        }
                        else
                        {console.log(orderNo+' submitTransaction failed with text: ',error.message);}
                    });
                })
                .catch((error) => {
                    if (error.message.search('MVCC_READ_CONFLICT') !== -1)
                        {console.log(orderNo+' retrying assetRegistry.add for: '+orderNo);
                        svc.loadTransaction(req.app.locals, createNew, orderNo, businessNetworkConnection);
                    }
                    else
                    {
                        console.log(orderNo+' assetRegistry.add failed: ',error.message);
                        res.send({'result': 'failed', 'error':' order '+orderNo+' getAssetRegistry failed '+error.message});
                    }
                });
        })
        .catch((error) => {
            console.log(orderNo+' getAssetRegistry failed: ',error.message);
            res.send({'result': 'failed', 'error':' order '+orderNo+' getAssetRegistry failed '+error.message});
        });
    })
    .catch((error) => {
        console.log(methodName + ' : '+orderNo+' business network connection failed: text',error.message);
        res.send({'result': 'failed', 'error':' order '+orderNo+' add failed on on business network connection '+error.message});
    });
};

/**
 * _monitor
 * @param {WebSocket} _conn - web socket to use for member event posting
 * @param {WebSocket} _f_conn - web sockect to use for FinanceCo event posting
 * @param {Event} _event - the event just emitted
 *
 */
function _monitor(locals, _event)
{
    let methodName = '_monitor';
    console.log(methodName+ ' _event received: '+_event.$type+' for Order: '+_event.orderID);
    // create an event object and give it the event type, the orderID, the buyer id and the eventID
    // send that event back to the requestor
    let event = {};
    event.type = _event.$type;
    event.orderID = _event.orderID;
    event.ID = _event.buyerID;
    svc.send(locals, 'Alert',JSON.stringify(event));

    // using switch/case logic, send events back to each participant who should be notified.
    // for example, when a seller requests payment, they should be notified when the transaction has completed
    // and the financeCo should be notified at the same time.
    // so you would use the _conn connection to notify the seller and the
    // _f_conn connection to notify the financeCo

    switch (_event.$type)
    {
    case 'Created':
        break;
    case 'Bought':
    case 'PaymentRequested':
        event.ID = _event.sellerID;
        svc.send(locals, 'Alert',JSON.stringify(event));
        event.ID = _event.financeCoID;
        svc.send(locals, 'Alert',JSON.stringify(event));
        break;
    case 'Ordered':
    case 'Cancelled':
    case 'Backordered':
        event.ID = _event.sellerID;
        svc.send(locals, 'Alert',JSON.stringify(event));
        event.ID = _event.providerID;
        svc.send(locals, 'Alert',JSON.stringify(event));
        break;
    case 'ShipRequest':
    case 'DeliveryStarted':
    case 'DeliveryCompleted':
        event.ID = _event.sellerID;
        svc.send(locals, 'Alert',JSON.stringify(event));
        event.ID = _event.providerID;
        svc.send(locals, 'Alert',JSON.stringify(event));
        event.ID = _event.shipperID;
        svc.send(locals, 'Alert',JSON.stringify(event));
        break;
    case 'DisputeOpened':
    case 'Resolved':
    case 'Refunded':
    case 'Paid':
        event.ID = _event.sellerID;
        svc.send(locals, 'Alert',JSON.stringify(event));
        event.ID = _event.providerID;
        svc.send(locals, 'Alert',JSON.stringify(event));
        event.ID = _event.shipperID;
        svc.send(locals, 'Alert',JSON.stringify(event));
        event.ID = _event.financeCoID;
        svc.send(locals, 'Alert',JSON.stringify(event));
        break;
    case 'PaymentAuthorized':
        event.ID = _event.sellerID;
        svc.send(locals, 'Alert',JSON.stringify(event));
        event.ID = _event.financeCoID;
        svc.send(locals, 'Alert',JSON.stringify(event));
        break;
    default:
        break;
    }

}

/**
 * Register for all of the available Z2BEvents
 * @param {express.req} req - the inbound request object from the client
 * @param {express.res} res - the outbound response object for communicating back to client
 * @param {express.next} next - an express service to enable post processing prior to responding to the client
 * @returns {Object} - returns are via res.send
*/
exports.init_z2bEvents = function (req, res, next)
{
    let methodName = 'init_z2bEvents';
    if (bRegistered) {res.send('Already Registered');}
    else{
        bRegistered = true;
//        svc.createAlertSocket();
        let businessNetworkConnection;
        businessNetworkConnection = new BusinessNetworkConnection();
        businessNetworkConnection.setMaxListeners(50);
        //
        // v0.14
        // return businessNetworkConnection.connect(config.composer.connectionProfile, config.composer.network, config.composer.adminID, config.composer.adminPW)
        //
        // v0.15
        return businessNetworkConnection.connect(config.composer.adminCard)
        .then(() => {
            // using the businessNetworkConnection, start monitoring for events.
            // when an event is provided, call the _monitor function, passing in the al_connection, f_connection and event information
            businessNetworkConnection.on('event', (event) => {_monitor(req.app.locals, event); });
            res.send('event registration complete');
        }).catch((error) => {
            // if an error is encountered, log the error and send it back to the requestor
            console.log(methodName+' business network connection failed'+error.message);
            res.send(methodName+' business network connection failed'+error.message);
        });
    }
};
