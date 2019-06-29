class BufferCopyWorkletNode extends AudioWorkletNode{
    /**
     * 
     * @param {BaseAudioContext} context 
     * @param {function(Float32Array)} callback 
     */
    constructor(context, callback) {
        super(context, "buffercopy-processor");
        this.callback = callback;
        this.port.onmessage = this.handleMessage_.bind(this);
        this.buffer = new Float32Array(1024);
        this.offset = 0;
    }
    handleMessage_(event){
        if(this.offset == 1024){
            this.offset = 0;
            if(this.callback){
                this.callback(new Float32Array(this.buffer));
            }
        }
        var wavData = event.data.wavData;
        this.buffer.set(wavData, this.offset);
        this.offset += wavData.length;
    }
}