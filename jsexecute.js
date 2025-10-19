javascript:(function(){
  // Remove existing executor if present
  if(document.getElementById('jsCodeExecutor')) {
    document.getElementById('jsCodeExecutor').remove();
    return;
  }
  
  // Create main container
  var container = document.createElement('div');
  container.id = 'jsCodeExecutor';
  container.innerHTML = `
    <style>
      #jsCodeExecutor {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 90%;
        max-width: 600px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border-radius: 16px;
        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        z-index: 999999;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        padding: 20px;
      }
      #jsCodeExecutor * {
        box-sizing: border-box;
      }
      .executor-header {
        color: white;
        font-size: 22px;
        font-weight: 700;
        margin-bottom: 15px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .close-btn {
        background: rgba(255,255,255,0.2);
        border: none;
        color: white;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        cursor: pointer;
        font-size: 20px;
        font-weight: bold;
        transition: all 0.3s;
      }
      .close-btn:hover {
        background: rgba(255,255,255,0.3);
        transform: rotate(90deg);
      }
      .executor-body {
        background: white;
        border-radius: 12px;
        padding: 16px;
      }
      .code-area {
        width: 100%;
        min-height: 200px;
        padding: 12px;
        border: 2px solid #e0e0e0;
        border-radius: 8px;
        font-family: 'Courier New', monospace;
        font-size: 14px;
        resize: vertical;
        transition: border-color 0.3s;
        background: #f8f9fa;
      }
      .code-area:focus {
        outline: none;
        border-color: #667eea;
        background: white;
      }
      .button-group {
        display: flex;
        gap: 10px;
        margin-top: 15px;
      }
      .btn {
        flex: 1;
        padding: 12px;
        border: none;
        border-radius: 8px;
        font-size: 16px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s;
      }
      .btn-execute {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
      }
      .btn-execute:hover {
        transform: translateY(-2px);
        box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
      }
      .btn-clear {
        background: #f1f3f5;
        color: #495057;
      }
      .btn-clear:hover {
        background: #e9ecef;
      }
      .result-area {
        margin-top: 15px;
        padding: 12px;
        border-radius: 8px;
        font-family: 'Courier New', monospace;
        font-size: 13px;
        min-height: 60px;
        max-height: 150px;
        overflow-y: auto;
        display: none;
      }
      .result-success {
        background: #d4edda;
        border: 2px solid #28a745;
        color: #155724;
      }
      .result-error {
        background: #f8d7da;
        border: 2px solid #dc3545;
        color: #721c24;
      }
      .result-log {
        background: #d1ecf1;
        border: 2px solid #17a2b8;
        color: #0c5460;
      }
    </style>
    <div class="executor-header">
      <span>⚡ JS Code Executor</span>
      <button class="close-btn" onclick="document.getElementById('jsCodeExecutor').remove()">×</button>
    </div>
    <div class="executor-body">
      <textarea class="code-area" placeholder="// Paste your JavaScript code here...&#10;// Example: console.log('Hello World!');" id="codeInput"></textarea>
      <div class="button-group">
        <button class="btn btn-execute" id="executeBtn">▶ Execute</button>
        <button class="btn btn-clear" id="clearBtn">🗑 Clear</button>
      </div>
      <div class="result-area" id="resultArea"></div>
    </div>
  `;
  
  document.body.appendChild(container);
  
  var codeInput = document.getElementById('codeInput');
  var resultArea = document.getElementById('resultArea');
  var executeBtn = document.getElementById('executeBtn');
  var clearBtn = document.getElementById('clearBtn');
  
  // Override console.log to capture output
  var logs = [];
  var originalLog = console.log;
  
  function showResult(message, type) {
    resultArea.style.display = 'block';
    resultArea.className = 'result-area result-' + type;
    resultArea.textContent = message;
  }
  
  executeBtn.onclick = function() {
    var code = codeInput.value.trim();
    if (!code) {
      showResult('⚠ No code provided!', 'error');
      return;
    }
    
    logs = [];
    console.log = function(...args) {
      logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '));
      originalLog.apply(console, args);
    };
    
    try {
      var result = eval(code);
      console.log = originalLog;
      
      var output = '✓ Code executed successfully!';
      if (logs.length > 0) {
        output += '\n\nConsole Output:\n' + logs.join('\n');
      }
      if (result !== undefined) {
        output += '\n\nReturn Value: ' + (typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result));
      }
      showResult(output, 'success');
    } catch (e) {
      console.log = originalLog;
      showResult('✗ Error: ' + e.message + '\n\nStack:\n' + (e.stack || 'No stack trace available'), 'error');
    }
  };
  
  clearBtn.onclick = function() {
    codeInput.value = '';
    resultArea.style.display = 'none';
    logs = [];
  };
  
  // Allow Enter+Ctrl to execute
  codeInput.onkeydown = function(e) {
    if (e.ctrlKey && e.key === 'Enter') {
      executeBtn.click();
    }
  };
  
  codeInput.focus();
})();
