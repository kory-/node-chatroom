var socket = io.connect('/chatroom/');

function checkName(room, name) {
  $.ajax({
      cache: false
    , type: "GET"
    , url: "/valid/name"
    , datatype: "json"
    , data: {room: room, name: name}
    , success: function(data){
        if (data.success == "OK") {
          chat(room, name);
        } else {
          nameError(data.error);
          return false;
        }
      }
  }); 
}

function chat(room, name) {

 socket.json.emit('init', { 'room': room, 'name': name });

  socket.on('members', function(members) {
    if (members) {
      mlu(members);
    }
  });

  socket.on('message', function(data) {
    if (data) {
      update(data);
    }
  });
  socket.on('messages', function(datas) {
    if (datas) {
      for (i = 0; i < datas.length; i++ ) {
        update(datas[i]);
      }
    }
  });
  $("#comment").focus();
}

function send(name) {
  var data = $('#comment').val();
  if (!util.isBlank(data)) {
    socket.json.send(data);
  }
  $('#comment').val("");
}

function update(data) {
  var obj = $(document.createElement('p'));
  obj.html(util.timeString(data.timestamp) + ' ' + data.name + ' : ' + data.message);
  $('#view').append(obj);
  if (document.body.scrollHeight) {
    window.scrollTo(0, document.body.scrollHeight);
  }

}

function mlu(members) {
  var html='<ul class="nav nav-list">';
  $(members).each(function(i, member){
    html += '<li><a href="#"><i class="icon-user"></i>'+member+'</a></li>';
  });
  html += '</ul>'
  $('#members').html(html);

  c(members.length);
}

function c(count) {
  var obj = $(document.createElement('div'));
  obj.html('<span class="badge">' + count + '</span>');
  $('#counter').html(obj);
}

util = {
  zeroPad: function(digits, n) {
    n = n.toString();
    while (n.length < digits)
      n = '0' + n;
      return n;
  },
  timeString: function (timestamp) {
    var date = new Date(timestamp);
    var minutes = date.getMinutes().toString();
    var hours = date.getHours().toString();
    return this.zeroPad(2, hours) + ":" + this.zeroPad(2, minutes);
  },
  isBlank: function(text) {
    var blank = /^\s*$/;
    return (text.match(blank) !==null);
  }
};

function nameError(err) {
  $('#myModal').css('display', 'block');
  $('#myModal').modal({
    backdrop: false
  });
  $("#modal_name").addClass('error');
  var obj = $(document.createElement('div'));
  obj.html('<p class="help-block">'+err+'</p>');
  $('#error_name').html(obj);
}

function setConfig(room) {
  $('#myModal').modal({
    backdrop: false
  });
  $('#name').focus();
  $("#set-name").click(function(){
    name = $("#name").val();
    if (name!="" && name!=null) {
      checkName(room, name);
      $('#myModal').modal('hide');
    }
  });

  $('#name').keypress(function(event) {
    if (event.which === 13) {
      name = $("#name").val();
      if (name!="" && name!=null) {
        checkName(room, name);
        $('#myModal').modal('hide');
      }
    }
  });

}

$(function() {
  var room = (document.URL).replace(/http:\/\/[\x21-\x7e]+\/chatroom\/([\x21-\x7e])/gi, '$1');

  $("#comment").keypress( function(event) {
    if (event.which === 13) {
      send(room);
      return false;
    }
  });

  setConfig(room);

});

