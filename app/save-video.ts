export type VideoFileHandle = {createWritable:()=>Promise<{write:(blob:Blob)=>Promise<void>;close:()=>Promise<void>}>};
type PickerWindow = Window & {showSaveFilePicker?:(options:{suggestedName:string;types:{description:string;accept:Record<string,string[]>}[]})=>Promise<VideoFileHandle>};
export async function saveVideo(blob:Blob):Promise<'saved'|'downloaded'|'cancelled'> {
 const picker=(window as PickerWindow).showSaveFilePicker;
 if(picker){
  try {
   const handle=await picker.call(window,{suggestedName:'slim-studio.webm',types:[{description:'WebM video',accept:{'video/webm':['.webm']}}]});
   const writable=await handle.createWritable();await writable.write(blob);await writable.close();return 'saved';
  }catch(e){if(e instanceof DOMException&&e.name==='AbortError')return 'cancelled';throw e;}
 }
 const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='slim-studio.webm';document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);return 'downloaded';
}
