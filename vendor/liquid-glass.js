var me = Object.defineProperty;
var pe = (o, e, t) => e in o ? me(o, e, { enumerable: !0, configurable: !0, writable: !0, value: t }) : o[e] = t;
var d = (o, e, t) => pe(o, typeof e != "symbol" ? e + "" : e, t);
const ge = `precision highp float;
// The backdrop the glass bends: an image or video cropped to cover, or the built-in aurora.
uniform vec2 u_size;      // CSS pixels
uniform float u_dpr;
uniform float u_mode;     // 0: image or video, 1: aurora, 2: plain base colour (while an image loads)
uniform sampler2D u_image;
uniform vec4 u_crop;      // scale x, scale y, offset x, offset y (cover crop)
uniform float u_time;
uniform vec3 u_colors[4];
uniform vec3 u_base;
uniform float u_dim;       // 0..1, darkens the backdrop like a scrim

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}

float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  for (int i = 0; i < 4; i++) { value += amplitude * noise(p); p = p * 2.03 + 11.7; amplitude *= 0.5; }
  return value;
}

// Four slow colour fields, folded by a noise flow, with fine contour lines so the glass
// always has edges to bend.
vec3 aurora(vec2 pixel) {
  vec2 q = pixel / max(u_size.x, u_size.y) * 2.4;
  float t = u_time * 0.045;
  vec2 warp = vec2(fbm(q + vec2(t, -t * 0.7)), fbm(q + vec2(-t * 0.6, t) + 5.2));
  vec2 p = q + warp * 1.35;
  vec3 color = u_base;
  for (int i = 0; i < 4; i++) {
    float fi = float(i);
    vec2 center = vec2(0.6 + 1.1 * sin(t * (1.0 + fi * 0.37) + fi * 1.9), 0.55 + 0.75 * cos(t * (0.8 + fi * 0.29) + fi * 2.6));
    center *= vec2(max(u_size.x / u_size.y, 1.0), max(u_size.y / u_size.x, 1.0)) * 1.2;
    float reach = exp(-dot(p - center, p - center) * 1.15);
    color = mix(color, u_colors[i], clamp(reach * 1.25, 0.0, 1.0));
  }
  float height = fbm(p * 1.6 + t);
  float lines = abs(fract(height * 14.0) - 0.5);
  float line = 1.0 - smoothstep(0.0, 0.07, lines);
  color = mix(color, color * 1.35 + 0.06, line * 0.35);
  color += (hash(pixel + fract(u_time)) - 0.5) * 0.025;
  return color;
}

void main() {
  vec2 pixel = vec2(gl_FragCoord.x, u_size.y * u_dpr - gl_FragCoord.y) / u_dpr;
  vec2 uv = pixel / u_size;
  vec3 color;
  if (u_mode < 0.5) color = texture2D(u_image, vec2(u_crop.z + uv.x * u_crop.x, 1.0 - (u_crop.w + uv.y * u_crop.y))).rgb;
  else if (u_mode < 1.5) color = aurora(pixel);
  else color = u_base;
  gl_FragColor = vec4(color * (1.0 - u_dim), 1.0);
}
`, ve = `precision highp float;
uniform sampler2D u_background;
uniform vec2 u_size;
uniform vec2 u_step;

vec3 sampleLinear(vec2 uv) {
  return pow(texture2D(u_background, clamp(uv, 0.001, 0.999)).rgb, vec3(2.2));
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_size;
  vec3 color = vec3(0.0);
  float total = 0.0;
  // The cached wider Gaussian prevents tiny granules from becoming ridges
  // when the bevel compresses the transmitted image's sampling footprint.
  for (int y = -2; y <= 2; y++) {
    for (int x = -2; x <= 2; x++) {
      vec2 offset = vec2(float(x), float(y));
      float weight = exp(-dot(offset, offset) * 0.5);
      color += sampleLinear(uv + offset * u_step) * weight;
      total += weight;
    }
  }
  color /= total;
  gl_FragColor = vec4(pow(color, vec3(1.0 / 2.2)), 1.0);
}
`, ye = `precision highp float;
// Every glass panel on the scene as a real solid of glass. Each panel is a rounded slab with
// a domed crown and rounded edges, ray-traced from a camera straight in front of it: light
// refracts into the slab, travels through it (bouncing inside when it can't get out), refracts
// out and lands on the backdrop behind. That's what makes the backdrop magnify, flip and
// smear at the rim. The same model as the liquid-glass playground's pebble.
// MAX_PANES is defined by the renderer from what the device's GPU allows.
uniform sampler2D u_scene;
uniform sampler2D u_frost;
uniform vec2 u_size;      // CSS pixels
uniform float u_dpr;
uniform int u_count;
uniform vec4 u_rect[MAX_PANES];    // centre x, centre y, half width, half height (CSS px)
uniform vec4 u_look[MAX_PANES];    // corner radius, frost 0..1, chroma, pointer pull (px)
uniform vec4 u_tint[MAX_PANES];    // rgb, strength
uniform vec4 u_profile[MAX_PANES]; // half depth, edge rounding, dome, index of refraction
uniform vec4 u_lens[MAX_PANES];    // a raised disc on the face: x, y (from centre), radius, amount
uniform vec4 u_extra[MAX_PANES];   // sound glow 0..1, shadow 0..1, press highlight 0..1, unused
uniform vec2 u_light;              // light position, CSS px
uniform vec2 u_pointer;            // pointer position, CSS px
uniform float u_bands[6];          // sound, low to high
uniform float u_level;

const float CAMERA = 780.0;
const float BACKGROUND = -190.0;

// The selected panel, copied out of the arrays (GLSL ES 1.0 can't index them by a variable).
vec4 R; vec4 L; vec4 T; vec4 P; vec4 N; vec4 X;
vec2 pointerLocal;

vec3 sceneColor(vec2 pixel, float frost) {
  vec2 uv = clamp(vec2(pixel.x / u_size.x, 1.0 - pixel.y / u_size.y), 0.001, 0.999);
  vec3 clear = pow(texture2D(u_scene, uv).rgb, vec3(2.2));
  vec3 blurred = pow(texture2D(u_frost, uv).rgb, vec3(2.2));
  return mix(clear, blurred, clamp(frost, 0.0, 1.0));
}

float box(vec2 p, vec2 halfSize, float radius) {
  vec2 q = abs(p) - halfSize + radius;
  return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - radius;
}

// The panel's outline: its rounded rectangle, bulging a little toward a nearby pointer.
float outline(vec2 p) {
  float radius = min(L.x, min(R.z, R.w));
  float d = box(p, R.zw, radius);
  vec2 toPointer = p - pointerLocal;
  return d - L.w * exp(-dot(toPointer, toPointer) / 1800.0);
}

vec3 field(vec2 p) {
  float d = outline(p);
  vec2 e = vec2(0.5, 0.0);
  vec2 n = vec2(outline(p + e.xy) - outline(p - e.xy), outline(p + e.yx) - outline(p - e.yx));
  return vec3(d, normalize(n + 1e-6));
}

// Rounded extrusion with a smooth convex crown; the gradient belongs to the same solid.
vec4 solid(vec3 p) {
  vec3 boundary = field(p.xy);
  vec2 radius = max(R.zw, vec2(20.0));
  float dome = P.z * exp(-1.5 * dot(p.xy / radius, p.xy / radius));
  vec2 domeGradient = -3.0 * dome * p.xy / (radius * radius);
  float rounding = P.y;
  vec2 q = vec2(boundary.x + rounding, abs(p.z) - P.x - dome + rounding);
  vec2 outside = max(q, 0.0);
  float outsideLength = length(outside);
  vec2 weights = outsideLength > 0.0001 ? outside / outsideLength : (q.x > q.y ? vec2(1.0, 0.0) : vec2(0.0, 1.0));
  float distance = min(max(q.x, q.y), 0.0) + outsideLength - rounding;
  vec3 gradient = weights.x * vec3(boundary.yz, 0.0) + weights.y * vec3(-domeGradient, sign(p.z));
  if (N.w > 0.02) {
    vec2 delta = p.xy - N.xy;
    vec2 lensQ = vec2(length(delta) - N.z + 8.0, abs(p.z - P.x - 5.0) - 2.0);
    vec2 lensOutside = max(lensQ, 0.0);
    float lensLength = length(lensOutside);
    vec2 lensWeights = lensLength > 0.0001 ? lensOutside / lensLength : (lensQ.x > lensQ.y ? vec2(1.0, 0.0) : vec2(0.0, 1.0));
    float lensDistance = min(max(lensQ.x, lensQ.y), 0.0) + lensLength - 8.0;
    vec3 lensGradient = vec3(delta / max(length(delta), 0.001) * lensWeights.x, sign(p.z - P.x - 5.0) * lensWeights.y);
    float blend = clamp(0.5 + 0.5 * (distance - lensDistance) / 2.5, 0.0, 1.0) * N.w;
    distance = mix(distance, lensDistance, blend) - 2.5 * blend * (1.0 - blend);
    gradient = mix(gradient, lensGradient, blend);
  }
  return vec4(distance, gradient);
}

bool enterSolid(vec3 origin, vec3 direction, out vec3 hit) {
  vec3 bounds = vec3(R.zw + L.w + 6.0, P.x + P.z + 10.0);
  vec3 inverseRay = 1.0 / (direction + vec3(0.000001));
  vec3 a = (-bounds - origin) * inverseRay;
  vec3 b = (bounds - origin) * inverseRay;
  vec3 nearBox = min(a, b);
  vec3 farBox = max(a, b);
  float nearDistance = max(max(nearBox.x, nearBox.y), nearBox.z);
  float farDistance = min(min(farBox.x, farBox.y), farBox.z);
  float travel = max(0.0, nearDistance);
  if (farDistance < travel) return false;
  for (int i = 0; i < 56; i++) {
    hit = origin + direction * travel;
    float distance = solid(hit).x;
    if (distance < 0.12) return true;
    travel += max(0.06, distance * 0.74);
    if (travel > farDistance) break;
  }
  return false;
}

vec3 exitSolid(vec3 origin, vec3 direction, out float traveled) {
  float travel = 0.6;
  vec3 point = origin + direction * travel;
  float limit = 2.0 * (R.z + R.w) + 2.0 * P.x;
  for (int i = 0; i < 48; i++) {
    point = origin + direction * travel;
    float distance = -solid(point).x;
    if (i > 1 && distance < 0.12) break;
    travel += max(0.10, distance * 0.74);
    if (travel > limit) break;
  }
  traveled = travel;
  return point;
}

vec3 environment(vec3 direction, vec2 pixel) {
  vec2 reflectedPixel = u_size * 0.5 + direction.xy * u_size * 0.42;
  vec3 reflectedScene = sceneColor(reflectedPixel, 0.9);
  float softbox = exp(-pow((direction.x + 0.42) / 0.16, 2.0) - pow((direction.y + 0.58) / 0.28, 4.0));
  float fill = exp(-pow((direction.x - 0.7) / 0.10, 2.0) - pow(direction.y / 0.55, 4.0));
  return mix(reflectedScene, sceneColor(pixel, 0.65), 0.20) + vec3(0.96, 0.98, 1.0) * (softbox * 1.65 + fill * 0.32);
}

float energy(vec2 p, vec2 origin, vec2 spread) {
  vec2 d = (p - origin) / spread;
  return exp(-dot(d, d));
}

void main() {
  vec2 pixel = vec2(gl_FragCoord.x, u_size.y * u_dpr - gl_FragCoord.y) / u_dpr;
  vec3 base = sceneColor(pixel, 0.0);

  // Later panels sit on top (a knob on its track); outside every panel, the nearest one wins.
  float nearest = 1e5;
  float shade = 0.0;
  for (int i = 0; i < MAX_PANES; i++) {
    if (i >= u_count) break;
    vec4 r = u_rect[i];
    float radius = min(u_look[i].x, min(r.z, r.w));
    vec2 local = pixel - r.xy;
    float d = box(local, r.zw, radius) - u_look[i].w;
    float lift = min(r.w, 40.0);
    float s = box(local - vec2(2.0, lift * 0.22), r.zw, radius);
    shade = max(shade, (1.0 - smoothstep(-lift * 0.3, lift * 0.8, s)) * u_extra[i].y);
    bool take = d < 2.0 || (nearest >= 2.0 && d < nearest);
    if (take) { nearest = d; R = r; L = u_look[i]; T = u_tint[i]; P = u_profile[i]; N = u_lens[i]; X = u_extra[i]; }
  }
  vec3 outside = base * (1.0 - shade * 0.16);
  if (nearest > 2.0 || u_count == 0) { gl_FragColor = vec4(pow(outside, vec3(1.0 / 2.2)), 1.0); return; }

  vec2 local = pixel - R.xy;
  pointerLocal = u_pointer - R.xy;
  vec3 origin = vec3(0.0, 0.0, CAMERA);
  vec3 viewRay = normalize(vec3(local, -CAMERA));
  vec3 direction = viewRay;
  vec3 front;
  if (!enterSolid(origin, direction, front)) {
    float contact = (1.0 - smoothstep(-2.0, 13.0, outline(local - vec2(2.0, 7.0)))) * 0.045;
    gl_FragColor = vec4(pow(outside * (1.0 - contact), vec3(1.0 / 2.2)), 1.0);
    return;
  }
  vec3 normal = normalize(solid(front).yzw);
  float ior = P.w;
  vec3 inside = refract(direction, normal, 1.0 / ior);
  float pathLength;
  vec3 rear = exitSolid(front, inside, pathLength);
  vec3 rearNormal = normalize(solid(rear).yzw);
  vec3 outgoing = refract(inside, -rearNormal, ior);
  // Follow one internal bounce instead of a dark band where the first exit totally reflects.
  if (dot(outgoing, outgoing) < 0.01) {
    inside = reflect(inside, rearNormal);
    float secondLength;
    rear = exitSolid(rear, inside, secondLength);
    pathLength += secondLength;
    rearNormal = normalize(solid(rear).yzw);
    outgoing = refract(inside, -rearNormal, ior);
    if (dot(outgoing, outgoing) < 0.01) outgoing = reflect(inside, rearNormal);
  }
  vec3 reflected = environment(reflect(viewRay, normal), pixel);
  vec3 transmitted;
  float frost = L.y;
  if (outgoing.z < -0.045) {
    float distance = (BACKGROUND - rear.z) / outgoing.z;
    vec2 backgroundPoint = (rear.xy + outgoing.xy * distance) * CAMERA / (CAMERA - BACKGROUND);
    vec2 rayPixel = R.xy + backgroundPoint;
    vec2 displacement = clamp(rayPixel - pixel, vec2(-180.0), vec2(180.0));
    float grazing = 1.0 - max(dot(normal, -viewRay), 0.0);
    float filtering = clamp(grazing * grazing * 1.6 + length(displacement) / 300.0 + frost, 0.02, 0.92);
    float chroma = L.z;
    vec3 red = sceneColor(pixel + displacement * (1.0 - chroma), filtering);
    vec3 green = sceneColor(pixel + displacement, filtering);
    vec3 blue = sceneColor(pixel + displacement * (1.0 + chroma), filtering);
    transmitted = vec3(red.r, green.g, blue.b);
  } else transmitted = environment(outgoing, pixel);
  transmitted *= exp(-vec3(0.00032, 0.00015, 0.00007) * min(pathLength, 250.0));
  transmitted = mix(transmitted, pow(T.rgb, vec3(2.2)), T.a);

  float f0 = pow((ior - 1.0) / (ior + 1.0), 2.0);
  float fresnel = f0 + (1.0 - f0) * pow(1.0 - max(dot(normal, -viewRay), 0.0), 5.0);
  vec3 color = mix(transmitted, reflected, fresnel);
  vec3 toLight = normalize(vec3(u_light - R.xy - front.xy, 500.0));
  vec3 halfVector = normalize(toLight - viewRay);
  color += vec3(0.97, 0.985, 1.0) * pow(max(dot(normal, halfVector), 0.0), 160.0) * (0.04 + X.z * 0.10);
  color *= 1.0 + X.z * 0.06;

  // Sound lights the glass from inside in six colours, low notes left to high notes right.
  if (X.x > 0.001) {
    vec2 q = front.xy / max(R.zw, vec2(1.0));
    vec3 glow = vec3(1.0, 0.45, 0.10) * u_bands[0] * energy(q, vec2(-0.39, 0.53), vec2(0.26, 0.53));
    glow += vec3(1.0, 0.19, 0.08) * u_bands[1] * energy(q, vec2(-0.20, 0.64), vec2(0.24, 0.48));
    glow += vec3(1.0, 0.025, 0.30) * u_bands[2] * energy(q, vec2(0.03, 0.61), vec2(0.28, 0.52));
    glow += vec3(0.47, 0.04, 1.0) * u_bands[3] * energy(q, vec2(0.28, 0.55), vec2(0.26, 0.53));
    glow += vec3(0.08, 0.23, 1.0) * u_bands[4] * energy(q, vec2(0.52, 0.38), vec2(0.23, 0.52));
    glow += vec3(0.035, 0.75, 1.0) * u_bands[5] * energy(q, vec2(-0.64, 0.17), vec2(0.17, 0.53));
    color += glow * u_level * 0.75 * X.x;
  }
  if (N.w > 0.5 && length(front.xy - N.xy) < N.z - 2.0) color = mix(color, sceneColor(pixel, 0.85), 0.15);

  float coverage = clamp(0.5 - nearest * u_dpr, 0.0, 1.0);
  color = mix(outside, color, max(coverage, step(nearest, -1.0)));
  gl_FragColor = vec4(pow(max(color, vec3(0.0)), vec3(1.0 / 2.2)), 1.0);
}
`;
function be(o, e, t, n) {
  if (![o, e, t, n].every((u) => Number.isFinite(u) && u > 0))
    throw new RangeError("Backdrop dimensions must be finite and positive.");
  const r = o / e, s = t / n, a = Math.min(1, r / s), y = Math.min(1, s / r);
  return [a, y, (1 - a) / 2, (1 - y) / 2];
}
function xe(o, e = () => new Image()) {
  return new Promise((t, n) => {
    const r = e();
    r.decoding = "async", r.crossOrigin = "anonymous", r.onload = () => {
      if (r.onload = null, r.onerror = null, r.naturalWidth <= 0 || r.naturalHeight <= 0) {
        n(new Error("The backdrop image has invalid image dimensions."));
        return;
      }
      t({ source: r, width: r.naturalWidth, height: r.naturalHeight });
    }, r.onerror = () => {
      r.onload = null, r.onerror = null, n(new Error("The backdrop image could not load; the procedural scene remains available."));
    }, r.src = o;
  });
}
const ne = 16, we = "attribute vec2 a_position; void main() { gl_Position = vec4(a_position, 0.0, 1.0); }";
function _e(o) {
  const e = o.getContext("webgl", { alpha: !1, antialias: !1, premultipliedAlpha: !1, powerPreference: "low-power" });
  if (!e) throw new Error("WebGL is unavailable.");
  const t = [], n = [];
  function r(c, m) {
    const b = e.createShader(c);
    if (!b) throw new Error("Unable to allocate a glass shader.");
    if (e.shaderSource(b, m), e.compileShader(b), !e.getShaderParameter(b, e.COMPILE_STATUS)) {
      const N = e.getShaderInfoLog(b);
      throw e.deleteShader(b), new Error(`Glass shader failed: ${N}`);
    }
    return t.push(b), b;
  }
  function s(c) {
    const m = e.createProgram();
    if (!m) throw new Error("Unable to allocate the glass renderer.");
    if (e.attachShader(m, r(e.VERTEX_SHADER, we)), e.attachShader(m, r(e.FRAGMENT_SHADER, c)), e.linkProgram(m), !e.getProgramParameter(m, e.LINK_STATUS)) throw new Error(`Glass renderer failed to link: ${e.getProgramInfoLog(m)}`);
    return n.push(m), m;
  }
  function a() {
    const c = e.createTexture();
    if (!c) throw new Error("Unable to allocate a glass texture.");
    return e.bindTexture(e.TEXTURE_2D, c), e.texParameteri(e.TEXTURE_2D, e.TEXTURE_MIN_FILTER, e.LINEAR), e.texParameteri(e.TEXTURE_2D, e.TEXTURE_MAG_FILTER, e.LINEAR), e.texParameteri(e.TEXTURE_2D, e.TEXTURE_WRAP_S, e.CLAMP_TO_EDGE), e.texParameteri(e.TEXTURE_2D, e.TEXTURE_WRAP_T, e.CLAMP_TO_EDGE), e.texImage2D(e.TEXTURE_2D, 0, e.RGBA, 1, 1, 0, e.RGBA, e.UNSIGNED_BYTE, new Uint8Array([20, 24, 40, 255])), c;
  }
  const y = s(ge), u = s(ve), x = Number(e.getParameter(e.MAX_FRAGMENT_UNIFORM_VECTORS)) || 64, g = Math.max(2, Math.min(ne, Math.floor((x - 16) / 6))), h = s(`#define MAX_PANES ${g}
${ye}`), p = e.createBuffer(), A = a(), R = a(), _ = a(), C = e.createFramebuffer(), w = e.createFramebuffer();
  if (!p || !C || !w) throw new Error("Unable to allocate glass buffers.");
  e.bindBuffer(e.ARRAY_BUFFER, p), e.bufferData(e.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), e.STATIC_DRAW);
  const T = (c, m) => Object.fromEntries(m.map((b) => [b, e.getUniformLocation(c, b)])), l = T(y, ["u_size", "u_dpr", "u_mode", "u_image", "u_crop", "u_time", "u_colors[0]", "u_base", "u_dim"]), f = T(u, ["u_background", "u_size", "u_step"]), i = T(h, ["u_scene", "u_frost", "u_size", "u_dpr", "u_count", "u_rect[0]", "u_look[0]", "u_tint[0]", "u_profile[0]", "u_lens[0]", "u_extra[0]", "u_light", "u_pointer", "u_bands[0]", "u_level"]), v = new Float32Array(g * 4), F = new Float32Array(g * 4), U = new Float32Array(g * 4), P = new Float32Array(g * 4), B = new Float32Array(g * 4), q = new Float32Array(g * 4), I = new Float32Array(6);
  let L = 1, E = 1, X = 1, O = !1, G = !1, H = 1, Q = 0, W = { width: 1, height: 1 }, j = new Float32Array([1, 0.35, 0.12, 1, 0.18, 0.54, 0.42, 0.23, 1, 0, 0.76, 1]), K = new Float32Array([0.04, 0.03, 0.12]);
  function $(c) {
    e.useProgram(c), e.bindBuffer(e.ARRAY_BUFFER, p);
    const m = e.getAttribLocation(c, "a_position");
    e.enableVertexAttribArray(m), e.vertexAttribPointer(m, 2, e.FLOAT, !1, 0, 0);
  }
  function J(c, m, b, N) {
    if (e.bindTexture(e.TEXTURE_2D, m), e.texImage2D(e.TEXTURE_2D, 0, e.RGBA, b, N, 0, e.RGBA, e.UNSIGNED_BYTE, null), e.bindFramebuffer(e.FRAMEBUFFER, c), e.framebufferTexture2D(e.FRAMEBUFFER, e.COLOR_ATTACHMENT0, e.TEXTURE_2D, m, 0), e.checkFramebufferStatus(e.FRAMEBUFFER) !== e.FRAMEBUFFER_COMPLETE) throw new Error("A glass framebuffer is incomplete.");
  }
  function ae(c, m) {
    L = Math.max(1, c), E = Math.max(1, m), X = Math.min(window.devicePixelRatio || 1, 1.5), o.width = Math.round(L * X), o.height = Math.round(E * X), J(C, R, o.width, o.height), J(w, _, Math.max(1, Math.ceil(o.width / 4)), Math.max(1, Math.ceil(o.height / 4))), e.bindFramebuffer(e.FRAMEBUFFER, null), O = !0;
  }
  function le(c, m = 1, b = 1) {
    H = c === "wait" ? 2 : c ? 0 : 1, !(!c || c === "wait") && (W = { width: Math.max(1, m), height: Math.max(1, b) }, e.bindTexture(e.TEXTURE_2D, A), e.pixelStorei(e.UNPACK_FLIP_Y_WEBGL, !0), e.texImage2D(e.TEXTURE_2D, 0, e.RGBA, e.RGBA, e.UNSIGNED_BYTE, c), e.pixelStorei(e.UNPACK_FLIP_Y_WEBGL, !1));
  }
  function ce(c, m) {
    j = new Float32Array(Array.from({ length: 4 }, (b, N) => c[N % c.length]).flat()), K = new Float32Array(m);
  }
  function ue(c) {
    Q = Math.min(0.9, Math.max(0, Number.isFinite(c) ? c : 0));
  }
  function de(c) {
    if (G || !O) return;
    e.bindFramebuffer(e.FRAMEBUFFER, C), e.viewport(0, 0, o.width, o.height), $(y), e.activeTexture(e.TEXTURE0), e.bindTexture(e.TEXTURE_2D, A), e.uniform1i(l.u_image, 0), e.uniform2f(l.u_size, L, E), e.uniform1f(l.u_dpr, X), e.uniform1f(l.u_mode, H), e.uniform4f(l.u_crop, ...be(L, E, W.width, W.height)), e.uniform1f(l.u_time, c), e.uniform3fv(l["u_colors[0]"], j), e.uniform3fv(l.u_base, K), e.uniform1f(l.u_dim, Q), e.drawArrays(e.TRIANGLES, 0, 3);
    const m = Math.max(1, Math.ceil(o.width / 4)), b = Math.max(1, Math.ceil(o.height / 4));
    e.bindFramebuffer(e.FRAMEBUFFER, w), e.viewport(0, 0, m, b), $(u), e.bindTexture(e.TEXTURE_2D, R), e.uniform1i(f.u_background, 0), e.uniform2f(f.u_size, m, b), e.uniform2f(f.u_step, 5 * X / o.width, 5 * X / o.height), e.drawArrays(e.TRIANGLES, 0, 3), e.bindFramebuffer(e.FRAMEBUFFER, null);
  }
  function he(c, m, b, N) {
    if (G || !O) return;
    const Z = Math.min(g, c.length);
    for (let M = 0; M < Z; M += 1) {
      const S = c[M];
      v.set([S.x, S.y, S.halfWidth, S.halfHeight], M * 4), F.set([S.radius, S.frost, S.chroma, S.pull], M * 4), U.set(S.tint, M * 4), P.set([S.depth, S.rounding, S.dome, S.ior], M * 4), B.set(S.lens, M * 4), q.set([S.glow, S.shadow, S.press, 0], M * 4);
    }
    for (let M = 0; M < 6; M += 1) I[M] = Number(N.bands[M]) || 0;
    e.bindFramebuffer(e.FRAMEBUFFER, null), e.viewport(0, 0, o.width, o.height), $(h), e.activeTexture(e.TEXTURE0), e.bindTexture(e.TEXTURE_2D, R), e.activeTexture(e.TEXTURE1), e.bindTexture(e.TEXTURE_2D, _), e.uniform1i(i.u_scene, 0), e.uniform1i(i.u_frost, 1), e.uniform2f(i.u_size, L, E), e.uniform1f(i.u_dpr, X), e.uniform1i(i.u_count, Z), e.uniform4fv(i["u_rect[0]"], v), e.uniform4fv(i["u_look[0]"], F), e.uniform4fv(i["u_tint[0]"], U), e.uniform4fv(i["u_profile[0]"], P), e.uniform4fv(i["u_lens[0]"], B), e.uniform4fv(i["u_extra[0]"], q), e.uniform2f(i.u_light, m.x, m.y), e.uniform2f(i.u_pointer, b.x, b.y), e.uniform1fv(i["u_bands[0]"], I), e.uniform1f(i.u_level, Math.min(1, Math.max(0, N.level))), e.drawArrays(e.TRIANGLES, 0, 3), e.activeTexture(e.TEXTURE0);
  }
  function fe() {
    G || (G = !0, t.forEach((c) => e.deleteShader(c)), n.forEach((c) => e.deleteProgram(c)), [A, R, _].forEach((c) => e.deleteTexture(c)), e.deleteFramebuffer(C), e.deleteFramebuffer(w), e.deleteBuffer(p), e.getExtension("WEBGL_lose_context")?.loseContext());
  }
  return { resize: ae, setSource: le, setAurora: ce, setDim: ue, drawScene: de, drawGlass: he, destroy: fe, maxPanes: g };
}
const Ee = [[30, 120], [120, 300], [300, 700], [700, 1600], [1600, 4e3], [4e3, 1e4]];
function Ae(o, e, t, n = new Float32Array(6)) {
  if (!Number.isFinite(e) || e <= 0 || !Number.isInteger(t) || t < 32 || t > 32768 || (t & t - 1) !== 0 || o.length !== t / 2 || n.length < 6)
    throw new RangeError("Audio analysis needs a valid sample rate, power-of-two FFT and matching spectrum.");
  const r = e / t;
  return Ee.forEach(([s, a], y) => {
    const u = Math.max(1, Math.ceil(s / r)), x = Math.min(o.length, Math.ceil(a / r));
    let g = 0, h = 0;
    for (let A = u; A < x; A += 1) {
      const R = o[A] / 255;
      g += R * R, h = Math.max(h, R);
    }
    const p = x > u ? Math.sqrt(g / (x - u)) : 0;
    n[y] = Math.min(1, (p * 0.4 + h * 0.6) * 1.3);
  }), n;
}
function Se(o) {
  const e = !!o.getUserMedia && !!o.createAudioContext;
  let t = { status: e ? "idle" : "unavailable", message: e ? "" : "Microphone analysis is not supported in this browser. The visual demo still works." }, n = null, r = null, s = null, a = null, y = new Uint8Array(0), u = new Float32Array(0);
  const x = new Float32Array(6), g = { bands: new Float32Array(6), level: 0 };
  let h = 0, p = null;
  async function A() {
    const w = n, T = r, l = s, f = a;
    n = null, r = null, s = null, a = null, l?.disconnect(), f?.disconnect(), T?.getTracks().forEach((i) => i.stop()), g.bands.fill(0), g.level = 0, w && w.state !== "closed" && await w.close().catch(() => {
    });
  }
  async function R() {
    h += 1, t = { status: e ? "idle" : "unavailable", message: e ? "" : t.message }, await A();
  }
  function _() {
    if (!e) return Promise.resolve(!1);
    if (t.status === "live") return Promise.resolve(!0);
    if (t.status === "requesting" && p) return p;
    const w = ++h;
    t = { status: "requesting", message: "Allow microphone access in your browser, or cancel to keep exploring." };
    const T = (async () => {
      try {
        const l = o.createAudioContext();
        n = l;
        const f = l.resume().then(() => null, (F) => F), i = await o.getUserMedia({ audio: { echoCancellation: !0, noiseSuppression: !0, autoGainControl: !0 }, video: !1 });
        if (w !== h)
          return i.getTracks().forEach((F) => F.stop()), !1;
        r = i;
        const v = await f;
        if (v) throw v;
        return w !== h ? !1 : (s = l.createMediaStreamSource(i), a = l.createAnalyser(), a.fftSize = 4096, a.minDecibels = -90, a.maxDecibels = -15, a.smoothingTimeConstant = 0.55, y = new Uint8Array(a.frequencyBinCount), u = new Float32Array(a.fftSize), s.connect(a), i.getAudioTracks().forEach((F) => F.addEventListener("ended", () => {
          R();
        }, { once: !0 })), t = { status: "live", message: "Microphone on. Audio is analysed on this device; nothing is saved or uploaded." }, !0);
      } catch (l) {
        if (w !== h || (await A(), w !== h)) return !1;
        const f = l && typeof l == "object" && "name" in l && typeof l.name == "string" ? l.name : "";
        return t = f === "NotAllowedError" || f === "SecurityError" ? { status: "denied", message: "Microphone permission was not allowed. You can allow it in your browser and try again; the demo still works." } : { status: "error", message: f === "NotFoundError" ? "No microphone was found. Connect one and try again, or use the visual demo." : "The microphone could not be started. Check your device and browser permissions, then try again." }, !1;
      }
    })();
    return p = T, T.finally(() => {
      p === T && (p = null);
    }), T;
  }
  function C(w) {
    return t.status !== "live" || !a || !n ? g : re(a, n.sampleRate, w, g, x, y, u);
  }
  return { start: _, stop: R, read: C, getState: () => ({ ...t }) };
}
function re(o, e, t, n, r, s, a) {
  o.getByteFrequencyData(s), o.getFloatTimeDomainData(a), Ae(s, e, o.fftSize, r);
  let y = 0;
  for (const p of a) y += p * p;
  const u = Math.sqrt(y / a.length), x = Math.min(1, Math.max(0, (u - 6e-3) / 0.012)), g = Math.min(0.1, Math.max(0, Number.isFinite(t) ? t : 0));
  r.forEach((p, A) => {
    const R = p * x, _ = R > n.bands[A] ? 0.045 : 0.23;
    n.bands[A] += (R - n.bands[A]) * (1 - Math.exp(-g / _));
  });
  const h = Math.min(1, Math.max(0, (u - 6e-3) * 9));
  return n.level += (h - n.level) * (1 - Math.exp(-g / (h > n.level ? 0.04 : 0.2))), n;
}
function Re(o) {
  const e = o.context.createAnalyser();
  e.fftSize = 4096, e.minDecibels = -90, e.maxDecibels = -15, e.smoothingTimeConstant = 0.55, o.connect(e);
  const t = { bands: new Float32Array(6), level: 0 }, n = new Float32Array(6), r = new Uint8Array(e.frequencyBinCount), s = new Float32Array(e.fftSize);
  let a = !0;
  return {
    read: (y) => a ? re(e, o.context.sampleRate, y, t, n, r, s) : t,
    disconnect: () => {
      if (a) {
        a = !1;
        try {
          o.disconnect(e);
        } catch {
        }
        t.bands.fill(0), t.level = 0;
      }
    }
  };
}
function D(o, e, t) {
  return Math.min(t, Math.max(e, o));
}
function z(o, e, t, n, r = 420, s = 18) {
  const a = D(Number.isFinite(n) ? n : 0, 0, 0.06666666666666667), y = Math.max(1, Math.ceil(a / (1 / 240))), u = a / y;
  let x = o, g = e;
  for (let h = 0; h < y; h += 1)
    g += ((t - x) * r - g * s) * u, x += g * u;
  return [x, g];
}
function Me(o, e, t) {
  const n = (o || "").trim().split(/\s+/)[0] ?? "", r = parseFloat(n);
  if (!Number.isFinite(r) || r <= 0) return 0;
  const s = Math.min(e, t), a = n.endsWith("%") ? r / 100 * s : r;
  return D(a, 0, s / 2);
}
function k(o, e, t = -1 / 0, n = 1 / 0) {
  const r = parseFloat(o);
  return Number.isFinite(r) ? D(r, t, n) : e;
}
function Te(o) {
  const e = /rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+%?))?\s*\)/.exec(o || "");
  if (!e) return null;
  const t = e[4], n = t === void 0 ? 1 : t.endsWith("%") ? parseFloat(t) / 100 : parseFloat(t);
  return [Number(e[1]) / 255, Number(e[2]) / 255, Number(e[3]) / 255, D(n, 0, 1)];
}
function Fe(o) {
  return /\.(mp4|webm|mov|m4v)(\?|#|$)/i.test(o);
}
const Ce = [[1, 0.35, 0.12], [1, 0.18, 0.54], [0.42, 0.23, 1], [0, 0.76, 1]], Pe = [0.04, 0.03, 0.12], ee = `
:host { display: block; position: relative; isolation: isolate; overflow: hidden; min-height: 120px; color: #fff; background: #0a0818; }
:host([hidden]) { display: none; }
canvas { position: absolute; inset: 0; width: 100%; height: 100%; z-index: 0; pointer-events: none; opacity: 0; transition: opacity .5s; }
:host([data-ready]) canvas { opacity: 1; }
.fallback { position: absolute; inset: 0; z-index: 0; background: var(--image, linear-gradient(120deg, #ff5a1f, #ff2d8a 35%, #6a3bff 65%, #00c2ff)) center / cover no-repeat; }
:host([data-renderer='webgl'][data-ready]) .fallback { display: none; }
.content { position: relative; z-index: 1; height: 100%; }`, ie = document.createElement("template");
ie.innerHTML = '<div class="fallback" part="fallback"></div><canvas part="canvas" aria-hidden="true"></canvas><div class="content" part="content"><slot></slot></div>';
const te = `
liquid-glass [glass] { -webkit-tap-highlight-color: transparent; }
liquid-glass [glass-drag] { touch-action: none; cursor: grab; user-select: none; }
liquid-glass [glass-drag]:active { cursor: grabbing; }
liquid-glass:not([data-renderer='webgl']) [glass] { background: rgba(255,255,255,.16); border: 1px solid rgba(255,255,255,.38); box-shadow: inset 0 1px 1px rgba(255,255,255,.6), 0 10px 30px rgba(0,0,0,.18); backdrop-filter: blur(14px) saturate(1.7); -webkit-backdrop-filter: blur(14px) saturate(1.7); }`;
function oe(o) {
  if (!("adoptedStyleSheets" in Document.prototype) || !("replaceSync" in CSSStyleSheet.prototype)) return null;
  try {
    const e = new CSSStyleSheet();
    return e.replaceSync(o), e;
  } catch {
    return null;
  }
}
let Y, V;
function ke(o) {
  if (Y === void 0 && (Y = oe(ee)), Y) {
    o.adoptedStyleSheets = [...o.adoptedStyleSheets, Y];
    return;
  }
  const e = document.createElement("style");
  e.textContent = ee, o.prepend(e);
}
function De() {
  if (V === void 0 && (V = oe(te)), V) {
    document.adoptedStyleSheets.includes(V) || (document.adoptedStyleSheets = [...document.adoptedStyleSheets, V]);
    return;
  }
  if (document.getElementById("liquid-glass-style")) return;
  const o = document.createElement("style");
  o.id = "liquid-glass-style", o.textContent = te, document.head.append(o);
}
class se extends HTMLElement {
  constructor() {
    super();
    d(this, "canvas");
    d(this, "fallback");
    d(this, "renderer", null);
    d(this, "states", /* @__PURE__ */ new WeakMap());
    d(this, "colorProbe", document.createElement("span"));
    d(this, "colorCache", /* @__PURE__ */ new Map());
    d(this, "motionQuery", window.matchMedia("(prefers-reduced-motion: reduce)"));
    d(this, "events", null);
    d(this, "resizeObserver", null);
    d(this, "visibility", null);
    d(this, "mutations", null);
    d(this, "video", null);
    d(this, "animatedScene", !0);
    d(this, "sceneDirty", !0);
    d(this, "stylesDirty", !0);
    d(this, "onScreen", !0);
    d(this, "frameId", 0);
    d(this, "frameCount", 0);
    d(this, "lastFrame", 0);
    d(this, "time", 0);
    d(this, "width", 1);
    d(this, "height", 1);
    d(this, "lastSignature", "");
    d(this, "backdropRequest", 0);
    d(this, "pointer", { x: 0, y: 0, inside: !1, down: !1, target: null });
    d(this, "light", { x: 0, y: 0, vx: 0, vy: 0 });
    d(this, "bulge", { x: -1e4, y: -1e4, vx: 0, vy: 0 });
    d(this, "microphone", null);
    d(this, "node", null);
    d(this, "manualAudio", null);
    d(this, "silent", { bands: new Float32Array(6), level: 0 });
    d(this, "demo", { bands: new Float32Array(6), level: 0 });
    d(this, "level", 0);
    d(this, "lastAudioStatus", "");
    d(this, "liveSince", 0);
    const t = this.attachShadow({ mode: "open" });
    ke(t), t.append(ie.content.cloneNode(!0)), this.canvas = t.querySelector("canvas"), this.fallback = t.querySelector(".fallback"), this.colorProbe.hidden = !0, t.append(this.colorProbe), De();
  }
  /** 'aurora' (default), or the URL of an image or video to refract. */
  get backdrop() {
    return this.getAttribute("backdrop") || "aurora";
  }
  set backdrop(t) {
    this.setAttribute("backdrop", t);
  }
  /** The glass elements this scene renders (at most 16). */
  get panes() {
    return Array.from(this.querySelectorAll("[glass]")).slice(0, this.renderer?.maxPanes ?? ne);
  }
  /** The microphone's state: idle, requesting, live, denied, unavailable or error. */
  get microphoneState() {
    return this.mic().getState();
  }
  /** When the microphone went live (performance.now() time), for a recording timer. */
  get listeningSince() {
    return this.liveSince;
  }
  /** Ask for the microphone and let the glass glow with it. Call from a click or a key press. */
  async startMicrophone() {
    const t = this.mic().start();
    this.syncAudio();
    const n = await t;
    return n && (this.liveSince = performance.now()), this.syncAudio(), n;
  }
  /** Stop the microphone and release the device. */
  stopMicrophone() {
    this.microphone && (this.microphone.stop(), this.syncAudio());
  }
  /** Let any Web Audio node light the glass (a player, a synth). Returns a function that stops listening. */
  listen(t) {
    this.node?.disconnect();
    const n = Re(t);
    return this.node = n, () => {
      n.disconnect(), this.node === n && (this.node = null);
    };
  }
  /** Drive the glow with your own levels: six bands (low to high) and an overall level, 0 to 1. null stops. */
  setAudio(t) {
    if (!t) {
      this.manualAudio = null;
      return;
    }
    const n = new Float32Array(6);
    for (let r = 0; r < 6; r += 1) n[r] = D(Number(t.bands[r]) || 0, 0, 1);
    this.manualAudio = { bands: n, level: D(Number(t.level) || 0, 0, 1) };
  }
  mic() {
    return this.microphone ?? (this.microphone = Se({
      getUserMedia: navigator.mediaDevices?.getUserMedia ? (t) => navigator.mediaDevices.getUserMedia(t) : void 0,
      createAudioContext: typeof window.AudioContext == "function" ? () => new AudioContext() : void 0
    })), this.microphone;
  }
  syncAudio() {
    const t = this.mic().getState();
    t.status !== this.lastAudioStatus && (this.lastAudioStatus = t.status, this.dataset.audio = t.status, this.dispatchEvent(new CustomEvent("microphone-change", { detail: t, bubbles: !0, composed: !0 })));
  }
  connectedCallback() {
    this.events = new AbortController();
    const t = this.events.signal;
    try {
      this.renderer = _e(this.canvas), this.dataset.renderer = "webgl";
    } catch (n) {
      console.warn("liquid-glass: WebGL is unavailable, using frosted CSS glass.", n), this.dataset.renderer = "css";
    }
    this.resizeObserver = new ResizeObserver(() => this.resize()), this.resizeObserver.observe(this), this.visibility = new IntersectionObserver(([n]) => {
      this.onScreen = n.isIntersecting, this.onScreen ? this.start() : this.stop();
    }), this.visibility.observe(this), this.mutations = new MutationObserver(() => {
      this.stylesDirty = !0;
    }), this.mutations.observe(this, { subtree: !0, childList: !0, attributes: !0 }), this.resize(), this.applyDim(), this.applyBackdrop(), this.addEventListener("pointermove", (n) => this.movePointer(n), { passive: !0, signal: t }), this.addEventListener("pointerenter", (n) => this.movePointer(n), { passive: !0, signal: t }), this.addEventListener("pointerleave", () => {
      this.pointer.inside = !1;
    }, { signal: t }), this.addEventListener("pointerdown", (n) => this.press(n), { signal: t }), window.addEventListener("pointerup", (n) => this.release(n), { signal: t }), window.addEventListener("pointercancel", (n) => this.release(n), { signal: t }), window.addEventListener("pointermove", (n) => this.dragMove(n), { passive: !0, signal: t }), document.addEventListener("visibilitychange", () => {
      document.hidden ? (this.stop(), this.stopMicrophone()) : this.start();
    }, { signal: t }), this.canvas.addEventListener("webglcontextlost", (n) => {
      n.preventDefault(), this.renderer?.destroy(), this.renderer = null, this.dataset.renderer = "css";
    }, { signal: t }), this.start();
  }
  disconnectedCallback() {
    this.stop(), this.events?.abort(), this.resizeObserver?.disconnect(), this.visibility?.disconnect(), this.mutations?.disconnect(), this.video?.pause(), this.video = null, this.microphone?.stop(), this.node?.disconnect(), this.node = null, this.renderer?.destroy(), this.renderer = null, delete this.dataset.ready;
  }
  attributeChangedCallback(t, n, r) {
    n === r || !this.isConnected || ((t === "backdrop" || t === "colors") && this.applyBackdrop(), t === "dim" && this.applyDim());
  }
  // ---- the backdrop
  applyBackdrop() {
    const t = ++this.backdropRequest, n = this.backdrop.trim();
    if (this.video?.pause(), this.video = null, n === "aurora" || !n) {
      this.renderer?.setAurora(this.auroraColors(), Pe), this.renderer?.setSource(null), this.fallback.style.removeProperty("--image"), this.animatedScene = !0, this.sceneDirty = !0, this.dataset.ready = "";
      return;
    }
    if (this.fallback.style.setProperty("--image", `url("${n.replace(/"/g, "%22")}")`), this.renderer?.setSource("wait"), this.sceneDirty = !0, Fe(n)) {
      const r = document.createElement("video");
      Object.assign(r, { muted: !0, loop: !0, playsInline: !0, autoplay: !0, crossOrigin: "anonymous", src: n }), r.setAttribute("muted", ""), this.video = r, this.animatedScene = !0, r.addEventListener("playing", () => {
        t === this.backdropRequest && (this.dataset.ready = "");
      }, { once: !0 }), r.play().catch(() => {
      });
      return;
    }
    this.animatedScene = !1, xe(n).then((r) => {
      t === this.backdropRequest && (this.renderer?.setSource(r.source, r.width, r.height), this.sceneDirty = !0, this.dataset.ready = "");
    }).catch((r) => {
      t === this.backdropRequest && (console.warn(`liquid-glass: the backdrop "${n}" could not load (images on other sites need CORS headers). Showing the aurora.`, r), this.renderer?.setSource(null), this.animatedScene = !0, this.sceneDirty = !0, this.dataset.ready = "");
    });
  }
  applyDim() {
    const t = k(this.getAttribute("dim") ?? "", 0, 0, 0.9);
    this.renderer?.setDim(t), this.fallback.style.filter = t ? `brightness(${1 - t})` : "", this.sceneDirty = !0;
  }
  auroraColors() {
    const t = (this.getAttribute("colors") || "").split(/[\s,]+/).filter(Boolean).map((n) => this.resolveColor(n)).filter((n) => n[3] > 0);
    return t.length ? t.map(([n, r, s]) => [n, r, s]) : Ce;
  }
  // ---- reading the panes
  resolveColor(t) {
    const n = this.colorCache.get(t);
    if (n) return n;
    this.colorProbe.style.color = "", this.colorProbe.style.color = t;
    const r = (this.colorProbe.style.color ? Te(getComputedStyle(this.colorProbe).color) : null) ?? [0, 0, 0, 0];
    return this.colorCache.set(t, r), r;
  }
  readLook(t, n, r) {
    const s = getComputedStyle(t), a = Math.min(n, r) / 2, y = s.getPropertyValue("--glass-tint").trim(), u = s.getPropertyValue("--glass-lens").trim().split(/[\s,]+/).map(Number), x = Math.min(44, Math.max(a * 0.36, Math.min(a * 0.7, 14))) * k(s.getPropertyValue("--glass-depth"), 1, 0.2, 3);
    return {
      radius: Me(s.borderTopLeftRadius, n, r),
      frost: k(s.getPropertyValue("--glass-frost"), 0, 0, 1),
      chroma: k(s.getPropertyValue("--glass-chroma"), 8e-3, 0, 0.1),
      pull: k(s.getPropertyValue("--glass-pull"), Math.min(9, a * 0.3), 0, 40),
      tint: y ? this.resolveColor(y) : [1, 1, 1, 0],
      depth: x,
      rounding: Math.min(x * 0.73, a * 0.9),
      dome: x * 0.48 * k(s.getPropertyValue("--glass-dome"), 1, 0, 4),
      ior: k(s.getPropertyValue("--glass-ior"), 1.38, 1.05, 2.4),
      lens: u.length === 3 && u.every(Number.isFinite) ? [u[0], u[1], u[2]] : null,
      glow: k(s.getPropertyValue("--glass-glow"), 1, 0, 2),
      shadow: k(s.getPropertyValue("--glass-shadow"), 1, 0, 1),
      press: k(s.getPropertyValue("--glass-press"), 1.045, 0.8, 1.3)
    };
  }
  state(t) {
    let n = this.states.get(t);
    return n || (n = { scale: 1, scaleVelocity: 0, glow: 0, glowVelocity: 0, stretchX: 1, stretchXVelocity: 0, stretchY: 1, stretchYVelocity: 0, look: null, drag: null, offsetX: 0, offsetY: 0, lens: [0, 0, 0, 0], lensVelocity: [0, 0, 0, 0] }, this.states.set(t, n)), n;
  }
  // ---- pointer: light, press, drag
  movePointer(t) {
    const n = this.getBoundingClientRect();
    this.pointer.x = t.clientX - n.left, this.pointer.y = t.clientY - n.top, this.pointer.inside = !0;
  }
  press(t) {
    this.movePointer(t);
    const n = t.target?.closest?.("[glass]");
    if (!(!n || !this.contains(n)) && (this.pointer.down = !0, this.pointer.target = n, n.hasAttribute("glass-drag"))) {
      const r = this.state(n);
      r.drag = { pointer: t.pointerId, startX: t.clientX, startY: t.clientY, baseX: r.offsetX, baseY: r.offsetY, lastX: t.clientX, lastY: t.clientY, lastT: t.timeStamp, vx: 0, vy: 0 }, n.setPointerCapture?.(t.pointerId);
    }
  }
  dragMove(t) {
    const n = this.pointer.target, r = n ? this.states.get(n)?.drag : null;
    if (!n || !r || r.pointer !== t.pointerId) return;
    const s = this.state(n), a = Math.max(1, t.timeStamp - r.lastT) / 1e3;
    r.vx = r.vx * 0.6 + (t.clientX - r.lastX) / a * 0.4, r.vy = r.vy * 0.6 + (t.clientY - r.lastY) / a * 0.4, r.lastX = t.clientX, r.lastY = t.clientY, r.lastT = t.timeStamp, s.offsetX = r.baseX + t.clientX - r.startX, s.offsetY = r.baseY + t.clientY - r.startY, n.style.translate = `${s.offsetX}px ${s.offsetY}px`;
  }
  release(t) {
    const n = this.pointer.target;
    if (n) {
      const r = this.states.get(n);
      r?.drag && r.drag.pointer === t.pointerId && (r.drag = null);
    }
    this.pointer.down = !1, this.pointer.target = null;
  }
  // ---- the frame loop
  resize() {
    const t = this.getBoundingClientRect();
    this.width = Math.max(1, t.width), this.height = Math.max(1, t.height);
    try {
      this.renderer?.resize(this.width, this.height);
    } catch (n) {
      console.warn(n), this.renderer?.destroy(), this.renderer = null, this.dataset.renderer = "css";
    }
    this.sceneDirty = !0, this.stylesDirty = !0, this.lastSignature = "";
  }
  start() {
    this.frameId || !this.isConnected || !this.onScreen || document.hidden || (this.lastFrame = performance.now(), this.frameId = requestAnimationFrame((t) => this.frame(t)));
  }
  stop() {
    cancelAnimationFrame(this.frameId), this.frameId = 0;
  }
  frame(t) {
    this.frameId = requestAnimationFrame((l) => this.frame(l));
    const n = this.renderer;
    if (!n) return;
    const r = D((t - this.lastFrame) / 1e3, 0, 1 / 15);
    this.lastFrame = t, this.frameCount += 1;
    const s = this.motionQuery.matches || this.hasAttribute("reduce-motion"), a = this.video;
    a && a.readyState >= 2 && (n.setSource(a, a.videoWidth, a.videoHeight), this.sceneDirty = !0), this.animatedScene && !s && (this.time += r, this.sceneDirty = !0);
    const y = this.sceneDirty;
    this.sceneDirty && (n.drawScene(this.time), this.sceneDirty = !1);
    const u = this.light, x = this.pointer.inside ? this.pointer.x - 100 : this.width * 0.18, g = this.pointer.inside ? this.pointer.y - 160 : -this.height * 0.25;
    [u.x, u.vx] = z(u.x, u.vx, x, r, 330, 24), [u.y, u.vy] = z(u.y, u.vy, g, r, 330, 24);
    const h = this.bulge;
    this.pointer.inside && h.x < -5e3 && Object.assign(h, { x: this.pointer.x, y: this.pointer.y, vx: 0, vy: 0 }), !this.pointer.inside || s ? Object.assign(h, { x: -1e4, y: -1e4, vx: 0, vy: 0 }) : ([h.x, h.vx] = z(h.x, h.vx, this.pointer.x, r, 140, 9), [h.y, h.vy] = z(h.y, h.vy, this.pointer.y, r, 140, 9)), this.microphone && this.syncAudio();
    let p = this.silent;
    this.microphone?.getState().status === "live" ? p = this.microphone.read(r) : this.node ? p = this.node.read(r) : this.manualAudio ? p = this.manualAudio : this.hasAttribute("inner-light") && (this.demo.bands.forEach((l, f) => {
      this.demo.bands[f] = 0.26 + Math.sin(this.time * (1.4 + f * 0.28) + f) * 0.17;
    }), this.demo.level = Math.max(...this.demo.bands) * 0.6, p = this.demo, !this.animatedScene && !s && (this.time += r));
    const A = p === this.demo ? 0.85 : p === this.silent ? 0 : D(p.level * 1.5, 0, 1);
    this.level = s ? A : this.level + (A - this.level) * Math.min(r * 7, 1);
    const R = p !== this.silent || this.level > 2e-3;
    (this.stylesDirty || this.frameCount % 30 === 0) && this.panes.forEach((l) => {
      this.state(l).look = null;
    }), this.stylesDirty = !1;
    const _ = this.getBoundingClientRect(), C = [];
    let w = Math.abs(u.vx) + Math.abs(u.vy) + Math.abs(h.vx) + Math.abs(h.vy) > 0.5 || R;
    for (const l of this.panes) {
      const f = l.getBoundingClientRect();
      if (f.width < 1 || f.height < 1 || f.right < _.left || f.left > _.right || f.bottom < _.top || f.top > _.bottom) continue;
      const i = this.state(l);
      i.look ?? (i.look = this.readLook(l, f.width, f.height));
      const v = i.look, F = this.pointer.down && this.pointer.target === l, U = this.pointer.inside && this.pointer.x >= f.left - _.left && this.pointer.x <= f.right - _.left && this.pointer.y >= f.top - _.top && this.pointer.y <= f.bottom - _.top, P = i.drag, B = F ? v.press : U ? 1 + (v.press - 1) * 0.3 : 1, q = P ? D(Math.abs(P.vx) / 2600, 0, 0.22) : 0, I = P ? D(Math.abs(P.vy) / 2600, 0, 0.22) : 0;
      s ? Object.assign(i, { scale: B, scaleVelocity: 0, stretchX: 1, stretchY: 1, stretchXVelocity: 0, stretchYVelocity: 0, glow: F ? 1 : 0, glowVelocity: 0 }) : ([i.scale, i.scaleVelocity] = z(i.scale, i.scaleVelocity, B, r, 520, 14), [i.stretchX, i.stretchXVelocity] = z(i.stretchX, i.stretchXVelocity, 1 + q - I * 0.5, r, 300, 12), [i.stretchY, i.stretchYVelocity] = z(i.stretchY, i.stretchYVelocity, 1 + I - q * 0.5, r, 300, 12), [i.glow, i.glowVelocity] = z(i.glow, i.glowVelocity, F ? 1 : U ? 0.35 : 0, r, 260, 22)), P && (P.vx *= 0.9, P.vy *= 0.9), w || (w = Math.abs(i.scaleVelocity) + Math.abs(i.stretchXVelocity) + Math.abs(i.stretchYVelocity) + Math.abs(i.glowVelocity) > 2e-3);
      const L = v.lens ? [v.lens[0], v.lens[1], v.lens[2], 1] : [i.lens[0], i.lens[1], i.lens[2], 0];
      i.lens[3] === 0 && v.lens && !i.lensVelocity.some(Boolean) && (i.lens = [...L]);
      for (let E = 0; E < 4; E += 1) {
        if (s) {
          i.lens[E] = L[E], i.lensVelocity[E] = 0;
          continue;
        }
        [i.lens[E], i.lensVelocity[E]] = z(i.lens[E], i.lensVelocity[E], L[E], r, 330, 24);
      }
      w || (w = i.lensVelocity.some((E) => Math.abs(E) > 0.01)), C.push({
        x: f.left - _.left + f.width / 2,
        y: f.top - _.top + f.height / 2,
        halfWidth: f.width / 2 * i.scale * i.stretchX,
        halfHeight: f.height / 2 * i.scale * i.stretchY,
        radius: v.radius * i.scale,
        frost: v.frost,
        chroma: v.chroma,
        pull: v.pull,
        tint: v.tint,
        depth: v.depth,
        rounding: v.rounding,
        dome: v.dome,
        ior: v.ior,
        lens: [i.lens[0] * i.scale, i.lens[1] * i.scale, i.lens[2] * i.scale, i.lens[3]],
        glow: v.glow,
        shadow: v.shadow,
        press: i.glow
      });
    }
    const T = C.map((l) => `${l.x.toFixed(1)},${l.y.toFixed(1)},${l.halfWidth.toFixed(1)},${l.halfHeight.toFixed(1)},${l.radius},${l.frost},${l.depth},${l.dome},${l.tint.join(",")}`).join("|");
    !y && !w && T === this.lastSignature || (this.lastSignature = T, n.drawGlass(C, { x: u.x, y: u.y }, { x: h.x, y: h.y }, p === this.silent ? { bands: this.silent.bands, level: this.level } : { bands: p.bands, level: this.level }));
  }
}
d(se, "observedAttributes", ["backdrop", "colors", "dim", "inner-light"]);
typeof customElements < "u" && !customElements.get("liquid-glass") && customElements.define("liquid-glass", se);
export {
  se as LiquidGlassElement
};
