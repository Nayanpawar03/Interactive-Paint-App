const canvas         = document.getElementById('paintCanvas');
const ctx            = canvas.getContext('2d');
const clearBtn       = document.getElementById('clearBtn');
const downloadBtn    = document.getElementById('downloadBtn');
const colorInput     = document.getElementById('colorInput');
const toolSelect     = document.getElementById('toolSelect');
const thicknessInput = document.getElementById('thicknessInput');
const undoBtn        = document.getElementById('undoBtn');
const redoBtn        = document.getElementById('redoBtn');
const fontSizeInput  = document.getElementById('fontSizeInput');
const fontSizeControl= document.getElementById('fontSizeControl');
const thicknessControl = document.querySelector('.tool-group:nth-child(3)');
const gridToggle     = document.getElementById('gridToggle');
const gridOverlay    = document.getElementById('gridOverlay');

let isDrawing     = false;
let startPoint    = null;
let historyStack  = [];
let historyIndex  = -1;
let activeTool    = 'line';
let brushPoints   = [];

function initCanvas(){
  canvas.width  = canvas.offsetWidth;
  canvas.height = canvas.offsetHeight;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  saveState();
}

function resizeCanvas(){
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
  canvas.width  = canvas.offsetWidth;
  canvas.height = canvas.offsetHeight;
  ctx.putImageData(data, 0, 0);
}

function saveState(){
  if (historyIndex < historyStack.length - 1) historyStack = historyStack.slice(0, historyIndex + 1);
  historyStack.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
  if (historyStack.length > 50) historyStack.shift();
  historyIndex = historyStack.length - 1;
  updateUndoRedo();
}

function restoreState(idx){
  if (idx < 0 || idx >= historyStack.length) return;
  ctx.putImageData(historyStack[idx], 0, 0);
  historyIndex = idx;
  updateUndoRedo();
}

function updateUndoRedo(){
  undoBtn.disabled = historyIndex <= 0;
  redoBtn.disabled = historyIndex >= historyStack.length - 1;
}
const brushStyleControl = document.getElementById('brushStyleControl');

function updateUI() {
  fontSizeControl.style.display = (activeTool === 'text') ? 'flex' : 'none';
  thicknessControl.style.display = (activeTool === 'text' || activeTool === 'fill') ? 'none' : 'flex';
  brushStyleControl.style.display = (activeTool === 'brush') ? 'flex' : 'none';
}


window.addEventListener('load',   initCanvas);
window.addEventListener('resize', resizeCanvas);

toolSelect.addEventListener('change', e => { activeTool = e.target.value; updateUI(); });
gridToggle.addEventListener('change', () => { gridOverlay.style.display = gridToggle.checked ? 'block' : 'none'; });

clearBtn.addEventListener('click', () => { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height); historyStack=[]; historyIndex=-1; saveState(); });
undoBtn.addEventListener('click', () => restoreState(historyIndex - 1));
redoBtn.addEventListener('click', () => restoreState(historyIndex + 1));
downloadBtn.addEventListener('click', () => { const a = document.createElement('a'); a.download = 'canvas.png'; a.href = canvas.toDataURL('image/png'); a.click(); });

canvas.addEventListener('mousedown', e => {
  const rect = canvas.getBoundingClientRect();
  const x    = Math.floor(e.clientX - rect.left);
  const y    = Math.floor(e.clientY - rect.top);

  if (activeTool === 'fill') { bucketFill(x, y, colorInput.value); saveState(); return; }
  if (activeTool === 'text') { const txt = prompt('Enter text:'); if (txt) { ctx.fillStyle = colorInput.value; ctx.font = `${parseInt(fontSizeInput.value,10)}px Arial`; ctx.fillText(txt, x, y); saveState(); } return; }


 


  if (activeTool === 'brush') {
    isDrawing = true;
    brushPoints = [{x,y}];
    ctx.beginPath();
    ctx.lineCap  = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = parseInt(thicknessInput.value,10);
    ctx.strokeStyle = colorInput.value;
    return;
  }
  if (activeTool === 'eraser') {
    isDrawing = true;
    ctx.beginPath(); ctx.lineCap='round'; ctx.lineJoin='round'; ctx.lineWidth = parseInt(thicknessInput.value,10);
    ctx.strokeStyle = '#ffffff'; ctx.moveTo(x,y);
    return;
  }

  isDrawing  = true;
  startPoint = { x, y };
});

canvas.addEventListener('mousemove', e => {
  if (!isDrawing) return;
  const rect = canvas.getBoundingClientRect();
  const x    = Math.floor(e.clientX - rect.left);
  const y    = Math.floor(e.clientY - rect.top);
  const col  = colorInput.value;
  const th   = parseInt(thicknessInput.value, 10);

 
  
  const style = document.getElementById('brushStyle').value;

  if (activeTool === 'brush') {
    brushPoints.push({x, y});
    const p0 = brushPoints[brushPoints.length - 2];
    const p1 = brushPoints[brushPoints.length - 1];
  
    switch (style) {
      case 'round':
        drawInterpolatedLine(p0, p1, col, th);
        break;
      case 'spray':
        drawSprayBrush(x, y, col, th);
        break;
      case 'calligraphy':
        drawCalligraphyBrush(x, y, col, th);
        break;
    }
    return;
  }
  
    

  if (activeTool === 'eraser') { ctx.lineTo(x, y); ctx.stroke(); return; }

  if (historyIndex >= 0 && ['line','rectangle','circle','triangle'].includes(activeTool)) {
    ctx.putImageData(historyStack[historyIndex], 0, 0);
  }

  switch(activeTool) {
    case 'line':
      drawLine(startPoint.x, startPoint.y, x, y, col, th);
      break;
    case 'rectangle':
      drawRect(startPoint.x, startPoint.y, x - startPoint.x, y - startPoint.y, col, th);
      break;
    case 'circle':
      const r = Math.hypot(x - startPoint.x, y - startPoint.y);
      drawCircle(startPoint.x, startPoint.y, r, col, th);
      break;
    case 'triangle':
      const tri = [
        {x: startPoint.x, y: startPoint.y},
        {x: x, y: y},
        {x: startPoint.x - (x - startPoint.x), y: y}
      ];
      const clippedTri = sutherlandHodgman(tri, { xmin:0, ymin:0, xmax:canvas.width, ymax:canvas.height });
      drawPolygon(clippedTri, col, th);
      break;
  }
});

canvas.addEventListener('mouseup', () => { if (isDrawing) { isDrawing = false; saveState(); }});
canvas.addEventListener('mouseleave', () => { if (isDrawing) { isDrawing = false; saveState(); }});

// --- PRIMITIVES & ALGORITHMS ---

// Bresenham + Liang-Barsky
function drawLine(x1,y1,x2,y2,color,th) {
  const clip = liangBarsky(x1,y1,x2,y2, 0,0, canvas.width, canvas.height);
  if (!clip) return;
  [x1,y1,x2,y2] = clip;
  ctx.fillStyle = color;
  let dx = Math.abs(x2 - x1), sx = x1 < x2 ? 1 : -1;
  let dy = Math.abs(y2 - y1), sy = y1 < y2 ? 1 : -1;
  let err = dx - dy;
  while(true) {
    ctx.fillRect(x1, y1, th, th);
    if (x1 === x2 && y1 === y2) break;
    let e2 = 2 * err;
    if (e2 > -dy) { err -= dy; x1 += sx; }
    if (e2 < dx)  { err += dx; y1 += sy; }
  }
}





function liangBarsky(x0,y0,x1,y1, xmin,ymin,xmax,ymax) {
  const p = [-(x1-x0), x1-x0, -(y1-y0), y1-y0];
  const q = [x0-xmin, xmax-x0, y0-ymin, ymax-y0];
  let u1 = 0, u2 = 1;
  for (let i=0; i<4; i++) {
    if (p[i] === 0) {
      if (q[i] < 0) return null;
    } else {
      const u = q[i] / p[i];
      if (p[i] < 0) u1 = Math.max(u1, u);
      else         u2 = Math.min(u2, u);
      if (u1 > u2) return null;
    }
  }
  return [
    x0 + u1*(x1-x0), y0 + u1*(y1-y0),
    x0 + u2*(x1-x0), y0 + u2*(y1-y0)
  ];
}

// Rectangle, Circle, Polygon drawing
function drawRect(x,y,w,h,color,th) {
  ctx.strokeStyle = color; ctx.lineWidth = th;
  ctx.beginPath(); ctx.rect(x,y,w,h); ctx.stroke();
}

function drawCircle(cx,cy,r,color,th) {
  ctx.strokeStyle = color; ctx.lineWidth = th;
  ctx.beginPath(); ctx.arc(cx,cy,r,0,2*Math.PI); ctx.stroke();
}

function drawPolygon(vertices,color,th) {
  if (!vertices.length) return;
  ctx.strokeStyle = color; ctx.lineWidth = th;
  ctx.beginPath(); ctx.moveTo(vertices[0].x, vertices[0].y);
  vertices.slice(1).forEach(p => ctx.lineTo(p.x, p.y));
  ctx.closePath(); ctx.stroke();
}

// Sutherland-Hodgman Polygon Clipping
function sutherlandHodgman(subject, clipRect) {
  const edges = [
    {x1:clipRect.xmin, y1:clipRect.ymin, x2:clipRect.xmax, y2:clipRect.ymin},
    {x1:clipRect.xmax, y1:clipRect.ymin, x2:clipRect.xmax, y2:clipRect.ymax},
    {x1:clipRect.xmax, y1:clipRect.ymax, x2:clipRect.xmin, y2:clipRect.ymax},
    {x1:clipRect.xmin, y1:clipRect.ymax, x2:clipRect.xmin, y2:clipRect.ymin}
  ];
  let output = subject;
  edges.forEach(edge => {
    const input = output; output = [];
    input.forEach((current, i) => {
      const prev = input[(i + input.length - 1) % input.length];
      const insideCurr = isInside(current, edge);
      const insidePrev = isInside(prev, edge);
      if (insidePrev && insideCurr) output.push(current);
      else if (insidePrev && !insideCurr) output.push(intersect(prev, current, edge));
      else if (!insidePrev && insideCurr) {
        output.push(intersect(prev, current, edge));
        output.push(current);
      }
    });
  });
  return output;
}

function isInside(pt, edge) {
  return (edge.x2 - edge.x1)*(pt.y - edge.y1) - (edge.y2 - edge.y1)*(pt.x - edge.x1) >= 0;
}



function drawInterpolatedLine(p0, p1, color, thickness) {
  const dx = p1.x - p0.x;
  const dy = p1.y - p0.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const steps = Math.floor(distance / 1); // 1px step

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = p0.x + dx * t;
    const y = p0.y + dy * t;

    ctx.beginPath();
    ctx.arc(x, y, thickness / 2, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  }
}


function intersect(A,B,edge) {
  const {x1,y1,x2,y2} = edge;
  const a1 = y2 - y1, b1 = x1 - x2, c1 = a1*x1 + b1*y1;
  const a2 = B.y - A.y, b2 = A.x - B.x, c2 = a2*A.x + b2*A.y;
  const det = a1*b2 - a2*b1;
  return { x:(b2*c1 - b1*c2)/det, y:(a1*c2 - a2*c1)/det };
}

// --- BUCKET FILL (unchanged) ---

function bucketFill(sx,sy,hex) {
  const img = ctx.getImageData(0,0,canvas.width,canvas.height), pix = img.data;
  const w = img.width, h = img.height;
  const tgt = getPixel(pix,sx,sy,w), col = hexToRgb(hex);
  if (tgt[0]===col.r && tgt[1]===col.g && tgt[2]===col.b && tgt[3]===255) return;
  const stack = [{x:sx,y:sy}];
  while(stack.length){
    const {x,y} = stack.pop(); let x1=x, up=false, down=false;
    while(x1>=0 && matchColor(pix,x1,y,tgt,w)) x1--;
    x1++;
    while(x1<w && matchColor(pix,x1,y,tgt,w)){
      setPixel(pix,x1,y,col,w);
      if(!up   && y>0   && matchColor(pix,x1,y-1,tgt,w)) { stack.push({x:x1,y:y-1}); up=true; }
      else if(up   && y>0   && !matchColor(pix,x1,y-1,tgt,w)) up=false;
      if(!down && y<h-1 && matchColor(pix,x1,y+1,tgt,w)) { stack.push({x:x1,y:y+1}); down=true; }
      else if(down && y<h-1 && !matchColor(pix,x1,y+1,tgt,w)) down=false;
      x1++;
    }
  }
  ctx.putImageData(img,0,0);
}







function drawSprayBrush(x, y, color, thickness) {
  const density = 20;
  const radius = thickness * 1.5;

  ctx.fillStyle = color;

  for (let i = 0; i < density; i++) {
    const angle = Math.random() * 2 * Math.PI;
    const r = Math.random() * radius;
    const dx = r * Math.cos(angle);
    const dy = r * Math.sin(angle);
    ctx.fillRect(x + dx, y + dy, 1, 1);
  }
}

function drawCalligraphyBrush(x, y, color, thickness) {
  // Calculate the angle between the previous two brush points
  const angle = Math.atan2(y - brushPoints[brushPoints.length - 2].y, x - brushPoints[brushPoints.length - 2].x);
  
  // Increase the effect of thickness variation based on the angle (for deeper effect)
  const width = thickness + Math.abs(Math.sin(angle) * thickness * 2); // Increase the multiplier (2 for more depth)

  ctx.lineWidth = width; // Adjust the thickness dynamically
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = color;
  
  // Drawing a smooth curved line between points using quadratic curve
  const p0 = brushPoints[brushPoints.length - 2];
  const p1 = brushPoints[brushPoints.length - 1];
  const cp = { x: (p0.x + p1.x) / 2, y: (p0.y + p1.y) / 2 }; // Control point for curve
  
  ctx.beginPath();
  ctx.moveTo(p0.x, p0.y);
  ctx.quadraticCurveTo(cp.x, cp.y, p1.x, p1.y);
  ctx.stroke();
}




function getPixel(d,x,y,w){ const i=(y*w+x)*4; return [d[i],d[i+1],d[i+2],d[i+3]]; }
function matchColor(d,x,y,t,w){ const i=(y*w+x)*4; return d[i]===t[0]&&d[i+1]===t[1]&&d[i+2]===t[2]&&d[i+3]===t[3]; }
function setPixel(d,x,y,c,w){ const i=(y*w+x)*4; d[i]=c.r; d[i+1]=c.g; d[i+2]=c.b; d[i+3]=255; }
function hexToRgb(h){ const m=/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(h);
  return {r:parseInt(m[1],16),g:parseInt(m[2],16),b:parseInt(m[3],16)}; }
