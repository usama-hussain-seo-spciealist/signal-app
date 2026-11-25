(function(root){
 'use strict';
 function create({audio,status,enabled,native,speech,Utterance,later=setTimeout,cancel=clearTimeout}){
  let generation=0,timer=null,voice=null;
  const guidance='If unheard, check media volume, audio output and iPhone Silent/Focus settings. This app cannot detect or override the silent switch.';
  function stop(){generation++;cancel(timer);timer=null;audio.pause();try{audio.currentTime=0;}catch(_){}if(speech)speech.cancel();if(native)native.postMessage(JSON.stringify({action:'stop'}));voice=null;}
  function play(cents,{kind='received'}={}){
   stop();if(!enabled()){status('Sound muted. The signed demo receipt remains available.');return;}
   const token=generation,text=(kind==='sent'?'Demo payment sent. ':kind==='test'?'Sound test. ':'Demo payment received. ')+cents/100+' Pakistani rupees. This is a simulation.';
   if(native){status('Native demo sound requested. '+guidance);native.postMessage(JSON.stringify({action:'speak',cents,kind}));return;}
   let started=false;
   audio.muted=false;audio.volume=1;
   audio.onplaying=()=>{if(token===generation){started=true;status('Chime playback started. '+guidance);}};
   audio.onended=()=>{if(token===generation){cancel(timer);status('Chime playback completed. '+guidance);}};
   const failure=error=>{if(token!==generation)return;cancel(timer);audio.pause();status(error&&error.name==='NotAllowedError'?'Sound playback restricted. Tap Test sound to enable audio, then retry. '+guidance:'Sound could not play. Reopen online once to save the sound file, then tap Test sound. '+guidance);};
   audio.onerror=()=>failure(audio.error);
   // play() is called synchronously inside the tap handler, before any await.
   // HTML media playback avoids depending solely on an un-resumed Web Audio context.
   try{const promise=audio.play();if(promise&&promise.catch)promise.catch(failure);}catch(error){failure(error);return;}
   status('Starting demo sound…');
   timer=later(()=>{if(token!==generation)return;if(!started){audio.pause();status('No audio playback started. Tap Test sound again. '+guidance);}},5000);
   if(speech&&Utterance){try{voice=new Utterance(text);voice.lang='en-PK';voice.onerror=()=>{if(token===generation&&started)status('Chime started; voice announcement unavailable. '+guidance);};speech.speak(voice);}catch(_){} }
  }
  return {play,stop};
 }
 if(typeof module!=='undefined'&&module.exports)module.exports={create};else root.SignalSound={create};
})(typeof window!=='undefined'?window:globalThis);
