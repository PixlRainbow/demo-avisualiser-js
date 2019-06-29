class BufferCopyWorkletNode extends AudioWorkletNode{
    /**
     * 
     * @param {BaseAudioContext} context 
     * @param {function(Float32Array)} callback 
     * @param {number} buffersize
     */
    constructor(context, callback, buffersize = 1024) {
        super(context, "buffercopy-processor");
        this.callback = callback;
        this.port.onmessage = this.handleMessage_.bind(this);
        this.buffersize = buffersize | 0;
        this.buffer = new Float32Array(this.buffersize);
        this.offset = 0;
    }
    handleMessage_(event){
        if(this.offset == this.buffersize){
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