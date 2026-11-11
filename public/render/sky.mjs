// Night sky and far backdrop (R02): sky dome with procedural stars and cloud bands, moon disc
// with halo (placed on the moonlight direction so light and picture agree), two far mountain
// silhouette rings fading into valley mist, and the lake-town lights in the valley to the east.
// Everything here is unlit and ignores scene fog; it draws in 4 calls.
import * as THREE from 'three';

export const SKY={
  zenith:'#070a17',upper:'#121831',horizon:'#2a3a66',glow:'#4a4a73',
  moonColor:'#fff1cf',moonHalo:'#9fb4ff',
  mountains:[{radius:175,height:[12,30],color:'#141c33',top:'#2b3a62',seed:1.7},{radius:205,height:[18,44],color:'#10172b',top:'#24325a',seed:4.1}],
  village:{count:260,color:['#ffcf7d','#ffb062','#ffe3a6','#ff9e5a']}
};

const DOME_VERT='varying vec3 vDir;void main(){vDir=normalize(position);vec4 p=projectionMatrix*modelViewMatrix*vec4(position,1.);gl_Position=p.xyww;}';
const DOME_FRAG=`
varying vec3 vDir;
uniform vec3 zenith,upper,horizon,glow,moonDir,haloColor,flashColor;uniform float time,starGain;
float hash(vec3 p){p=fract(p*.3183099+.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float noise(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.-2.*f);
  return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
void main(){
  vec3 d=normalize(vDir);float h=d.y;
  vec3 c=mix(horizon,upper,smoothstep(-.02,.28,h));c=mix(c,zenith,smoothstep(.25,.9,h));
  // warm-violet haze low over the valley (east) where the town and festival light the air
  float east=pow(max(0.,dot(normalize(vec3(d.x,0.,d.z)),vec3(1.,0.,-.2))),2.);
  c+=glow*east*exp(-max(h,0.)*9.)*.35;
  // moon halo
  float m=max(dot(d,moonDir),0.);
  c+=haloColor*(pow(m,40.)*.22+pow(m,6.)*.06);
  // soft cloud bands catching moonlight
  float n=noise(d*vec3(3.,9.,3.)+vec3(time*.004,0.,0.))*.6+noise(d*vec3(7.,18.,7.))*.4;
  float band=smoothstep(.55,.85,n)*smoothstep(.02,.18,h)*(1.-smoothstep(.35,.6,h));
  c=mix(c,c*.72+haloColor*.05,band*.7);
  // stars: hashed cells, twinkling, fading toward the hazy horizon and under clouds
  vec3 q=d*220.;vec3 cell=floor(q);float s=hash(cell);
  vec3 sp=cell+.5+(vec3(hash(cell+3.1),hash(cell+7.7),hash(cell+1.3))-.5)*.6;
  float star=smoothstep(.14,.0,length(q-sp))*step(.965,s);
  star*=.55+.45*sin(time*(1.+s*3.)+s*40.);
  c+=vec3(.85,.9,1.)*star*starGain*smoothstep(.06,.35,h)*(1.-band);
  c+=flashColor*(.35+.65*smoothstep(-.1,.5,h));
  gl_FragColor=vec4(c,1.);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

const MOON_FRAG=`varying vec2 vUv;uniform vec3 moonColor,haloColor;uniform float opacity;
void main(){vec2 p=vUv*2.-1.;float r=length(p);
  float disc=smoothstep(.27,.25,r);
  float crater=.9+.1*sin(p.x*13.+p.y*7.)*sin(p.y*11.-p.x*3.);
  float halo=exp(-max(r-.25,0.)*7.)*.55;
  vec3 c=moonColor*disc*crater*2.2+haloColor*halo*(1.-disc);
  float a=max(disc,halo);if(a<.003)discard;
  gl_FragColor=vec4(c,a*opacity);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

const RIDGE_FRAG=`varying float vH;varying vec3 vW;uniform vec3 base,top,mist,flashColor;
void main(){
  vec3 c=mix(base,top,pow(clamp(vH,0.,1.),3.));
  c=mix(mist,c,smoothstep(-.05,.55,vH));
  c+=flashColor*.25*vH;
  gl_FragColor=vec4(c,1.);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

function ridge({radius,height:[h0,h1],color,top,seed},mist){
  const count=220,pos=[],hs=[],idx=[];
  for(let i=0;i<=count;i++){
    const a=i/count*Math.PI*2;
    const n=Math.sin(a*5+seed)*.5+Math.sin(a*11.3+seed*2)*.28+Math.sin(a*23.7+seed*3)*.12+Math.pow(Math.max(0,Math.sin(a*3.1+seed)),3)*.6;
    // keep the east (valley/lake) side low so the town lights are visible
    const valley=1-.6*Math.pow(Math.max(0,Math.cos(a-0.0)),3);
    const h=(h0+(h1-h0)*(.5+.5*n))*valley;
    const x=Math.cos(a)*radius,z=Math.sin(a)*radius-7;
    pos.push(x,-25,z,x,h,z);hs.push(-.4,1);
    if(i<count){const k=i*2;idx.push(k,k+1,k+2,k+2,k+1,k+3);}
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('ridgeH',new THREE.Float32BufferAttribute(hs,1));g.setIndex(idx);
  const m=new THREE.ShaderMaterial({side:THREE.DoubleSide,fog:false,depthWrite:true,
    uniforms:{base:{value:new THREE.Color(color)},top:{value:new THREE.Color(top)},mist:{value:mist},flashColor:{value:new THREE.Color(0,0,0)}},
    vertexShader:'attribute float ridgeH;varying float vH;varying vec3 vW;void main(){vH=ridgeH;vW=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:RIDGE_FRAG});
  const mesh=new THREE.Mesh(g,m);mesh.frustumCulled=false;mesh.renderOrder=-9;mesh.name='sky-ridge';return mesh;
}

function village(cfg){
  const rand=n=>{const x=Math.sin(n*91.7+3.1)*43758.5453;return x-Math.floor(x);};
  const pos=[],col=[],size=[];
  for(let i=0;i<cfg.count;i++){
    // clusters on the far lake shores in the eastern valley, plus a few up the slopes
    const cluster=Math.floor(rand(i)*6),ca=-.9+cluster*.36,cr=95+rand(cluster+9)*55;
    const a=ca+(rand(i*3)-.5)*.22,r=cr+(rand(i*5)-.5)*18;
    const x=Math.cos(a)*r+20,z=Math.sin(a)*r-10,y=-6+rand(i*7)*4+Math.max(0,r-130)*.12;
    pos.push(x,y,z);const c=new THREE.Color(cfg.color[i%cfg.color.length]);col.push(c.r,c.g,c.b);size.push(1.2+rand(i*11)*1.8);
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('color',new THREE.Float32BufferAttribute(col,3));g.setAttribute('size',new THREE.Float32BufferAttribute(size,1));
  const m=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,fog:false,uniforms:{time:{value:0}},
    vertexShader:'attribute float size;attribute vec3 color;varying vec3 vC;uniform float time;void main(){vC=color*(.75+.25*sin(time*1.3+position.x*.7+position.z));vec4 p=modelViewMatrix*vec4(position,1.);gl_PointSize=clamp(size*260./-p.z,1.,6.);gl_Position=projectionMatrix*p;}',
    fragmentShader:'varying vec3 vC;void main(){float r=length(gl_PointCoord-.5)*2.;if(r>1.)discard;gl_FragColor=vec4(vC*(1.-r*r)*1.6,1.);}'});
  const pts=new THREE.Points(g,m);pts.frustumCulled=false;pts.renderOrder=-8;pts.name='sky-village-lights';return pts;
}

/**
 * @param {THREE.Scene} scene
 * @param {{moonDirection: THREE.Vector3}} o  direction *towards* the moon (normalised)
 */
export function createSky(scene,{moonDirection}){
  const root=new THREE.Group();root.name='night-sky-r02';scene.add(root);
  const flash=new THREE.Color(0,0,0);
  const domeUniforms={zenith:{value:new THREE.Color(SKY.zenith)},upper:{value:new THREE.Color(SKY.upper)},horizon:{value:new THREE.Color(SKY.horizon)},glow:{value:new THREE.Color(SKY.glow)},
    moonDir:{value:moonDirection.clone()},haloColor:{value:new THREE.Color(SKY.moonHalo)},flashColor:{value:flash},time:{value:0},starGain:{value:1.6}};
  const dome=new THREE.Mesh(new THREE.SphereGeometry(1,40,20),new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,depthTest:true,fog:false,uniforms:domeUniforms,vertexShader:DOME_VERT,fragmentShader:DOME_FRAG}));
  dome.scale.setScalar(250);dome.frustumCulled=false;dome.renderOrder=-10;dome.name='sky-dome';root.add(dome);
  const moon=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.ShaderMaterial({transparent:true,depthWrite:false,fog:false,uniforms:{moonColor:{value:new THREE.Color(SKY.moonColor)},haloColor:{value:new THREE.Color(SKY.moonHalo)},opacity:{value:1}},
    vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:MOON_FRAG}));
  moon.scale.setScalar(46);moon.frustumCulled=false;moon.renderOrder=-9;moon.name='sky-moon';root.add(moon);
  const mist=new THREE.Color(SKY.horizon);
  const ridges=SKY.mountains.map(cfg=>ridge(cfg,mist));ridges.forEach(r=>root.add(r));
  const lights=village(SKY.village);root.add(lights);
  return {
    root,dome,moon,
    update({elapsed=0,camera=null}={}){
      domeUniforms.time.value=elapsed;lights.material.uniforms.time.value=elapsed;
      if(camera){dome.position.copy(camera.position);moon.position.copy(camera.position).addScaledVector(domeUniforms.moonDir.value,220);moon.lookAt(camera.position);}
    },
    setFlash(color){flash.copy(color);for(const r of ridges)r.material.uniforms.flashColor.value.copy(color);},
    setMoonDirection(v){domeUniforms.moonDir.value.copy(v).normalize();}
  };
}
