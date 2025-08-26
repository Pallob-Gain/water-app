const delay= ms => new Promise(resolve=>setTimeout(resolve,ms));

class debugSysClass{
    log(...others){
        if(debug){
            console.log(...others);
        }
    }
    error(...others){
        if(debug){
            console.error(...others);
        }
    }
}

var  debugSys=new debugSysClass();

var alertTextColor={error:"text-danger",success:"text-primary",info:"text-info",danger:"text-warning"};
                    
var alertTextColorSelf={error:"text-danger"
                    ,success:"text-primary"
                    ,info:"text-info"
                    ,danger:"text-warning"};  

var alertBGColor={error:"bg-danger"
                    ,success:"bg-success"
                    ,info:"bg-info"
                    ,danger:"bg-warning"}; 

var alertTitleText={error:"Oops, Try Again!"
                    ,success:"Great!"
                    ,info:"Acknowledgement!"
                    ,danger:"Warning!"};   


function apiLink(link){
    return `apis/${link}`;
}

function loadingShow(msg){
    return bootbox.dialog({
            message: '<p class="text-center mb-0"><i class="fa fa-spin fa-spinner"></i> '+msg+'</p>',
            className: 'dialog-box',
            closeButton: false
        });
}

function loadingHide(dlg,call_back){
    setTimeout(async ()=>{
        dlg.modal('hide');
        if(typeof call_back=='function')call_back(dlg);
    },500);
}

//json parsing healeper
function json_parse(text,callback){
    try{
        if(typeof text=="string")callback(JSON.parse(text),true);
        else callback(text,true);
    }
    catch (error){
        callback(error,false);
    }
}

                            

function dlgStyleTitleBarSetting(dlg,type){
//css setting
    dlg.find('.modal-title').css('color','white');
    dlg.find('.modal-header').addClass(alertBGColor[type]);
}

function alertWith(json_data,call_back){
    var dlg=bootbox.alert({
        title:alertTitleText[json_data.respond]
        ,message :'<p class="text-center mb-0">'+json_data.payload+'</p>'
        ,className: 'dialog-box'
        ,closeButton: true
        ,buttons : {
            ok : {
            label : json_data.respond=='error'?"OK, Retry":"OK",
            className : "btn btn-raised btn-primary"
            }
        },
        callback: function () {
            debugSys.log("OK CLICK");
            debugSys.log(call_back);
            if(typeof call_back=='function')call_back(dlg);
        }
    });
    dlgStyleTitleBarSetting(dlg,json_data.respond);
    return dlg;
}

function confirmWith(json_data,call_back){
    var dlg=bootbox.alert({
        title:alertTitleText[json_data.respond]
        ,message :'<p class="text-center mb-0">'+json_data.payload+'</p>'
        ,className: 'dialog-box'
        ,closeButton: true
        ,buttons : {
            ok : {
            label : json_data.respond=='error'?"OK, Retry":"OK",
            className : "btn btn-raised btn-primary"
            }
        },
        callback: function () {
            debugSys.log("OK CLICK");
            debugSys.log(call_back);
            if(typeof call_back=='function')call_back(dlg);
        }
    });
    dlgStyleTitleBarSetting(dlg,json_data.respond);
    return dlg;
}

function alertBy(notice,type="info",call_back){
    if(type==null || type=="")type="info";
    
    var dlg=bootbox.alert({
        title:alertTitleText[type]
        ,message :'<p class="text-center mb-0">'+notice+'</p>'
        ,className: 'dialog-box'
        ,closeButton: true
        ,buttons : {
            ok : {
            label : type=='error'?"OK, Retry":"OK",
            className : "btn btn-raised btn-primary"
            }
        },
        callback: function () {
            if(typeof call_back=='function')call_back(dlg);
        }
    });
    dlgStyleTitleBarSetting(dlg,type);
    return dlg;
}

function elementNotice(ele,notice,type='info')
{
    if(notice!=null)ele.html('<font class="h4 text-center mb-0 '+alertTextColor[type]+'">'+notice+'</font>');
    else ele.html(" ");
}


function easyForm(link,form_data,call_back,error_callBack){
    if(typeof error_callBack!='function'){
        error_callBack=function(err,data){
                if(err){
                    alertWith(data);
                }
                else   alertBy("Please try again,after some times.",'error');
        }
    }

    var dlg=loadingShow("Please wait...");
    $.ajax({
        url: link, // Url to which the request is send
        type: "POST",             // Type of request to be send, called as method
        data: form_data, // Data sent to server, a set of key/value pairs (i.e. form fields and values)
        contentType: false,       // The content type used when sending data to the server.
        cache: false,             // To unable request pages to be cached
        processData:false,        // To send DOMDocument or non processed data file it is set to false
        success: function(data,res)   // A function to be called if request succeeds
            {
                loadingHide(dlg,function(){
                        if(res=="success"){
                        debugSys.log(data);
                        json_parse(data,function(json_data,status){
                            if(status){
                                debugSys.log("JSON Parsing completed");
                                debugSys.log(json_data);
                                if(json_data.respond=='success'){
                                    debugSys.log("Successful");
                                    if(typeof call_back=='function')call_back(json_data);
                                }
                                else{
                                    debugSys.log("Problem happening");
                                    if(typeof error_callBack=='function')error_callBack(true,json_data);
                                }  
                            }
                            else{
                                debugSys.log("JSON Parsing error");
                                debugSys.log(json_data);
                                if(typeof error_callBack=='function')error_callBack(false);
                            }
                        });
                    }
                    else{
                            debugSys.log("Some things worng here.");
                            if(typeof error_callBack=='function')error_callBack(false);
                    } 
                }); 
            }
        }).fail(function() {
            debugSys.log("Some things worng here.");
            loadingHide(dlg,function(){
            if(typeof error_callBack=='function')error_callBack(false);
            });
        });
}

function easyFormSilent(link,form_data,call_back,error_callBack){
    if(typeof error_callBack!='function'){
        error_callBack=function(err,data){
                if(err){
                    alertWith(data);
                }
                else   alertBy("Please try again,after some times.",'error');
        }
    }

        $.ajax({
            url: link, // Url to which the request is send
            type: "POST",             // Type of request to be send, called as method
            data: form_data, // Data sent to server, a set of key/value pairs (i.e. form fields and values)
            contentType: false,       // The content type used when sending data to the server.
            cache: false,             // To unable request pages to be cached
            processData:false,        // To send DOMDocument or non processed data file it is set to false
            success: function(data,res)   // A function to be called if request succeeds
                {
                if(res=="success"){
                    debugSys.log(data);
                    json_parse(data,function(json_data,status){
                        if(status){
                            debugSys.log("JSON Parsing completed");
                            debugSys.log(json_data);
                            if(json_data.respond=='success'){
                                debugSys.log("Successful");
                                if(typeof call_back=='function')call_back(json_data);
                            }
                            else{
                                debugSys.log("Problem happening");
                                if(typeof error_callBack=='function')error_callBack(true,json_data);
                            }  
                        }
                        else{
                            debugSys.log("JSON Parsing error");
                            debugSys.log(json_data);
                            if(typeof error_callBack=='function')error_callBack(false);
                        }
                    });
                }
                else{
                        debugSys.log("Some things worng here.");
                        if(typeof error_callBack=='function')error_callBack(false);
                } 
                }
            }).fail(function() {
                debugSys.log("Some things worng here.");
                if(typeof error_callBack=='function')error_callBack(false);
            });
}

function easyFetch(link,json_data,call_back,error_callBack){
    var fd=new FormData();
    for (var key in json_data) {
        fd.append(key,json_data[key]);
    }

    easyForm(link,fd,call_back,error_callBack);
}

function easyFetchSilent(link,json_data,call_back,error_callBack){
    var fd=new FormData();
    for (var key in json_data) {
        fd.append(key,json_data[key]);
    }

    easyFormSilent(link,fd,call_back,error_callBack);
}

function easyConfirm(dialog,link,json_data,call_back,error_callBack,extentions={}){
    var  OK_label='Yes',Cancel_label='No';
    if('OK_label' in extentions)OK_label=extentions.OK_label;
    if('Cancel_label' in extentions)Cancel_label=extentions.Cancel_label;

    var fd=new FormData();
    for (var key in json_data) {
        fd.append(key,json_data[key]);
    }
    return bootbox.confirm({
                message: dialog,
                className: 'dialog-box',
                closeButton: false,
                buttons : {
                    confirm : {
                        label : OK_label,
                        className : "btn  btn-raised btn-primary"
                    },
                    cancel:{
                        label : Cancel_label,
                        className : "btn  btn-raised btn-danger"
                    }
                }
            ,callback: function (res) {
                if(res){
                    easyForm(link,fd,call_back,error_callBack);
                }
            }
        });
}

function normalConfirm(dialog,call_back,extentions={}){
    var  OK_label='Yes',Cancel_label='No',window_size='medium',main_class='dialog-box';

    if('OK_label' in extentions)OK_label=extentions.OK_label;
    if('Cancel_label' in extentions)Cancel_label=extentions.Cancel_label;
    if('window_size' in extentions)window_size=extentions.window_size;
    if('main_class' in extentions)main_class=extentions.main_class;

    var dlg=bootbox.confirm({
                size:window_size,
                message: dialog,
                className:main_class ,
                closeButton: false,
                buttons : {
                confirm : {
                    label : OK_label,
                    className : "btn  btn-raised btn-primary"
                },
                cancel:{
                    label : Cancel_label,
                    className : "btn  btn-raised btn-danger"
                }
                }
            ,callback: function (res) {
                call_back(res,dlg);
            }
        });
    return dlg;
}


function mkConfirm(dialog,call_back,dial=false,size='medium',ok_btn="Yes"){
    var dlg= bootbox.confirm({
            message: dialog,
            className: (dial)?'':'dialog-box',
            size:size,
            buttons : {
            confirm : {
                label : ok_btn,
                className : "btn  btn-raised btn-primary"
            },
            cancel:{
                label : "No",
                className : "btn  btn-raised btn-danger"
            }
            }
        ,callback: function (res) {
            if(typeof call_back=='function')call_back(res);
        }
    });
    return dlg;
}

function easyTab(link,data,call_back,target="_blank",method="POST"){
    // Create a form
    var mapForm = document.createElement("form");
    mapForm.target = target;    
    mapForm.method = method;
    mapForm.action = link;
    for(var dt in data){
        // Create an input
        var mapInput = document.createElement("input");
        mapInput.type = "text";
        mapInput.name = dt;
        mapInput.value = data[dt];
        // Add the input to the form
        mapForm.appendChild(mapInput);
    }


    // Add the form to dom
    document.body.appendChild(mapForm);

    // Just submit
    mapForm.submit();
    if(typeof call_back=='function')call_back(mapForm,true);
    document.body.removeChild(mapForm);
}

function changePage(link){
    debugSys.log("GOING AT="+link);
    window.location=link;
}

function copyToClipboard(text) {
        if (window.clipboardData && window.clipboardData.setData) {
            // Internet Explorer-specific code path to prevent textarea being shown while dialog is visible.
            return clipboardData.setData("Text", text);

        }
        else if (document.queryCommandSupported && document.queryCommandSupported("copy")) {
            var textarea = document.createElement("textarea");
            textarea.textContent = text;
            textarea.style.position = "fixed";  // Prevent scrolling to bottom of page in Microsoft Edge.
            document.body.appendChild(textarea);
            textarea.select();
            try {
                return document.execCommand("copy");  // Security exception may be thrown by some browsers.
            }
            catch (ex) {
                console.warn("Copy to clipboard failed.", ex);
                return false;
            }
            finally {
                document.body.removeChild(textarea);
            }
        }
}

function getDateString(date, format) {
        var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
        getPaddedComp = function(comp) {
            return ((parseInt(comp) < 10) ? ('0' + comp) : comp)
        },
        formattedDate = format,
        o = {
            "y+": date.getFullYear(), // year
            "m+": date.getMonth()+1, //month
            "d+": getPaddedComp(date.getDate()), //day
            "h+": getPaddedComp((date.getHours() > 12) ? date.getHours() % 12 : date.getHours()), //hour
            "H+": getPaddedComp(date.getHours()), //hour
            "i+": getPaddedComp(date.getMinutes()), //minute
            "s+": getPaddedComp(date.getSeconds()), //second
            "S+": getPaddedComp(date.getMilliseconds()), //millisecond,
            "b+": (date.getHours() >= 12) ? 'PM' : 'AM'
        };

        for (var k in o) {
            if (new RegExp("(" + k + ")").test(format)) {
                formattedDate = formattedDate.replace(RegExp.$1, o[k]);
            }
        }
        return formattedDate;
}

//this is used to export module data to global
function exportToGlobal(data){
    for(var key in data){
        window[key]=data[key];
    }
}


function uuidWithCrypto() {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);

  // Set version (4) and variant bits
  arr[6] = (arr[6] & 0x0f) | 0x40;
  arr[8] = (arr[8] & 0x3f) | 0x80;

  return [...arr].map((b, i) =>
    ([4, 6, 8, 10].includes(i) ? '-' : '') + b.toString(16).padStart(2, '0')
  ).join('');
}