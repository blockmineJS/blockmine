const { MetricsCollector } = require('../MetricsCollector');

describe('MetricsCollector', () => {
    let metrics;

    beforeEach(() => {
        metrics = new MetricsCollector();
    });

    describe('counters', () => {
        it('starts at 0', () => {
            expect(metrics.getCounter('requests')).toBe(0);
        });

        it('increments counter', () => {
            metrics.incrementCounter('requests');
            metrics.incrementCounter('requests');
            expect(metrics.getCounter('requests')).toBe(2);
        });

        it('increments by custom value', () => {
            metrics.incrementCounter('bytes', {}, 100);
            metrics.incrementCounter('bytes', {}, 50);
            expect(metrics.getCounter('bytes')).toBe(150);
        });

        it('isolates counters by labels', () => {
            metrics.incrementCounter('requests', { method: 'GET' });
            metrics.incrementCounter('requests', { method: 'POST' });
            expect(metrics.getCounter('requests', { method: 'GET' })).toBe(1);
            expect(metrics.getCounter('requests', { method: 'POST' })).toBe(1);
        });
    });

    describe('histograms', () => {
        it('returns null for unknown histogram', () => {
            expect(metrics.getHistogram('duration')).toBeNull();
        });

        it('records duration and computes stats', () => {
            metrics.recordDuration('duration', 10);
            metrics.recordDuration('duration', 20);
            metrics.recordDuration('duration', 30);
            const h = metrics.getHistogram('duration');
            expect(h.count).toBe(3);
            expect(h.sum).toBe(60);
            expect(h.min).toBe(10);
            expect(h.max).toBe(30);
            expect(h.avg).toBe(20);
        });

        it('computes percentiles', () => {
            for (let i = 1; i <= 100; i++) metrics.recordDuration('latency', i);
            const h = metrics.getHistogram('latency');
            expect(h.p50).toBe(50);
            expect(h.p95).toBe(95);
            expect(h.p99).toBe(99);
        });

        it('isolates histograms by labels', () => {
            metrics.recordDuration('duration', 10, { route: '/a' });
            metrics.recordDuration('duration', 20, { route: '/b' });
            expect(metrics.getHistogram('duration', { route: '/a' }).count).toBe(1);
            expect(metrics.getHistogram('duration', { route: '/b' }).count).toBe(1);
        });
    });

    describe('gauges', () => {
        it('returns null for unknown gauge', () => {
            expect(metrics.getGauge('bots')).toBeNull();
        });

        it('sets and gets gauge value', () => {
            metrics.setGauge('bots', 5);
            expect(metrics.getGauge('bots')).toBe(5);
        });

        it('overwrites gauge value', () => {
            metrics.setGauge('bots', 5);
            metrics.setGauge('bots', 3);
            expect(metrics.getGauge('bots')).toBe(3);
        });

        it('isolates gauges by labels', () => {
            metrics.setGauge('bots', 2, { status: 'running' });
            metrics.setGauge('bots', 1, { status: 'stopped' });
            expect(metrics.getGauge('bots', { status: 'running' })).toBe(2);
            expect(metrics.getGauge('bots', { status: 'stopped' })).toBe(1);
        });
    });

    describe('reset', () => {
        it('clears all metrics', () => {
            metrics.incrementCounter('requests');
            metrics.recordDuration('duration', 10);
            metrics.setGauge('bots', 5);
            metrics.reset();
            expect(metrics.getCounter('requests')).toBe(0);
            expect(metrics.getHistogram('duration')).toBeNull();
            expect(metrics.getGauge('bots')).toBeNull();
        });
    });

    describe('toPrometheus', () => {
        it('outputs counter in Prometheus format', () => {
            metrics.incrementCounter('http_requests_total', { method: 'GET' }, 3);
            const output = metrics.toPrometheus();
            expect(output).toContain('# TYPE http_requests_total counter');
            expect(output).toContain('http_requests_total{method="GET"} 3');
        });

        it('outputs histogram in Prometheus format', () => {
            metrics.recordDuration('request_duration_ms', 100);
            const output = metrics.toPrometheus();
            expect(output).toContain('# TYPE request_duration_ms histogram');
            expect(output).toContain('request_duration_ms_count 1');
            expect(output).toContain('request_duration_ms_sum 100');
        });

        it('outputs gauge in Prometheus format', () => {
            metrics.setGauge('active_bots', 7);
            const output = metrics.toPrometheus();
            expect(output).toContain('# TYPE active_bots gauge');
            expect(output).toContain('active_bots 7');
        });

        it('returns empty string when no metrics', () => {
            expect(metrics.toPrometheus()).toBe('');
        });
    });
});
