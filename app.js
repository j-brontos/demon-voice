const $=id=>document.getElementById(id);
let ctx,stream,source,processor,distortion,wet,master,running=false;
for(const id of ['pitch','drive','echo'])$(id).addEventListener('input',()=>{$(id+'v').textContent=$(id).value+(id==='pitch'?'':' %');update();});
function curve(amount){const n=2048,a=new Float32Array(n),k=1+amount*8;for(let i=0;i<n;i++){const x=2*i/(n-1)-1;a[i]=Math.tanh(k*x)/Math.tanh(k);}return a;}
function update(){if(!ctx)return;distortion.curve=curve(Number($('drive').value)/100*.18);wet.gain.value=Number($('echo').value)/100*.12;}
async function start(){try{
stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}});
ctx=new (window.AudioContext||window.webkitAudioContext)({latencyHint:'interactive'});await ctx.resume();source=ctx.createMediaStreamSource(stream);
const length=16384,ring=new Float32Array(length),grain=2048;let write=0,phase=0;
processor=ctx.createScriptProcessor(512,1,1);
processor.onaudioprocess=e=>{const input=e.inputBuffer.getChannelData(0),output=e.outputBuffer.getChannelData(0);const ratio=Math.pow(2,Number($('pitch').value)/12);for(let i=0;i<input.length;i++){ring[write]=input[i];let sum=0,weight=0;for(let j=0;j<2;j++){const p=(phase+j*.5)%1;const w=.5-.5*Math.cos(2*Math.PI*p);const offset=grain+(ratio-1)*p*grain;const pos=(write-offset+length*4)%length;const a=Math.floor(pos),fraction=pos-a;sum+=(ring[a]*(1-fraction)+ring[(a+1)%length]*fraction)*w;weight+=w;}output[i]=sum/(weight||1);write=(write+1)%length;phase=(phase+1/grain)%1;}};
master=ctx.createDynamicsCompressor();master.threshold.value=-16;master.ratio.value=3;master.attack.value=.005;master.release.value=.15;
const clear=ctx.createGain();clear.gain.value=.72;source.connect(clear).connect(master);
const shifted=ctx.createGain();shifted.gain.value=.28;distortion=ctx.createWaveShaper();distortion.oversample='2x';
source.connect(processor).connect(distortion).connect(shifted).connect(master);
const delay=ctx.createDelay(.5);delay.delayTime.value=.16;wet=ctx.createGain();distortion.connect(delay).connect(wet).connect(master);
master.connect(ctx.destination);update();running=true;$('toggle').textContent='⏹ Zastavit';$('status').textContent='Aktivní: hlubší démonický hlas s přimíchanou čistou řečí. Zkus hloubku −2 až −4.';
}catch(err){$('status').textContent='Chyba mikrofonu: '+err.message;await stop();}}
async function stop(){running=false;stream?.getTracks().forEach(t=>t.stop());processor?.disconnect();source?.disconnect();await ctx?.close().catch(()=>{});ctx=null;$('toggle').textContent='🎙️ Spustit mikrofon';}
$('toggle').onclick=async()=>running?(await stop(),$('status').textContent='Mikrofon vypnutý.'):start();