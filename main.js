var WIDTH = 400,
    HEIGHT = 200;

var encodingOptions = {
    sampleRate: 16000,
    channelCount: 1
};
var audioOnly = {
    audio: encodingOptions
};
var mediaRecorder;
var audioCtx;
var source;
var destination;
var scriptNode;
var bufferCopyNode;
var encoder;
var decoder;
var drawBuffer = new Float32Array(2**14);
//var blobBuffer = [];
var audioBuffer = [];
var mergedAudioBuffer;
var first_sample = true;
var first_click = true;
var canvasCtx;

function display_warning(text){
    var message_box = $("<div></div>");
    message_box.addClass("alert");
    message_box.text(text);
    message_box.click(function(){
        $(this).remove();
    });
    $("body").prepend(message_box);
}

function merge_arrays(arr_of_arr){
    var len = 0;
    var offset = 0;
    arr_of_arr.forEach(arr => {
        len += arr.length;
    });
    var mergedArr = new Float32Array(len);
    arr_of_arr.forEach(arr => {
        mergedArr.set(arr, offset);
        offset += arr.length;
    });
    //console.dir(mergedArr);
    return mergedArr;
}

function draw(drawbuf){
    var drawVisual = requestAnimationFrame(draw);

    canvasCtx.lineWidth = 1;
    canvasCtx.strokeStyle = 'rgb(0,0,0)';
    canvasCtx.beginPath();

    var sliceWidth = WIDTH * 1.0 / drawbuf.length;
    var x = 0;
    for(var i = 0; i < drawbuf.length; i++){
        var v = drawbuf[i] + 1.0;
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

function draw_time(event){
    if(!event.target)
        return;
    var duration = event.target.duration;
    var curTime = event.target.currentTime;
    var x = (curTime/duration) * WIDTH;

    var drawVisual = requestAnimationFrame(draw_time);

    canvasCtx.clearRect(0, 0, WIDTH, HEIGHT);
    canvasCtx.lineWidth = 1;
    canvasCtx.strokeStyle = 'rgb(255,0,0)';
    canvasCtx.beginPath();
    canvasCtx.moveTo(x, 0);
    canvasCtx.lineTo(x, HEIGHT);
    canvasCtx.stroke();
    //draw(merge_arrays(audioBuffer));
    draw(mergedAudioBuffer);
}

/**
 * @returns {Promise<AudioBuffer>} PCM encoded audio
 * @param {ArrayBuffer} buf Opus encoded audio
 */
function decode_opus(buf){
    return audioCtx.decodeAudioData(buf);
}

/**
 * @summary listen to event "packetAvailable" on audioCtx to catch this event
 * @param {Float32Array} buf PCM audio
 */
function dispatch_packet_ready(buf){
    //encoder.encode(buf);
    var packetAvailable = new CustomEvent("packetAvailable",{
        detail: {
            wavData: buf
        }
    });
    audioCtx.dispatchEvent(packetAvailable);
}

/**
 * 
 * @param {CustomEvent<{wavData: Float32Array}>} event 
 */
function process_packet(event){
    var value = event.detail.wavData;
    audioBuffer.push(value);
    //console.dir(done);
    //console.dir(value);
    //value = value.slice((value.length/2 - 1) | 0);
    drawBuffer.copyWithin(0, value.length/4 - 1);
    //drawBuffer.set(value, drawBuffer.length - value.length);
    var offset = drawBuffer.length - value.length;
    for(var i = 0; i < value.length; i+=4){
        drawBuffer[offset + i/4] = value[i];
    }
    canvasCtx.clearRect(0, 0, WIDTH, HEIGHT);
    draw(drawBuffer);
}

function init_record(stream){
    /* mediaRecorder = new MediaRecorder(stream);
    mediaRecorder.mimeType = 'audio/wav';
    mediaRecorder.ondataavailable = async function(event) {
        try{
        var blob = event.data;
        var reader = await (new Response(blob)).body.getReader();
        reader.read().then(process_packet);
        } catch (e){console.dir(e);}
        blobBuffer.push(blob);
    }; */

    $(".controls").removeAttr("disabled");

    $("#stop").click(function(){
        if(scriptNode)
            scriptNode.disconnect(destination);
        else
            bufferCopyNode.disconnect(destination);
        mediaRecorder.stop();
        audioCtx.suspend();

        $("#start").removeAttr("disabled");

        /*ConcatenateBlobs(blobBuffer, blobBuffer[0].type, function(playbackBuffer){
            $("#player").attr("src", URL.createObjectURL(playbackBuffer));
        });*/
    });
    $("#start").click(async function(){
        //https://developers.google.com/web/updates/2017/09/autoplay-policy-changes#webaudio
        //workaround: only construct AudioContext after user interaction
        if(first_click){
            audioCtx = new AudioContext(encodingOptions);
            source = audioCtx.createMediaStreamSource(stream);
            if(AudioWorklet){
                await audioCtx.audioWorklet.addModule("buffercopy-processor.js");
                bufferCopyNode = new BufferCopyWorkletNode(audioCtx, dispatch_packet_ready);
                source.connect(bufferCopyNode);
            }
            else{
                console.log("AudioWorklet API not available. Falling back to ScriptProcessor");
                scriptNode = audioCtx.createScriptProcessor(512, 1, 1);
                scriptNode.onaudioprocess = function(event){
                    var inputData = event.inputBuffer.getChannelData(0);
                    var outputData = event.outputBuffer.getChannelData(0);
                    if(first_sample){
                        console.dir(inputData);
                        first_sample = false;
                    }
                    //process_packet(inputData);
                    dispatch_packet_ready(new Float32Array(inputData));
                    outputData.set(inputData);
                };
                source.connect(scriptNode);
            }
            destination = audioCtx.createMediaStreamDestination();
            //scriptNode.connect(destination);
            audioCtx.addEventListener("packetAvailable", process_packet);

            mediaRecorder = new MediaRecorder(destination.stream);
            mediaRecorder.ondataavailable = function(event){
                var blob = event.data;
                //blobBuffer.push(blob);
                new Response(blob)
                    .arrayBuffer()
                    .then(decode_opus)
                    .then(function(data) {
                        console.dir(data);
                        encoder.encode([data.getChannelData(0)]);
                        var outBlob = encoder.finish();
                        console.dir(outBlob);
                        mergedAudioBuffer = merge_arrays(audioBuffer);
                        $("#player").attr("src", URL.createObjectURL(outBlob));
                    }).catch(failed_record);
            };

            first_click = false;
        }else{
            audioCtx.resume();
        }

        //clear buffer and canvas
        canvasCtx.clearRect(0, 0, WIDTH, HEIGHT);
        drawBuffer.fill(0);
        //blobBuffer = [];
        audioBuffer = [];
        draw(drawBuffer);

        $("#player").attr("src","");

        /*
        WavAudioEncoder.js:
        "once it has completed packaging a WAV
         it cannot be reused and must be re-constructed"
        */
        encoder = new WavAudioEncoder(16000, 1);

        //start record and prevent re-click
        if(scriptNode)
            scriptNode.connect(destination);
        else
            bufferCopyNode.connect(destination);
        mediaRecorder.start();
        $(this).attr("disabled","");
    });
    $("#save").click(function(){
        //mediaRecorder.save();
        var downloadURL = $("#player").attr("src");
        if(downloadURL != null && downloadURL != "")
            downloadFile(downloadURL);
    });
}

function failed_record(e){
    console.dir(e);
    display_warning(e.message);
}

$(document).ready(function(){
    var canvasElem = $("#waveform")[0];
    canvasElem.width = WIDTH;
    canvasElem.height = HEIGHT;
    canvasCtx = canvasElem.getContext("2d");

    $("#player").on("timeupdate", draw_time);
    
    if(navigator.mediaDevices.getSupportedConstraints()["sampleRate"]){
        navigator.mediaDevices.getUserMedia(audioOnly)
            .then(init_record)
            .catch(failed_record);
    }
    else
        display_warning("your browser does not support setting sample rate");
});
