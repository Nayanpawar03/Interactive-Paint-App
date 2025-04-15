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

function initCanvas(){
  canvas.width  = canvas.offsetWidth;
  canvas.height = canvas.offsetHeight;
  // fill white background
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
  // truncate redo stack
  if (historyIndex < historyStack.length - 1) {
    historyStack = historyStack.slice(0, historyIndex + 1);
  }
  historyStack.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
  if (historyStack.length > 50) historyStack.shift(); // cap history
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

function updateUI(){
  fontSizeControl.style.display = (activeTool === 'text') ? 'flex' : 'none';
  thicknessControl.style.display = (activeTool === 'text' || activeTool === 'fill') ? 'none' : 'flex';
}

window.addEventListener('load',   initCanvas);
window.addEventListener('resize', resizeCanvas);

// tool & grid toggles
toolSelect.addEventListener('change', e => {
  activeTool = e.target.value;
  updateUI();
});
gridToggle.addEventListener('change', () => {
  gridOverlay.style.display = gridToggle.checked ? 'block' : 'none';
});

// clear / undo / redo / download
clearBtn.addEventListener('click', () => {
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  historyStack = [];
  historyIndex = -1;
  saveState();
});
undoBtn.addEventListener('click', () => restoreState(historyIndex - 1));
redoBtn.addEventListener('click', () => restoreState(historyIndex + 1));
downloadBtn.addEventListener('click', () => {
  const a = document.createElement('a');
  a.download = 'canvas.png';
  a.href     = canvas.toDataURL('image/png');
  a.click();
});

// --- DRAWING LOGIC ---

canvas.addEventListener('mousedown', e => {
  const rect = canvas.getBoundingClientRect();
  const x    = Math.floor(e.clientX - rect.left);
  const y    = Math.floor(e.clientY - rect.top);

  // Bucket fill
  if (activeTool === 'fill') {
    bucketFill(x, y, colorInput.value);
    saveState();
    return;
  }

  // Text
  if (activeTool === 'text') {
    const txt = prompt('Enter text:');
    if (txt) {
      ctx.fillStyle = colorInput.value;
      ctx.font      = `${parseInt(fontSizeInput.value,10)}px Arial`;
      ctx.fillText(txt, x, y);
      saveState();
    }
    return;
  }

  // **Brush & Eraser**: start one continuous path
  if (activeTool === 'brush' || activeTool === 'eraser') {
    isDrawing = true;
    ctx.beginPath();
    ctx.lineCap  = 'round';       // smooth ends :contentReference[oaicite:0]{index=0}
    ctx.lineJoin = 'round';
    ctx.lineWidth   = parseInt(thicknessInput.value, 10);
    ctx.strokeStyle = (activeTool === 'eraser') ? '#ffffff' : colorInput.value;
    ctx.moveTo(x, y);
    return;
  }

  // Shapes: record start, draw on mousemove
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

  // **Brush & Eraser**: continue the path
  if (activeTool === 'brush' || activeTool === 'eraser') {
    ctx.lineTo(x, y);
    ctx.stroke();
    return;
  }

  // For shapes, restore last state before preview
  if (historyIndex >= 0 && ['line','rectangle','circle','triangle'].includes(activeTool)) {
    ctx.putImageData(historyStack[historyIndex], 0, 0);
  }

  // Draw preview of shape
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
      drawTriangle(startPoint.x, startPoint.y, x, y, col, th);
      break;
  }
});

canvas.addEventListener('mouseup', () => {
  if (isDrawing) {
    isDrawing = false;
    saveState();
  }
});
canvas.addEventListener('mouseleave', () => {
  if (isDrawing) {
    isDrawing = false;
    saveState();
  }
});

// --- PRIMITIVES ---

function drawLine(x1,y1,x2,y2,color,th) {
  ctx.strokeStyle = color;
  ctx.lineWidth   = th;
  ctx.beginPath();
  ctx.moveTo(x1,y1);
  ctx.lineTo(x2,y2);
  ctx.stroke();
}

function drawRect(x,y,w,h,color,th) {
  ctx.strokeStyle = color;
  ctx.lineWidth   = th;
  ctx.beginPath();
  ctx.rect(x,y,w,h);
  ctx.stroke();
}

function drawCircle(cx,cy,r,color,th) {
  ctx.strokeStyle = color;
  ctx.lineWidth   = th;
  ctx.beginPath();
  ctx.arc(cx,cy,r,0,2*Math.PI);
  ctx.stroke();
}

function drawTriangle(x1,y1,x2,y2,color,th) {
  const x3 = x1 - (x2 - x1);
  ctx.strokeStyle = color;
  ctx.lineWidth   = th;
  ctx.beginPath();
  ctx.moveTo(x1,y1);
  ctx.lineTo(x2,y2);
  ctx.lineTo(x3,y2);
  ctx.closePath();
  ctx.stroke();
}

// --- SCANLINE BUCKET FILL (unchanged) ---

function bucketFill(sx,sy,hex) {
  const img = ctx.getImageData(0,0,canvas.width,canvas.height),
        pix = img.data,
        w   = img.width, h = img.height;
  const tgt = getPixel(pix,sx,sy,w),
        col = hexToRgb(hex);
  if (tgt[0]===col.r && tgt[1]===col.g && tgt[2]===col.b && tgt[3]===255) return;
  const stack = [{x:sx,y:sy}];
  while(stack.length){
    const {x,y} = stack.pop();
    let x1 = x;
    while(x1>=0 && matchColor(pix,x1,y,tgt,w)) x1--;
    x1++;
    let up=false, down=false;
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

function getPixel(d,x,y,w){ const i=(y*w+x)*4; return [d[i],d[i+1],d[i+2],d[i+3]]; }
function matchColor(d,x,y,t,w){ const i=(y*w+x)*4; return d[i]===t[0]&&d[i+1]===t[1]&&d[i+2]===t[2]&&d[i+3]===t[3]; }
function setPixel(d,x,y,c,w){ const i=(y*w+x)*4; d[i]=c.r; d[i+1]=c.g; d[i+2]=c.b; d[i+3]=255; }
function hexToRgb(h){ const m=/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(h);
  return {r:parseInt(m[1],16),g:parseInt(m[2],16),b:parseInt(m[3],16)};
}
