import {Jimp} from 'jimp';
const logo=await Jimp.read('public/assets/multilimp-logo.png');
for(const [size,name] of [[512,'app-icon-512.png'],[192,'app-icon-192.png'],[180,'apple-touch-icon.png'],[32,'favicon-32.png']]){
 const img=new Jimp({width:size,height:size,color:0x07111fff}),mark=logo.clone().scaleToFit({w:Math.round(size*.70),h:Math.round(size*.70)});
 img.composite(mark,Math.round((size-mark.bitmap.width)/2),Math.round((size-mark.bitmap.height)/2));await img.write('public/assets/'+name);
}
