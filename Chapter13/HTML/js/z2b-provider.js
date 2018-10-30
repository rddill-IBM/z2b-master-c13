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

// z2c-provider.js

'use strict';

let p_id;
let providerJSON = {
    pageToLoad: 'provider.html',
    body: 'providerbody',
    notification: 'provider_notify',
    orderDiv: 'providerOrderDiv',
    clear: 'provider_clear',
    clearAction: $('#providerOrderDiv').empty,
    list: 'providerOrderStatus',
    pageID: 'provider',
    memberBody: 'provider',
    names: 'providerNames',
    company: 'providerCompany',
    subscribe: 'Provider',
    messages: 'provider_messages',
    counter: 'provider_count',
    array: {},
    alerts: new Array(),
    options: {},
    ml_text: 'p_no_order_msg',
    list_cbfn: formatProviderOrders
    };

/**
 * used by the listOrders() function
 * formats the orders for a Provider. Orders to be formatted are provided in the _orders array
 * output replaces the current contents of the html element identified by _target
 * @param _target - string with div id prefaced by #
 * @param _orders - array with order objects
 */
function formatProviderOrders(_target, _orders)
{
    let methodName = 'formatProviderOrders';
    console.log(methodName+' entered. providerJSON.alerts is: ', providerJSON.alerts);
    _target.empty();
    let _str = ''; let _date = ''; let b_string;
    for (let each in _orders)
    {(function(_idx, _arr)
        { 
        //
        // each order can have different states and the action that a Provider can take is directly dependent on the state of the order. 
        // this switch/case table displays selected order information based on its current status and displays selected actions, which
        // are limited by the sate of the order.
        //
        // Throughout this code, you will see many different objects referemced by 'textPrompts.orderProcess.(something)' 
        // These are the text strings which will be displayed in the browser and are retrieved from the prompts.json file 
        // associated with the language selected by the web user.
        //
        let da = getProviderDataAndAction(_arr[_idx], _idx);
        _date = da.date;
        _action = da.action;
        let b_string = da.b_string;
        let _button = '<th><button id="p_btn_'+_idx+'">'+textPrompts.orderProcess.ex_button+'</button></th>'
        _action += '</select>';
        if (_idx > 0) {_str += '<div class="spacer"></div>';}
        _str += '<table class="wide"><tr><th>'+textPrompts.orderProcess.orderno+'</th><th>'+textPrompts.orderProcess.status+'</th><th class="right">'+textPrompts.orderProcess.total+'</th><th colspan="3" class="right message">'+textPrompts.orderProcess.buyer+findMember(_arr[_idx].buyer.split('#')[1],buyerJSON.array).companyName+'</th></tr>';
        _str += '<tr><th id ="p_order'+_idx+'" width="20%">'+_arr[_idx].id+'</th><th width="50%" id="p_status'+_idx+'">'+JSON.parse(_arr[_idx].status).text+': '+_date+'</th><th class="right">$'+_arr[_idx].amount+'.00</th>'+_action+'<br/><select id="shippers'+_idx+'">'+shipperJSON.options+b_string+'</th>'+_button+'</tr></table>';
        _str+= '<table class="wide"><tr align="center"><th>'+textPrompts.orderProcess.itemno+'</th><th>'+textPrompts.orderProcess.description+'</th><th>'+textPrompts.orderProcess.qty+'</th><th>'+textPrompts.orderProcess.price+'</th></tr>';
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
        { $('#p_btn_'+_idx).on('click', function ()
            {
            let options = {};
            options.action = $('#p_action'+_idx).find(':selected').text();
            options.orderNo = $('#p_order'+_idx).text();
            options.participant = $('#'+providerJSON.names).val();
            options.shipper = $('#shippers'+_idx).find(':selected').val();
            if ((options.action === 'Resolve') || (options.action === 'Refund') || (options.action === 'BackOrder')) {options.reason = $('#p_reason'+_idx).val();}
            console.log(options);
            $('#'+providerJSON.messages).prepend(formatMessage(options.action+textPrompts.orderProcess.processing_msg.format(options.action, options.orderNo)+options.orderNo));
            $.when($.post('/composer/client/orderAction', options)).done(function (_results)
            { console.log(_results);
                $('#'+providerJSON.messages).prepend(formatMessage(_results.result));
            });
        });
            if (notifyMe(_arr[_idx].id)) {$('#p_status'+_idx).addClass('highlight'); }
        })(each, _orders);
    }
    console.log(methodName+' entering toggleAlerts. providerJSON.alerts is: ', providerJSON.alerts);
    providerJSON.alerts = new Array();
    toggleAlert($('#'+providerJSON.notification), providerJSON.alerts, providerJSON.counter);
}
function getProviderDataAndAction(_element)
{
    let _action = '<th><select id=p_action'+_idx+'>';
    _action += createSelect(textPrompts.orderProcess.NoAction.select, textPrompts.orderProcess.NoAction.message);
    b_string = '';
    let _date = getEventDates(_element);
    switch (JSON.parse(_element.status).code)
    {
    case orderStatus.Ordered.code:
        _action += createSelect(textPrompts.orderProcess.RequestShipping.select, textPrompts.orderProcess.RequestShipping.message);
        _action += createSelect(textPrompts.orderProcess.BackOrder.select, textPrompts.orderProcess.BackOrder.message);
        b_string = '<br/>'+textPrompts.orderProcess.BackOrder.prompt+'<input id="p_reason'+_idx+'" type="text"></input>';
        break;
    case orderStatus.Backordered.code:
        _action += createSelect(textPrompts.orderProcess.RequestShipping.select, textPrompts.orderProcess.RequestShipping.message);
        break;
    case orderStatus.Delivered.code:
        _action += createSelect(textPrompts.orderProcess.PayRequest.select, textPrompts.orderProcess.PayRequest.message);
        break;
    case orderStatus.Dispute.code:
        _action += createSelect(textPrompts.orderProcess.Resolve.select, textPrompts.orderProcess.Resolve.message);
        _action += createSelect(textPrompts.orderProcess.Refund.select, textPrompts.orderProcess.Refund.message);
        b_string += '<br/>'+textPrompts.orderProcess.Refund.prompt+'<input id="p_reason'+_idx+'" type="text"></input>';
        break;
    default:
        break;
    }
    return {date: _date, action: _action, b_string: b_string};
}