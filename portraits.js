// Original elemental glyphs; intentionally legible at the orbit's smallest size.
function drawSpirit(ctx,key,x,y,r){
 const colors={R:['#ff8966','#bd2d39'],B:['#81e1ff','#2363bf'],F:['#a4ee9a','#28784e'],L:['#f4cd8f','#986032'],U:['#fff3a8','#c59232'],D:['#ffbfdc','#bf508b'],V:['#c6a6ff','#643895'],I:['#b8fff3','#298d99'],M:['#d4deec','#66758e']};
 colors.J=['#7e8798','#303847'];colors.H=['#fffbea','#c9bfa0'];colors.P=['#dbf472','#738926'];
 const [light,dark]=colors[key];ctx.save();ctx.translate(x,y);ctx.scale(r/20,r/20);
 const g=ctx.createLinearGradient(-10,-18,12,19);g.addColorStop(0,light);g.addColorStop(1,dark);
 ctx.beginPath();ctx.arc(0,0,19,0,Math.PI*2);ctx.fillStyle=g;ctx.fill();ctx.strokeStyle='#ffffff90';ctx.lineWidth=1.4;ctx.stroke();
 ctx.fillStyle='#fff8e9';ctx.strokeStyle='#fff8e9';ctx.lineWidth=2.7;ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();
 if(key==='R'){ctx.moveTo(1,-13);ctx.bezierCurveTo(3,-4,12,-3,10,5);ctx.bezierCurveTo(8,15,-10,15,-10,4);ctx.bezierCurveTo(-11,-2,-4,-3,-4,-10);ctx.lineTo(-1,-3);ctx.quadraticCurveTo(4,-7,1,-13);ctx.fill();ctx.fillStyle=dark;ctx.beginPath();ctx.moveTo(1,0);ctx.quadraticCurveTo(10,11,0,11);ctx.quadraticCurveTo(-5,8,1,0);ctx.fill()}
 if(key==='B'){ctx.moveTo(0,-13);ctx.bezierCurveTo(-2,-8,-11,0,-10,5);ctx.bezierCurveTo(-9,16,9,16,10,5);ctx.bezierCurveTo(11,0,2,-8,0,-13);ctx.fill();ctx.strokeStyle=dark;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-5,3);ctx.quadraticCurveTo(-6,8,-1,9);ctx.stroke()}
 if(key==='F'){ctx.moveTo(11,-12);ctx.quadraticCurveTo(-16,-12,-10,7);ctx.quadraticCurveTo(9,17,11,-12);ctx.fill();ctx.strokeStyle=dark;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-10,12);ctx.lineTo(6,-6);ctx.moveTo(-2,3);ctx.lineTo(-5,-2);ctx.stroke()}
 if(key==='L'){ctx.moveTo(-12,7);ctx.lineTo(-7,-8);ctx.lineTo(4,-12);ctx.lineTo(12,-2);ctx.lineTo(8,10);ctx.lineTo(-5,12);ctx.closePath();ctx.fill();ctx.strokeStyle=dark;ctx.lineWidth=1.8;ctx.beginPath();ctx.moveTo(-7,-8);ctx.lineTo(1,1);ctx.lineTo(8,10);ctx.moveTo(1,1);ctx.lineTo(12,-2);ctx.moveTo(1,1);ctx.lineTo(-12,7);ctx.stroke()}
 if(key==='U'){ctx.moveTo(0,-14);ctx.lineTo(4,-4);ctx.lineTo(14,0);ctx.lineTo(4,4);ctx.lineTo(0,14);ctx.lineTo(-4,4);ctx.lineTo(-14,0);ctx.lineTo(-4,-4);ctx.closePath();ctx.fill()}
 if(key==='D'){ctx.moveTo(0,12);ctx.bezierCurveTo(-20,-1,-9,-16,0,-6);ctx.bezierCurveTo(9,-16,20,-1,0,12);ctx.fill()}
 if(key==='V'){ctx.arc(0,0,12,0,Math.PI*2);ctx.fill();ctx.fillStyle=dark;ctx.beginPath();ctx.arc(6,-4,10,0,Math.PI*2);ctx.fill()}
 if(key==='I'){for(let i=0;i<6;i++){ctx.save();ctx.rotate(i*Math.PI/3);ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(0,-13);ctx.moveTo(-4,-8);ctx.lineTo(0,-5);ctx.lineTo(4,-8);ctx.stroke();ctx.restore()}}
 if(key==='M'){ctx.moveTo(-11,-9);ctx.lineTo(11,-9);ctx.lineTo(9,5);ctx.lineTo(0,13);ctx.lineTo(-9,5);ctx.closePath();ctx.fill();ctx.strokeStyle=dark;ctx.beginPath();ctx.moveTo(0,-6);ctx.lineTo(0,7);ctx.stroke()}
 if(key==='H'){ctx.arc(0,0,6,0,Math.PI*2);ctx.fill();for(let i=0;i<8;i++){const a=i*Math.PI/4;ctx.beginPath();ctx.moveTo(Math.cos(a)*10,Math.sin(a)*10);ctx.lineTo(Math.cos(a)*14,Math.sin(a)*14);ctx.stroke()}}
 if(key==='P'){ctx.arc(0,-2,10,0,Math.PI*2);ctx.fill();ctx.fillRect(-6,4,12,8);ctx.fillStyle=dark;ctx.beginPath();ctx.arc(-4,-3,3,0,Math.PI*2);ctx.arc(4,-3,3,0,Math.PI*2);ctx.fill()}
 if(key==='J'){ctx.lineWidth=5;ctx.moveTo(-8,-8);ctx.lineTo(8,8);ctx.moveTo(8,-8);ctx.lineTo(-8,8);ctx.stroke()}
 ctx.restore();
}
function dragonMarkup(){
 return `<svg class="dragon-art" viewBox="0 0 360 205" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="三日月の角と結晶の胸を持つオリジナルの翼竜">
 <defs>
  <linearGradient id="dragonBody" x1="0" y1="0" x2="0.7" y2="1"><stop stop-color="var(--dragon-light,#8addc5)"/><stop offset=".5" stop-color="var(--dragon-main,#378e88)"/><stop offset="1" stop-color="var(--dragon-dark,#173f59)"/></linearGradient>
  <linearGradient id="dragonWing" x2=".5" y2="1"><stop stop-color="var(--dragon-main,#378e88)"/><stop offset="1" stop-color="#16223e"/></linearGradient>
  <linearGradient id="dragonHorn" x2=".7" y2="1"><stop stop-color="#fff1c2"/><stop offset="1" stop-color="#9d8055"/></linearGradient>
  <radialGradient id="dragonAura"><stop stop-color="var(--dragon-light,#8addc5)" stop-opacity=".22"/><stop offset="1" stop-color="var(--dragon-light,#8addc5)" stop-opacity="0"/></radialGradient>
 </defs>
 <ellipse cx="184" cy="111" rx="145" ry="88" fill="url(#dragonAura)"/>
 <ellipse cx="188" cy="184" rx="89" ry="9" fill="#091321" opacity=".5"/>
 <g stroke="#13283c" stroke-width="2.3" stroke-linejoin="round">
 <g class="dragon-wings" fill="url(#dragonWing)">
 <path d="M165 117 Q125 50 39 16 L67 63 Q51 52 22 57 L61 100 Q48 94 28 106 Q95 117 135 150Z"/>
 <path d="M203 112 Q240 39 329 13 L306 62 Q326 53 344 61 L309 99 Q332 90 347 103 Q277 117 227 148Z"/>
 <g fill="none" stroke="var(--dragon-light,#8addc5)" stroke-opacity=".48" stroke-width="1.6"><path d="M163 122 L39 16 M154 131 L67 63 M145 139 L61 100 M207 119 L329 13 M219 132 L306 62 M230 140 L309 99"/></g>
 <path d="M39 16 Q119 27 170 111 M329 13 Q250 20 202 109" fill="none" stroke="url(#dragonHorn)" stroke-width="4"/>
 </g>
 <path d="M201 142 C274 128 310 151 290 176 C273 197 220 183 250 165 C228 169 218 159 192 165Z" fill="url(#dragonBody)"/>
 <path d="M282 146 L294 128 L300 152 L315 151 L294 167" fill="url(#dragonHorn)"/>
 <path d="M153 166 Q129 174 113 163 L104 175 L128 183 L169 182 L179 164 M201 161 L213 180 L246 181 L257 171 L240 160 L224 165" fill="url(#dragonBody)"/>
 <g fill="url(#dragonHorn)"><path d="M107 171 L101 183 L117 177 M120 176 L120 188 L132 178 M241 173 L250 186 L250 175 M252 169 L265 178 L260 168"/></g>
 <path d="M160 92 C130 116 142 163 164 176 Q190 190 214 168 C236 143 221 113 201 94Z" fill="url(#dragonBody)"/>
 <path d="M177 101 Q153 138 177 174 Q203 172 207 145 L192 105Z" fill="#b7c8a1"/>
 <g fill="none" stroke="#496a68" stroke-width="2"><path d="M166 124 L201 128 M164 136 L205 140 M168 149 L201 152 M173 161 L194 164"/></g>
 <path d="M153 112 L127 131 L138 145 L151 136 M214 111 L239 129 L230 145 L214 137" fill="url(#dragonBody)"/>
 <g fill="url(#dragonHorn)"><path d="M136 139 L129 150 L141 145 M145 137 L141 151 L151 142 M227 139 L225 153 L234 145 M235 136 L239 149 L242 140"/></g>
 <path d="M163 83 Q151 63 143 43 Q159 51 172 58 L187 49 L204 60 L221 47 L213 78 L208 98 L182 114 L161 99Z" fill="url(#dragonBody)"/>
 <path d="M164 66 C139 56 135 29 153 15 Q128 19 130 44 Q133 64 160 77 M203 63 C229 49 237 25 222 10 Q250 18 243 42 Q234 65 210 75" fill="url(#dragonHorn)"/>
 <path d="M180 55 L184 34 L192 50 L200 38 L201 63" fill="url(#dragonHorn)"/>
 <path d="M153 83 L169 77 L176 84 L164 89Z M191 83 L209 76 L210 87 L195 90Z" fill="#ffea9c"/>
 <path d="M165 80 L166 87 M202 80 L201 87" stroke="#18243a" stroke-width="3"/>
 <path d="M167 93 L189 88 L207 99 L191 114 L169 107 L159 101Z" fill="var(--dragon-main,#378e88)"/>
 <path d="M164 101 L179 104 L193 101 L205 100" fill="none"/>
 <path d="M173 104 L177 112 L181 104 M194 102 L195 109 L199 102" fill="#fff4d8" stroke-width="1"/>
 <path d="M173 93 L176 94 M192 93 L196 94" fill="none" stroke-width="3"/>
 <path class="dragon-core" d="M183 117 L195 130 L185 146 L175 131Z" fill="var(--dragon-gem,#b6ffee)" stroke="#e4fff4" stroke-width="1.3"/>
 <g fill="none" stroke="var(--dragon-light,#8addc5)" stroke-opacity=".5" stroke-width="1.4"><path d="M149 121 L154 125 L160 121 M146 134 L151 138 L155 133 M211 125 L218 130 L223 125 M215 142 L220 146 L224 141 M257 146 L263 151 L269 147"/></g>
 </g></svg>`;
}
