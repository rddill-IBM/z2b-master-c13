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

// z2c-seller.js

'use strict';
let s_id;
let sellerJSON = {
    pageToLoad: 'seller.html',
    body: 'sellerbody',
    notification: 'seller_notify',
    orderDiv: 'sellerOrderDiv',
    clear: 'seller_clear',
    clearAction: $('#sellerOrderDiv').empty,
    list: 'sellerOrderStatus',
    pageID: 'seller',
    memberBody: 'seller',
    names: 'sellerNames',
    company: 'sellerCompany',
    subscribe: 'Seller',
    messages: 'seller_messages',
    counter: 'seller_count',
    array: {},
    alerts: new Array(),
    options: {},
    listFunction: listSellerOrders
    };
       
/**
 * lists all orders for the selected seller
 */
function listSellerOrders()
{
    let options = {};
    //
    // seller instead of buyer
    //
    options.id= $('#'+sellerJSON.names).find(':selected').val();
    options.userID = options.id;
    $.when($.post('/composer/client/getMyOrders', options)).done(function(_results)
    {
        if (_results.orders.length < 1) {$('#sellerOrderDiv').empty(); $('#sellerOrderDiv').append(formatMessage(textPrompts.orderProcess.s_no_order_msg+options.id));}
        else{formatSellerOrders($('#sellerOrderDiv'), _results.orders);}
    });
}
/**
 * used by the listOrders() function
 * formats the orders for a buyer. Orders to be formatted are provided in the _orders array
 * output replaces the current contents of the html element identified by _target
 * @param {String} _target - string with div id prefaced by #
 * @param {Array} _orders - array with order objects
 */
function formatSellerOrders(_target, _orders)
{
    let methodName = 'formatSellerOrders';
    _target.empty();
    let _str = ''; let _date = '';
    for (let each in _orders)
    {(function(_idx, _arr)
        { let _action = '<th><select id=s_action'+_idx+'><option value="'+textPrompts.orderProcess.NoAction.select+'">'+textPrompts.orderProcess.NoAction.message+'</option>';
        //
        // each order can have different states and the action that a buyer can take is directly dependent on the state of the order. 
        // this switch/case table displays selected order information based on its current status and displays selected actions, which
        // are limited by the sate of the order.
        //
        // Throughout this code, you will see many different objects referemced by 'textPrompts.orderProcess.(something)' 
        // These are the text strings which will be displayed in the browser and are retrieved from the prompts.json file 
        // associated with the language selected by the web user.
        //
        switch (JSON.parse(_arr[_idx].status).code)
        {
        case orderStatus.PayRequest.code:
            _date = _arr[_idx].paymentRequested;
            break;
        case orderStatus.Bought.code:
            _date = _arr[_idx].bought;
            _action += '<option value="'+textPrompts.orderProcess.Order.select+'">'+textPrompts.orderProcess.Order.message+'</option>';
            break;
        case orderStatus.Delivered.code:
            _date = _arr[_idx].delivered;
            _action += '<option value="'+textPrompts.orderProcess.PayRequest.select+'">'+textPrompts.orderProcess.PayRequest.message+'</option>';
            break;
        case orderStatus.ShipRequest.code:
            _date = _arr[_idx].requestShipment;
            break;
        case orderStatus.Delivering.code:
            _date = _arr[_idx].delivering;
            break;
        case orderStatus.Ordered.code:
            _date = _arr[_idx].ordered;
            break;
        case orderStatus.Backordered.code:
            _date = _arr[_idx].dateBackordered + '<br/>'+_arr[_idx].backorder;
            break;
        case orderStatus.Dispute.code:
            _date = _arr[_idx].disputeOpened + '<br/>'+_arr[_idx].dispute;
            _action += '<option value="'+textPrompts.orderProcess.Resolve.select+'">'+textPrompts.orderProcess.Resolve.message+'</option>';
            _action += '<option value="'+textPrompts.orderProcess.Refund.select+'">'+textPrompts.orderProcess.Refund.message+'</option>';
            let _string = '<br/>'+textPrompts.orderProcess.Refund.prompt+'<input id="s_reason'+_idx+'" type="text"></input>';
            break;
        case orderStatus.Resolve.code:
            _date = _arr[_idx].disputeResolved + '<br/>'+_arr[_idx].resolve;
            _action += '<option value="'+textPrompts.orderProcess.PayRequest.select+'">'+textPrompts.orderProcess.PayRequest.message+'</option>';
            break;
        case orderStatus.Cancelled.code:
            _date = _arr[_idx].cancelled;
            break;
        case orderStatus.Paid.code:
            _date = _arr[_idx].paid;
            break;
        default:
            break;
        }
        let _button = '<th><button id="s_btn_'+_idx+'">'+textPrompts.orderProcess.ex_button+'</button></th>'
        _action += '</select>';
        if (_idx > 0) {_str += '<div class="spacer"></div>';}
        _str += '<table class="wide"><tr><th>'+textPrompts.orderProcess.orderno+'</th><th>'+textPrompts.orderProcess.status+'</th><th class="right">'+textPrompts.orderProcess.total+'</th><th colspan="3" class="right message">'+textPrompts.orderProcess.buyer+findMember(_arr[_idx].buyer.split('#')[1],buyers).companyName+'</th></tr>';
        _str += '<tr><th id ="s_order'+_idx+'" width="20%">'+_arr[_idx].id+'</th><th width="50%" id="s_status'+_idx+'">'+JSON.parse(_arr[_idx].status).text+': '+_date+'</th><th class="right">$'+_arr[_idx].amount+'.00</th>'+_action+'<br/><select id="providers'+_idx+'">'+providerJSON.options+'</th>'+_button+'</tr></table>';
        _str+= '<table class="wide"><tr align="center"><th>'+textPrompts.orderProcess.itemno+'</th><th>'+textPrompts.orderProcess.description+'</th><th>'+textPrompts.orderProcess.qty+'</th><th>'+textPrompts.orderProcess.price+'</th></tr>'
        for (let every in _arr[_idx].items)
        {(function(_idx2, _arr2)
        { let _item = JSON.parse(_arr2[_idx2]);
            _str += '<tr><td align="center">'+_item.itemNo+'</td><td>'+_item.description+'</td><td align="center">'+_item.quantity+'</td><td align="right">$'+_item.extendedPrice+'.00</td><tr>';
        })(every, _arr[_idx].items);
        }
        _str += '</table>';
    })(each, _orders);
    }

    _target.append(_str);
    for (let each in _orders)
    {(function(_idx, _arr)
      { $('#s_btn_'+_idx).on('click', function ()
        {
          let options = {};
          options.action = $('#s_action'+_idx).find(':selected').text();
          options.orderNo = $('#s_order'+_idx).text();
          options.participant = $('#'+sellerJSON.names).val();
          options.provider = $('#providers'+_idx).find(':selected').val();
          if ((options.action === 'Resolve') || (options.action === 'Refund')) {options.reason = $('#s_reason'+_idx).val();}
          $('#'+sellerJSON.messages).prepend(formatMessage(options.action+textPrompts.orderProcess.processing_msg.format(options.action, options.orderNo)+options.orderNo));
          $.when($.post('/composer/client/orderAction', options)).done(function (_results)
          { $('#'+sellerJSON.messages).prepend(formatMessage(_results.result)); });
      });
        if (notifyMe(sellerJSON.alerts, _arr[_idx].id)) {$('#s_status'+_idx).addClass('highlight'); }
    })(each, _orders);
    }
    sellerJSON.alerts = new Array();
    toggleAlert($('#'+sellerJSON.notification), sellerJSON.alerts, sellerJSON.counter);
}