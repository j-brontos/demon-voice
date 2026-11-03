const $=id=>document.getElementById(id);
let ctx,stream,source,distortion,bass,dark,wet,master,running=false;
for(const id of ['pitch','drive','echo'])$(id).addEventListener('input',()=>{$(id+'v').textContent=$(id).value+' %';update();});
function curve(amount){const n=2048,a=new Float32Array(n),k=amount*5;for(let i=0;i<n;i++){const x=2*i/(n-1)-1;a[i]=Math.tanh(x*(1+k))/Math.tanh(1+k);}return a;}
function update(){if(!ctx)return;const t=Number($('pitch').value)/100,d=Number($('drive').value)/100,e=Number($('echo').value)/100;bass.gain.value=3+t*9;dark.frequency.value=1000+t*500;distortion.curve=curve(d*.22);wet.gain.value=e*.13;}
async function start(){try{
stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}});
ctx=new (window.AudioContext||window.webkitAudioContext)({latencyHint:'interactive'});await ctx.resume();
source=ctx.createMediaStreamSource(stream);master=ctx.createDynamicsCompressor();master.threshold.value=-15;master.ratio.value=3;master.attack.value=.004;master.release.value=.12;
const clear=ctx.createGain();clear.gain.value=.82;source.connect(clear).connect(master);
bass=ctx.createBiquadFilter();bass.type='lowshelf';bass.frequency.value=220;
dark=ctx.createBiquadFilter();dark.type='lowpass';dark.Q.value=.6;
distortion=ctx.createWaveShaper();distortion.oversample='2x';
const demon=ctx.createGain();demon.gain.value=.17;
source.connect(bass).connect(dark).connect(distortion).connect(demon).connect(master);
const delay=ctx.createDelay(.5);delay.delayTime.value=.13;wet=ctx.createGain();source.connect(delay).connect(wet).connect(master);
master.connect(ctx.destination);update();running=true;$('toggle').textContent='⏹ Zastavit';$('status').textContent='Aktivní: srozumitelný hlas s temným zabarvením. Ovladač Temnota mění barvu hlasu, nikoliv výšku tónu.';
}catch(err){$('status').textContent='Chyba mikrofonu: '+err.message;await stop();}}
async function stop(){running=false;stream?.getTracks().forEach(t=>t.stop());source?.disconnect();await ctx?.close().catch(()=>{});ctx=null;$('toggle').textContent='🎙️ Spustit mikrofon';}
$('toggle').onclick=async()=>running?(await stop(),$('status').textContent='Mikrofon vypnutý.'):start();