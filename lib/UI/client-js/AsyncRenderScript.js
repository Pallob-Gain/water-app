
function AsynRenderRefresh(ele, link, post_data, callback_fun) {
  const data_holder = $(ele).attr('data-id').length != 0 ? $(`#${$(ele).attr('data-id')}`) : null;
  const data = data_holder ? data_holder.html() : null;
  // debugSys.log('AsyncRender Links:',link);
  //debugSys.log('AsyncRender Data:',data);

  const formData = new FormData();

  try {
    let parsed_data = data && data != "" ? JSON.parse(data) : null;
    for (const key in parsed_data) {
      //console.log('AsyncRenderFun x-->',{key,data:parsed_data[key]});
      formData.append(key, typeof parsed_data[key] == 'string'?parsed_data[key]:JSON.stringify(parsed_data[key]));
    }
  }
  catch (err) {
    //console.log('AsyncRender parsing error:',err);
  }

  if (post_data) for (const key in post_data) {
    //console.log('AsyncRenderFun -->',{key,data:post_data[key]});
    formData.delete(key);
    formData.append(key, typeof post_data[key] == 'string'?post_data[key]:JSON.stringify(post_data[key]));
  }

  //console.log('AsyncRenderFun formData',formData);

  fetch(link, {
    method: 'POST',
    body: formData
  }).then(function (response) {
    return response.text();
  }).then(function (text) {
    $(ele).html(text);
    $(ele).trigger('update');

    if (typeof callback_fun == 'function') callback_fun();
  }).catch(err => {
    if (typeof callback_fun == 'function') callback_fun(err);
  });
}

function AsyncRenderFun(event, post_data, callback_fun) {

  //console.log('AsyncRenderFun:',{event,post_data});

  const ele = this;
  const link = $(ele).attr('link');
  //console.log(link);
  
  if(link)return AsynRenderRefresh(ele, link, post_data, callback_fun);

}

function AsyncUpdateFun() {

}

socket.on('server-component-refresh',function(link){
  $(`.async-render-view[link_id="${link}"]`).trigger('render'); //server referesh request
});

document.addEventListener("DOMContentLoaded", function (event) {
  $(document).ready(function () {
    $('.async-render-view').each(function (index, element) {
      $(element).on('render', AsyncRenderFun);
      $(element).on('update', AsyncUpdateFun);

      $(element).trigger('render');
    });
  });
});