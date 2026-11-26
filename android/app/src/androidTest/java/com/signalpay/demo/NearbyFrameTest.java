package com.signalpay.demo;
import static org.junit.Assert.*;
import java.util.List;
import org.junit.Test;

/** Codec/emulator tests only. They do not establish a physical Bluetooth connection. */
public class NearbyFrameTest {
 private String hex(byte[] input){StringBuilder s=new StringBuilder();for(byte b:input)s.append(String.format("%02x",b&255));return s.toString();}
 @Test public void sharedSwiftGoldenFramesDuplicateAndUTF8()throws Exception{
  List<byte[]> frames=NearbyFrame.split("Hello SignalPay",7,20);assertEquals("530100070000000f48656c6c6f205369676e616c",hex(frames.get(0)));assertEquals("53010007000c000f506179",hex(frames.get(1)));
  NearbyFrame a=new NearbyFrame();assertNull(a.accept(frames.get(0),1000));assertNull(a.accept(frames.get(0),2000));assertEquals("Hello SignalPay",a.accept(frames.get(1),3000));
  StringBuilder text=new StringBuilder();for(int i=0;i<80;i++)text.append("ادائیگی🙂");String result=null;for(byte[] f:NearbyFrame.split(text.toString(),42,182))result=a.accept(f,4000);assertEquals(text.toString(),result);
 }
 @Test public void gapsExpiryBoundsAndRoutingFailClosed()throws Exception{
  List<byte[]> frames=NearbyFrame.split("Hello SignalPay",7,20);NearbyFrame a=new NearbyFrame();
  try{a.accept(frames.get(1),1000);fail("gap accepted");}catch(IllegalArgumentException expected){}
  a.accept(frames.get(0),1000);try{a.accept(frames.get(1),12000);fail("expired accepted");}catch(IllegalStateException expected){}
  try{NearbyFrame.split("x",0,20);fail("id accepted");}catch(IllegalArgumentException expected){}
  assertEquals("01234567-89ab-cdef-0123-456789abcdef",NearbyBle.accountService("SP-0123456789abcdef0123456789abcdef").toString());
  try{NearbyBle.accountService("name");fail("route accepted");}catch(IllegalArgumentException expected){}
 }
}
