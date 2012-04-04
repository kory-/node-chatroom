  var socket = io.connect('/chat');

  socket.on('connected', function() {
    socket.emit('rooms');
  });

  socket.on('rooms', function(rooms) {
    update(rooms);
  });

  socket.on('room_create', function(room) {
    if (room) {
      add(room);
    }
  });

  socket.on('rooms_del', function(rooms) {
    update(rooms);
  });

function update(rooms) {
  var html='<table class="table" id="rooms">';
  html += '<thead>'
        + '<tr>'
        + '<th></th>'
        + '<th>Room Name</th>'
        + '<th>Member</th>'
        + '</tr>'
        + '</thead>'
        + '<tbody>';
  $.each(
      rooms,
      function(key, value) {
        if (value.key!=null || value.key!="") {
          var icon="home";
        } else {
          var icon="lock";
        }
        html += '<tr><td style="text-align:center"><i class="icon-'+icon+'"></i></td><td><a href="/chatroom/' + value.room  + '">' + value.room_name + '</a></td><td>' + value.count + '</td></tr>';
      });
  html += '</tbody>'
        + '</table>';console.log(html);
    $('#view').html(html);
}

function add(room) {
  if (room.key!=null || room.key!="") {
    var icon="home";
  } else {
    var icon="lock";
  }
  $("#rooms").append('<tr><td style="text-align:center"><i class="icon-'+icon+'"></i></td><td><a href="/chatroom/' + room.room  + '">' + room.room_name + '</a></td><td>' + room.count + '</td></tr>');
}
