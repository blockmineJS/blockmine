class MetricsCollector {
    constructor() {
        this._counters = new Map();
        this._histograms = new Map();
        this._gauges = new Map();
    }

    incrementCounter(name, labels = {}, value = 1) {
        const key = this._key(name, labels);
        this._counters.set(key, { name, labels, value: (this._counters.get(key)?.value || 0) + value });
    }

    recordDuration(name, durationMs, labels = {}) {
        const key = this._key(name, labels);
        const existing = this._histograms.get(key) || { name, labels, count: 0, sum: 0, min: Infinity, max: -Infinity, buckets: [] };
        existing.count++;
        existing.sum += durationMs;
        existing.min = Math.min(existing.min, durationMs);
        existing.max = Math.max(existing.max, durationMs);
        existing.buckets.push(durationMs);
        this._histograms.set(key, existing);
    }

    setGauge(name, value, labels = {}) {
        const key = this._key(name, labels);
        this._gauges.set(key, { name, labels, value });
    }

    getCounter(name, labels = {}) {
        return this._counters.get(this._key(name, labels))?.value || 0;
    }

    getHistogram(name, labels = {}) {
        const h = this._histograms.get(this._key(name, labels));
        if (!h) return null;
        const avg = h.count > 0 ? h.sum / h.count : 0;
        const p50 = this._percentile(h.buckets, 50);
        const p95 = this._percentile(h.buckets, 95);
        const p99 = this._percentile(h.buckets, 99);
        return { count: h.count, sum: h.sum, min: h.min, max: h.max, avg, p50, p95, p99 };
    }

    getGauge(name, labels = {}) {
        return this._gauges.get(this._key(name, labels))?.value ?? null;
    }

    reset() {
        this._counters.clear();
        this._histograms.clear();
        this._gauges.clear();
    }

    toPrometheus() {
        const lines = [];

        for (const { name, labels, value } of this._counters.values()) {
            lines.push(`# TYPE ${name} counter`);
            lines.push(`${name}${this._labelsStr(labels)} ${value}`);
        }

        for (const { name, labels, count, sum, min, max } of this._histograms.values()) {
            lines.push(`# TYPE ${name} histogram`);
            lines.push(`${name}_count${this._labelsStr(labels)} ${count}`);
            lines.push(`${name}_sum${this._labelsStr(labels)} ${sum}`);
            lines.push(`${name}_min${this._labelsStr(labels)} ${min}`);
            lines.push(`${name}_max${this._labelsStr(labels)} ${max}`);
        }

        for (const { name, labels, value } of this._gauges.values()) {
            lines.push(`# TYPE ${name} gauge`);
            lines.push(`${name}${this._labelsStr(labels)} ${value}`);
        }

        return lines.join('\n');
    }

    _key(name, labels) {
        const labelStr = Object.entries(labels).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}="${v}"`).join(',');
        return labelStr ? `${name}{${labelStr}}` : name;
    }

    _labelsStr(labels) {
        const entries = Object.entries(labels);
        if (entries.length === 0) return '';
        const parts = entries.map(([k, v]) => `${k}="${v}"`).join(',');
        return `{${parts}}`;
    }

    _percentile(values, p) {
        if (values.length === 0) return 0;
        const sorted = [...values].sort((a, b) => a - b);
        const idx = Math.ceil((p / 100) * sorted.length) - 1;
        return sorted[Math.max(0, idx)];
    }
}

let instance = null;

function getMetricsCollector() {
    if (!instance) instance = new MetricsCollector();
    return instance;
}

module.exports = { MetricsCollector, getMetricsCollector };
