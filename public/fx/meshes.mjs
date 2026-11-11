// R10 mesh effects: soft ground rings / shockwaves, the golden talisman ward dome, light pillars.
// Additive, depthWrite off, no lights (cheap on mobile). Each spawn returns a handle; the manager
// ages and disposes them. Geometry is shared; materials are per instance (they animate uniforms).
import * as THREE from 'three';

const ringFrag=`
uniform vec3 uColor;uniform float uAlpha,uWidth,uSoft;varying vec2 vUv;
void main(){float r=length(vUv*2.-1.);float band=1.-smoothstep(uWidth*.5,uWidth*.5+uSoft,abs(r-(1.-uWidth*.5-uSoft)));
  float fill=.12*(1.-smoothstep(.0,1.,r))*step(r,1.);float a=(band+fill*uSoft*4.)*uAlpha;if(a<.003)discard;
  gl_FragColor=vec4(uColor,a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;
const domeFrag=`
uniform vec3 uColor;uniform float uAlpha,uTime;varying vec3 vN;varying vec3 vView;varying vec2 vUv;
void main(){float f=pow(1.-abs(dot(normalize(vN),normalize(vView))),2.2);
  float bands=step(.82,fract(vUv.x*14.+uTime*.15))*smoothstep(.0,.25,vUv.y)*(1.-smoothstep(.55,.85,vUv.y));
  float scan=smoothstep(.04,.0,abs(fract(vUv.y*1.2-uTime*.6)-.5)-.44);
  float a=(f*.62+bands*.2+scan*.22)*uAlpha;if(a<.003)discard;
  gl_FragColor=vec4(uColor*(1.+bands*.6),a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;
const domeVert=`varying vec3 vN;varying vec3 vView;varying vec2 vUv;
void main(){vUv=uv;vec4 w=modelMatrix*vec4(position,1.);vN=normalize(mat3(modelMatrix)*normal);vView=cameraPosition-w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}`;
const pillarFrag=`
uniform vec3 uColor;uniform float uAlpha,uTime;varying vec2 vUv;
void main(){float fall=pow(1.-vUv.y,1.6);float streak=.65+.35*sin(vUv.x*6.2832*7.+uTime*3.)*sin(vUv.y*9.-uTime*6.);
  float a=fall*streak*uAlpha;if(a<.003)discard;gl_FragColor=vec4(uColor,a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;
const uvVert=`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;

const plane=new THREE.PlaneGeometry(2,2).rotateX(-Math.PI/2);
const dome=new THREE.SphereGeometry(1,40,16,0,Math.PI*2,0,Math.PI/2);
const pillar=new THREE.CylinderGeometry(1,1,1,32,1,true).translate(0,.5,0);

function mat(frag,vert,uniforms){
  return new THREE.ShaderMaterial({vertexShader:vert,fragmentShader:frag,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide,
    uniforms:{uColor:{value:new THREE.Color()},uAlpha:{value:1},uTime:{value:0},uWidth:{value:.12},uSoft:{value:.06},...uniforms}});
}
const easeOut=t=>1-Math.pow(1-t,3);

export function createMeshFx(scene){
  const live=[];
  function add(mesh,life,step){mesh.frustumCulled=false;mesh.renderOrder=9;scene.add(mesh);const h={mesh,age:0,life,step};live.push(h);return h;}
  return {
    live,
    /** Flat soft ring on the ground. from/to are radii (m). */
    ring({x,y,z},{color='#ffd79a',intensity=1.9,from=.3,to=2,life=.6,width=.18,alpha=1,delay=0}={}){
      const m=new THREE.Mesh(plane,mat(ringFrag,uvVert));m.material.uniforms.uColor.value.set(color).multiplyScalar(intensity);m.material.uniforms.uWidth.value=width;
      m.position.set(x,y+.04,z);m.scale.setScalar(from);m.visible=delay<=0;
      return add(m,life+delay,(h,t)=>{const k=Math.max(0,(h.age-delay)/life);m.visible=h.age>=delay;m.scale.setScalar(from+(to-from)*easeOut(k));m.material.uniforms.uAlpha.value=alpha*(1-k)*(1-k);});
    },
    /** Ward dome (talisman bands, fresnel rim, scan line). Follows getCenter() each frame if given. */
    dome({x,y,z},{radius=3.2,color='#ffcf6b',intensity=1.05,life=2.2,getCenter}={}){
      const m=new THREE.Mesh(dome,mat(domeFrag,domeVert));m.material.uniforms.uColor.value.set(color).multiplyScalar(intensity);m.position.set(x,y,z);
      return add(m,life,(h,t,time)=>{const c=getCenter?.();if(c)m.position.set(c.x,c.y,c.z);
        const grow=easeOut(Math.min(1,h.age/.25)),r=radius*(.6+.4*grow)*(1+.03*Math.sin(h.age*9));m.scale.set(r,r*.8,r);
        m.material.uniforms.uTime.value=time;m.material.uniforms.uAlpha.value=Math.min(1,h.age/.12)*(t>.8?(1-t)/.2:1);});
    },
    /** Vertical light column (shrine reaction, help beacon). */
    pillar({x,y,z},{radius=.9,height=7,color='#ffb066',intensity=1.6,life=1.6}={}){
      const m=new THREE.Mesh(pillar,mat(pillarFrag,uvVert));m.material.uniforms.uColor.value.set(color).multiplyScalar(intensity);m.position.set(x,y,z);
      return add(m,life,(h,t,time)=>{const w=t<.15?easeOut(t/.15):1-(t-.15)/.85*.5;m.scale.set(radius*w,height*(t<.2?easeOut(t/.2):1),radius*w);m.material.uniforms.uTime.value=time;m.material.uniforms.uAlpha.value=t<.1?t/.1:Math.pow(1-(t-.1)/.9,1.4);});
    },
    update(dt,time){
      for(let i=live.length-1;i>=0;i--){const h=live[i];h.age+=dt;const t=Math.min(1,h.age/h.life);h.step(h,t,time);
        if(h.age>=h.life){scene.remove(h.mesh);h.mesh.material.dispose();live.splice(i,1);}}
    },
    clear(){for(const h of live){scene.remove(h.mesh);h.mesh.material.dispose();}live.length=0;}
  };
}
