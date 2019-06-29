/**
 * @class BufferCopyProcessor
 * @extends AudioWorkletProcessor
 */
class BufferCopyProcessor extends AudioWorkletProcessor{
    constructor() {
        super();
        this.first_sample = true;
    }

    process(inputs, outputs, parameters){
        const input = inputs[0];
        const output = outputs[0];

        for(let channel = 0; channel < output.length; ++channel){
            output[channel].set(input[channel]);
        }
        if(this.first_sample){
            console.dir(input[0]);
            this.first_sample = false;
        }
        this.port.postMessage({
            wavData: input[0]
        });
        return true;
    }
}
registerProcessor('buffercopy-processor', BufferCopyProcessor);