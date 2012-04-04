// ポート指定
var port = 8001;

// session sercret
var ss = 'momomei';

// Module読み込み
var express = require('express');
var app = module.exports = express.createServer();
var io = require('socket.io').listen(app);
var connect = require('connect');

// Session Start
var MemoryStore = express.session.MemoryStore
var sessionStore = new MemoryStore();

// Debug関数
var log = console.log;

// Config
app.configure(function() {
  app.set('views', __dirname + '/views');
  app.register('html', require('ejs'));
  app.set('view engine', 'html');
  app.set('view options', { layout : false});
  app.use(express.bodyParser());
  app.use(express.cookieParser());
  app.use(express.methodOverride());
  app.use(express.session({
    secret : ss
  , store : sessionStore
  }));
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});

// 開発環境 - エラーハンドラ
app.configure('development', function() {
  app.use(express.errorHandler({ dumpExceptions : true, showStatck : true}));
});

// 本番環境 - エラーハンドラ
app.configure('production', function() {
    app.use(express.errorHandler());
});

// session変数
var Session = connect.middleware.session.Session;
var parseCookie = connect.utils.parseCookie;

// 定数設定
var MESSAGE_LOG = 10;

// ルーム情報
var channel = new function() {
  var rooms = []
    , messages = []
    , HN = []
    , callbacks = [];

  // 部屋作成
  this.addRoom = function(room_name, room_key) {
    var rs = random_string(8);
    rooms[rs] = {room: rs, room_name: room_name, key: room_key};
    return rooms[rs];
  };

  // 部屋取得
  this.getRooms = function(room_id) {
    var res = "";
    if (room_id != "" && room_id != null) {
      res = rooms[room_id];
    } else {
      res = rooms;
    }
    return res;
  };

  // 部屋削除
  this.removeRoom = function(room_id) {
    if (room_id != "" && room_id != null) {
      var rooms_bk = [];
      for (i in rooms) {
        if (i != room_id) {
          rooms_bk[i] = rooms[i];
        }
      }
      rooms = rooms_bk;
    }
  };

  // メッセージログ追加
  this.addMessage = function(room_id, hn, message, timestamp) {
    m = {
           name: hn
        , message: message
        , timestamp: timestamp
    };
    if (!messages[room_id]) {
      messages[room_id] = [];
    }
    messages[room_id].push(m);

    while (messages[room_id].length > MESSAGE_LOG)
      messages[room_id].shift();
  };

  // メッセージログ取得
  this.getChatLog = function(room_id) {
    if (messages[room_id]) {
      return messages[room_id];
    } else {
      return false;
    }
  };

  // メッセージログ削除
  this.removeChatLog = function(room_id) {
    if (messages[room_id]) {
      messages[room_id] = [];
    }
  };

  // ハンドルネーム追加
  this.addHN = function(room_id, hn) {
    nick = {
              name: hn
    }
    if (!HN[room_id]) {
      HN[room_id] = [];
    }
    HN[room_id].push(nick);
  };

  // ハンドルネームの重複チェック
  this.chkHN = function(room_id, hn) {
    if (HN[room_id]) {
      for(i = 0; i < HN[room_id].length; i++) {
        if (HN[room_id][i].name == hn) {
          return false;
          break;
        }
      }
    }
    return true;
  }

  // ハンドルネーム削除
  this.removeHN = function(room_id, hn) {
    if (HN[room_id]) {
      for(i = 0; i < HN[room_id].length; i++) {
        if (HN[room_id][i].name == hn) {
          HN[room_id][i] = "";
          break;
        }
      }
    }
  }

}

// TOP
app.get('/', function(req, res) {
  res.redirect('/chat');
});

// index - GET
app.get('/chat', function(req, res) {
  res.render('rooms', {
    error: ''
  });
});

// index - POST - ルーム作成
app.post('/chat', function(req, res) {
//  var room = new Room();
  var locals = {
      error : null
    , room_name : null
  };

  // 入力チェック
  if (!req.body.room_name) {
    locals.error = 'ルーム名を入力してください。';
  } else if (req.body.room_name > 300) {
    locals.error = 'ルーム名が長すぎます。';
  }

  if (locals.error) {
    res.render('rooms', {
      error: locals.error
    });
    //res.redirect('/');
  } else {

    var room = channel.addRoom(req.body.room_name, "");

    // チャットルーム作成を通知
    io.sockets.emit('make_room', {
          room : room.room
        , room_name : room.room_name
        , count : 1
      }
    );

    // index - GET へリダイレクト
    res.redirect('/chatroom/' + room.room);
  }
});

// chatroom - GET
app.get('/chatroom/:room', function(req, res) {
  // チャットルームの存在チェック
  var chatroom = channel.getRooms(req.params.room);
    if(!chatroom){
      res.redirect('/');
    }else{
      // ハンドルネーム設定
      var HN = '';
      if (req.params.name) {
        HN = req.params.name;
      } else {
        if (req.session.HN) {
          HN = req.session.HN;
        }
      }
      // view
      res.render('chatroom', {
          title : chatroom.room_name
        , port : port
        , room : req.params.room
        , name : HN
      });
    }
});

app.get('/valid/name', function(req, res) {
  if (!channel.chkHN(req.query.room, req.query.name)) {
    res.send({error: "Is name that already exists"});
  } else {
    res.send({success: "OK"});
    channel.addHN(req.query.room, req.query.name);
  }
});

//socket通信
io.set('authorization', function(handshakeData, callback) {
  if (handshakeData.headers.cookie) {
    // セッションの共有
    var cookie = handshakeData.headers.cookie;
    var sessionID = parseCookie(cookie)['connect.sid'];
    handshakeData.cookie = cookie;
    handshakeData.sessionID = sessionID;
    handshakeData.sessionStore = sessionStore;
    callback(null, true);
  } else {
    return callback('Not found cookie', false);
  }
});

// index
var room = io
  .of('/chat')
  .on('connection', function(socket) {
    // 接続時
    socket.emit('connected');
    // 初期設定
    socket.on('rooms', function(rooms) {
      var chatrooms = channel.getRooms();
      var rooms = {};
      for(i in chatrooms) {
        rooms[i] = chatrooms[i];
        c = socket.manager.rooms['/chatroom//' + rooms[i].room];
        rooms[i]['count'] = c ? c.length : 0;
      }
      socket.json.emit('rooms', rooms);
    });
});

// chatroom
var chat = io
  .of('/chatroom/')
  .on('connection', function(socket) {
    // 接続時
    socket.emit('connected');

    var sid = socket.id;
    var uid = socket.store.id;

    // 初期設定
    socket.on('init', function(req) {
      var c = [];
      socket.set('room', req.room);
      socket.set('name', req.name);


      // 入室処理
      socket.join(req.room);

      // 入室時に人数更新
      var chatrooms = channel.getRooms();
      var rooms = {};
      for(i in chatrooms) {
        rooms[i] = chatrooms[i];
        c = socket.manager.rooms['/chatroom//' + rooms[i].room];
        rooms[i]['count'] = c ? c.length : 0;
      }

      room.json.emit('rooms', rooms);

      // チャットログ出力
      var chatLogs = channel.getChatLog(req.room);
      if (chatLogs) {
        socket.json.emit('messages', chatLogs);
      }

      // ルームメンバー更新
      var mn = [];
      var members = chat.manager.rooms['/chatroom//' + req.room];
      for(i = 0; i < members.length; i++) {
        mn[i] = chat.socket(members[i]).store.data['name'];
      }
      chat.to(req.room).emit('members', mn);
    });

    // メッセージ受信
    socket.on('message', function(data) {
      var room_id, name;
      var ts = (new Date()).getTime();

      socket.get('room', function(err, _room) {
        room_id = _room;
      });
      socket.get('name', function(err, _name) {
        name = _name;
      });

      // 過去ログへ追加
      channel.addMessage(room_id, name, data, ts);

      log('chat:' + name + ':' + data + '(' + room_id + ')');
      if (name && data && room_id) {
        chat.to(room_id).emit('message', {
            name: name
          , message: data
          , timestamp: ts
        });
      }
    });

    // 切断時
    socket.on('disconnect', function() {
      var room_id, name;

      socket.get('room', function(err, _room) {
        room_id = _room;
      });
      socket.get('name', function(err, _name) {
        name = _name;
      });

      // 退室処理
      socket.leave(room_id);

      // ルームメンバー更新
      var mn = new Array();
      var members = socket.manager.rooms['/chatroom//' + room_id];
      if (members) {
        for(i = 0; i < members.length; i++) {
          mn[i] = chat.socket(members[i]).store.data['name'];
        }
        chat.to(room_id).emit('members', mn);
      } else {
        // メンバーがいない場合チャットルームを削除
        channel.removeRoom(room_id);
        // メンバーのいない場合チャットログを削除
        channel.removeChatLog(room_id);
      }

      // HN削除
      channel.removeHN(room_id, name);

      // 退室時に人数更新
      var chatrooms = channel.getRooms();
      var rooms = {};
      for(i in chatrooms) {
        rooms[i] = chatrooms[i];
        c = socket.manager.rooms['/chatroom//' + rooms[i].room];
        rooms[i]['count'] = c ? c.length : 0;
      }
      room.json.emit('rooms', rooms);
    })
});

// server start
app.listen(port);

console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);

// function
function random_string(len) {
    var base = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    base = base.split('');
    var str = '';
    var count = base.length;
    for (var i = 0; i < len; i++) {
        str += base[Math.floor(Math.random() * count)];
    }
    return str;
}
