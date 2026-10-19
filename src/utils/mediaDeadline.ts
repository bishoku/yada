/** A stalled browser media API must not keep the export UI and its resources alive forever. */
export async function mediaDeadline<T>(operation: Promise<T>, milliseconds: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([operation,new Promise<never>((_,reject)=>{
      timer=setTimeout(()=>reject(new Error('Media operation timed out')),milliseconds);
    })]);
  } finally { clearTimeout(timer); }
}

export async function waitForEncoderCapacity(encoder: VideoEncoder) {
  if (encoder.encodeQueueSize < 4) return;
  let release: (()=>void) | undefined;
  try {
    await mediaDeadline(new Promise<void>((resolve,reject)=>{
      const changed=()=>{
        if (encoder.state==='closed') reject(new Error('Video encoder closed'));
        else if (encoder.encodeQueueSize < 4) resolve();
      };
      encoder.addEventListener('dequeue',changed);
      release=()=>encoder.removeEventListener('dequeue',changed);
      changed();
    }),10_000);
  } finally { release?.(); }
}
