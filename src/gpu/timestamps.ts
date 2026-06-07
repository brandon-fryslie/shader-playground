export const GPU_TIMING_BUCKETS = [
  'pmDepositConvert',
  'outerVCycle',
  'boundarySample',
  'innerVCycle',
  'starInterpolate',
  'gasInterpolatePressure',
  'starGasIntegrate',
  'starsRender',
  'gasRender',
  'bloomComposite',
] as const;

export type GpuTimingBucket = typeof GPU_TIMING_BUCKETS[number];
export type TimestampWrites = {
  querySet: GPUQuerySet;
  beginningOfPassWriteIndex?: number;
  endOfPassWriteIndex?: number;
};

function makeZeroGpuTimingDetail(): Record<GpuTimingBucket, number> {
  return Object.fromEntries(GPU_TIMING_BUCKETS.map((bucket) => [bucket, 0])) as Record<GpuTimingBucket, number>;
}

export interface GpuTimingStats {
  gpuFrameMs: number;
  gpuTimingDetail: Record<GpuTimingBucket, number>;
}

export interface GpuTimingService {
  beginFrame(): void;
  endFrame(encoder: GPUCommandEncoder, now: number): void;
  getStats(): GpuTimingStats;
  init(device: GPUDevice): void;
  measure(now: number): void;
  tsBegin(bucket: GpuTimingBucket): TimestampWrites | undefined;
  tsEnd(bucket: GpuTimingBucket): TimestampWrites | undefined;
  tsWrites(bucket: GpuTimingBucket): TimestampWrites | undefined;
}

export function createGpuTimingService(): GpuTimingService {
  // [LAW:one-source-of-truth] GPU timing query state and fallback profiling
  // both live in this service so pass helpers and diagnostics read one owner.
  const GPU_TIMING_INDEX: Record<GpuTimingBucket, number> = Object.fromEntries(
    GPU_TIMING_BUCKETS.map((bucket, index) => [bucket, index]),
  ) as Record<GpuTimingBucket, number>;
  const GPU_TS_COUNT = GPU_TIMING_BUCKETS.length * 2;
  const PROFILE_INTERVAL_MS = 2000;

  let device: GPUDevice | null = null;
  let gpuFrameMs = 0;
  let gpuTimingDetail = makeZeroGpuTimingDetail();
  let activeGpuTimingBuckets = new Set<GpuTimingBucket>();
  let gpuTimingFrameActive = false;
  let profilingPending = false;
  let lastProfileTime = 0;
  let gpuTs: { querySet: GPUQuerySet; resolveBuf: GPUBuffer; stagingBuf: GPUBuffer; pending: boolean } | null = null;

  return {
    init(nextDevice) {
      device = nextDevice;
      gpuFrameMs = 0;
      gpuTimingDetail = makeZeroGpuTimingDetail();
      activeGpuTimingBuckets = new Set<GpuTimingBucket>();
      gpuTimingFrameActive = false;
      profilingPending = false;
      lastProfileTime = 0;
      gpuTs = nextDevice.features.has('timestamp-query')
        ? {
            querySet: nextDevice.createQuerySet({ type: 'timestamp', count: GPU_TS_COUNT }),
            resolveBuf: nextDevice.createBuffer({ size: GPU_TS_COUNT * 8, usage: GPUBufferUsage.QUERY_RESOLVE | GPUBufferUsage.COPY_SRC }),
            stagingBuf: nextDevice.createBuffer({ size: GPU_TS_COUNT * 8, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ }),
            pending: false,
          }
        : null;
    },
    beginFrame() {
      activeGpuTimingBuckets = new Set<GpuTimingBucket>();
      gpuTimingFrameActive = true;
    },
    tsWrites(bucket) {
      if (!gpuTs || !gpuTimingFrameActive) return undefined;
      activeGpuTimingBuckets.add(bucket);
      const slotPair = GPU_TIMING_INDEX[bucket];
      return { querySet: gpuTs.querySet, beginningOfPassWriteIndex: slotPair * 2, endOfPassWriteIndex: slotPair * 2 + 1 };
    },
    tsBegin(bucket) {
      if (!gpuTs || !gpuTimingFrameActive) return undefined;
      activeGpuTimingBuckets.add(bucket);
      return { querySet: gpuTs.querySet, beginningOfPassWriteIndex: GPU_TIMING_INDEX[bucket] * 2 };
    },
    tsEnd(bucket) {
      if (!gpuTs || !gpuTimingFrameActive) return undefined;
      activeGpuTimingBuckets.add(bucket);
      return { querySet: gpuTs.querySet, endOfPassWriteIndex: GPU_TIMING_INDEX[bucket] * 2 + 1 };
    },
    endFrame(encoder, now) {
      gpuTimingFrameActive = false;
      if (!gpuTs || gpuTs.pending || now - lastProfileTime < PROFILE_INTERVAL_MS) return;
      const activeBuckets = Array.from(activeGpuTimingBuckets);
      if (activeBuckets.length === 0) return;
      lastProfileTime = now;
      encoder.resolveQuerySet(gpuTs.querySet, 0, GPU_TS_COUNT, gpuTs.resolveBuf, 0);
      encoder.copyBufferToBuffer(gpuTs.resolveBuf, 0, gpuTs.stagingBuf, 0, GPU_TS_COUNT * 8);
      gpuTs.pending = true;
      const ts = gpuTs;
      const activeBucketsSnapshot = [...activeBuckets];
      device?.queue.onSubmittedWorkDone().then(() => {
        ts.stagingBuf.mapAsync(GPUMapMode.READ).then(() => {
          const ns = new BigUint64Array(ts.stagingBuf.getMappedRange().slice(0));
          ts.stagingBuf.unmap();
          ts.pending = false;
          const toMs = (a: bigint, b: bigint) => b > a ? Number(b - a) / 1_000_000 : 0;
          const detail = makeZeroGpuTimingDetail();
          let first = 0n;
          let last = 0n;
          for (const bucket of activeBucketsSnapshot) {
            const idx = GPU_TIMING_INDEX[bucket] * 2;
            const begin = ns[idx];
            const end = ns[idx + 1];
            detail[bucket] = toMs(begin, end);
            if (begin > 0n && (first === 0n || begin < first)) first = begin;
            if (end > last) last = end;
          }
          gpuTimingDetail = detail;
          gpuFrameMs = first > 0n && last > first ? Number(last - first) / 1_000_000 : 0;
        }).catch(() => { ts.pending = false; });
      }).catch(() => { ts.pending = false; });
    },
    measure(now) {
      if (gpuTs || !device) return;
      if (profilingPending || now - lastProfileTime < PROFILE_INTERVAL_MS) return;
      lastProfileTime = now;
      profilingPending = true;
      const t0 = performance.now();
      device.queue.onSubmittedWorkDone().then(() => {
        gpuFrameMs = performance.now() - t0;
        profilingPending = false;
      }).catch(() => { profilingPending = false; });
    },
    getStats() {
      return { gpuFrameMs, gpuTimingDetail };
    },
  };
}
