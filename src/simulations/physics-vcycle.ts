type TimestampWrites = {
  beginningOfPassWriteIndex?: number;
  endOfPassWriteIndex?: number;
  querySet: GPUQuerySet;
};

export interface PmVCycleArgs {
  coarsestSweeps: number;
  levels: number;
  pipelines: {
    prolong: GPUComputePipeline;
    residual: GPUComputePipeline;
    restrict: GPUComputePipeline;
    smooth: GPUComputePipeline;
  };
  postSmooth: number;
  potential: GPUBuffer[];
  preSmooth: number;
  prolongBG: GPUBindGroup[];
  residualBG: GPUBindGroup[];
  restrictBG: GPUBindGroup[];
  smoothBG: GPUBindGroup[][];
  timestampWrites?: TimestampWrites;
  wgCount: number[];
}

export function runPmVCycle(encoder: GPUCommandEncoder, args: PmVCycleArgs): void {
  const maxLevel = args.levels - 1;

  for (let l = 1; l < args.levels; l++) encoder.clearBuffer(args.potential[l]);

  // [LAW:dataflow-not-control-flow] Every level executes the same V-cycle
  // stages; only the per-level data and workgroup counts vary.
  const pass = encoder.beginComputePass(
    args.timestampWrites ? { timestampWrites: args.timestampWrites } : undefined
  );

  for (let l = 0; l < maxLevel; l++) {
    const n = args.wgCount[l];
    pass.setPipeline(args.pipelines.smooth);
    for (let s = 0; s < args.preSmooth; s++) {
      pass.setBindGroup(0, args.smoothBG[l][0]);
      pass.dispatchWorkgroups(n, n, n);
      pass.setBindGroup(0, args.smoothBG[l][1]);
      pass.dispatchWorkgroups(n, n, n);
    }
    pass.setPipeline(args.pipelines.residual);
    pass.setBindGroup(0, args.residualBG[l]);
    pass.dispatchWorkgroups(n, n, n);
    pass.setPipeline(args.pipelines.restrict);
    pass.setBindGroup(0, args.restrictBG[l]);
    const nextCount = args.wgCount[l + 1];
    pass.dispatchWorkgroups(nextCount, nextCount, nextCount);
  }

  {
    const n = args.wgCount[maxLevel];
    pass.setPipeline(args.pipelines.smooth);
    for (let s = 0; s < args.coarsestSweeps; s++) {
      pass.setBindGroup(0, args.smoothBG[maxLevel][0]);
      pass.dispatchWorkgroups(n, n, n);
      pass.setBindGroup(0, args.smoothBG[maxLevel][1]);
      pass.dispatchWorkgroups(n, n, n);
    }
  }

  for (let l = maxLevel - 1; l >= 0; l--) {
    const n = args.wgCount[l];
    pass.setPipeline(args.pipelines.prolong);
    pass.setBindGroup(0, args.prolongBG[l]);
    pass.dispatchWorkgroups(n, n, n);
    pass.setPipeline(args.pipelines.smooth);
    for (let s = 0; s < args.postSmooth; s++) {
      pass.setBindGroup(0, args.smoothBG[l][0]);
      pass.dispatchWorkgroups(n, n, n);
      pass.setBindGroup(0, args.smoothBG[l][1]);
      pass.dispatchWorkgroups(n, n, n);
    }
  }

  pass.end();
}
