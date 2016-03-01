function gmBuffer(buffer) {
    this.buffer = Buffer(buffer);
    this.offset = 0;
};

gmBuffer.prototype.s8 = function(){
    var ret = this.buffer.readInt8(this.offset, false);
    this.offset+=1;
    return ret;
};

gmBuffer.prototype.u8 = function(){
    var ret = this.buffer.readUInt8(this.offset, false);
    this.offset+=1;
    return ret;
};

gmBuffer.prototype.s16 = function(){
    var ret = this.buffer.readInt16LE(this.offset, false);
    this.offset+=2;
    return ret;
};

gmBuffer.prototype.u16 = function(){
    var ret = this.buffer.readUInt16LE(this.offset, false);
    this.offset+=2;
    return ret;
};

gmBuffer.prototype.s32 = function(){
    var ret = this.buffer.readInt32LE(this.offset, false);
    this.offset+=4;
    return ret;
};

gmBuffer.prototype.u32 = function(){
    var ret = this.buffer.readUInt32LE(this.offset, false);
    this.offset+=4;
    return ret;
};

gmBuffer.prototype.f32 = function(){
    var ret = this.buffer.readFloatLE(this.offset, false);
    this.offset+=4;
    return ret;
};

gmBuffer.prototype.str = function(){
    var pos = this.buffer.indexOf(0, this.offset);
    var ret = this.buffer.toString('utf8', this.offset, pos);
    this.offset = pos+1;
    return ret;
};

gmBuffer.prototype.wu8 = function(val){
    this.buffer.writeUInt8(val, this.offset);
    this.offset+=1;
};

gmBuffer.prototype.wu16 = function(val){
    this.buffer.writeUInt16LE(val, this.offset);
    this.offset+=2;
};

gmBuffer.prototype.wu32 = function(val){
    this.buffer.writeUInt32LE(val, this.offset);
    this.offset+=4;
};

gmBuffer.prototype.wstr = function(val){
    this.offset += this.buffer.write(val, this.offset) + 1;
    this.buffer[this.offset-1] = 0;
};

gmBuffer.prototype.setOffset = function(offset){
    this.offset = offset;
};

gmBuffer.prototype.getBuffer = function(){
    //Only send the part of the buffer that has data
    return this.buffer.slice(0, this.offset);
};

module.exports = gmBuffer;