/*
* Error produced when calling a method in an invalid state.
*/
class InvalidStateError extends Error
{
    constructor(message)
    {
        super(message);

        this.name = 'InvalidStateError';

        if (Error.hasOwnProperty('captureStackTrace')) // Just in V8.
            Error.captureStackTrace(this, InvalidStateError);
        else
            this.stack = (new Error(message)).stack;
    }
}

class AwaitQueue
{
    constructor({ ClosedErrorClass = Error } = {})
    {
        // Closed flag.
        // @type {Boolean}
        this._closed = false;

        // Queue of pending tasks. Each task is a function that returns a promise
        // or a value directly.
        // @type {Array<Function>}
        this._tasks = [];

        // Error used when rejecting a task after the AwaitQueue has been closed.
        // @type {Error}
        this._closedErrorClass = ClosedErrorClass;
    }

    close()
    {
        this._closed = true;
    }

    /**
     * @param {Function} task - Function that returns a promise or a value directly.
     *
     * @async
     */
    async push(task)
    {
        if (typeof task !== 'function')
            throw new TypeError('given task is not a function');

        return new Promise((resolve, reject) =>
        {
            task._resolve = resolve;
            task._reject = reject;

            // Append task to the queue.
            this._tasks.push(task);

            // And run it if the only task in the queue is the new one.
            if (this._tasks.length === 1)
                this._next();
        });
    }

    async _next()
    {
        // Take the first task.
        const task = this._tasks[0];

        if (!task)
            return;

        // Execute it.
        await this._runTask(task);

        // Remove the first task (the completed one) from the queue.
        this._tasks.shift();

        // And continue.
        this._next();
    }

    async _runTask(task)
    {
        if (this._closed)
        {
            task._reject(new this._closedErrorClass('AwaitQueue closed'));

            return;
        }

        try
        {
            const result = await task();

            if (this._closed)
            {
                task._reject(new this._closedErrorClass('AwaitQueue closed'));

                return;
            }

            // Resolve the task with the given result (if any).
            task._resolve(result);
        }
        catch (error)
        {
            if (this._closed)
            {
                task._reject(new this._closedErrorClass('AwaitQueue closed'));

                return;
            }

            // Reject the task with the error.
            task._reject(error);
        }
    }
}
/////////////////////////////////////////////////////////////////////////////////////


$ (function(){

  var socket = io('/');

  var username = $('#user').val();
  var noChat = 0; //setting 0 if all chats histroy is not loaded. 1 if all chats loaded.
  var msgCount = 0; //counting total number of messages displayed.
  var oldInitDone = 0; //it is 0 when old-chats-init is not executed and 1 if executed.
  var roomId;//variable for setting room.
  var toUser;

  //passing data on connection.
  socket.on('connect',function(){
    socket.emit('set-user-data',username);
    // setTimeout(function() { alert(username+" logged In"); }, 500);

    socket.on('broadcast',function(data){
    document.getElementById("hell0").innerHTML += '<li>'+ data.description +'</li>';
    // $('#hell0').append($('<li>').append($(data.description).append($('<li>');
    $('#hell0').scrollTop($('#hell0')[0].scrollHeight);

});

  });//end of connect event.



  //receiving onlineStack.
  socket.on('onlineStack',function(stack){
    $('#list').empty();
    $('#list').append($('<li>').append($('<span>Group</span>'),$('<button id="ubtn" class="btn btn-danger btn-xs"></button>').data("name","Group").text("chat"), $('<button id="ubtn" class="btn btn-danger btn-xs"></button>').data("name","Group").text("call"), $('<button id="ubtn" class="btn btn-danger btn-xs"></button>').data("name","Group").text("share")));
    var totalOnline = 0;
    for (var user in stack){
      //setting txt1. shows users button.

      var txt1 = $('<span></span>').text(user);

      if(user == username){
        var txt2 = $('<button class="btn btn-secondary btn-xs disabled"> </button>').text("chat");
            //   var txt3 = $('<span class="badge"></span>').text(stack[user]).css({"float":"right","color":"#a6a6a6","font-size":"12px"});
      }
      else{
        var txt2 = $('<button id="ubtn" class="btn btn-primary btn-xs" >').text("chat").data("name",user) ;

      }


      if(user == username){
        var txt3= $('<button class="btn btn-secondary btn-xs disabled"> </button>').text("call");
        //   var txt3 = $('<span class="badge"></span>').text(stack[user]).css({"float":"right","color":"#a6a6a6","font-size":"12px"});
      }
      else{
        var txt3 = $('<button id="ubtn" data-name=user class="btn btn-primary btn-xs" >').text("call").data("name",user)  ;

      }


      if(user == username){
        var txt4= $('<button class="btn btn-secondary btn-xs disabled"> </button>').text("share");
        //   var txt3 = $('<span class="badge"></span>').text(stack[user]).css({"float":"right","color":"#a6a6a6","font-size":"12px"});
      }
      else{
        var txt4 = $('<button id="ubtn" data-name=user class="btn btn-primary btn-xs" >').text("share").data("name",user)  ;

      }




      //setting txt2. shows online status.
      if(stack[user] == "Online"){
        var txt5 = $('<span class="badge"></span>').text("*"+stack[user]).css({"float":"right","color":"#009933","font-size":"12px"});
        totalOnline++;

      }
      else{
        var txt5 = $('<span class="badge"></span>').text(stack[user]).css({"float":"right","color":"#a6a6a6","font-size":"12px"});
      }


      //listing all users.
      $('#list').append($('<li>').append(txt1,txt2,txt3,txt4,txt5));
      $('#totalOnline').text(totalOnline);
    }//end of for.
    $('#scrl1').scrollTop($('#scrl1').prop("scrollHeight"));
  }); //end of receiving onlineStack event.


  //on button click function.
  $(document).on("click","#ubtn",function(){

    //empty messages.
    $('#messages').empty();
    $('#typing').text("");
    msgCount = 0;
    noChat = 0;
    oldInitDone = 0;

    //assigning friends name to whom messages will send,(in case of group its value is Group).
    var type = $(this).text();

    if(type == 'call')
    {
       publish(true);
    }
    else if(type == 'share')
    {
      publish(false);
    }

    toUser =  $(this).data('name');


    //showing and hiding relevant information.
    $('#frndName').text(toUser);
    $('#initMsg').hide();
    $('#chatForm').show(); //showing chat form.
    $('#sendBtn').hide(); //hiding send button to prevent sending of empty messages.

    //assigning two names for room. which helps in one-to-one and also group chat.
    if(toUser == "Group"){
      var currentRoom = "Group-Group";
      var reverseRoom = "Group-Group";
    }
    else{
      var currentRoom = username+"-"+toUser;
      var reverseRoom = toUser+"-"+username;
    }

    //event to set room and join.
    socket.emit('set-room',{name1:currentRoom,name2:reverseRoom});

  }); //end of on button click event.

  //event for setting roomId.
  socket.on('set-room',function(room){
    //empty messages.
    $('#messages').empty();
    $('#typing').text("");
    msgCount = 0;
    noChat = 0;
    oldInitDone = 0;
    //assigning room id to roomId variable. which helps in one-to-one and group chat.
    roomId = room;
    console.log("roomId : "+roomId);
    //event to get chat history on button click or as room is set.
    socket.emit('old-chats-init',{room:roomId,username:username,msgCount:msgCount});

  }); //end of set-room event.

  //on scroll load more old-chats.
  $('#scrl2').scroll(function(){

    if($('#scrl2').scrollTop() == 0 && noChat == 0 && oldInitDone == 1){
      $('#loading').show();
      socket.emit('old-chats',{room:roomId,username:username,msgCount:msgCount});
    }

  }); // end of scroll event.

  //listening old-chats event.
  socket.on('old-chats',function(data){

    if(data.room == roomId){
      oldInitDone = 1; //setting value to implies that old-chats first event is done.
      if(data.result.length != 0){
        $('#noChat').hide(); //hiding no more chats message.
        for (var i = 0;i < data.result.length;i++) {
          //styling of chat message.
          var chatDate = moment(data.result[i].createdOn).format("MMMM Do YYYY, hh:mm:ss a");
          var txt1 = $('<span></span>').text(data.result[i].msgFrom+" : ").css({"color":"#006080"});
          var txt2 = $('<span></span>').text(chatDate).css({"float":"right","color":"#a6a6a6","font-size":"16px"});
          var txt3 = $('<p></p>').append(txt1,txt2);
          var txt4 = $('<p></p>').text(data.result[i].msg).css({"color":"#000000"});
          //showing chat in chat box.
          $('#messages').prepend($('<li>').append(txt3,txt4));
          msgCount++;

        }//end of for.
        console.log(msgCount);
      }
      else {
        $('#noChat').show(); //displaying no more chats message.
        noChat = 1; //to prevent unnecessary scroll event.
      }
      //hiding loading bar.
      $('#loading').hide();

      //setting scrollbar position while first 5 chats loads.
      if(msgCount <= 5){
        $('#scrl2').scrollTop($('#scrl2').prop("scrollHeight"));
      }
    }//end of outer if.

  }); // end of listening old-chats event.

  // keyup handler.
  $('#myMsg').keyup(function(){
    if($('#myMsg').val()){
      $('#sendBtn').show(); //showing send button.
      socket.emit('typing');
    }
    else{
      $('#sendBtn').hide(); //hiding send button to prevent sending empty messages.
    }
  }); //end of keyup handler.

  //receiving typing message.
  socket.on('typing',function(msg){
    var setTime;
    //clearing previous setTimeout function.
    clearTimeout(setTime);
    //showing typing message.
    $('#typing').text(msg);
    //showing typing message only for few seconds.
    setTime = setTimeout(function(){
      $('#typing').text("");
    },3500);
  }); //end of typing event.

  //sending message.
  $('form').submit(function(){
    socket.emit('chat-msg',{msg:$('#myMsg').val(),msgTo:toUser,date:Date.now()});
    $('#myMsg').val("");
    $('#sendBtn').hide();
    return false;
  }); //end of sending message.

  //receiving messages.
  socket.on('chat-msg',function(data){
    //styling of chat message.
    var chatDate = moment(data.date).format("MMMM Do YYYY, hh:mm:ss a");
    var txt1 = $('<span></span>').text(data.msgFrom+" : ").css({"color":"#006080"});
    var txt2 = $('<span></span>').text(chatDate).css({"float":"right","color":"#a6a6a6","font-size":"16px"});
    var txt3 = $('<p></p>').append(txt1,txt2);
    var txt4 = $('<p></p>').text(data.msg).css({"color":"#000000"});
    //showing chat in chat box.
    $('#messages').append($('<li>').append(txt3,txt4));
      msgCount++;
      console.log(msgCount);
      $('#typing').text("");
      $('#scrl2').scrollTop($('#scrl2').prop("scrollHeight"));
  }); //end of receiving messages.

  //on disconnect event.
  //passing data on connection.
  socket.on('disconnect',function(){


    //showing and hiding relevant information.
    $('#list').empty();
    $('#messages').empty();
    $('#typing').text("");
    $('#frndName').text("Disconnected..");
    $('#loading').hide();
    $('#noChat').hide();
    $('#initMsg').show().text("...Please, Refresh Your Page...");
    $('#chatForm').hide();
    msgCount = 0;
    noChat = 0;
  });//end of connect event.

///webrtc
/////////////////////////////////////////////////////////////////////////
  var  peerID;
  var  remotePeerName;
  var  peerName;


  var pc1;
  var pc2;

  socket.on('created', function(room) {
    console.log('Created room ' + room);
    isInitiator = true;
  });

  socket.on('full', function(room) {
    console.log('Room ' + room + ' is full');
  });

  socket.on('join', function (room, id){
    //console.log('Another peer made a request to join room ' + room);
    console.log('This peer is the initiator of room ' + room + '!' +" client id " + id);
    isChannelReady = true;

    // ////////////////////
    //
    //   sendMessage ({
    //       room: room,
    //       from: peerID,
    //       to: remotePeerID,
    //       type: "subscribe",
    //       desc: id
    //   });
    // ////////////////////


  });

  socket.on('joined', function(room, id) {
    console.log('joined: ' + room + ' with peerID: ' + id);
    //log('joined: ' + room + ' with peerID: ' + id);
    isChannelReady = true;
    peerID = id;


    initPC2();
    // Handle RTCPeerConnection connection status.


  });


  function initPC2()
  {
    pc2 = new RTCPeerConnection(
        {
          iceServers         : [],
          iceTransportPolicy : 'all',
          bundlePolicy       : 'max-bundle',
          rtcpMuxPolicy      : 'require',
          sdpSemantics       : 'unified-plan'
        });

    pc2.addEventListener('iceconnectionstatechange', () =>
    {
      switch (pc2.iceConnectionState)
      {
        case 'checking':
          console.log( 'subscribing...');
          break;
        case 'connected':
        case 'completed':
          //  document.querySelector('#local_video').srcObject = stream;
          // $txtPublish.innerHTML = 'published';
          // $fsPublish.disabled = true;
          // $fsSubscribe.disabled = false;
          pc2Connected = true;
          console.log( 'subscribed...');

          break;
        case 'failed':
          pc2.close();
          // $txtPublish.innerHTML = 'failed';
          // $fsPublish.disabled = false;
          // $fsSubscribe.disabled = true;
          console.log( 'failed...');
          break;
        case 'disconnected':
          pc2.close();
          // $txtPublish.innerHTML = 'failed';
          // $fsPublish.disabled = false;
          // $fsSubscribe.disabled = true;
          console.log( 'Peerconnection disconnected...');
          break;
        case 'closed':
          pc2.close();
          // $txtPublish.innerHTML = 'failed';
          // $fsPublish.disabled = false;
          // $fsSubscribe.disabled = true;
          console.log( 'failed...');
          break;
      }
    });



    /////////////////////////////////////////////////////////////////////////////////


    pc1 = new RTCPeerConnection(
        {
          iceServers         : [],
          iceTransportPolicy : 'all',
          bundlePolicy       : 'max-bundle',
          rtcpMuxPolicy      : 'require',
          sdpSemantics       : 'unified-plan'
        });

    // Handle RTCPeerConnection connection status.
    pc1.addEventListener('iceconnectionstatechange', () =>
    {
      switch (pc1.iceConnectionState)
      {
        case 'checking':
          console.log( 'publishing...');
          break;
        case 'connected':
        case 'completed':

          // const streamV = new MediaStream();
          // streamV.addTrack(videotrack);
          //
          // el.srcObject = streamV;
          //
          // el.play()
          //     .then(()=>{})
          //     .catch((e) => {
          //         err(e);
          //     });


          // $txtPublish.innerHTML = 'published';
          // $fsPublish.disabled = true;
          // $fsSubscribe.disabled = false;
          console.log( 'published...');
          break;
        case 'failed':
          pc1.close();
          // $txtPublish.innerHTML = 'failed';
          // $fsPublish.disabled = false;
          // $fsSubscribe.disabled = true;
          console.log( 'failed...');
          break;
        case 'disconnected':
          pc1.close();
          // $txtPublish.innerHTML = 'failed';
          // $fsPublish.disabled = false;
          // $fsSubscribe.disabled = true;
          console.log( 'failed...');
          break;
        case 'closed':
          pc1.close();
          // $txtPublish.innerHTML = 'failed';
          // $fsPublish.disabled = false;
          // $fsSubscribe.disabled = true;
          console.log( 'failed...');
          break;
      }
    });


  }


  socket.on('log', function(array) {
    console.log.apply(console, array);
  });

////////////////////////////////////////////////

  function sendMessage(message) {
    console.log('Client sending message: ', message);
    socket.emit('sfu-message', message);
  }


  async  function processOffer( remotePeerID,  sdp)
  {

    console.log( " Pc2 offers %o", sdp);

    await pc2.setRemoteDescription(new RTCSessionDescription(sdp));


    const ret = await doAnswer(remotePeerID);

    return ret;
  }




//////////////////////////////////////////////////////////////////////
  function subscribe_simulcast(trackid)
  {
    for (let s of CAM_VIDEO_SIMULCAST_ENCODINGS) {

      var div = document.createElement('div');
      var radio = document.createElement('input');
      var label = document.createElement('label');
      radio.type = 'radio';
      radio.name = `radioConsumer`;
      // radio.checked = currentLayer == undefined ?
      //     (i === stats.length-1) :
      //     (i === currentLayer);

      radio.onchange = () => {
        var desc= {};
        desc["id"]=trackid;

        var radioButtons = document.getElementsByName("radioConsumer");
        for(var i = 0; i < radioButtons.length; i++) {
          if (radioButtons[i].checked == true) {
            desc["data"]={"spatialLayer":i};
            sendMessage({
              room: roomId,
              from: peerID,
              type: 'setPreferredLayers',
              desc: desc
            });


          }
        }

      };
      // let bitrate = Math.floor(s.bitrate / 1000);
      label.innerHTML = s.rid + " " + ( (s.scaleResolutionDownBy != null) ? s.scaleResolutionDownBy:'full') ;
      div.appendChild(radio);
      div.appendChild(label);
      //container.appendChild(div);
      $('#TRSubscribe').append(div);

    }
  }


  function publish_simulcast(transceiver)
  {

    for (let s of CAM_VIDEO_SIMULCAST_ENCODINGS) {

      var div = document.createElement('div');
      var radio = document.createElement('input');
      var label = document.createElement('label');
      radio.type = 'radio';
      radio.name = `radioProducer`;
      // radio.checked = currentLayer == undefined ?
      //     (i === stats.length-1) :
      //     (i === currentLayer);
      radio.onchange = () => {
        console.log('ask server to set layers ' + i);
        // sig('consumer-set-layers', { consumerId: consumer.id,
        //  spatialLayer: i });

        const parameters =  transceiver.sender.getParameters();
        var radioButtons = document.getElementsByName("radioProducer");
        for(var i = 0; i < radioButtons.length; i++) {
          if (radioButtons[i].checked == true) {
            parameters.encodings[i].active = true;

          } else
            parameters.encodings[i].active = false;
        }

        transceiver.sender.setParameters(parameters);

      };
      // let bitrate = Math.floor(s.bitrate / 1000);
      label.innerHTML = s.rid + " " + ( (s.scaleResolutionDownBy != null) ? s.scaleResolutionDownBy:'full') ;

      div.appendChild(radio);
      div.appendChild(label);
      //container.appendChild(div);
      $('#local_video').append(div);

    }

  }


  var prodtrackNo= -1;

  var _awaitQueue = new AwaitQueue({ ClosedErrorClass: InvalidStateError });

// This client receives a message
  socket.on('message',  async function(message) {
    console.log('Client received message:', message);

    if (message.type === 'offer') {

      return _awaitQueue.push(
          async () =>  processOffer(message.from, message.desc  ));
      //await processOffer(message.from, message.desc  );

    } else if (message.type === 'answer' && isStarted) {
      //remotePeerID=message.from;
      console.log("publish andwer %o", message)
      pc1.setRemoteDescription(new RTCSessionDescription(message.desc))
          .then(function ()
          {
            // subscribe();
            //////

            var mss = pc1.getTransceivers();

            var store={};

            for (var ts in mss) {
              if( ts > prodtrackNo  ) {
                prodtrackNo = ts;
                var track = mss[ts].sender.track;
                store [track.kind] = track.id
                if (track.kind === 'video') {

                  addProducerVideoAudio(track, store);
                  publish_simulcast(mss[ts]);

                }
              }
            }


          }, function (error) {

            console.error(error);

          });



    } else if (message.type === 'candidate' && isStarted) {
      var candidate = new RTCIceCandidate({
        sdpMLineIndex: message.candidate.sdpMLineIndex,
        sdpMid: message.candidate.sdpMid,
        candidate: message.candidate.candidate
      });
      pc.addIceCandidate(candidate);
    } else if (message.type === 'bye' && isStarted) {
      handleRemoteHangup();
    } else if (message.type === 'soundlevel' && isStarted) {
      soundlevel(message.desc);
    }else if (message.type === 'prodstats' && isStarted) {
      prodstats(message.desc);
    }else if (message.type === 'constats') {
      constats(message.desc);
    }

  });

  var trackNo= -1;

  async function sleep(ms) {
    return new Promise((r) => setTimeout(() => r(), ms));
  }

  async function doAnswer(remotePeerID) {


    const answer = await  pc2.createAnswer();

    await pc2.setLocalDescription(answer);

    if(!pc2Connected) {
      pc2Connected = true;
      console.log('Sending answer to peer.');
      sendMessage({
        room: roomId,
        from: peerID,
        to: remotePeerID,
        type: answer.type,
        desc: answer
      });
    }


    // while (!pc2Connected) {
    //     console.log(' transport connstate', pc2Connected );
    //     await sleep(100);
    //
    // }


    console.log("answer %o", answer.type);




    // console.log( "transceivers %o", transceivers);
    // if (!transceivers)
    //     throw new Error('new RTCRtpTransceiver not found');


    var mss = pc2.getRemoteStreams();


    for (var ts in mss) {
      if (ts > trackNo) {
        // console.log("ts%o:%o, ", ts, mss[ts]);

        var ms = mss[ts];
        trackNo = ts;
        addConumerVideoAudio(ms);
      }
    }





    return  true;
  }

  function removeElement(elementId) {
    // Removes an element from the document
    var element = document.getElementById(elementId);
    element.parentNode.removeChild(element);
  }

  function addProducerVideoAudio(track, store) {



    // var track = ms;

    var divStore = document.createElement('div');

    var statButton;


    if(track.kind === 'video') {
      statButton = document.createElement('button');
      statButton.id=track.id;
      statButton.innerHTML += 'video Stats';
      statButton.onclick = function(){
        // alert('here be dragons');return false;
        btn_producer_stats(statButton.id);
        return false;
      };
    }

    if(statButton)
      divStore.appendChild(statButton);

    let el = document.createElement("video");

    el.setAttribute('playsinline', true);
    el.setAttribute('autoplay', true);


    var div = document.createElement('div');
    div.textContent = track.id;
    div.potato= store;

    div.appendChild(el);
    var td = document.createElement('td');

    td.appendChild(div);
    td.appendChild(divStore);


    var closeButton = document.createElement('button');
    closeButton.innerHTML += 'close';
    closeButton.onclick = async function(){

      var mss = pc1.getTransceivers();

      // console.log( "ravind1 : %o", mss);

      for (var ts in mss) {


        let ltrack = mss[ts].sender.track;

        if ( ltrack && store[ltrack.kind] === ltrack.id) {

          mss[ts].sender.replaceTrack(null);

          pc1.removeTrack(mss[ts].sender);

          mss[ts].direction = "inactive";

          //  this._remoteSdp.closeMediaSection(transceiver.mid)

          var offer = await pc1.createOffer();

          console.log( "arvind removed offer: %o", offer);
          console.log('removded ' + ts);

        }

        // var mss1 = pc1.getTransceivers();
        console.log(ts);


      }

      btn_producer_close(store);
      // removeElement('producertd' );
      return false;

    };

    td.appendChild(closeButton);

    td.id = 'producertd';

    $('#local_video').append(td);



    const streamV = new MediaStream();
    streamV.addTrack(track);

    el.srcObject = streamV;

    el.play()
        .then(()=>{})
        .catch((e) => {
          err(e);
        });


    return true;

  }

  function addConumerVideoAudio(ms) {

    var store={};

    var tracks = ms.getTracks();

    var divStore = document.createElement('div');

    var statButton;

    for( const tno in tracks)
    {
      var track = tracks[tno];
      store [track.kind] = track.id

      let pause = document.createElement('span'),
          checkbox = document.createElement('input'),
          label = document.createElement('label');
      pause.classList = 'nowrap';
      checkbox.type = 'checkbox';
      checkbox.id=track.id;
      checkbox.checked = false;
      checkbox.onchange = async () => {
        if (checkbox.checked) {
          await btn_subscribe_pause (checkbox.id);
        } else {
          await btn_subscribe_resume(checkbox.id);
        }

      }
      label.id = `consumer-stats-${track.id}`;
      label.innerHTML = "Pause " + track.kind;


      if(track.kind === 'video') {
        statButton = document.createElement('button');
        statButton.id=track.id;
        statButton.innerHTML += 'video Stats';
        statButton.onclick = function(){
          // alert('here be dragons');return false;
          btn_subscribe_stats(statButton.id);
          return false;
        };


      }


      // if (consumer.paused) {
      //     label.innerHTML = '[consumer paused]'
      // } else {
      //     let stats = lastPollSyncData[myPeerId].stats[consumer.id],
      //         bitrate = '-';
      //     if (stats) {
      //         bitrate = Math.floor(stats.bitrate / 1000.0);
      //     }
      //     label.innerHTML = `[consumer playing ${bitrate} kb/s]`;
      // }
      pause.appendChild(checkbox);
      pause.appendChild(label);
      // pause.appendChild(checkbox);
      divStore.appendChild(pause);

    }

    if(statButton)
      divStore.appendChild(statButton);

    let el = document.createElement("video");
// set some attributes on our audio and video elements to make
// mobile Safari happy. note that for audio to play you need to be
// capturing from the mic/camera
    el.setAttribute('playsinline', true);
    el.setAttribute('autoplay', true);


    var div = document.createElement('div');
    div.textContent = ms.id;
    div.potato= store;

    div.appendChild(el);
    var td = document.createElement('td');

    td.appendChild(div);
    td.appendChild(divStore);

    $('#TRSubscribe').append(td);


    subscribe_simulcast(store.video);

    el.srcObject = ms;
    el.play()
        .then(()=>{})
        .catch((e) => {
          err(e);
        });




    return true;

  }

  function onCreateSessionDescriptionError(error) {
    //log('Failed to create session description: ' + error.toString());
    console.log('Failed to create session description: ' + error.toString());

  }



  async function getUserMedia1( isWebcam) {


    let stream;
    try {

      //stream =  await navigator.mediaDevices.getUserMedia({ audio: true, video: true });

      stream = isWebcam ?
          await navigator.mediaDevices.getUserMedia({ audio: true, video: true }) :
          await navigator.mediaDevices.getDisplayMedia({ audio: true, video: true });
    } catch (err) {
      console.error('getUserMedia() failed:', err.message);
      throw err;
    }
    return stream;
  }

/////////////////////////////////////////////////////////////////////////////
  async function btn_subscribe_resume(consumerid ) {

    sendMessage ({
      room: roomId,
      from: peerID,
      type: "subscribe-resume",
      desc: consumerid
    });
  }

  async function btn_subscribe_pause(consumerid ) {

    sendMessage ({
      room: roomId,
      from: peerID,
      type: "subscribe-pause",
      desc: consumerid
    });
  }


  const CAM_VIDEO_SIMULCAST_ENCODINGS =
      [
        {rid: 'q', scaleResolutionDownBy: 4.0},
        {rid: 'h', scaleResolutionDownBy: 2.0},
        {rid: 'f'}
      ];
///////////////////////////////////////////////////////////////////////////

//var pc1
  async function publish(isWebcam)
  {
    // const isWebcam = (e.target.id === 'btn_webcam');
    // $txtPublish = isWebcam ? $txtWebcam : $txtScreen;

    var parser = new URL(window.location.href);
    var istcp = parser.searchParams;
    const tcpValue = istcp.get('forceTcp') ? true : false;


    let stream;

    stream =  await getUserMedia1(isWebcam);
    let  videotrack;
    let audiotrack;



    //if ($('#chk_video').prop('checked'))
      videotrack = stream.getVideoTracks()[0];

    //if ($('#chk_audio').prop('checked'))
      audiotrack = stream.getAudioTracks()[0];


    //var encodings;
    var _stream = new MediaStream();


    if(audiotrack) {
      var transceiver1 = pc1.addTransceiver(
          audiotrack,
          {
            direction: 'sendonly',
            streams: [_stream]
          });
    }

    //firefox
    // var parameters = transceiver.sender.getParameters();
    // console.log("simulcast parameters %o", parameters);

    //  if (!parameters.encodings) {
    //  parameters.encodings = [{}];
    //  }

    // var encodings = [
    //           { rid: 'r0', maxBitrate: 100000 },
    //           { rid: 'r1', maxBitrate: 500000 }
    //       ];
    // parameters.encodings = encodings;
    // transceiver.sender.setParameters(parameters);


    // Mormal without simulcast
    if(videotrack ) {
      //var checkBox = document.getElementById("chk_simulcast");
      //if (checkBox.checked)
      if(true)
      {

        var transceiver = pc1.addTransceiver(videotrack, {
          direction: 'sendonly',
          streams: [_stream],
          sendEncodings:CAM_VIDEO_SIMULCAST_ENCODINGS
        });


      } else {
        var transceiver = pc1.addTransceiver(
            videotrack,
            {
              direction: 'sendonly',
              streams: [_stream]
            });
      }
    }



    var offer = await pc1.createOffer();

    console.log( "publish offer: %o", offer);

    await pc1.setLocalDescription(offer);

    // We can now get the transceiver.mid.
    //const localId = transceiver.mid;

    //console.log("arvind transceiver.mid " + transceiver.mid);

    isStarted = true;

    //document.querySelector('#local_video').srcObject = stream;


    sendMessage ({
      room: roomId,
      from: peerID,
      //to: remotePeerID,
      type: pc1.localDescription.type,
      desc: pc1.localDescription
    });





  }
/////////////////////////////End Publish


  async function subscribe() {

    var parser = new URL(window.location.href);
    var istcp = parser.searchParams;
    const tcpValue = istcp.get('forceTcp') ? true : false;


    sendMessage ({
      room: roomId,
      from: peerID,
      type: "subscribe",
    });


  }//end subscribe



// async function pollit()
// {


//       // super-simple signaling: let's poll at 1-second intervals
//       pollingInterval = setInterval(async () => {
//         let { error } = await pollAndUpdate();
//         if (error) {
//           clearInterval(pollingInterval);
//           err(error);
//         }
//       }, 1000);


// }//end simulcast

  async function btn_audio_level_start()
  {

    sendMessage ({
      room: roomId,
      from: peerID,
      to: remotePeerID,
      type: "rtpObserver_addProducer",
    });
  }

  async function btn_audio_level_stop()
  {

    sendMessage ({
      room: roomId,
      from: peerID,
      to: remotePeerID,
      type: "rtpObserver_removeProducer",
    });
  }


  async function btn_producer_close(producerids)
  {

    sendMessage ({
      room: roomId,
      from: peerID,
      type: "producer_close",
      desc: producerids
    });

  }

  async function btn_producer_stats(producerid)
  {

    sendMessage ({
      room: roomId,
      from: peerID,
      type: "producer_getStats",
      desc: producerid
    });

  }

  async function btn_subscribe_stats(consumerid)
  {

    sendMessage ({
      room: roomId,
      from: peerID,
      type: "consumer_getStats",
      desc: consumerid
    });

  }


  function soundlevel(level)
  {
    //console.log(level);

    sound_level.innerHTML = JSON.stringify(level, undefined, 4);
  }

  function prodstats(desc)
  {
    //console.log(level);

    prod_stat.innerHTML = JSON.stringify(desc, undefined, 4);
  }

  function constats(desc)
  {
    //console.log(level);

    cons_stat.innerHTML = JSON.stringify(desc, undefined, 4);
  }


///////////////////////////////////////////////////////////////////////
});//end of function.
