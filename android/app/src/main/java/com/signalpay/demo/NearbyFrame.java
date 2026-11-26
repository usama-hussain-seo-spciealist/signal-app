package com.signalpay.demo;
import java.nio.ByteBuffer;
import java.nio.charset.CodingErrorAction;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

/** Bounded SPN/1 GATT framing. Transport framing is not transaction acknowledgement. */
final class NearbyFrame {
 static final int MAX=8192;
 static List<byte[]> split(String text,int id,int valueLength){
  byte[] data=text.getBytes(StandardCharsets.UTF_8);if(data.length<1||data.length>MAX||id<1||id>65535||valueLength<20||valueLength>512)throw new IllegalArgumentException("Nearby frame limits");
  List<byte[]> frames=new ArrayList<>();for(int offset=0;offset<data.length;offset+=valueLength-8){int n=Math.min(valueLength-8,data.length-offset);ByteBuffer b=ByteBuffer.allocate(8+n);b.put((byte)0x53).put((byte)1).putShort((short)id).putShort((short)offset).putShort((short)data.length).put(data,offset,n);frames.add(b.array());}return frames;
 }
 private byte[] buffer;private int id,position,total;private long first,last;
 void clear(){buffer=null;id=position=total=0;first=last=0;}
 String accept(byte[] frame,long now)throws Exception{
  if(frame==null||frame.length<9||frame.length>512||frame[0]!=0x53||frame[1]!=1)throw new IllegalArgumentException("Bad nearby frame");
  ByteBuffer b=ByteBuffer.wrap(frame);b.position(2);int nextId=b.getShort()&65535,offset=b.getShort()&65535,length=b.getShort()&65535,n=frame.length-8;
  if(nextId==0||length<1||length>MAX||offset+n>length)throw new IllegalArgumentException("Bad nearby bounds");
  if(buffer!=null&&(now-last>10000||now-first>30000)){clear();throw new IllegalStateException("Nearby frame timeout");}
  if(buffer==null){if(offset!=0)throw new IllegalArgumentException("Missing nearby frame start");buffer=new byte[length];id=nextId;total=length;first=now;}
  if(id!=nextId||length!=total)throw new IllegalArgumentException("Overlapping nearby messages");
  if(offset<position){if(offset+n>position||!Arrays.equals(Arrays.copyOfRange(buffer,offset,offset+n),Arrays.copyOfRange(frame,8,frame.length)))throw new IllegalArgumentException("Conflicting duplicate frame");last=now;return null;}
  if(offset!=position)throw new IllegalArgumentException("Nearby frame gap");System.arraycopy(frame,8,buffer,position,n);position+=n;last=now;
  if(position!=total)return null;byte[] complete=buffer;clear();return StandardCharsets.UTF_8.newDecoder().onMalformedInput(CodingErrorAction.REPORT).onUnmappableCharacter(CodingErrorAction.REPORT).decode(ByteBuffer.wrap(complete)).toString();
 }
}
