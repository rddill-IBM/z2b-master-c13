/*
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS' BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// z2c-utilities.js

'use strict';
/**
  * creates a set of utilities inside the named space: z2c
 * All utilities are accessed as z2c.functionName()
* @namespace - z2c
 */
let languages = {}, // getSupportedLanguages
    selectedLanguage = {},
    language = '',
    textLocations = {}, // getTextLocations
    textPrompts = {}, // getSelectedPromots
    subscribers = new Array(); // subscribers to business events
    
/**
* get the value associated with a cookie named in the input
* Refer to this by {@link getCookieValue}.
* @param {String} _name  - the name of the cookie to find
* @returns {String} - cookie value
* @namespace
*/
function getCookieValue(_name)
{
    let name = _name+'=';
    let cookie_array= document.cookie.split(';');
    for (let each in cookie_array)
    {
        let c = cookie_array[each].trim();
        if(c.indexOf(name) === 0) {return(c.substring(name.length, c.length));}
    }
    return('');
}

/**
* trims a string by removing all leading and trailing spaces
* trims the final period, if it exists, from a string.
* Refer to this by {@link trimStrip}.
* @param {String} _string - String to be trimmed and stripped of trailing period
* @returns {String} - trimmed string
* @namespace
*/
function trimStrip(_string)
{
    let str = _string.trim();
    let len = str.length;
    if(str.endsWith('.')) {str=str.substring(0,len-1);}
    return(str);
}

/**
* replaces text on an html page based on the anchors and text provided in a JSON textPrompts object
* Refer to this by {@link updatePage}.
* @param {String} _page - a string representing the name of the html page to be updated
* @namespace
*/
function updatePage(_page)
{
    for (let each in textPrompts[_page]){(function(_idx, _array)
        {$('#'+_idx).empty();$('#'+_idx).append(getDisplaytext(_page, _idx));})(each, textPrompts[_page])}
}

/**
* gets text from the JSON object textPrompts for the requested page and item
* Refer to this by {@link getDisplaytext}.
* @param {String} _page - string representing the name of the html page to be updated
* @param {String} _item - string representing the html named item to be updated
* @returns {String} - text to be placed on web page
* @namespace
*/
function getDisplaytext(_page, _item)
{return (textPrompts[_page][_item]);}

/**
* used to change displayed language and text
* Refer to this by {@link goMultiLingual}.
* @param {String} _language - language to be used in this session
* @param {String} _page - string representing html page to be updated in the selected language
* @namespace
*/
function goMultiLingual(_language, _page)
{ language = _language;
    $.when($.get('/api/getSupportedLanguages')).done(function(_res)
    {languages = _res;
        selectedLanguage = languages[_language];
        let options = {}; options.language = _language;
        $.when($.get('/api/getTextLocations'),$.post('/api/selectedPrompts', options)).done(function(_locations, _prompts)
        {textLocations = _locations;
            textPrompts = JSON.parse(_prompts[0]);
            updatePage(_page);
        });
        let _choices = $('#lang_choices');
        _choices.empty(); let _str = '';
        for (let each in _res)
        {(function(_idx, _array)
        {if (_array[_idx].active === 'yes')
        {_str += '<li id="'+_idx+'"><a onClick="goMultiLingual(\''+_idx+'\', \'index\')">'+_array[_idx].menu+'</a></li>'}
        })(each, _res);
        }
        _choices.append(_str);
    });
}

/**
* get SupportedLanguages returns an html menu object with available languages
* Refer to this by {@link getSupportedLanguages}.
* @namespace
*/
function getSupportedLanguages()
{
    $.when($.get('/api/getSupportedLanguages')).done(function(_res)
    {
        languages = _res; console.log(_res); let _choices = $('#lang_choices');
        _choices.empty(); let _str = '';
        for (let each in _res)
        {(function(_idx, _array)
        {if (_array[_idx].active === 'yes')
        {_str += '<li id="'+_idx+'"><a onClick="goMultiLingual(\''+_idx+'\', \'index\')">'+_array[_idx].menu+'</a></li>';}
        })(each, _res);
        }
        _choices.append(_str);
    });
}

/**
* returns a JSON object with the pages and objects which support text replacement
* Refer to this by {@link getTextLocations}.
* @namespace
*/
function getTextLocationsfunction ()
{$.when($.get('/api/getTextLocations')).done(function(_res){textLocations = _res; console.log(_res); });}

/**
* returns a JSON object with the text to be used to update identified pages and objects
* Refer to this by {@link getSelectedPrompts}.
* @param {String} _inbound - page or object to receive updated text
* @namespace
*/
function getSelectedPrompts(_inbound)
{  selectedLanguage=languages[_inbound];
    let options = {}; options.language = _inbound;
    $.when($.post('/api/selectedPrompts', options)).done(function(_res){textPrompts = _res; console.log(_res); });
}

/**
* retrieves the prompts for the requested language from the server
* Refer to this by {@link qOnSelectedPrompts}.
* @param {String} _inbound - string representing the requested language
* @returns {Promise} - returns promise when selected prompts have been retrieved from server
* @namespace
*/
function qOnSelectedPrompts(_inbound)
{
    let d_prompts = $.Deferred();
    let options = {}; options.language = _inbound;
    $.when($.post('/api/selectedPrompts', options)).done(function (p) {d_prompts.resolve(p);}).fail(d_prompts.reject);
    return d_prompts.promise();
}

/**
* function to display the properties of an object using console.log
* Refer to this by {@link displayObjectProperties}.
* @param {Object} _obj - the object whose properties are to be displayed
* @namespace
*/
function displayObjectProperties(_obj)
{
    for(let propt in _obj){ console.log('object property: '+propt ); }
}

/**
* function to display the values of every property in an object. If the type of a property is object or function, then the word 'object' or 'function' is displayed
* Refer to this by {@link displayObjectValues}.
* @param {String} _string - an arbitrary string to preface the printing of the object property name and value. often used to display the name of the object being printed
* @param {Object} _object - the object to be introspected
* @namespace
*/
function  displayObjectValues(_string, _object)
{
    for (let prop in _object){
        console.log(_string+prop+': '+(((typeof(_object[prop]) === 'object') || (typeof(_object[prop]) === 'function'))  ? typeof(_object[prop]) : _object[prop]));
    }
}

/**
 * get the value associated with a cookie named in the input
 * Inspired by http://bit.ly/juSAWl
 * Augment String.prototype to allow for easier formatting.  This implementation
 * doesn't completely destroy any existing String.prototype.format functions,
 * and will stringify objects/arrays.
 * Refer to this by {@link <string>.format}.
 * @param {String} this  - the string to be formatted
 * @param {String} arg - comma delimited set of strings or ints to be inserted into this
* string.format
*/

String.prototype.format = function(i, safe, arg) {
/**
 * the format function added to String.prototype
 * @returns {String} - returns original string with {x} replaced by provided text
 */
    function format() {
        let str = this, len = arguments.length+1;

        // For each {0} {1} {n...} replace with the argument in that position.  If
        // the argument is an object or an array it will be stringified to JSON.
        for (i=0; i < len; arg = arguments[i++]) {
            safe = typeof arg === 'object' ? JSON.stringify(arg) : arg;
            str = str.replace(RegExp('\\{'+(i-1)+'\\}', 'g'), safe);
        }
        return str;
    }

    // Save a reference of what may already exist under the property native.
    // Allows for doing something like: if(''.format.native) { /* use native */ }
    format.native = String.prototype.format;

    // Replace the prototype property
    return format;
}();


/**
 * display the hyperledger apis as currently understood
 * Refer to this by {@link showAPIDocs}.
  *
  */
function showAPIDocs()
{
    $.when($.get('/resources/getDocs'),$.get('hfcAPI.html')).done(function(_res, _page)
    {
        let _target = $('#body');
        _target.empty(); _target.append(_page[0]);
        displayAPI(_res[0]);
    });
}

/**
 *
 * @param {JSON} _api
 * Refer to this by {@link displayAPI}.
  *
  */
function displayAPI(_api)
{
    let _exports = _api.hfcExports;
    let _classes = _api.hfcClasses;
    let _eTarget = $('#hfc_exports');
    let _cTarget = $('#hfc_classes');
    let _str = '';
    for (let each in _exports) {
        (function(_idx, _arr){
            let _curObj = Object.getOwnPropertyNames(_arr[_idx]);
            _str += '<tr><td>'+_curObj+'</td><td>'+_arr[_idx][_curObj]+'</td></tr>';
        })(each, _exports);
    }
    _eTarget.append(_str);
    _str = '';
    for (let each in _classes) {
        (function(_idx, _arr){
            let _curObj = Object.getOwnPropertyNames(_arr[_idx]);
            for (let every in _arr[_idx][_curObj[0]]){
                (function(_idx2, _arr2)
                {
                    let _curObj2 = Object.getOwnPropertyNames(_arr2[_idx2]);
                    _str+= '<tr><td>'+_curObj[0]+'</td><td>'+_curObj2+'</td><td>'+_arr2[_idx2][_curObj2[0]]+'</td></tr>';
                })(every, _arr[_idx][_curObj[0]]);
            }
        })(each, _classes);
    }
    _cTarget.append(_str);
}

/**
 * format messages for display
 * @param {String} _msg - text to be enclosed in html message format
 * @returns {String} - html formatted message
 */
function formatMessage(_msg) {return '<p class="message">'+_msg+'</p>';}


/**
 * closes all accordians in this div
 * @param {String} target - formatted jQuery string pointing to div with all accordians to collapse
 */
function accOff(target)
{
    let childNodes = $(target).children();
    for (let each in childNodes)
    {
        let node = '#'+childNodes[each].id;
        if ((node !== '#') && $(node).hasClass('on')) {$(node).removeClass('on');}
        if ((node !== '#') && !$(node).hasClass('off')) {$(node).addClass('off');}
    }
}

/**
 * toggle an accordian window
 * @param {String} _parent - Div holding all accordians
 * @param {String} _body - Div which only appears when accordian is expanded
 * @param {HTMLDiv} _header - Div which appears when accordian is collapsed
 */
function accToggle(_parent, _body, _header)
{
    let parent = '#'+_parent;
    let body='#'+_body;
    if ($(body).hasClass('on'))
    {
        $(body).removeClass('on'); $(body).addClass('off');
        $(parent).removeClass('on'); $(parent).addClass('off');
    }else
    {
        accOff(parent);
        $(body).removeClass('off'); $(body).addClass('on');
        $(parent).removeClass('off'); $(parent).addClass('on');
    }
}

function loadMemberUX(_member)
{
    let methodName = 'loadMemberUX';
    let toLoad = _member.pageToLoad;
    if (buyers.length === 0)
    { $.when($.get(toLoad)).done(function (page, res)
      {setupMember(page, _member);});
    }
    else{
        $.when($.get(toLoad)).done(function (page)
        {setupMember(page, _member);});
    }

}
/**
 * 
 * @param {*} _page 
 * @param {*} _member 
 *  * json object: 
 * { 
 *  pageToLoad: 'provider.html',
 *  body: 'providerbody',
 *  notification: 'provider_notify',
 *  orderDiv: 'providerOrderDiv'
 *  clear: 'provider_clear',
 *  list: 'providerOrderStatus',
 *  pageID: 'provider',
 *  memberBody: 'provider',
 *  company: 'providerCompany',
 *  subscribe: 'Provider',
 *  messages: 'provider_messages,
 *  array: providers,
 *  alerts: new Array(),
 *  options: p_string,
 *  listFunction: listProviderOrders
 * }
 */
function setupMember(_page, _member)
{
    let methodName = 'setupMember';
    console.log(methodName+' entered, _member.array = ', _member.array);
    console.log(methodName+' entered, _member.options = ', _member.options);
    console.log(methodName+' entered, _member.alerts = ', _member.alerts);
    $('#'+_member.body).empty();
    $('#'+_member.body).append(_page);
    if (_member.alerts.length === 0)
    {$('#'+_member.notification).removeClass('on'); $('#'+_member.notification).addClass('off'); }
    else {$('#'+_member.notification).removeClass('off'); $('#'+_member.notification).addClass('on'); }
    updatePage(_member.pageID);
    let _clear = $('#'+_member.clear);
    let _list = $('#'+_member.list);
    let _orderDiv = $('#'+_member.orderDiv);
    if (_member.clear === 'newOrder')
    {_clear.on('click', function(){_member.clearAction();});}
    else
    {_clear.on('click', function(){$('#'+_member.orderDiv).empty();});}
    _list.on('click', function(){listOrders(_member);});
    $('#'+_member.names).empty();
    $('#'+_member.names).append(_member.options);
    $('#'+_member.company).empty();
    $('#'+_member.company).append(_member.array[0].companyName);
    p_id = _member.array[0].id;
    z2bSubscribe(_member.subscribe, p_id);
    // create a function to execute when the user selects a different provider
    $('#'+_member.memberBody).on('change', function() {
        $('#'+_member.comapny).empty(); _orderDiv.empty(); $('#'+_member.messages).empty();
        $('#'+_member.comapny).append(findMember($('#'+_member.memberBody).find(':selected').val(),_member.array).companyName);
        z2bUnSubscribe(p_id);
        p_id = findMember($('#'+_member.pageID).find(':selected').text(),_member.array).id;
        z2bSubscribe(_member.subscribe, p_id);
    });
}

/**
 * lists all orders for the selected Provider
 */
function listOrders(_member)
{
    let methodName = 'listOrders';
    console.log(methodName+' entered, providers = ', _member.array);
    let options = {};
    options.id = $('#'+_member.names).find(':selected').val();
    options.userID = options.id;
    $.when($.post('/composer/client/getMyOrders', options)).done(function(_results)
    {
        console.log(methodName+' _results.result: '+_results.result);
        console.log(methodName+' _results.orders: ',_results.orders);
        console.log(methodName+' _member: ',_member);
        if (_results.orders.length < 1) {$('#'+_member.orderDiv).empty(); $('#'+_member.orderDiv).append(formatMessage(textPrompts.orderProcess[_member.ml_text]+options.id));}
        else{_member.list_cbfn($('#'+_member.orderDiv), _results.orders);}
    });
}

function getEventDates(_element)
{
    let methodName = 'getEventDates';
    switch (JSON.parse(_element.status).code)
    {
    case orderStatus.PayRequest.code:
        _date = _element.paymentRequested;
        break;
    case orderStatus.Delivered.code:
        _date = _element.delivered;
        break;
    case orderStatus.Dispute.code:
        _date = _element.disputeOpened + '<br/>'+_element.dispute;
        break;
    case orderStatus.Resolve.code:
        _date = _element.disputeResolved + '<br/>'+_element.resolve;
        break;
    case orderStatus.Created.code:
        _date = _element.created;
        break;
    case orderStatus.Cancelled.code:
        _date = _element.cancelled;
        break;
    case orderStatus.Backordered.code:
        _date = _element.dateBackordered + '<br/>'+_element.backorder;
        break;
    case orderStatus.ShipRequest.code:
        _date = _element.requestShipment;
        break;
    case orderStatus.Authorize.code:
        _date = _element.approved;
        break;
    case orderStatus.Bought.code:
        _date = _element.bought;
        break;
    case orderStatus.Delivering.code:
        _date = _element.delivering;
        break;
    case orderStatus.Ordered.code:
        _date = _element.ordered;
        break;
    case orderStatus.Refund.code:
        _date = _element.orderRefunded + '<br/>'+_element.refund;
        break;
    case orderStatus.Paid.code:
        _date = _element.paid;
        break;
    default:
        break;
    }
    return _date;
}

function createSelect(_val, _text)
{
    return '<option value="'+_val+'">'+_text+'</option>'
}