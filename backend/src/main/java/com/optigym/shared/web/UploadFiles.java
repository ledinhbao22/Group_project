package com.optigym.shared.web;
import java.util.*;
import java.io.*;
import java.util.zip.*;
public final class UploadFiles {
 public record Upload(String name,String mime,byte[] bytes){}
 public static Upload decode(String name,String encoded,boolean image){
  if(encoded==null||encoded.length()>7_000_000)throw Inputs.bad("File tối đa 5 MB");
  byte[] data;try{data=Base64.getDecoder().decode(encoded);}catch(Exception e){throw Inputs.bad("File không hợp lệ");}
  if(data.length==0||data.length>5*1024*1024)throw Inputs.bad("File tối đa 5 MB");
  String safe=Objects.toString(name,"").replaceAll("[^\\p{L}\\p{N}._ -]","_");
  if(safe.length()>150)safe=safe.substring(safe.length()-150);
  String ext=safe.toLowerCase(Locale.ROOT),mime="";
  if(image){
   if(data.length>8&&data[0]==(byte)137&&data[1]==80&&data[2]==78&&data[3]==71&&data[4]==13&&data[5]==10&&data[6]==26&&data[7]==10)mime="image/png";
   else if(data.length>3&&data[0]==(byte)255&&data[1]==(byte)216&&data[2]==(byte)255)mime="image/jpeg";
   else throw Inputs.bad("QR cần là ảnh PNG hoặc JPG");
  }else if(ext.endsWith(".pdf")&&data.length>5&&new String(data,0,5,java.nio.charset.StandardCharsets.US_ASCII).equals("%PDF-"))mime="application/pdf";
  else if(ext.endsWith(".doc")&&data.length>8&&data[0]==(byte)0xd0&&data[1]==(byte)0xcf&&data[2]==0x11&&data[3]==(byte)0xe0)mime="application/msword";
  else if(ext.endsWith(".docx")){
   boolean word=false;try(ZipInputStream zip=new ZipInputStream(new ByteArrayInputStream(data))){ZipEntry e;int entries=0;long total=0;byte[] buffer=new byte[8192];while((e=zip.getNextEntry())!=null){if(++entries>1000)throw Inputs.bad("File DOCX quá lớn");if(e.getName().equals("word/document.xml"))word=true;int n;while((n=zip.read(buffer))>0){total+=n;if(total>25*1024*1024)throw Inputs.bad("File DOCX quá lớn");}}}catch(IOException e){throw Inputs.bad("File DOCX không hợp lệ");}if(!word)throw Inputs.bad("File DOCX không hợp lệ");mime="application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }else throw Inputs.bad("CV cần là PDF, DOC hoặc DOCX");
  return new Upload(safe,mime,data);
 }
}
