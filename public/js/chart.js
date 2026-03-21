// 简化版Chart.js，支持折线图和柱状图
if (typeof Chart === 'undefined') {
    window.Chart = function(ctx, config) {
        console.log('Chart.js fallback: Chart created with config:', config);
        
        var canvas = ctx;
        var ctx2d = canvas.getContext('2d');
        var chartType = config && config.type ? config.type : 'bar';
        
        // 清空画布
        ctx2d.clearRect(0, 0, canvas.width, canvas.height);
        
        // 获取数据
        if (!config || !config.data || !config.data.datasets) {
            ctx2d.fillStyle = '#666';
            ctx2d.textAlign = 'center';
            ctx2d.fillText('暂无数据', canvas.width / 2, canvas.height / 2);
            return { destroy: function() {} };
        }
        
        var datasets = config.data.datasets;
        var labels = config.data.labels || [];
        
        // 计算数据范围
        var allData = datasets.map(function(d) { return d.data || []; }).flat();
        var maxValue = Math.max(...allData, 1);
        var minValue = Math.min(...allData, 0);
        
        // 绘图区域
        var padding = { top: 30, right: 20, bottom: 40, left: 40 };
        var chartWidth = canvas.width - padding.left - padding.right;
        var chartHeight = canvas.height - padding.top - padding.bottom;
        
        // 绘制标题
        ctx2d.font = '14px Arial';
        ctx2d.fillStyle = '#333';
        ctx2d.textAlign = 'center';
        ctx2d.fillText('趋势图', canvas.width / 2, 20);
        
        // 绘制坐标轴
        ctx2d.strokeStyle = '#ddd';
        ctx2d.lineWidth = 1;
        
        // Y轴
        ctx2d.beginPath();
        ctx2d.moveTo(padding.left, padding.top);
        ctx2d.lineTo(padding.left, canvas.height - padding.bottom);
        ctx2d.stroke();
        
        // X轴
        ctx2d.beginPath();
        ctx2d.moveTo(padding.left, canvas.height - padding.bottom);
        ctx2d.lineTo(canvas.width - padding.right, canvas.height - padding.bottom);
        ctx2d.stroke();
        
        // 绘制Y轴刻度
        ctx2d.font = '10px Arial';
        ctx2d.fillStyle = '#666';
        ctx2d.textAlign = 'right';
        var ySteps = 5;
        for (var i = 0; i <= ySteps; i++) {
            var y = padding.top + (chartHeight / ySteps) * i;
            var value = maxValue - (maxValue / ySteps) * i;
            ctx2d.fillText(Math.round(value), padding.left - 5, y + 3);
            
            ctx2d.strokeStyle = '#eee';
            ctx2d.beginPath();
            ctx2d.moveTo(padding.left, y);
            ctx2d.lineTo(canvas.width - padding.right, y);
            ctx2d.stroke();
        }
        
        // 绘制X轴标签
        ctx2d.textAlign = 'center';
        var xStep = labels.length > 1 ? chartWidth / (labels.length - 1) : chartWidth / 2;
        labels.forEach(function(label, i) {
            var x = padding.left + (labels.length > 1 ? i * xStep : xStep);
            ctx2d.fillText(label, x, canvas.height - padding.bottom + 15);
        });
        
        // 绘制数据
        if (chartType === 'line') {
            // 折线图
            datasets.forEach(function(dataset, di) {
                var color = dataset.borderColor || '#333';
                var data = dataset.data || [];
                var points = [];
                
                // 计算点位置
                data.forEach(function(value, i) {
                    var x = padding.left + (labels.length > 1 ? i * xStep : xStep);
                    var y = padding.top + chartHeight - ((value - minValue) / (maxValue - minValue)) * chartHeight;
                    points.push({ x: x, y: y });
                });
                
                // 绘制连线
                ctx2d.strokeStyle = color;
                ctx2d.lineWidth = 2;
                ctx2d.beginPath();
                points.forEach(function(p, i) {
                    if (i === 0) ctx2d.moveTo(p.x, p.y);
                    else ctx2d.lineTo(p.x, p.y);
                });
                ctx2d.stroke();
                
                // 绘制填充区域
                if (dataset.fill) {
                    ctx2d.fillStyle = color.replace(')', ', 0.1)').replace('rgb', 'rgba').replace('#', 'rgba(').replace(/([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i, function(m, r, g, b) { 
                        return (parseInt(r, 16)) + ',' + parseInt(g, 16) + ',' + parseInt(b, 16) + ',0.1)'; 
                    });
                    ctx2d.beginPath();
                    ctx2d.moveTo(points[0].x, canvas.height - padding.bottom);
                    points.forEach(function(p) { ctx2d.lineTo(p.x, p.y); });
                    ctx2d.lineTo(points[points.length - 1].x, canvas.height - padding.bottom);
                    ctx2d.closePath();
                    ctx2d.fill();
                }
                
                // 绘制点
                ctx2d.fillStyle = color;
                points.forEach(function(p) {
                    ctx2d.beginPath();
                    ctx2d.arc(p.x, p.y, 4, 0, Math.PI * 2);
                    ctx2d.fill();
                });
                
                // 绘制图例
                ctx2d.font = '12px Arial';
                ctx2d.fillStyle = color;
                ctx2d.textAlign = 'left';
                var legendX = padding.left + (di === 0 ? 0 : 80);
                ctx2d.fillText(dataset.label || '', legendX, 15);
            });
        } else {
            // 柱状图
            var barWidth = (chartWidth / labels.length) * 0.8 / datasets.length;
            
            datasets.forEach(function(dataset, di) {
                var color = dataset.borderColor || '#333';
                var data = dataset.data || [];
                
                data.forEach(function(value, i) {
                    var x = padding.left + (i * chartWidth / labels.length) + (barWidth * di);
                    var barHeight = (value / maxValue) * chartHeight;
                    var y = canvas.height - padding.bottom - barHeight;
                    
                    ctx2d.fillStyle = color;
                    ctx2d.fillRect(x, y, barWidth - 2, barHeight);
                });
                
                // 绘制图例
                ctx2d.font = '12px Arial';
                ctx2d.fillStyle = color;
                ctx2d.textAlign = 'left';
                var legendX = padding.left + (di === 0 ? 0 : 80);
                ctx2d.fillText(dataset.label || '', legendX, 15);
            });
        }
        
        return {
            destroy: function() {
                console.log('Chart destroyed');
            }
        };
    };
    
    Chart.helpers = {
        isNumber: function(n) {
            return !isNaN(parseFloat(n)) && isFinite(n);
        }
    };
}
