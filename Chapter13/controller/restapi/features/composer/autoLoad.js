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

 /**
 * This file is used to automatically populate the network with Order assets and members
 * The opening section loads node modules required for this set of nodejs services
 * to work. Most of these are from the hyperledger composer SDK. This module also
 * uses services created specifically for this tutorial, in the Z2B_Services.js
 *  and Z2B_Utilities.js modules.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const _home = require('os').homedir();
const hlc_idCard = require('composer-common').IdCard;
const request = require('request');

const AdminConnection = require('composer-admin').AdminConnection;
const BusinessNetworkConnection = require('composer-client').BusinessNetworkConnection;
const financeCoID = 'easymoney@easymoneyinc.com';
const cfenv = require('cfenv');

const svc = require('./Z2B_Services');
const config = require('../../../env.json');
// 9/12/18 change to read connection.json from PeerAdmin@hlfv1 card
const admin_connection = require('./creds/cards/PeerAdmin@hlfv1/connection.json');
admin_connection.keyValStore = _home+config.keyValStore;
const memberDB = 'z2b_members';
const homedir = require('os').homedir();
const CLIENT_DATA = 'client-data'
const basePath = homedir+'/.composer/'+CLIENT_DATA+'/';
let protocolToUse;
if (cfenv.getAppEnv().isLocal)
    { protocolToUse = "http";  }
else
    { protocolToUse = "https"; }
/**
 * itemTable and memberTable are used by the server to reduce load time requests
 * for member secrets and item information
 */
let itemTable = new Array();
let memberTable = new Array();
/**
 * getLastRestart retrieves a timestamp for the last time the system was restarted
 * @param {express.req} req - the inbound request object from the client
 * @param {express.res} res - the outbound response object for communicating back to client
 * @param {express.next} next - an express service to enable post processing prior to responding to the client
 */
exports.getLastRestart = function( req, res, next)
{
    let methodName = 'getLastRestart';
    const _id = 'noop@dummyProvider';
    svc.getThisMember(req.app.locals, memberDB, _id, req.headers.host)
    .then((_res) => {res.send({result: 'success', timeStamp: JSON.parse(_res).lastUpdated}); });
}
/**
 * autoLoad reads the memberList.json file from the Startup folder and adds members,
 * executes the identity process, and then loads orders
 *
 * @param {express.req} req - the inbound request object from the client
 * @param {express.res} res - the outbound response object for communicating back to client
 * @param {express.next} next - an express service to enable post processing prior to responding to the client
 * saves a table of members and a table of items
 * @function
 */
exports.autoLoad = function(req, res, next) {
    let methodName = 'autoLoad';
    console.log(methodName+' entered.');
    // connect to the member table
    svc.connectToDB(memberDB, req.headers.host)
    .then((_conn_res) => {
        // get the autoload file
        let startupFile = JSON.parse(fs.readFileSync(path.join(path.dirname(require.main.filename),'startup','memberList.json')));
        // connect to the network
        let businessNetworkConnection;
        let factory; let participant;
        let adminConnection = new AdminConnection();
        adminConnection.connect(config.composer.adminCard)
        .then(() => {
            // a businessNetworkConnection is required to add members
            businessNetworkConnection = new BusinessNetworkConnection();
            return businessNetworkConnection.connect(config.composer.adminCard)
            .then(() => {
                // a factory is required to build the member object
                factory = businessNetworkConnection.getBusinessNetwork().getFactory();
                //iterate through the list of members in the memberList.json file and
                // first add the member to the network, then create an identity for
                // them. This generates the memberList.txt file later used for
                // retrieving member secrets.
                for (let each in startupFile.members)
                    {(function(_idx, _arr)
                        {
                        // the participant registry is where member information is first stored
                        // there are individual registries for each type of participant, or member.
                        // In our case, that is Buyer, Seller, Provider, Shipper, FinanceCo
                        return businessNetworkConnection.getParticipantRegistry(config.composer.NS+'.'+_arr[_idx].type)
                        .then(function(participantRegistry){
                            return participantRegistry.get(_arr[_idx].id)
                            .then((_res) => {
                                svc.getThisMember(req.app.locals, memberDB, _arr[_idx].id, req.headers.host)
                                .then((_res) => {
                                    let member = JSON.parse(_res);
                                    let options = {};
                                    options.registry = member.type;
                                    let _meta = {};
                                    for (each in config.composer.metaData)
                                    {(function(_idx, _obj) {_meta[_idx] = _obj[_idx]; })(each, config.composer.metaData); }
                                    _meta.businessNetwork = config.composer.network;
                                    _meta.userName = member.id;
                                    _meta.enrollmentSecret = member.secret;
                                    let tempCard = new hlc_idCard(_meta, admin_connection);
                                    return adminConnection.importCard(member.id, tempCard)
                                    .then(() => {
                                        let currentMemberPath = path.join(basePath,member.id);
                                        fs.mkdirSync(currentMemberPath);
                                        for (let i=0; i<3; i++)
                                        {(function(_idx){fs.writeFileSync(path.join(basePath,member.id,member[CLIENT_DATA+_idx].name), member[CLIENT_DATA+_idx].file);})(i)}
                                    })
                                    .catch((error) => {console.log(methodName+' adminConnection.importCard for '+member.id+' failed with error: ', error);})
                                })
                                .catch((_error) => {console.log(methodName+' error: ',_error);});
                            })
                            .catch((error) => {
                                participant = factory.newResource(config.composer.NS, _arr[_idx].type, _arr[_idx].id);
                                participant.companyName = _arr[_idx].companyName;
                                participantRegistry.add(participant)
                                .then(() => {svc.send(req.app.locals, 'Message', '['+_idx+'] '+_arr[_idx].companyName+' successfully added');})
                                .then(() => {
                                    return businessNetworkConnection.issueIdentity(config.composer.NS+'.'+_arr[_idx].type+'#'+_arr[_idx].id, _arr[_idx].id)
                                    .then((result) => {
                                        let _mem = _arr[_idx];
                                        _mem.secret = result.userSecret;
                                        _mem.userID = result.userID;
                                        memberTable.push(_mem);
                                        let _meta = {};
                                        for (each in config.composer.metaData){(function(_idx, _obj) {_meta[_idx] = _obj[_idx]; })(each, config.composer.metaData); }
                                        _meta.businessNetwork = config.composer.network;
                                        _meta.userName = result.userID;
                                        _meta.enrollmentSecret = result.userSecret;
                                        let tempCard = new hlc_idCard(_meta, admin_connection);
                                        return adminConnection.importCard(result.userID, tempCard)
                                        .then ((_res) => {
                                            let bnc = new BusinessNetworkConnection();
                                            return bnc.connect(_arr[_idx].id)
                                            .then(() => {
                                                return bnc.ping()
                                                .then((_msg) => {
                                                    let currentMemberPath = path.join(basePath,result.userID);
                                                    let fileList = fs.readdirSync(currentMemberPath);
                                                    for (each in fileList)
                                                    {(function(_each, _files)
                                                        {let _file=fs.readFileSync(path.join(basePath,result.userID,_files[_each]), 'utf8');
                                                        _mem[CLIENT_DATA+_each]={'name': _files[_each], 'file': _file};})(each, fileList)
                                                    }
                                                    svc.saveToDB(memberDB, _mem, result.userID, req.headers.host);
                                                })
                                                .catch((error) => { console.log(methodName+' businessNetworkConnection.ping() failed. error: ',error); bnc.disconnect(); });
                                            })
                                            .catch((error) => { console.log(methodName+' businessNetworkConnection.connect() failed. error: ',error); bnc.disconnect(); });
                                        })
                                        .catch((error) => {console.error(methodName+' adminConnection.importCard failed. ',error.message);});
                                    })
                                    .catch((error) => {console.error(methodName+' create id for '+_arr[_idx].id+'failed. ',error.message);});
                                })
                                .catch((error) => {console.log(methodName+' '+_arr[_idx].companyName+' add failed',error.message);});
                            });
                        })
                    .catch((error) => {console.log(methodName+' error with getParticipantRegistry', error.message);});
                    })(each, startupFile.members);
                }
                setupItems({s_file: startupFile, svc: svc, bnc: businessNetworkConnection, f: factory, r: req});
            })
        .catch((error) => {console.log(methodName+' error with business network Connect', error.message);});
        })
        .catch((error) => {console.log(methodName+' error with adminConnect', error.message);});
        res.send({'result': 'Success'});
    })
    .catch((error) => {console.log(methodName+' '+methodName+' svc.connectToDB('+memberDB+', req.headers.host); failed with error: ', error);});
};

function setupItems(_el)
{
    let methodName= 'setupItems';
    console.log(methodName+' entered.');
    let _startupFile = _el.s_file;
    let _svc = _el.svc;
    let _bnc = _el.bnc;
    let _factory = _el.f;
    let req = _el.r;
    // iterate through the order objects in the memberList.json file.
    for (let each in _startupFile.items){(function(_idx, _arr){itemTable.push(_arr[_idx]);})(each, _startupFile.items);}
    _svc.saveItemTable(itemTable);
    console.log(methodName+' _startupFile.assets.length: '+_startupFile.assets.length);
    for (let each in _startupFile.assets)
        {(function(_idx, _arr)
            {
                console.log(methodName+' ['+_idx+']');
            // each type of asset, like each member, gets it's own registry. Our application
            // has only one type of asset: 'Order'
            return _bnc.getAssetRegistry(config.composer.NS+'.'+_arr[_idx].type)
            .then((assetRegistry) => {
                return assetRegistry.get(_arr[_idx].id)
                .then((_res) => {
                    console.log(methodName+' ['+_idx+'] order with id: '+_arr[_idx].id+' already exists in Registry '+config.composer.NS+'.'+_arr[_idx].type);
                    _svc.send(req.app.locals, 'Message', '['+_idx+'] order with id: '+_arr[_idx].id+' already exists in Registry '+config.composer.NS+'.'+_arr[_idx].type);
                })
                .catch((error) => {
                    let cn = setupOrder(config, _arr[_idx], _factory);
                    let order = cn.order;
                    let createNew = cn.createNew;
                    _svc.addOrder({locals: req.app.locals, order: order, registry: assetRegistry, cn: createNew, bnc: _bnc});
                });
            })
            .catch((error) => {console.log(methodName+' error with getParticipantRegistry', error.message);});
        })(each, _startupFile.assets);
    }
}


function setupOrder(_config, _element, _factory)
{
    let methodName = 'setupOrder';
    console.log(methodName+' entered with _element: ', _element);
    // first, an Order Object is created
    let order = svc.createOrderTemplate(_factory.newResource(_config.composer.NS, _element.type, _element.id));
    let _tmp = svc.addItems(_element, itemTable);
    order.items = _tmp.items;
    order.amount = _tmp.amount;
    order.orderNumber = _element.id;
    // then the buy transaction is created
    const createNew = _factory.newTransaction(_config.composer.NS, 'CreateOrder');
    order.buyer = _factory.newRelationship(_config.composer.NS, 'Buyer', _element.buyer);
    order.seller = _factory.newRelationship(_config.composer.NS, 'Seller', _element.seller);
    order.provider = _factory.newRelationship(_config.composer.NS, 'Provider', 'noop@dummyProvider');
    order.shipper = _factory.newRelationship(_config.composer.NS, 'Shipper', 'noop@dummyShipper');
    order.financeCo = _factory.newRelationship(_config.composer.NS, 'FinanceCo', financeCoID);
    createNew.financeCo = _factory.newRelationship(_config.composer.NS, 'FinanceCo', financeCoID);
    createNew.order = _factory.newRelationship(_config.composer.NS, 'Order', order.$identifier);
    createNew.buyer = _factory.newRelationship(_config.composer.NS, 'Buyer', _element.buyer);
    createNew.seller = _factory.newRelationship(_config.composer.NS, 'Seller', _element.seller);
    createNew.amount = order.amount;
    return {order: order, createNew: createNew};
}
