// 简化版Chart.js，解决CDN加载超时问题
if (typeof Chart === 'undefined') {
    window.Chart = function(ctx, config) {
        console.log('Chart.js fallback: Chart created with config:', config);
        // 简单的渲染逻辑
        var canvas = ctx;
        var ctx2d = canvas.getContext('2d');
        
        // 清空画布
        ctx2d.clearRect(0, 0, canvas.width, canvas.height);
        
        // 绘制标题
        ctx2d.font = '14px Arial';
        ctx2d.fillStyle = '#333';
        ctx2d.textAlign = 'center';
        ctx2d.fillText('积分趋势图', canvas.width / 2, 20);
        
        // 绘制简单的柱状图
        if (config && config.data && config.data.datasets) {
            var datasets = config.data.datasets;
            var labels = config.data.labels || [];
            var barWidth = (canvas.width - 40) / labels.length;
            
            datasets.forEach(function(dataset, index) {
                var color = dataset.borderColor || '#333';
                var data = dataset.data || [];
                
                data.forEach(function(value, i) {
                    var x = 20 + i * barWidth + (barWidth / 2) * index;
                    var height = (value / Math.max(...data)) * (canvas.height - 60);
                    var y = canvas.height - 40 - height;
                    
                    ctx2d.fillStyle = color;
                    ctx2d.fillRect(x - barWidth / 4, y, barWidth / 2, height);
                });
            });
            
            // 绘制标签
            labels.forEach(function(label, i) {
                ctx2d.font = '12px Arial';
                ctx2d.fillStyle = '#666';
                ctx2d.textAlign = 'center';
                ctx2d.fillText(label, 20 + i * barWidth + barWidth / 2, canvas.height - 20);
            });
        }
        
        return {
            destroy: function() {
                console.log('Chart destroyed');
            }
        };
    };
    
    // 添加必要的静态方法
    Chart.helpers = {
        isNumber: function(n) {
            return !isNaN(parseFloat(n)) && isFinite(n);
        }
    };
}
