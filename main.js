var WIDTH = 300,
    HEIGHT = 200;

var mediaConstraints = {
    audio: {
        sampleRate: 16000,
        channelCount: 1
    }
};
var mediaRecorder;
var arrayBuffer = new Uint8Array(65536 * 4);
var blobBuffer = [];
var first_sample = true;
var canvasCtx;

function display_warning(text){
    var message_box = $("<div></div>");
    message_box.addClass("alert");
    message_box.text(text);
    $("body").prepend(message_box);
}

function draw(drawbuffer){
    var drawVisual = requestAnimationFrame(draw);

    canvasCtx.lineWidth = 1;
    canvasCtx.strokeStyle = 'rgb(0,0,0)';
    canvasCtx.beginPath();

    var sliceWidth = WIDTH * 1.0 / drawbuffer.length;
    var x = 0;
    for(var i = 0; i < drawbuffer.length; i++){
        var v = drawbuffer[i] / 32768.0 + 1.0;
        var y = v * HEIGHT/2;

        if(i === 0)
            canvasCtx.moveTo(x, y);
        else
            canvasCtx.lineTo(x, y);
        x += sliceWidth;
    }
    canvasCtx.lineTo(WIDTH, HEIGHT/2);
    canvasCtx.stroke();
}

function process_packet({done, value}){
    //console.dir(done);
    //console.dir(value);
    value = value.slice((value.length/2 - 1) | 0);
    arrayBuffer.copyWithin(0, value.length/4 - 1);
    //arrayBuffer.set(value, arrayBuffer.length - value.length);
    var offset = arrayBuffer.length - value.length;
    for(var i = 0; i < value.length; i+=4){
        arrayBuffer[offset + i/4] = value[i];
    }
    canvasCtx.clearRect(0, 0, WIDTH, HEIGHT);
    draw(new Int16Array(arrayBuffer.buffer));
}

function init_record(stream){
    mediaRecorder = new MediaRecorder(stream);
    mediaRecorder.mimeType = 'audio/wav';
    mediaRecorder.ondataavailable = async function(blob) {
        var reader = await (new Response(blob)).body.getReader();
        reader.read().then(process_packet);
        blobBuffer.push(blob);
    };

    $(".controls").removeAttr("disabled");

    $("#stop").click(function(){
        mediaRecorder.stop();
        $("#start").removeAttr("disabled");

        ConcatenateBlobs(blobBuffer, blobBuffer[0].type, function(playbackBuffer){
            $("#player").attr("src", URL.createObjectURL(playbackBuffer));
        });
    });
    $("#start").click(function(){
        //clear buffer and canvas
        canvasCtx.clearRect(0, 0, WIDTH, HEIGHT);
        arrayBuffer.fill(0);
        blobBuffer = [];
        draw(arrayBuffer);

        //start record and prevent re-click
        mediaRecorder.start(50);
        $(this).attr("disabled","");
    });
    $("#save").click(function(){
        mediaRecorder.save();
    });
}

function failed_record(e){
    console.dir(e);
    display_warning(e.message);
}

$(document).ready(function(){
    $(".alert").click(function(){
        $(this).remove();
        console.log(this);
    });

    canvasCtx = $("#waveform")[0].getContext("2d");
    
    if(navigator.mediaDevices.getSupportedConstraints()["sampleRate"]){
        navigator.mediaDevices.getUserMedia(mediaConstraints)
            .then(init_record)
            .catch(failed_record);
    }
    else
        display_warning("your browser does not support setting sample rate");
});
