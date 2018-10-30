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

// z2c-shipper.js

'use strict';

let sh_id;
let shipperJSON = {
    pageToLoad: 'shipper.html',
    body: 'shipperbody',
    notification: 'shipper_notify',
    orderDiv: 'shipperOrderDiv',
    clear: 'shipper_clear',
    clearAction: $('#shipperOrderDiv').empty,
    list: 'shipperOrderStatus',
    pageID: 'shipper',
    memberBody: 'shipper',
    names: 'shipperNames',
    company: 'shipperCompany',
    subscribe: 'Shipper',
    messages: 'shipper_messages',
    counter: 'shipper_count',
    array: {},
    alerts: new Array(),
    options: {},
    ml_text: 'sh_no_order_msg',
    list_cbfn: formatShipperOrders
    };

/**
 * used by the listOrders() function
 * formats the orders for a shipper. Orders to be formatted are provided in the _orders array
 * output replaces the current contents of the html element identified by _target
 * @param _target - string with div id prefaced by #
 * @param _orders - array with order objects
 */
function formatShipperOrders(_target, _orders)
{
    _target.empty();
    let _str = ''; let _date = ''; let _statusText;
    for (let each in _orders)
    {(function(_idx, _arr)
        { 
        //
        // each order can have different states and the action that a shipper can take is directly dependent on the state of the order. 
        // this switch/case table displays selected order information based on its current status and displays selected actions, which
        // are limited by the sate of the order.
        //
        // Throughout this code, you will see many different objects referemced by 'textPrompts.orderProcess.(something)' 
        // These are the text strings which will be displayed in the browser and are retrieved from the prompts.json file 
        // associated with the language selected by the web user.
        //
        let da = getShipperDataAndAction(_arr[_idx]);
        _date = da.date;
        _action = da.action;
        let _button = '<th><button id="sh_btn_'+_idx+'">'+textPrompts.orderProcess.ex_button+'</button></th>';
        _action += '</select>';
        console.log('shipper _action: '+_action);
        if (_idx > 0) {_str += '<div class="spacer"></div>';}
        _str += '<table class="wide"><tr><th>'+textPrompts.orderProcess.orderno+'</th><th>'+textPrompts.orderProcess.status+'</th><th class="right">'+textPrompts.orderProcess.total+'</th><th colspan="3" class="right message">Buyer: '+findMember(_arr[_idx].buyer.split('#')[1],buyerJSON.array).companyName+'</th></tr>';
        _str += '<tr><th id ="sh_order'+_idx+'" width="20%">'+_arr[_idx].id+'</th><th width="50%" id="sh_status'+_idx+'">'+JSON.parse(_arr[_idx].status).text+': '+_date+'</th><th class="right">$'+_arr[_idx].amount+'.00</th>'+_action+_statusText+'</th>'+_button+'</tr></table>';
        _str+= '<table class="wide"><tr align="center"><th>'+textPrompts.orderProcess.itemno+'</th><th>'+textPrompts.orderProcess.description+'</th><th>'+textPrompts.orderProcess.qty+'</th><th>'+textPrompts.orderProcess.price+'</th></tr>'
        for (let every in _arr[_idx].items)
        {(function(_idx2, _arr2)
        { let _item = JSON.parse(_arr2[_idx2]);
            _str += '<tr><td align="center">'+_item.itemNo+'</td><td>'+_item.description+'</td><td align="center">'+_item.quantity+'</td><td align="right">$'+_item.extendedPrice+'.00</td><tr>';
        })(every, _arr[_idx].items);
        }
        console.log(_str);
        _str += '</table>';
    })(each, _orders);
    }
    _target.append(_str);
    for (let each in _orders)
        {(function(_idx, _arr)
        { $('#sh_btn_'+_idx).on('click', function ()
            {
            let options = {};
            options.action = $('#sh_action'+_idx).find(':selected').text();
            options.orderNo = $('#sh_order'+_idx).text();
            options.participant = $('#shipperNames').val();
            options.delivery = $('#delivery'+_idx).val();
            if ((options.action === 'Resolve') || (options.action === 'Refund')) {options.reason = $('#sh_reason'+_idx).val();}
            console.log(options);
            $('#'+shipperJSON.messages).prepend(formatMessage(textPrompts.orderProcess.processing_msg.format(options.action, options.orderNo)));
            $.when($.post('/composer/client/orderAction', options)).done(function (_results)
            { console.log(_results);
                $('#'+shipperJSON.messages).prepend(formatMessage(_results.result));
            });
        });
            if (notifyMe(shipperJSON.alerts, _arr[_idx].id)) {$("#sh_status"+_idx).addClass('highlight'); }
        })(each, _orders);
    }
    shipperJSON.alerts = new Array();
    toggleAlert($('#'+shipperJSON.notification), shipperJSON.alerts, shipperJSON.counter);
  }

  function getShipperDateAndTime(_element)
  {
    let _action = '<th><select id=sh_action'+_idx+'><option value="'+textPrompts.orderProcess.NoAction.select+'">'+textPrompts.orderProcess.NoAction.message+'</option>';
    _statusText = '';
    switch (JSON.parse(_element.status).code)
    {
    case orderStatus.ShipRequest.code:
        _date = _element.requestShipment;
        _action += '<option value="'+textPrompts.orderProcess.Delivering.select+'">'+textPrompts.orderProcess.Delivering.message+'</option>';
        _statusText = '<br/>'+textPrompts.orderProcess.Delivering.prompt+'<input id="delivery'+_idx+'" type="text"></input>';
        break;
    case orderStatus.Delivering.code:
        _date = _element.delivering;
        _action += '<option value="'+textPrompts.orderProcess.Delivering.select+'">'+textPrompts.orderProcess.Delivering.message+'</option>';
        _action += '<option value="'+textPrompts.orderProcess.Delivered.select+'">'+textPrompts.orderProcess.Delivered.message+'</option>';
        _statusText = '<br/>'+textPrompts.orderProcess.Delivering.prompt+'<input id="delivery'+_idx+'" type="text"></input>';
        break;
    case orderStatus.Delivered.code:
        _date = _element.delivered;
        _statusText = '<br/>'+textPrompts.orderProcess.Delivering.prompt+'<input id="delivery'+_idx+'" type="text"></input>';
        break;
    case orderStatus.Dispute.code:
        _date = _element.disputeOpened+ '<br/>'+_element.dispute;
        _action += '<option value="'+textPrompts.orderProcess.Resolve.select+'">'+textPrompts.orderProcess.Resolve.message+'</option>';
        _action += '<option value="'+textPrompts.orderProcess.Refund.select+'">'+textPrompts.orderProcess.Refund.message+'</option>';
        _statusText = '<br/>'+textPrompts.orderProcess.Delivering.prompt+'<input id="delivery'+_idx+'" type="text"></input>';
        _statusText += '<br/>'+textPrompts.orderProcess.Refund.prompt+'<input id="sh_reason'+_idx+'" type="text"></input>';
        break;
    case orderStatus.Resolve.code:
        _date = _element.disputeResolved + '<br/>'+_element.resolve;
        break;
    case orderStatus.Cancelled.code:
        _date = _element.cancelled;
        break;
    case orderStatus.Paid.code:
        _date = _element.paid;
        break;
    default:
        console.log('OrderStatus not processed for: '+_element.status);
        break;
    }
return {date: _date, action: _action};
}