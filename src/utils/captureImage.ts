/** Image loading can stall in WebViews; detach callbacks and release failed decodes. */
export function loadCaptureImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve,reject)=>{
    const image=new Image();
    const clear=()=>{clearTimeout(timer);image.onload=image.onerror=null;};
    const failed=()=>{clear();image.src='';reject(new Error('Scene image could not be decoded'));};
    const timer=setTimeout(failed,10_000);
    image.onload=()=>{clear();resolve(image);};
    image.onerror=failed;
    image.src=src;
  });
}
