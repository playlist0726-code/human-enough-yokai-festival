# 그래픽 v05 이미지 제작 기록

Codex 내장 imagegen으로 생성했다. 외부 이미지 API는 사용하지 않았다. 게임에 복사한 실제 결과물:

- public/assets/shrine-paving-v05.png — 돌길 색상 텍스처
- public/assets/mountain-panorama-v05.png — 먼 산·호수·마을 배경

두 이미지 모두 배경이 포함된 불투명 이미지다. 다음은 실제 전달한 프롬프트다.

## Stone paving

Use case: stylized-concept. Asset type: seamless tileable diffuse/albedo ground texture for an original cozy 3D Japanese mountain festival game. Primary request: square texture looking straight down at old Japanese shrine stone paving, softly rounded irregular warm grey slate stones, fine pale worn stone grain, subtle chipped bevels, narrow dark mortar joints with tiny moss accents, gently handcrafted clay-like surfaces, premium stylized game material. Orthographic overhead surface ONLY, completely flat neutral diffuse illumination, no directional lighting, no cast shadows, no vignette, no perspective, no objects, no writing. Consistent moderate stone size with about 7 stones across the width and varied running bond arrangement; seamless repeat on all four edges. Muted grey-beige, slate and sage colors, restrained contrast, rich surface detail without noisy grit. This texture will be lit dynamically in game; do not bake dramatic lighting.

## Mountain panorama

Use case: stylized-concept. Asset type: wide distant background panorama for an original cozy 3D Japanese yokai festival game. Create a premium stylized animated-film matte painting with softly sculpted materials. Landscape, extra wide 3:2 or wider. View from a mountaintop across a huge indigo lake and layers of rounded cedar-covered Japanese mountains at blue hour/night, distant tiny hillside village with hundreds of warm amber window lights, subtle pale lavender atmospheric mist, subtle gold and coral fireworks far over the lake, deep navy sky occupying upper 50% of frame, a few delicate stars and a small glowing moon. Village lights and water reflections occupy lower third. No large foreground architecture, no foreground objects, no people, no yokai, no text, no logos, no watermark, no hard black border. Low contrast atmospheric distance with layered silhouettes, detailed landscape, serene magical summer festival atmosphere. Color palette: deep midnight indigo, dusty violet mountains, warm honey lights, desaturated teal lake. This will be a fixed far-background plane behind real playable 3D foreground with dynamic lighting; the image must work as distant scenery, not as a game screenshot. No close path, no close stalls, no giant mountain triangles.
